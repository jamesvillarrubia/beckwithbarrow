import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectBlock from './ProjectBlock';
import { getHeadingLevels } from '../utils/headingOrder';

vi.mock('./OptimizedImage', () => ({ default: () => null }));
vi.mock('../hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => ({ globalSettings: {}, lightThemeColor: '#000' }),
}));

const project = { id: 1, title: 'Berkshire Farmhouse', slug: 'berkshire-farmhouse' };

const renderBlock = () =>
  render(
    <MemoryRouter>
      <ProjectBlock project={project} number={1} />
    </MemoryRouter>
  );

describe('ProjectBlock headings', () => {
  /**
   * Project titles sit under the page h1 and the section h2, so they must be
   * h3. They were h5, which put a two-level gap in every page that renders a
   * project grid (the 2026-07-20 audit's `heading-order` finding).
   */
  it('renders project titles at heading level 3', () => {
    const { container } = renderBlock();
    const levels = getHeadingLevels(container);
    expect(levels.length).toBeGreaterThan(0);
    expect(new Set(levels)).toEqual(new Set([3]));
  });

  it('renders the project title text', () => {
    const { container } = renderBlock();
    expect(container.textContent).toContain('Berkshire Farmhouse');
  });
});
