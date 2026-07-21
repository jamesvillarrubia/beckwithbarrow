/**
 * Heading-order checking, matching the rule Lighthouse/axe enforce in their
 * `heading-order` audit: headings must not skip a level going down.
 *
 * The 2026-07-20 SEO audit flagged the live homepage for this (Accessibility
 * 98) — the page opened at `h3` with no `h1` above it.
 */

/** Extract heading levels, in document order, from a rendered subtree. */
export function getHeadingLevels(root: ParentNode): number[] {
  return Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
    (el) => Number(el.tagName[1])
  );
}

/**
 * Returns a human-readable violation for each place the heading outline breaks.
 * An empty array means the outline is valid.
 */
export function findHeadingOrderViolations(levels: number[]): string[] {
  const violations: string[] = [];
  if (levels.length === 0) return violations;

  const [first] = levels;
  if (first !== 1) {
    violations.push(`first heading is h${first}, expected h1`);
  }

  for (let i = 1; i < levels.length; i += 1) {
    const previous = levels[i - 1] as number;
    const current = levels[i] as number;
    if (current > previous + 1) {
      violations.push(
        `h${previous} is followed by h${current} (skipped h${previous + 1})`
      );
    }
  }

  return violations;
}
