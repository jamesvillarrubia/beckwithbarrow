/**
 * Pure builder for schema.org Article JSON-LD used on press article pages.
 */

import { SITE_NAME } from '../config/site';

interface ArticleInput {
  title: string;
  cover?: {
    url: string;
  };
}

export interface ArticleJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  url: string;
  publisher: {
    '@type': 'Organization';
    name: string;
  };
  image?: string;
}

/**
 * Build an Article JSON-LD object for a press article.
 * Omits `image` when the article has no cover.
 */
export function buildArticleJsonLd(article: ArticleInput, url: string): ArticleJsonLd {
  const jsonLd: ArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };

  if (article.cover?.url) {
    jsonLd.image = article.cover.url;
  }

  return jsonLd;
}
