#!/usr/bin/env tsx
/**
 * Layer B — stdio transport.
 *
 * Spawned by the MCP client, talks over stdin/stdout, dies with the session. Not a
 * network service: the token never leaves this machine.
 *
 * The tools themselves live in server.ts, shared with the hosted HTTP transport, so the
 * two can never drift apart in what they expose or what they permit.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { buildServer } from './server.js';

// Resolve the repo root from this file's location, not cwd: the MCP client chooses the
// working directory it spawns us in.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');

/**
 * Load the token from packages/cms-client/.env.
 *
 * The MCP client spawns this without a shell, so nothing else sources that file. Never
 * logged: stdout is the JSON-RPC channel, and stray output there corrupts the session.
 */
async function loadTokenEnv(): Promise<void> {
  try {
    const text = await readFile(
      path.join(REPO_ROOT, 'packages', 'cms-client', '.env'),
      'utf8',
    );
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      const name = key?.trim();
      if (name && !process.env[name]) {
        process.env[name] = rest.join('=').trim().replace(/^[\'"]|[\'"]$/g, '');
      }
    }
  } catch {
    // Absent .env is fine: read tools work token-free, and cms_write reports a clear
    // error rather than writing unauthenticated.
  }
}

await loadTokenEnv();
await buildServer({ repoRoot: REPO_ROOT }).connect(new StdioServerTransport());
