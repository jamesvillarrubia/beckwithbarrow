import * as pulumi from "@pulumi/pulumi";
import * as vercel from "@pulumiverse/vercel";
import { VercelDeployHook, StrapiWebhook } from "./webhooks";

const config = new pulumi.Config();

// ---------------------------------------------------------------------------
// Vercel Project
// ---------------------------------------------------------------------------
// To import the existing project instead of creating a new one:
//   pulumi import pulumiverse:index/project:Project beckwithbarrow prj_AYMvwFdokakjzzydvZVuygBKVmEU
//
const project = new vercel.Project("beckwithbarrow", {
  name: "beckwithbarrow",
  framework: "vite",
  rootDirectory: "frontend",
  buildCommand: "pnpm install && pnpm run build",
  outputDirectory: "dist",
  installCommand: "pnpm install --no-frozen-lockfile",
  gitRepository: {
    repo: "jamesvillarrubia/beckwithbarrow",
    type: "github",
    productionBranch: "main",
  },
});

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
// DNS already configured at registrar to point to Vercel — no DNS changes needed.
new vercel.ProjectDomain("domain", {
  projectId: project.id,
  domain: "beckwithbarrow.com",
});

// ---------------------------------------------------------------------------
// Environment Variables — Vercel (production)
// ---------------------------------------------------------------------------
// Secrets: set with `pulumi config set --secret <key> <value>`
// Plain:   set with `pulumi config set <key> <value>`
//
// To populate a fresh stack:
//   pulumi config set --secret resendApiKey         re_xxx
//   pulumi config set --secret recaptchaSecretKey   6LeG6u...
//   pulumi config set contactEmail                  hello@beckwithbarrow.com
//   pulumi config set viteProdApiUrl                https://striking-ball-b079f8c4b0.strapiapp.com/api
//   pulumi config set viteUseProdApi                true
//   pulumi config set viteRecaptchaSiteKey          6LeG6uAr...

interface EnvVarDef {
  key: string;
  value: pulumi.Input<string>;
  sensitive: boolean;
}

const envVars: EnvVarDef[] = [
  // Secrets
  {
    key: "RESEND_API_KEY",
    value: config.requireSecret("resendApiKey"),
    sensitive: true,
  },
  {
    key: "RECAPTCHA_SECRET_KEY",
    value: config.requireSecret("recaptchaSecretKey"),
    sensitive: true,
  },
  // Plain values
  {
    key: "CONTACT_EMAIL",
    value: config.require("contactEmail"),
    sensitive: false,
  },
  {
    key: "VITE_PROD_API_URL",
    value: config.require("viteProdApiUrl"),
    sensitive: false,
  },
  {
    key: "VITE_USE_PROD_API",
    value: config.require("viteUseProdApi"),
    sensitive: false,
  },
  {
    key: "VITE_RECAPTCHA_SITE_KEY",
    value: config.require("viteRecaptchaSiteKey"),
    sensitive: false,
  },
];

envVars.forEach(({ key, value, sensitive }) => {
  const resourceName = key.toLowerCase().replace(/_/g, "-");
  new vercel.ProjectEnvironmentVariable(resourceName, {
    projectId: project.id,
    key,
    value,
    targets: ["production"],
    sensitive,
  });
});

// ---------------------------------------------------------------------------
// Rebuild Webhook Pipeline
// ---------------------------------------------------------------------------
// When she publishes in Strapi → Strapi fires webhook → Vercel rebuilds →
// build script re-fetches all Strapi data → static data is fresh on CDN.
//
// Required secrets (run once, then `pulumi up`):
//   pulumi config set --secret strapiAdminEmail    admin@example.com
//   pulumi config set --secret strapiAdminPassword mypassword
//
// The Vercel API token is read from VERCEL_API_TOKEN env var (already used
// by the @pulumiverse/vercel provider).

const vercelApiToken = process.env.VERCEL_API_TOKEN ?? "";
const strapiBaseUrl = config.require("viteProdApiUrl").replace(/\/api$/, "");
const strapiAdminEmail = config.requireSecret("strapiAdminEmail");
const strapiAdminPassword = config.requireSecret("strapiAdminPassword");

const deployHook = new VercelDeployHook("strapi-publish-hook", {
  projectId: project.id,
  name: "strapi-publish",
  ref: "main",
  apiToken: vercelApiToken,
});

new StrapiWebhook("vercel-rebuild-webhook", {
  strapiBaseUrl,
  adminEmail: strapiAdminEmail,
  adminPassword: strapiAdminPassword,
  webhookName: "vercel-rebuild",
  targetUrl: deployHook.hookUrl,
  events: ["entry.publish", "entry.unpublish", "media.create", "media.delete"],
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
export const projectId = project.id;
export const projectUrl = "https://beckwithbarrow.com";
export const deployHookUrl = deployHook.hookUrl;

// ---------------------------------------------------------------------------
// STRAPI CLOUD — Manual configuration required
// ---------------------------------------------------------------------------
// Strapi Cloud has no public API for env var management. These must be set
// manually in the Strapi Cloud dashboard: https://cloud.strapi.io
//
// Store the values here as encrypted secrets for reference and disaster recovery:
//   pulumi config set --secret strapiAppKeys        "VWS6q/..."
//   pulumi config set --secret strapiApiTokenSalt   KgMOlP...
//   pulumi config set --secret strapiAdminJwtSecret 57goHY...
//   pulumi config set --secret strapiJwtSecret      9HknlD...
//   pulumi config set --secret strapiEncryptionKey  hPz1+C...
//   pulumi config set --secret cloudinarySecret     0ITZlU...
//   pulumi config set          cloudinaryName       dqeqavdd8
//   pulumi config set          cloudinaryKey        865956219142244
//
// Strapi Cloud dashboard env vars to keep in sync:
// ┌──────────────────────────┬─────────────────────────────────────┐
// │ APP_KEYS                 │ config.requireSecret("strapiAppKeys")│
// │ API_TOKEN_SALT           │ config.requireSecret("strapiApiTokenSalt") │
// │ ADMIN_JWT_SECRET         │ config.requireSecret("strapiAdminJwtSecret") │
// │ JWT_SECRET               │ config.requireSecret("strapiJwtSecret") │
// │ ENCRYPTION_KEY           │ config.requireSecret("strapiEncryptionKey") │
// │ CLOUDINARY_NAME          │ config.require("cloudinaryName")     │
// │ CLOUDINARY_KEY           │ config.require("cloudinaryKey")      │
// │ CLOUDINARY_SECRET        │ config.requireSecret("cloudinarySecret") │
// └──────────────────────────┴─────────────────────────────────────┘
//
// Strapi Cloud auto-deploys when main branch is pushed — no manual trigger needed.
