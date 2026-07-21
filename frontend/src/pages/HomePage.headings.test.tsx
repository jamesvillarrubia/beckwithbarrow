import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from './HomePage';
import { findHeadingOrderViolations, getHeadingLevels } from '../utils/headingOrder';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));

// Stub children that carry no headings of their own. ProjectGrid IS stubbed —
// its heading level is covered by ProjectBlock's own test.
vi.mock('../components/Navigation', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('../components/ProjectGrid', () => ({ default: () => null }));
vi.mock('../components/Logo', () => ({ default: () => null }));
vi.mock('../components/OptimizedImage', () => ({ default: () => null }));
vi.mock('../components/AnimatedSection', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('../hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => ({ globalSettings: {}, lightThemeColor: '#000' }),
}));

const mockedUseQuery = vi.mocked(useQuery);

describe('HomePage heading outline', () => {
  beforeEach(() => {
    mockedUseQuery.mockReturnValue({
      data: { data: { title: 'Home', projects: [] } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>);
  });

  const renderHome = () =>
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      </HelmetProvider>
    );

  it('has exactly one h1', () => {
    const { container } = renderHome();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('names the firm in the h1 for screen readers', () => {
    const { container } = renderHome();
    expect(container.querySelector('h1')?.textContent).toContain(
      'Beckwith Barrow'
    );
  });

  it('does not skip heading levels', () => {
    const { container } = renderHome();
    expect(findHeadingOrderViolations(getHeadingLevels(container))).toEqual([]);
  });
});
