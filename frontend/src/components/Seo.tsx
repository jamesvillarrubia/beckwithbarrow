/**
 * Seo Component
 *
 * Reusable head/meta manager built on react-helmet-async. Emits the title,
 * meta description, canonical link, Open Graph, Twitter Card tags, and an
 * optional JSON-LD structured-data script for a given page.
 */

import { Helmet } from 'react-helmet-async';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../config/site';

export interface SeoProps {
  /** Used verbatim as the document title and og:title. */
  title: string;
  /** Meta description and og:description. */
  description: string;
  /** Path portion of the canonical URL, e.g. "/about". */
  canonicalPath: string;
  /** Absolute URL of the social share image. Defaults to DEFAULT_OG_IMAGE. */
  ogImage?: string;
  /** Open Graph type. Defaults to "website". */
  type?: string;
  /** Structured data rendered as an application/ld+json script. */
  jsonLd?: object | object[];
}

const Seo = ({
  title,
  description,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  type = 'website',
  jsonLd,
}: SeoProps) => {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* Structured data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default Seo;
