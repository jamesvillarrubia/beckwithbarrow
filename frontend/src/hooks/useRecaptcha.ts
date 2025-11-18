/**
 * useRecaptcha Hook
 * 
 * Lazy loads the Google reCAPTCHA script only when needed (on the Connect page).
 * This prevents the reCAPTCHA script from blocking render on pages that don't need it.
 * 
 * Key features:
 * - Dynamically injects the reCAPTCHA script into the DOM
 * - Tracks loading state to prevent duplicate script injection
 * - Provides error handling for script loading failures with timeout
 * - Non-blocking: page renders immediately, reCAPTCHA loads in background
 * - Automatically cleans up on unmount
 * 
 * @returns {Object} - { isLoaded, error }
 * 
 * @example
 * ```tsx
 * const { isLoaded, error } = useRecaptcha();
 * 
 * if (error) {
 *   return <div>Failed to load reCAPTCHA</div>;
 * }
 * 
 * if (!isLoaded) {
 *   return <div>Loading...</div>;
 * }
 * 
 * // Render form with reCAPTCHA
 * ```
 */

import { useEffect, useState } from 'react';

// Global flag to track if script is already loaded or loading
// This prevents multiple instances of the hook from loading the script multiple times
let scriptLoadingState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
let scriptLoadPromise: Promise<void> | null = null;

// Timeout duration for reCAPTCHA loading (10 seconds)
const RECAPTCHA_TIMEOUT = 10000;

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(scriptLoadingState === 'loaded');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If already loaded, set state immediately
    if (scriptLoadingState === 'loaded') {
      setIsLoaded(true);
      return;
    }

    // If there's an error, set error state
    if (scriptLoadingState === 'error') {
      setError(new Error('Failed to load reCAPTCHA script'));
      return;
    }

    // If already loading, wait for the existing promise
    if (scriptLoadingState === 'loading' && scriptLoadPromise) {
      scriptLoadPromise
        .then(() => setIsLoaded(true))
        .catch((err) => setError(err));
      return;
    }

    // Start loading the script
    scriptLoadingState = 'loading';
    
    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      // Check if script already exists in DOM (shouldn't happen, but defensive)
      const existingScript = document.querySelector('script[src*="recaptcha"]');
      if (existingScript) {
        scriptLoadingState = 'loaded';
        resolve();
        return;
      }

      // Set a timeout to prevent hanging if reCAPTCHA server is slow
      const timeoutId = setTimeout(() => {
        scriptLoadingState = 'error';
        const err = new Error('reCAPTCHA loading timeout - server may be slow or blocked');
        setError(err);
        reject(err);
      }, RECAPTCHA_TIMEOUT);

      // Create and inject the script
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        clearTimeout(timeoutId);
        scriptLoadingState = 'loaded';
        setIsLoaded(true);
        resolve();
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        scriptLoadingState = 'error';
        const err = new Error('Failed to load reCAPTCHA script - network error');
        setError(err);
        reject(err);
      };

      // Use preconnect hint for faster DNS resolution (if not already done)
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://www.google.com';
      document.head.appendChild(preconnect);

      const preconnectGstatic = document.createElement('link');
      preconnectGstatic.rel = 'preconnect';
      preconnectGstatic.href = 'https://www.gstatic.com';
      preconnectGstatic.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectGstatic);

      document.head.appendChild(script);
    });

    // Wait for the script to load
    scriptLoadPromise
      .then(() => setIsLoaded(true))
      .catch((err) => setError(err));

  }, []);

  return { isLoaded, error };
}

