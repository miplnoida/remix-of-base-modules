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

/**
 * Check if the Turnstile API is fully functional (not a stub/partial load).
 */
function isTurnstileFullyAvailable(): boolean {
  return !!(
    window.turnstile &&
    typeof window.turnstile.render === 'function' &&
    typeof window.turnstile.execute === 'function' &&
    typeof window.turnstile.reset === 'function'
  );
}

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load the Turnstile script
  useEffect(() => {
    if (scriptLoadedRef.current || document.querySelector(`script[src*="turnstile"]`)) {
      // Script tag exists — wait for full API
      const checkInterval = setInterval(() => {
        if (isTurnstileFullyAvailable()) {
          setIsReady(true);
          setIsAvailable(true);
          scriptLoadedRef.current = true;
          clearInterval(checkInterval);
        }
      }, 200);
      // Timeout after 5s — mark ready but unavailable
      setTimeout(() => {
        clearInterval(checkInterval);
        scriptLoadedRef.current = true;
        setIsReady(true);
        if (!isTurnstileFullyAvailable()) {
          console.warn('[Turnstile] Script loaded but API not fully available (preview/iframe restriction)');
          setIsAvailable(false);
        }
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      // Give the API a moment to initialize
      setTimeout(() => {
        const available = isTurnstileFullyAvailable();
        setIsAvailable(available);
        setIsReady(true);
        if (!available) {
          console.warn('[Turnstile] Script loaded but API not fully functional');
        }
      }, 500);
    };
    script.onerror = () => {
      console.warn('[Turnstile] Failed to load script — login will proceed without verification');
      setIsReady(true);
      setIsAvailable(false);
      scriptLoadedRef.current = true;
    };
    document.head.appendChild(script);
  }, []);

  // Render the invisible widget once ready and available
  useEffect(() => {
    if (!isReady || !isAvailable || !containerRef.current) return;
    if (widgetIdRef.current) return;

    try {
      const id = window.turnstile!.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (tkn: string) => {
          // Clear safety timeout
          const ref = containerRef as React.MutableRefObject<HTMLDivElement | null> & { _timeoutId?: ReturnType<typeof setTimeout> };
          if (ref._timeoutId) { clearTimeout(ref._timeoutId); ref._timeoutId = undefined; }
          setToken(tkn);
          setError(null);
        },
        'error-callback': () => {
          // Clear safety timeout
          const ref = containerRef as React.MutableRefObject<HTMLDivElement | null> & { _timeoutId?: ReturnType<typeof setTimeout> };
          if (ref._timeoutId) { clearTimeout(ref._timeoutId); ref._timeoutId = undefined; }
          setError('Verification failed. Please try again.');
          setToken(null);
        },
        'expired-callback': () => {
          setToken(null);
        },
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.warn('[Turnstile] Failed to render widget:', err);
      setIsAvailable(false);
    }
  }, [isReady, isAvailable]);

  // Execute verification (call on form submit)
  const execute = useCallback(() => {
    setToken(null);
    setError(null);

    if (!isTurnstileFullyAvailable() || !containerRef.current) {
      // Not available — signal immediately via error so caller can proceed without
      setError('turnstile-unavailable');
      return;
    }

    try {
      // Reset first, then execute after a short delay to avoid "already executing" state
      if (widgetIdRef.current) {
        window.turnstile!.reset(widgetIdRef.current);
      }

      // Slight delay after reset to allow widget to return to idle state
      setTimeout(() => {
        try {
          if (widgetIdRef.current) {
            window.turnstile!.execute(widgetIdRef.current);
          } else if (containerRef.current) {
            window.turnstile!.execute(containerRef.current);
          } else {
            setError('turnstile-unavailable');
          }
        } catch (err) {
          console.warn('[Turnstile] Execute (delayed) failed:', err);
          setError('turnstile-unavailable');
        }
      }, 100);

      // Safety timeout: if turnstile doesn't respond in 8s, unblock login
      const timeoutId = setTimeout(() => {
        setError('turnstile-unavailable');
        console.warn('[Turnstile] Timed out waiting for response — proceeding without verification');
      }, 8000);

      // Store timeout ID so we can clear it if token/error arrives
      (containerRef as React.MutableRefObject<HTMLDivElement | null> & { _timeoutId?: ReturnType<typeof setTimeout> })._timeoutId = timeoutId;
    } catch (err) {
      console.warn('[Turnstile] Execute failed:', err);
      setError('turnstile-unavailable');
    }
  }, []);

  // Reset the widget
  const reset = useCallback(() => {
    setToken(null);
    setError(null);
    if (isTurnstileFullyAvailable() && widgetIdRef.current) {
      try {
        window.turnstile!.reset(widgetIdRef.current);
      } catch { /* noop */ }
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

  return { token, error, isReady, isAvailable, execute, reset, containerRef };
}
