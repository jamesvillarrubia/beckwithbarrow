import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Seo from './Seo';

describe('Seo', () => {
  it('renders title, meta, canonical, og tags, and json-ld', async () => {
    render(
      <HelmetProvider>
        <Seo
          title="About | X"
          description="d"
          canonicalPath="/about"
          jsonLd={{ '@type': 'WebSite' }}
        />
      </HelmetProvider>
    );

    await waitFor(() => expect(document.title).toBe('About | X'));

    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content')
    ).toBe('d');

    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://beckwithbarrow.com/about');

    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    ).toBe('About | X');

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const parsed = JSON.parse(script?.textContent ?? '{}');
    expect(parsed['@type']).toBe('WebSite');
  });

  it('does not emit a robots meta when noindex is not set', async () => {
    render(
      <HelmetProvider>
        <Seo title="Home | X" description="d" canonicalPath="/" />
      </HelmetProvider>
    );

    await waitFor(() => expect(document.title).toBe('Home | X'));

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('emits a noindex robots meta when noindex is set', async () => {
    render(
      <HelmetProvider>
        <Seo title="Not Found | X" description="d" canonicalPath="/missing" noindex />
      </HelmetProvider>
    );

    await waitFor(() => expect(document.title).toBe('Not Found | X'));

    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content')
    ).toBe('noindex, follow');
  });
});
