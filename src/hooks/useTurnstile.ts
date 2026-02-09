import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACZ0HQSt_zV47yKd';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      execute: (container: string | HTMLElement, options?: Record<string, unknown>) => void;
    };
  }
}

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load the Turnstile script
  useEffect(() => {
    if (scriptLoadedRef.current || document.querySelector(`script[src*="turnstile"]`)) {
      if (window.turnstile) {
        setIsReady(true);
        scriptLoadedRef.current = true;
      }
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      setIsReady(true);
    };
    script.onerror = () => {
      setError('Failed to load verification service');
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount — it's shared
    };
  }, []);

  // Render the invisible widget once ready
  useEffect(() => {
    if (!isReady || !window.turnstile || !containerRef.current) return;
    if (widgetIdRef.current) return; // Already rendered

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (tkn: string) => {
          setToken(tkn);
          setError(null);
        },
        'error-callback': () => {
          setError('Verification failed. Please try again.');
          setToken(null);
        },
        'expired-callback': () => {
          setToken(null);
        },
      });
      widgetIdRef.current = id;
    } catch {
      setError('Failed to initialize verification');
    }
  }, [isReady]);

  // Execute verification (call on form submit)
  const execute = useCallback(() => {
    setToken(null);
    setError(null);

    if (!window.turnstile || !containerRef.current) {
      setError('Verification not ready');
      return;
    }

    // Reset and re-execute
    if (widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    window.turnstile.execute(containerRef.current);
  }, []);

  // Reset the widget
  const reset = useCallback(() => {
    setToken(null);
    setError(null);
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return { token, error, isReady, execute, reset, containerRef };
}
