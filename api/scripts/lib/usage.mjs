// Pure evaluation of a Cloudinary usage report — no network, no fs. Easy to unit test.

const METRICS = ['credits', 'bandwidth', 'storage', 'transformations'];

/** Percent used for one metric block, deriving it from usage/limit if absent. */
function toPct(block) {
  if (!block) return null;
  if (typeof block.used_percent === 'number') return block.used_percent;
  if (typeof block.usage === 'number' && block.limit) return (block.usage / block.limit) * 100;
  return null;
}

/**
 * Evaluate a Cloudinary `GET /usage` response against a percent threshold.
 * Considers credits/bandwidth/storage/transformations and reports the WORST
 * (highest-percent) metric, so a spike in any dimension trips the guardrail.
 *
 * @param {object} usage - parsed usage response
 * @param {number} thresholdPct - trip at or above this percent (default 80)
 * @returns {{ over: boolean, worst: object|null, metrics: object[], thresholdPct: number }}
 */
export function evaluateUsage(usage, thresholdPct = 80) {
  const metrics = [];
  for (const name of METRICS) {
    const pct = toPct(usage?.[name]);
    if (pct != null) {
      metrics.push({ name, pct, usage: usage[name].usage ?? null, limit: usage[name].limit ?? null });
    }
  }
  const worst = metrics.reduce((a, b) => (a == null || b.pct > a.pct ? b : a), null);
  const over = worst != null && worst.pct >= thresholdPct;
  return { over, worst, metrics, thresholdPct };
}
