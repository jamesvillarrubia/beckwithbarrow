/**
 * Cache Configuration Constants
 * 
 * Centralized cache version management.
 * Increment CACHE_VERSION whenever you make breaking changes to:
 * - API response structures
 * - Populate parameters
 * - Data schemas
 * 
 * This will automatically invalidate old caches and force fresh data fetch
 */

export const CACHE_VERSION = 'v5';
export const CACHE_KEY = `beckwithbarrow-cache-${CACHE_VERSION}`;



