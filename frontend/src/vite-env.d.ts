/// <reference types="vite/client" />

/**
 * Global type declarations for Google reCAPTCHA
 */
interface Window {
  grecaptcha: {
    render: (container: string | HTMLElement, parameters: {
      sitekey: string;
      size?: 'normal' | 'compact' | 'invisible';
      theme?: 'light' | 'dark';
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    }) => number;
    execute: (widgetId: number) => void;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
  };
}
