/**
 * Satellite routing helpers.
 *
 * Two satellite micro-frontends are embedded in SocialServe via iframe:
 *   - Integrated Compliance Hub  ->  /compliance-hub/*   (mirrors /compliance/*)
 *   - SocialServe-Internal Audit ->  /audit-hub/*        (mirrors /audit/*)
 *
 * When the corresponding feature flag is on, sidebar menu URLs are rewritten
 * from the local `/compliance/...` / `/audit/...` paths to the remote
 * `/compliance-hub/...` / `/audit-hub/...` paths so the click lands on the
 * <SatelliteFrame /> host route. Otherwise the original local routes are used.
 *
 * No DB, auth, or provider changes — this is purely a presentation-layer swap.
 */

export const COMPLIANCE_HUB_BASE = '/compliance-hub';
export const AUDIT_HUB_BASE = '/audit-hub';

export const COMPLIANCE_LOCAL_PREFIX = '/compliance';
export const AUDIT_LOCAL_PREFIX = '/audit';

export type SatelliteApp = 'compliance' | 'audit';

import { SATELLITE_CONFIG, pickSatelliteUrl } from '@/config/satellites';

// Runtime flags driven by app_modules.base_url (see useDynamicNavigation).
// Default OFF: until the DB confirms a non-blank base_url for the module,
// the host serves local routes (per docs/INTERNAL_AUDIT_ROLLBACK.md contract).
const remoteEnabledFromDb: { compliance: boolean; audit: boolean } = {
  compliance: false,
  audit: false,
};

export const setSatelliteRemoteEnabled = (
  flags: { compliance?: boolean; audit?: boolean },
): void => {
  if (typeof flags.compliance === 'boolean') remoteEnabledFromDb.compliance = flags.compliance;
  if (typeof flags.audit === 'boolean') remoteEnabledFromDb.audit = flags.audit;
};

// A satellite is only considered "enabled" when the static config flag is on,
// the DB has a non-blank base_url for the module, AND a non-blank URL is
// configured for the current environment. This prevents sidebar links from
// being rewritten to /…-hub/* (and the host route from embedding an empty
// iframe) when the base_url has been cleared.
export const isComplianceRemoteEnabled = (): boolean =>
  SATELLITE_CONFIG.compliance.enabled &&
  remoteEnabledFromDb.compliance &&
  !!pickSatelliteUrl(SATELLITE_CONFIG.compliance).trim();

export const isAuditRemoteEnabled = (): boolean =>
  SATELLITE_CONFIG.audit.enabled &&
  remoteEnabledFromDb.audit &&
  !!pickSatelliteUrl(SATELLITE_CONFIG.audit).trim();

export const getComplianceHubUrl = (): string =>
  pickSatelliteUrl(SATELLITE_CONFIG.compliance);

export const getAuditHubUrl = (): string =>
  pickSatelliteUrl(SATELLITE_CONFIG.audit);

export const getComplianceHubAllowedOrigins = (): string[] =>
  [...SATELLITE_CONFIG.compliance.allowedOrigins];

export const getAuditHubAllowedOrigins = (): string[] =>
  [...SATELLITE_CONFIG.audit.allowedOrigins];

const swapPrefix = (url: string, from: string, to: string): string => {
  if (typeof url !== 'string' || !url.startsWith(from)) return url;
  if (url === from) return to;
  if (url[from.length] === '/' || url[from.length] === '?' || url[from.length] === '#') {
    return to + url.slice(from.length);
  }
  return url;
};

const remapTree = <T extends { url?: string; subItems?: unknown[] }>(
  items: T[],
  from: string,
  to: string,
): T[] =>
  items.map(item => {
    const next: T = { ...item };
    if (typeof next.url === 'string') next.url = swapPrefix(next.url, from, to);
    if (Array.isArray(next.subItems)) {
      next.subItems = remapTree(next.subItems as Array<{ url?: string; subItems?: unknown[] }>, from, to) as typeof next.subItems;
    }
    return next;
  });

/**
 * Returns a menu tree with local URLs rewritten to the satellite-host route
 * iff the feature flag is on. Otherwise returns the input unchanged.
 */
export const applyComplianceRemoteRouting = <T extends { url?: string; subItems?: unknown[] }>(
  items: T[],
): T[] =>
  isComplianceRemoteEnabled()
    ? remapTree(items, COMPLIANCE_LOCAL_PREFIX, COMPLIANCE_HUB_BASE)
    : items;

export const applyAuditRemoteRouting = <T extends { url?: string; subItems?: unknown[] }>(
  items: T[],
): T[] =>
  isAuditRemoteEnabled()
    ? remapTree(items, AUDIT_LOCAL_PREFIX, AUDIT_HUB_BASE)
    : items;
