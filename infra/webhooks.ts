/**
 * webhooks.ts
 *
 * Pulumi dynamic resource for:
 *  - Vercel Deploy Hook  (triggers a rebuild when Strapi publishes content)
 *
 * The Strapi webhook is registered manually once in the Strapi admin UI:
 *   Settings → Webhooks → Add webhook
 *   URL: <deployHookUrl from `pulumi stack output deployHookUrl`>
 *   Events: Entry (publish, unpublish), Media (create, delete)
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
      {
        ...opts,
        // Without this the token is a plain input: Pulumi renders it in clear
        // text in every `preview`/`up` diff (so it lands in CI logs) and stores
        // it unencrypted in stack state. The hook URL is a deploy trigger, so
        // it is treated as a secret too.
        additionalSecretOutputs: [
          "apiToken",
          "hookUrl",
          ...(opts?.additionalSecretOutputs ?? []),
        ],
      }
    );
  }
}

