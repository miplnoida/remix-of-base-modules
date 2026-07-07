/**
 * Epic OM-7 — Configuration Center v2 permission surface.
 * Reuses OM-3.1 organisation-configuration action permissions; no new keys.
 */
import { ORG_PERMS } from '@/platform/organization/orgActionPermissions';

export const CONFIG_CENTER_PERMS = {
  view:     ORG_PERMS.configuration.view,
  manage:   ORG_PERMS.configuration.manage,
  advanced: ORG_PERMS.configuration.manage,
} as const;
