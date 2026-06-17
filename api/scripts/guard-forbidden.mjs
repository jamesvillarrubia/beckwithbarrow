#!/usr/bin/env node
// Refuses to run destructive Strapi operations unless a human sets an explicit,
// one-time override. These operations can sever or destroy DB->Cloudinary links.
const op = process.argv[2] ?? 'unknown';
const OVERRIDE = 'I_UNDERSTAND_THIS_CAN_DESTROY_PRODUCTION_DATA';

const messages = {
  restore: 'strapi import OVERWRITES the target database and can delete media.',
  'transfer': 'strapi transfer WIPES the destination (deleting Cloudinary assets).',
};

console.error(`\n  ⛔ BLOCKED: "${op}" is a destructive operation.`);
console.error(`     ${messages[op] ?? 'This command can cause irreversible data loss.'}`);
console.error(`     It must NEVER be run by an AI agent or autonomously.`);
console.error(`     See docs/RESTORE-RUNBOOK.md for the supervised manual procedure.\n`);

if (process.env.STRAPI_DESTRUCTIVE_OVERRIDE !== OVERRIDE) {
  console.error(`     To proceed (humans only), re-run with:`);
  console.error(`       STRAPI_DESTRUCTIVE_OVERRIDE='${OVERRIDE}' <command>\n`);
  process.exit(1);
}
console.error(`     Override present. A human has accepted the risk. Proceeding is still manual.\n`);
process.exit(2); // never auto-chains into the destructive command
