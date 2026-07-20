import { describe, it, expect } from 'vitest';
import { evaluateUsage } from './usage.mjs';

// Shape mirrors Cloudinary GET /v1_1/{cloud}/usage: each metric carries
// { usage, limit, used_percent } (used_percent may be absent on some plans).
const under = {
  credits: { usage: 3, limit: 25, used_percent: 12 },
  bandwidth: { usage: 3_000_000_000, limit: 26_843_545_600, used_percent: 11 },
  storage: { usage: 900_000_000, limit: 26_843_545_600, used_percent: 3 },
};

describe('evaluateUsage', () => {
  it('is not over threshold when every metric is well below it', () => {
    const r = evaluateUsage(under, 80);
    expect(r.over).toBe(false);
    expect(r.worst.name).toBe('credits'); // highest pct among the metrics
    expect(Math.round(r.worst.pct)).toBe(12);
  });

  it('flags over-threshold on the worst metric (credits at/above limit)', () => {
    const spiked = { ...under, credits: { usage: 26, limit: 25, used_percent: 104 } };
    const r = evaluateUsage(spiked, 80);
    expect(r.over).toBe(true);
    expect(r.worst.name).toBe('credits');
    expect(r.worst.pct).toBe(104);
  });

  it('derives used_percent from usage/limit when the field is absent', () => {
    const noPct = { bandwidth: { usage: 24_000_000_000, limit: 26_843_545_600 } };
    const r = evaluateUsage(noPct, 80);
    expect(r.over).toBe(true);
    expect(Math.round(r.worst.pct)).toBe(89);
  });

  it('respects a custom threshold', () => {
    expect(evaluateUsage(under, 10).over).toBe(true);  // credits 12% >= 10%
    expect(evaluateUsage(under, 50).over).toBe(false);
  });

  it('returns not-over with no metrics when usage is empty/unknown', () => {
    const r = evaluateUsage({}, 80);
    expect(r.over).toBe(false);
    expect(r.metrics).toEqual([]);
    expect(r.worst).toBeNull();
  });
});
