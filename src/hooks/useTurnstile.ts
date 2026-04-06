import { useEffect, useRef, useState, useCallback } from 'react';
import { isLovableEditorPreview } from '@/lib/runtimeEnvironment';

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
  const shouldBypassTurnstile = isLovableEditorPreview();
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);
  const availabilityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const availabilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingRef = useRef(false);

  const clearAvailabilityWatchers = useCallback(() => {
    if (availabilityCheckIntervalRef.current) {
      clearInterval(availabilityCheckIntervalRef.current);
      availabilityCheckIntervalRef.current = null;
    }

    if (availabilityTimeoutRef.current) {
      clearTimeout(availabilityTimeoutRef.current);
      availabilityTimeoutRef.current = null;
    }
  }, []);

  const clearExecutionState = useCallback((nextError?: string | null) => {
    if (executeTimeoutRef.current) {
      clearTimeout(executeTimeoutRef.current);
      executeTimeoutRef.current = null;
    }

    isExecutingRef.current = false;

    if (nextError !== undefined) {
      setError(nextError);
    }
  }, []);

  // Load the Turnstile script
  useEffect(() => {
    if (shouldBypassTurnstile) {
      setIsReady(true);
      setIsAvailable(false);
      return;
    }

    if (scriptLoadedRef.current || document.querySelector(`script[src*="turnstile"]`)) {
      // Script tag exists — wait for full API
      availabilityCheckIntervalRef.current = setInterval(() => {
        if (isTurnstileFullyAvailable()) {
          setIsReady(true);
          setIsAvailable(true);
          scriptLoadedRef.current = true;
          clearAvailabilityWatchers();
        }
      }, 200);

      // Timeout after 5s — mark ready but unavailable
      availabilityTimeoutRef.current = setTimeout(() => {
        scriptLoadedRef.current = true;
        setIsReady(true);
        if (!isTurnstileFullyAvailable()) {
          console.warn('[Turnstile] Script loaded but API not fully available (preview/iframe restriction)');
          setIsAvailable(false);
        }
      }, 5000);

      return clearAvailabilityWatchers;
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

    return clearAvailabilityWatchers;
  }, [clearAvailabilityWatchers, shouldBypassTurnstile]);

  // Render the invisible widget once ready and available
  useEffect(() => {
    if (shouldBypassTurnstile || !isReady || !isAvailable || !containerRef.current) return;
    if (widgetIdRef.current) return;

    try {
      const id = window.turnstile!.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (tkn: string) => {
          clearExecutionState(null);
          setToken(tkn);
        },
        'error-callback': () => {
          clearExecutionState('Verification failed. Please try again.');
          setToken(null);
        },
        'expired-callback': () => {
          clearExecutionState(null);
          setToken(null);
        },
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.warn('[Turnstile] Failed to render widget:', err);
      setIsAvailable(false);
    }
  }, [clearExecutionState, isReady, isAvailable, shouldBypassTurnstile]);

  // Execute verification (call on form submit)
  const execute = useCallback(() => {
    setToken(null);
    setError(null);

    if (shouldBypassTurnstile || !isTurnstileFullyAvailable() || !containerRef.current) {
      // Not available — signal immediately via error so caller can proceed without
      setError('turnstile-unavailable');
      return;
    }

    if (isExecutingRef.current) {
      return;
    }

    isExecutingRef.current = true;

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
            clearExecutionState('turnstile-unavailable');
          }
        } catch (err) {
          console.warn('[Turnstile] Execute (delayed) failed:', err);
          clearExecutionState('turnstile-unavailable');
        }
      }, 100);

      // Safety timeout: if turnstile doesn't respond quickly, unblock login
      executeTimeoutRef.current = setTimeout(() => {
        clearExecutionState('turnstile-unavailable');
        console.warn('[Turnstile] Timed out waiting for response — proceeding without verification');
      }, 3000);
    } catch (err) {
      console.warn('[Turnstile] Execute failed:', err);
      clearExecutionState('turnstile-unavailable');
    }
  }, [clearExecutionState, shouldBypassTurnstile]);

  // Reset the widget
  const reset = useCallback(() => {
    setToken(null);
    clearExecutionState(null);
    if (isTurnstileFullyAvailable() && widgetIdRef.current) {
      try {
        window.turnstile!.reset(widgetIdRef.current);
      } catch { /* noop */ }
    }
  }, [clearExecutionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAvailabilityWatchers();
      clearExecutionState();
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, [clearAvailabilityWatchers, clearExecutionState]);

  return { token, error, isReady, isAvailable, execute, reset, containerRef };
}
