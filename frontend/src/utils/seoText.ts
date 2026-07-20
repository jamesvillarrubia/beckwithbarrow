/**
 * Helpers for producing clean, length-bounded text for SEO meta tags.
 */

/**
 * Strip a light subset of Markdown / HTML markup and collapse whitespace so a
 * body of rich text can be reused as a plain-text meta description.
 */
const stripMarkup = (text: string): string =>
  text
    // Markdown links / images: [label](url) or ![alt](url) -> label / alt
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // HTML tags
    .replace(/<[^>]+>/g, '')
    // Emphasis, headings, blockquotes, list bullets, inline code, etc.
    .replace(/[*_`~#>]/g, '')
    // Collapse all whitespace (including newlines) to single spaces
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Truncate text to at most `max` characters, breaking on a word boundary and
 * appending an ellipsis when the input is longer. Markdown/HTML is stripped and
 * whitespace collapsed first. Returns an empty string for nullish input.
 *
 * The returned string (including the ellipsis) never exceeds `max` characters.
 */
export const truncateForMeta = (
  text: string | null | undefined,
  max = 155
): string => {
  const clean = stripMarkup(text ?? '');
  if (clean.length <= max) return clean;

  // Reserve one character for the ellipsis.
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const truncated = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${truncated.trimEnd()}…`;
};
