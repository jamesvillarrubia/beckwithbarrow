import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PressArticlePage from './PressArticlePage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);

describe('PressArticlePage <Seo>', () => {
  beforeEach(() => {
    mockedUseQuery.mockReturnValue({
      data: { data: [{ id: 1, title: 'Foo', slug: 'foo', showExternal: false }] },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>);
  });

  it('builds the article title from the fetched article', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/press/foo']}>
          <Routes>
            <Route path="/press/:slug" element={<PressArticlePage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() =>
      expect(document.title).toBe('Foo | Press | Beckwith Barrow')
    );
  });
});
