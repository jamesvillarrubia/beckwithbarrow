#!/usr/bin/env node
// READ-ONLY guardrail: GETs Cloudinary's usage report and decides whether usage
// has crossed a percent threshold. Never mutates anything. Exits 0 regardless so
// it never fails the workflow; it communicates via GITHUB_OUTPUT (over/title/body).
import { appendFileSync } from 'node:fs';
import { evaluateUsage } from './lib/usage.mjs';

const NAME = process.env.CLOUDINARY_NAME;
const KEY = process.env.CLOUDINARY_KEY;
const SECRET = process.env.CLOUDINARY_SECRET;
const THRESHOLD = Number(process.env.THRESHOLD_PCT ?? '80');

function setOutput(pairs) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return; // local run — nothing to write
  let out = '';
  for (const [k, v] of Object.entries(pairs)) {
    if (String(v).includes('\n')) {
      out += `${k}<<__EOF__\n${v}\n__EOF__\n`;
    } else {
      out += `${k}=${v}\n`;
    }
  }
  appendFileSync(file, out);
}

function fmt(n) {
  if (n == null) return 'n/a';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return String(n);
}

async function main() {
  if (!NAME || !KEY || !SECRET) {
    console.error('Missing CLOUDINARY_NAME/KEY/SECRET');
    process.exit(1);
  }
  const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${NAME}/usage`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    console.error(`Cloudinary usage API -> ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const usage = await res.json();
  const { over, worst, metrics } = evaluateUsage(usage, THRESHOLD);

  console.log(`Cloudinary usage (threshold ${THRESHOLD}%):`);
  for (const m of metrics) {
    console.log(`  ${m.name.padEnd(16)} ${m.pct.toFixed(1)}%  (${fmt(m.usage)} / ${fmt(m.limit)})`);
  }
  console.log(over ? `OVER THRESHOLD on "${worst.name}"` : 'within limits');

  const title = `⚠️ Cloudinary usage at ${worst ? worst.pct.toFixed(0) : '?'}% (${worst?.name ?? 'unknown'})`;
  const body = [
    `Automated guardrail: Cloudinary usage crossed **${THRESHOLD}%** of the free tier.`,
    '',
    '| Metric | Used % | Usage | Limit |',
    '| --- | --- | --- | --- |',
    ...metrics.map((m) => `| ${m.name} | ${m.pct.toFixed(1)}% | ${fmt(m.usage)} | ${fmt(m.limit)} |`),
    '',
    'First suspect is a job re-downloading originals (see the Weekly Safety Backup / `safe-backup.mjs`).',
    'Check the Cloudinary delivery report: `node` browser + "No Referral Domain" = a script, not visitors.',
  ].join('\n');

  setOutput({ over: String(over), title, body });
}

main().catch((e) => { console.error(e); process.exit(1); });
