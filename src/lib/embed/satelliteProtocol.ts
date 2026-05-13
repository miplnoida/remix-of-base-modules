/**
 * Shared postMessage protocol used between SocialServe (host) and any
 * embedded satellite micro-frontend (Compliance Hub, Internal Audit, ...).
 *
 * KEEP THIS FILE IN SYNC across all three repos — the contract MUST match.
 * Documentation lives in docs/SATELLITE_EMBED_PROTOCOL.md.
 */

export const PROTOCOL_VERSION = 1;
export const PROTOCOL_SOURCE_HOST = 'host' as const;
export const PROTOCOL_SOURCE_SAT = 'satellite' as const;

export type SatelliteAppId = 'compliance' | 'audit';

export interface ProtocolEnvelope<T = unknown> {
  source: typeof PROTOCOL_SOURCE_HOST | typeof PROTOCOL_SOURCE_SAT;
  app: SatelliteAppId;
  v: number;
  type: string;
  payload?: T;
}

/* ── host -> satellite ── */
export type HostToSatType =
  | 'INIT'
  | 'TOKEN_REFRESH'
  | 'THEME_CHANGE'
  | 'LANG_CHANGE'
  | 'NAVIGATE'
  | 'LOGOUT_REQUEST';

/* ── satellite -> host ── */
export type SatToHostType =
  | 'READY'
  | 'NAVIGATE'
  | 'NOTIFY'
  | 'BREADCRUMB'
  | 'LOADING'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'ERROR';

export interface InitPayload {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string | null; full_name?: string | null } | null;
  roles: string[];
  permissions: string[];
  theme: { key: string; isDark: boolean };
  language: string;
  tenant: string | null;
  initialPath?: string;
}

export interface TokenRefreshPayload {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ThemeChangePayload {
  theme: { key: string; isDark: boolean };
}

export interface LangChangePayload {
  language: string;
}

export interface NavigatePayload {
  path: string;
}

export interface NotifyPayload {
  level: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
}

export interface BreadcrumbPayload {
  items: Array<{ label: string; href?: string }>;
}

export interface LoadingPayload {
  active: boolean;
}

export interface ReadyPayload {
  app: SatelliteAppId;
  version?: string;
}

export interface ErrorPayload {
  message: string;
  stack?: string;
}

export const isProtocolMessage = (data: unknown): data is ProtocolEnvelope =>
  !!data &&
  typeof data === 'object' &&
  'v' in (data as Record<string, unknown>) &&
  'source' in (data as Record<string, unknown>) &&
  'type' in (data as Record<string, unknown>) &&
  'app' in (data as Record<string, unknown>);
