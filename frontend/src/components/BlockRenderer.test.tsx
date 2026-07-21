import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BlockRenderer from './BlockRenderer';
import { getHeadingLevels } from '../utils/headingOrder';

/**
 * CMS-authored rich text is markdown, so `# Foo` would naturally render as an
 * <h1>. Press article and project pages already own the page's single <h1>
 * (the entry title), so CMS headings are shifted down one level: the author's
 * "top level heading" becomes <h2>, and so on. Ardis's editing experience is
 * unchanged — only the emitted markup differs.
 */
const richText = (body: string) => [
  { __component: 'shared.rich-text' as const, id: 1, body },
];

const quote = [
  {
    __component: 'shared.quote' as const,
    id: 2,
    quoteText: 'A room should never allow the eye to settle.',
    name: 'Albert Hadley',
  },
];

describe('BlockRenderer heading levels', () => {
  it('renders a markdown h1 as h2 so it cannot compete with the page title', () => {
    const { container } = render(<BlockRenderer blocks={richText('# Top')} />);
    expect(getHeadingLevels(container)).toEqual([2]);
  });

  it('shifts every markdown heading level down by one', () => {
    const { container } = render(
      <BlockRenderer blocks={richText('# One\n\n## Two\n\n### Three')} />
    );
    expect(getHeadingLevels(container)).toEqual([2, 3, 4]);
  });

  it('never emits an h1 from CMS content', () => {
    const { container } = render(
      <BlockRenderer blocks={richText('# One\n\n## Two')} />
    );
    expect(container.querySelectorAll('h1')).toHaveLength(0);
  });

  it('renders a quote block at h2, not h3', () => {
    const { container } = render(<BlockRenderer blocks={quote} />);
    expect(getHeadingLevels(container)).toEqual([2]);
  });

  it('still renders the heading text itself', () => {
    const { container } = render(<BlockRenderer blocks={richText('# Top')} />);
    expect(container.textContent).toContain('Top');
  });
});
