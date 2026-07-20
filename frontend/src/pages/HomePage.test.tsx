import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from './HomePage';

// Mock react-query so the page renders synchronously with controlled data.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

// Stub heavy presentational children so the test stays focused on <Seo>.
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

describe('HomePage <Seo>', () => {
  beforeEach(() => {
    mockedUseQuery.mockReturnValue({
      data: { data: { title: 'Home', projects: [] } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>);
  });

  it('sets the document title to the Home SEO title', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <HomePage />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() =>
      expect(document.title).toBe(
        'Beckwith Barrow Interior Design | The Berkshires & Boston'
      )
    );
  });
});
