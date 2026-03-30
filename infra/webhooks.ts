/**
 * webhooks.ts
 *
 * Pulumi dynamic resources for:
 *  - Vercel Deploy Hook  (triggers a rebuild when Strapi publishes content)
 *  - Strapi Webhook      (fires on publish/unpublish/media events → deploy hook URL)
 *
 * Both resources are fully managed: create on `pulumi up`, delete on `pulumi destroy`.
 *
 * Required Pulumi secrets (set before `pulumi up`):
 *   pulumi config set --secret strapiAdminEmail    admin@example.com
 *   pulumi config set --secret strapiAdminPassword mypassword
 *
 * The Vercel API token is read from the VERCEL_API_TOKEN environment variable,
 * which is already used by the @pulumiverse/vercel provider.
 */

import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function vercelFetch(
  path: string,
  method: string,
  token: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

async function strapiAdminFetch(
  baseUrl: string,
  path: string,
  method: string,
  jwt: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi admin ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

async function getStrapiAdminJwt(
  baseUrl: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/admin/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi admin login failed ${res.status}: ${text}`);
  }

  const data = await res.json() as { data: { token: string } };
  return data.data.token;
}

// ---------------------------------------------------------------------------
// Vercel Deploy Hook
// ---------------------------------------------------------------------------

interface VercelDeployHookInputs {
  projectId: string;
  name: string;
  ref: string;
  apiToken: string;
}

interface VercelDeployHookOutputs extends VercelDeployHookInputs {
  hookId: string;
  hookUrl: string;
}

const vercelDeployHookProvider: dynamic.ResourceProvider = {
  async create(inputs: VercelDeployHookInputs): Promise<dynamic.CreateResult> {
    const result = await vercelFetch(
      `/v1/projects/${inputs.projectId}/deploy-hooks`,
      "POST",
      inputs.apiToken,
      { name: inputs.name, ref: inputs.ref }
    ) as { id: string; url: string };

    return {
      id: result.id,
      outs: {
        ...inputs,
        hookId: result.id,
        hookUrl: result.url,
      } satisfies VercelDeployHookOutputs,
    };
  },

  async delete(id: string, props: VercelDeployHookOutputs): Promise<void> {
    await vercelFetch(
      `/v1/projects/${props.projectId}/deploy-hooks/${id}`,
      "DELETE",
      props.apiToken
    );
  },

  async read(id: string, props: VercelDeployHookOutputs): Promise<dynamic.ReadResult> {
    const hooks = await vercelFetch(
      `/v1/projects/${props.projectId}/deploy-hooks`,
      "GET",
      props.apiToken
    ) as Array<{ id: string; url: string; name: string; ref: string }>;

    const hook = hooks.find(h => h.id === id);
    if (!hook) return { id: "", props: {} };

    return {
      id: hook.id,
      props: { ...props, hookId: hook.id, hookUrl: hook.url },
    };
  },
};

export class VercelDeployHook extends dynamic.Resource {
  public readonly hookId!: pulumi.Output<string>;
  public readonly hookUrl!: pulumi.Output<string>;

  constructor(
    name: string,
    args: {
      projectId: pulumi.Input<string>;
      name: pulumi.Input<string>;
      ref: pulumi.Input<string>;
      apiToken: pulumi.Input<string>;
    },
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      vercelDeployHookProvider,
      name,
      { hookId: undefined, hookUrl: undefined, ...args },
      opts
    );
  }
}

// ---------------------------------------------------------------------------
// Strapi Webhook
// ---------------------------------------------------------------------------

interface StrapiWebhookInputs {
  strapiBaseUrl: string;
  adminEmail: string;
  adminPassword: string;
  webhookName: string;
  targetUrl: string;
  events: string[];
}

interface StrapiWebhookOutputs extends StrapiWebhookInputs {
  webhookId: number;
}

const strapiWebhookProvider: dynamic.ResourceProvider = {
  async create(inputs: StrapiWebhookInputs): Promise<dynamic.CreateResult> {
    const jwt = await getStrapiAdminJwt(
      inputs.strapiBaseUrl,
      inputs.adminEmail,
      inputs.adminPassword
    );

    const result = await strapiAdminFetch(
      inputs.strapiBaseUrl,
      "/admin/webhooks",
      "POST",
      jwt,
      {
        name: inputs.webhookName,
        url: inputs.targetUrl,
        events: inputs.events,
        enabled: true,
      }
    ) as { data: { id: number } };

    const webhookId = result.data.id;
    return {
      id: String(webhookId),
      outs: { ...inputs, webhookId } satisfies StrapiWebhookOutputs,
    };
  },

  async delete(id: string, props: StrapiWebhookOutputs): Promise<void> {
    const jwt = await getStrapiAdminJwt(
      props.strapiBaseUrl,
      props.adminEmail,
      props.adminPassword
    );
    await strapiAdminFetch(
      props.strapiBaseUrl,
      `/admin/webhooks/${id}`,
      "DELETE",
      jwt
    );
  },

  async read(id: string, props: StrapiWebhookOutputs): Promise<dynamic.ReadResult> {
    const jwt = await getStrapiAdminJwt(
      props.strapiBaseUrl,
      props.adminEmail,
      props.adminPassword
    );
    const result = await strapiAdminFetch(
      props.strapiBaseUrl,
      `/admin/webhooks/${id}`,
      "GET",
      jwt
    ) as { data: { id: number; url: string } } | null;

    if (!result?.data) return { id: "", props: {} };
    return { id: String(result.data.id), props };
  },
};

export class StrapiWebhook extends dynamic.Resource {
  public readonly webhookId!: pulumi.Output<number>;

  constructor(
    name: string,
    args: {
      strapiBaseUrl: pulumi.Input<string>;
      adminEmail: pulumi.Input<string>;
      adminPassword: pulumi.Input<string>;
      webhookName: pulumi.Input<string>;
      targetUrl: pulumi.Input<string>;
      events: pulumi.Input<string[]>;
    },
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      strapiWebhookProvider,
      name,
      { webhookId: undefined, ...args },
      opts
    );
  }
}
