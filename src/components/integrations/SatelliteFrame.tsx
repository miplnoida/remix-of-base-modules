import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  PROTOCOL_VERSION,
  PROTOCOL_SOURCE_HOST,
  PROTOCOL_SOURCE_SAT,
  isProtocolMessage,
  type SatelliteAppId,
  type InitPayload,
  type NavigatePayload,
  type NotifyPayload,
  type ThemeChangePayload,
  type TokenRefreshPayload,
} from '@/lib/embed/satelliteProtocol';
import {
  getAuditHubAllowedOrigins,
  getAuditHubUrl,
  getComplianceHubAllowedOrigins,
  getComplianceHubUrl,
} from '@/lib/embed/satelliteRouting';

interface SatelliteFrameProps {
  app: SatelliteAppId;
  basePath: string; // e.g. "compliance-hub" — without leading slash
  title: string;
}

const READY_TIMEOUT_MS = 15_000;

const buildSrc = (baseUrl: string, theme: { key: string; isDark: boolean }, language: string, initialPath: string) => {
  if (!baseUrl) return '';
  const url = new URL(baseUrl);
  url.searchParams.set('embed', '1');
  url.searchParams.set('theme', theme.isDark ? 'dark' : 'light');
  url.searchParams.set('themeKey', theme.key);
  url.searchParams.set('lang', language);
  if (initialPath) url.searchParams.set('initialPath', initialPath);
  return url.toString();
};

const Unavailable: React.FC<{ title: string; reason: string; onRetry: () => void }> = ({ title, reason, onRetry }) => (
  <div className="flex h-full w-full items-center justify-center p-6">
    <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title} unavailable</h2>
      <p className="mb-4 text-sm text-muted-foreground">{reason}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Retry
      </button>
    </div>
  </div>
);

const SatelliteFrameInner: React.FC<SatelliteFrameProps> = ({ app, basePath, title }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { user, profile, roles, session } = useSupabaseAuth();
  const { currentTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const baseUrl = app === 'compliance' ? getComplianceHubUrl() : getAuditHubUrl();
  const allowedOrigins = useMemo(
    () => (app === 'compliance' ? getComplianceHubAllowedOrigins() : getAuditHubAllowedOrigins()),
    [app],
  );

  // Path inside the satellite (everything after /<basePath>)
  const innerPath = useMemo(() => {
    const splat = (params['*'] as string | undefined) ?? '';
    const path = '/' + splat;
    return path + (location.search || '');
  }, [params, location.search]);

  const language = 'en';

  const src = useMemo(
    () => buildSrc(baseUrl, { key: currentTheme, isDark }, language, innerPath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl, retryToken],
  );

  const targetOrigin = useMemo(() => {
    if (!baseUrl) return '*';
    try {
      return new URL(baseUrl).origin;
    } catch {
      return '*';
    }
  }, [baseUrl]);

  const postToSatellite = useCallback(
    (type: string, payload?: unknown) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        { source: PROTOCOL_SOURCE_HOST, app, v: PROTOCOL_VERSION, type, payload },
        targetOrigin || '*',
      );
    },
    [app, targetOrigin],
  );

  /* ── Send INIT once satellite signals READY ── */
  const sendInit = useCallback(() => {
    const payload: InitPayload = {
      accessToken: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      user: user
        ? { id: user.id, email: user.email ?? null, full_name: profile?.full_name ?? null }
        : null,
      roles,
      permissions: [],
      theme: { key: currentTheme, isDark },
      language,
      tenant: null,
      initialPath: innerPath,
    };
    postToSatellite('INIT', payload);
  }, [session, user, profile, roles, currentTheme, isDark, innerPath, postToSatellite]);

  /* ── Listen for messages from satellite ── */
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (allowedOrigins.length && !allowedOrigins.includes(event.origin)) return;
      const data = event.data;
      if (!isProtocolMessage(data)) return;
      if (data.source !== PROTOCOL_SOURCE_SAT || data.app !== app) return;

      switch (data.type) {
        case 'READY': {
          setReady(true);
          sendInit();
          break;
        }
        case 'NAVIGATE': {
          const { path } = (data.payload ?? {}) as NavigatePayload;
          if (typeof path === 'string') {
            const next = `/${basePath}${path.startsWith('/') ? path : `/${path}`}`;
            // Replace state so back button still works as expected
            window.history.replaceState(null, '', next);
          }
          break;
        }
        case 'NOTIFY': {
          const p = (data.payload ?? {}) as NotifyPayload;
          const fn = p.level === 'error' ? toast.error
            : p.level === 'success' ? toast.success
            : p.level === 'warning' ? toast.warning
            : toast;
          fn(p.title ?? p.message, p.title ? { description: p.message } : undefined);
          break;
        }
        case 'SESSION_EXPIRED':
        case 'LOGOUT': {
          // Defer to host's existing flow — surface a toast and let user re-auth.
          toast.warning('Session ended in embedded module. Please sign in again.');
          break;
        }
        case 'ERROR': {
          // Swallow — embedded module renders its own error UI; log for diagnostics.
          // eslint-disable-next-line no-console
          console.warn(`[SatelliteFrame:${app}] error from satellite`, data.payload);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [allowedOrigins, app, basePath, sendInit]);

  /* ── Re-INIT on token refresh ── */
  useEffect(() => {
    if (!ready) return;
    const sub = supabase.auth.onAuthStateChange((_event, sess) => {
      const payload: TokenRefreshPayload = {
        accessToken: sess?.access_token ?? null,
        refreshToken: sess?.refresh_token ?? null,
      };
      postToSatellite('TOKEN_REFRESH', payload);
    });
    return () => sub.data.subscription.unsubscribe();
  }, [ready, postToSatellite]);

  /* ── Push theme changes ── */
  useEffect(() => {
    if (!ready) return;
    const payload: ThemeChangePayload = { theme: { key: currentTheme, isDark } };
    postToSatellite('THEME_CHANGE', payload);
  }, [currentTheme, isDark, ready, postToSatellite]);

  /* ── Push host-driven navigation into satellite ── */
  useEffect(() => {
    if (!ready) return;
    postToSatellite('NAVIGATE', { path: innerPath });
  }, [innerPath, ready, postToSatellite]);

  /* ── Readiness timeout ── */
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => {
      if (!ready) setLoadFailed(true);
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [ready, retryToken]);

  const handleRetry = () => {
    setReady(false);
    setLoadFailed(false);
    setRetryToken(x => x + 1);
  };

  if (!baseUrl) {
    return (
      <Unavailable
        title={title}
        reason={`The embedded module URL is not configured. Set ${app === 'compliance' ? 'VITE_COMPLIANCE_HUB_URL' : 'VITE_AUDIT_HUB_URL'}.`}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      {loadFailed && !ready && (
        <Unavailable
          title={title}
          reason="The embedded module did not respond in time."
          onRetry={handleRetry}
        />
      )}
      <iframe
        key={retryToken}
        ref={iframeRef}
        src={src}
        title={title}
        className={`h-full w-full border-0 ${loadFailed && !ready ? 'hidden' : 'block'}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

const SatelliteFrame: React.FC<SatelliteFrameProps> = (props) => (
  <ErrorBoundary>
    <SatelliteFrameInner {...props} />
  </ErrorBoundary>
);

export default SatelliteFrame;
