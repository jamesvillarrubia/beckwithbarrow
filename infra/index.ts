import * as pulumi from "@pulumi/pulumi";
import * as vercel from "@pulumiverse/vercel";
import { VercelDeployHook } from "./webhooks";

const config = new pulumi.Config();

// ---------------------------------------------------------------------------
// Vercel Project
// ---------------------------------------------------------------------------
// This project already exists; `import` adopts it into state rather than
// creating a duplicate. The stack previously had no state at all, so a plain
// `up` would have tried to create a second project and re-bind the live domain.
//
// buildCommand / installCommand / outputDirectory are deliberately NOT set:
// the live project leaves them unset and uses Vite framework defaults, which
// already run `pnpm run build` in rootDirectory. Setting them would change the
// production build, and the previous `installCommand` carried
// --no-frozen-lockfile, which would let lockfile drift back in.
const VERCEL_PROJECT_ID = "prj_AYMvwFdokakjzzydvZVuygBKVmEU";

const project = new vercel.Project(
  "beckwithbarrow",
  {
    name: "beckwithbarrow",
    framework: "vite",
    rootDirectory: "frontend",
    gitRepository: {
      repo: "jamesvillarrubia/beckwithbarrow",
      type: "github",
      productionBranch: "main",
    },
  },
  { import: VERCEL_PROJECT_ID }
);

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
// DNS already configured at registrar to point to Vercel — no DNS changes needed.
// Note: the project also serves www.beckwithbarrow.com (a redirect to the apex)
// and beckwithbarrow.vercel.app. Neither is managed here, and Pulumi leaves
// unmanaged resources alone.
new vercel.ProjectDomain(
  "domain",
  {
    projectId: project.id,
    domain: "beckwithbarrow.com",
  },
  { import: `${VERCEL_PROJECT_ID}/beckwithbarrow.com` }
);

// ---------------------------------------------------------------------------
// Environment Variables — Vercel (production)
// ---------------------------------------------------------------------------
// Secrets: set with `pulumi config set --secret <key> <value>`
// Plain:   set with `pulumi config set <key> <value>`
//
// To populate a fresh stack:
//   pulumi config set --secret resendApiKey         re_xxx
//   pulumi config set --secret recaptchaSecretKey   6LeG6u...
//   pulumi config set contactEmail                  design@beckwithbarrow.com
//   pulumi config set viteProdApiUrl                https://striking-ball-b079f8c4b0.strapiapp.com/api
//   pulumi config set viteUseProdApi                true
//   pulumi config set viteRecaptchaSiteKey          6LeG6uAr...

interface EnvVarDef {
  key: string;
  value: pulumi.Input<string>;
  sensitive: boolean;
  /** Existing Vercel env-var id, so this is adopted rather than recreated. */
  importId: string;
}

const envVars: EnvVarDef[] = [
  // NOTE: `sensitive: false` matches the live vars, which are all Vercel
  // "encrypted" type. Pulumi's `sensitive: true` maps to Vercel's "sensitive"
  // (write-only) type, and switching type forces a REPLACE — a delete+create of
  // a live production variable. Keeping false makes the import a clean no-op.
  // Hardening these two to write-only is worth doing, but as a separate,
  // deliberate change once the stack actually owns the resources.
  {
    key: "RESEND_API_KEY",
    value: config.requireSecret("resendApiKey"),
    sensitive: false,
    importId: "hKRoRgi8Hygcq31K",
  },
  {
    key: "RECAPTCHA_SECRET_KEY",
    value: config.requireSecret("recaptchaSecretKey"),
    sensitive: false,
    importId: "9LADWh7yQTQWvCAU",
  },
  // Plain values
  {
    key: "CONTACT_EMAIL",
    value: config.require("contactEmail"),
    sensitive: false,
    importId: "MNCZhlkKAR8vlCac",
  },
  {
    key: "VITE_PROD_API_URL",
    value: config.require("viteProdApiUrl"),
    sensitive: false,
    importId: "TlBhfa3RG4vrNucG",
  },
  {
    key: "VITE_USE_PROD_API",
    value: config.require("viteUseProdApi"),
    sensitive: false,
    importId: "bdwoWf7wHraj1qsD",
  },
  {
    key: "VITE_RECAPTCHA_SITE_KEY",
    value: config.require("viteRecaptchaSiteKey"),
    sensitive: false,
    importId: "VPk7qyRASgWkAica",
  },
];

// All six already exist on production, preview AND development. Narrowing them
// to production alone would strip the API URL and reCAPTCHA keys out of preview
// builds, so the targets here match what is actually deployed.
const ENV_TARGETS = ["production", "preview", "development"];

envVars.forEach(({ key, value, sensitive, importId }) => {
  const resourceName = key.toLowerCase().replace(/_/g, "-");
  new vercel.ProjectEnvironmentVariable(
    resourceName,
    {
      projectId: project.id,
      key,
      value,
      targets: ENV_TARGETS,
      sensitive,
    },
    { import: `${VERCEL_PROJECT_ID}/${importId}` }
  );
});

// ---------------------------------------------------------------------------
// Rebuild Webhook Pipeline
// ---------------------------------------------------------------------------
// Pulumi creates the Vercel deploy hook and outputs its URL.
// The Strapi webhook must be registered manually once:
//   Strapi admin → Settings → Webhooks → Add webhook
//   Name: vercel-rebuild
//   URL: <deployHookUrl output from `pulumi stack output deployHookUrl`>
//   Events: Entry (publish, unpublish), Media (create, delete)
//
// The URL only changes if the deploy hook is destroyed and recreated.

// The token is NOT passed here — the dynamic provider reads VERCEL_API_TOKEN
// from the environment directly (the same var @pulumiverse/vercel uses). That
// keeps it out of the resource inputs entirely, so it never appears in diffs
// or state and cannot trigger the "Unexpected struct type" serialization error
// that a secret-wrapped input caused.
const deployHook = new VercelDeployHook("strapi-publish-hook", {
  projectId: project.id,
  name: "strapi-publish",
  ref: "main",
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
