/**
 * OM-5 — permission keys for canonical Document Templates.
 *
 * Reuses OM-2/OM-3 organisation permission keys. Do not weaken existing gates.
 */
import { ORG_PERMS } from '@/platform/organization/orgActionPermissions';

export const DOCUMENT_TEMPLATE_PERMS = {
  view: ORG_PERMS.templates.view,
  manage: ORG_PERMS.templates.manage,
} as const;

export const LETTERHEAD_PERMS = {
  view: ORG_PERMS.letterheads.view,
  manage: ORG_PERMS.letterheads.manage,
} as const;
