import { describe, it, expect } from 'vitest';
import { findHeadingOrderViolations, getHeadingLevels } from './headingOrder';

describe('findHeadingOrderViolations', () => {
  it('accepts an empty outline', () => {
    expect(findHeadingOrderViolations([])).toEqual([]);
  });

  it('accepts a well-formed outline', () => {
    expect(findHeadingOrderViolations([1, 2, 3, 3, 2, 3])).toEqual([]);
  });

  it('flags an outline that does not start at h1', () => {
    expect(findHeadingOrderViolations([3, 4])).toEqual([
      'first heading is h3, expected h1',
    ]);
  });

  it('flags a skipped level going down', () => {
    expect(findHeadingOrderViolations([1, 3])).toEqual([
      'h1 is followed by h3 (skipped h2)',
    ]);
  });

  it('allows jumping back up any number of levels', () => {
    expect(findHeadingOrderViolations([1, 2, 3, 4, 1])).toEqual([]);
  });

  it('reports every violation, not just the first', () => {
    expect(findHeadingOrderViolations([2, 4, 6])).toHaveLength(3);
  });
});

describe('getHeadingLevels', () => {
  it('reads levels in document order', () => {
    const root = document.createElement('div');
    root.innerHTML = '<h1>a</h1><section><h2>b</h2><h4>c</h4></section>';
    expect(getHeadingLevels(root)).toEqual([1, 2, 4]);
  });

  it('ignores non-heading elements', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>a</p><div>b</div>';
    expect(getHeadingLevels(root)).toEqual([]);
  });
});
