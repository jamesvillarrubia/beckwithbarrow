/**
 * webhooks.ts
 *
 * Pulumi dynamic resource for:
 *  - Vercel Deploy Hook  (triggers a rebuild when Strapi publishes content)
 *
 * The Strapi webhook is registered manually once in the Strapi admin UI:
 *   Settings → Webhooks → Add webhook
 *   URL: <deployHookUrl from `pulumi stack output deployHookUrl --show-secrets`>
 *   Events: Entry (publish, unpublish), Media (create, delete)
 *
 * The Vercel API token is read from the VERCEL_API_TOKEN environment variable
 * INSIDE the provider functions — never as a resource input. Passing it as an
 * input serialized a secret-wrapped value into the dynamic provider, which
 * failed with "Unexpected struct type", and storing the token in state/diffs
 * is exactly what we want to avoid. Reading it from the environment keeps it
 * out of both.
 */

import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The same env var the @pulumiverse/vercel provider already uses. */
function requireToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error(
      "VERCEL_API_TOKEN is not set — the deploy-hook provider needs it to call the Vercel API."
    );
  }
  return token;
}

async function vercelFetch(
  path: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
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
      "DELETE"
    );
  },

  async read(id: string, props: VercelDeployHookOutputs): Promise<dynamic.ReadResult> {
    const hooks = await vercelFetch(
      `/v1/projects/${props.projectId}/deploy-hooks`,
      "GET"
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
    },
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      vercelDeployHookProvider,
      name,
      { hookId: undefined, hookUrl: undefined, ...args },
      {
        ...opts,
        // The hook URL is a deploy trigger — anyone with it can force a
        // production rebuild — so keep it out of plaintext diffs and state.
        additionalSecretOutputs: [
          "hookUrl",
          ...(opts?.additionalSecretOutputs ?? []),
        ],
      }
    );
  }
}
