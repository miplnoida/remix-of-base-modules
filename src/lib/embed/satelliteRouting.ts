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

export const isComplianceRemoteEnabled = (): boolean =>
  SATELLITE_CONFIG.compliance.enabled;

export const isAuditRemoteEnabled = (): boolean =>
  SATELLITE_CONFIG.audit.enabled;

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
