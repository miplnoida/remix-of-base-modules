/**
 * BN-AWARD360-ADMIN-1 — Central tab-access resolver.
 *
 * Single source of truth for every Award 360 tab's:
 *   - visibility in the tab bar
 *   - queryEnabled flag (whether the tab should execute its data query)
 *   - human-readable reason (for diagnostics)
 *   - the underlying capability key
 *
 * Tabs and navigation must consume this instead of recomputing permission
 * rules per component.
 *
 * Communication rendered content is a special case: the Communications *tab*
 * itself is visible and queryable when metadata view is granted; only the
 * rendered subject/body remains hidden until a dedicated action is registered.
 */
import { useMemo } from 'react';
import type { Award360TabKey } from './viewModels';
import type { Award360Capability } from './award360Capabilities';
import type { Award360Permissions } from './useAwardPermissions';

export interface Award360TabAccess {
  tab: Award360TabKey;
  visible: boolean;
  queryEnabled: boolean;
  reason: string;
  capability: Award360Capability | 'ALWAYS_VISIBLE';
}

interface TabRule {
  tab: Award360TabKey;
  capability: Award360Capability | 'ALWAYS_VISIBLE';
  /**
   * Optional secondary capability that also grants access (OR semantics).
   * Used e.g. for schedule/payments which accept either payment-history or
   * payment-profile view.
   */
  altCapability?: Award360Capability;
}

const TAB_RULES: TabRule[] = [
  // BN-AWARD360-ADMIN-2: Overview now requires AWARD_VIEW. A user without
  // bn_awards_list.view must not see or query Award Overview data.
  { tab: 'overview',           capability: 'AWARD_VIEW' },
  { tab: 'pensioner',          capability: 'PENSIONER_VIEW' },
  { tab: 'claim',              capability: 'CLAIM_VIEW' },
  { tab: 'product',            capability: 'PRODUCT_VIEW' },
  { tab: 'beneficiaries',      capability: 'AWARD_VIEW' },
  { tab: 'schedule',           capability: 'PAYMENT_HISTORY_VIEW', altCapability: 'PAYMENT_PROFILE_VIEW' },
  { tab: 'payments',           capability: 'PAYMENT_HISTORY_VIEW', altCapability: 'PAYMENT_PROFILE_VIEW' },
  { tab: 'life-certificates',  capability: 'LIFE_CERTIFICATE_VIEW' },
  { tab: 'medical',            capability: 'MEDICAL_REVIEW_VIEW' },
  { tab: 'suspensions',        capability: 'SUSPENSION_VIEW' },
  { tab: 'overpayments',       capability: 'OVERPAYMENT_VIEW' },
  { tab: 'communications',     capability: 'COMMUNICATION_METADATA_VIEW' },
  { tab: 'audit',              capability: 'CENTRAL_AUDIT_VIEW' },
];

export function computeAward360TabAccess(
  perms: Award360Permissions,
): Record<Award360TabKey, Award360TabAccess> {
  const out = {} as Record<Award360TabKey, Award360TabAccess>;
  for (const rule of TAB_RULES) {
    const capsMap = perms.capabilities ?? ({} as Award360Permissions['capabilities']);
    const primary = capsMap[rule.capability as Award360Capability];
    const alt = rule.altCapability ? capsMap[rule.altCapability] : undefined;
    // Use effectiveAccess when available; fall back to permissionGranted.
    const granted =
      (primary?.effectiveAccess ?? primary?.permissionGranted) ||
      !!(alt?.effectiveAccess ?? alt?.permissionGranted);
    if (perms.isLoading) {
      out[rule.tab] = {
        tab: rule.tab,
        visible: false,
        queryEnabled: false,
        reason: 'Awaiting admin / permission resolution.',
        capability: rule.capability,
      };
      continue;
    }
    out[rule.tab] = {
      tab: rule.tab,
      visible: granted,
      queryEnabled: granted,
      reason: granted
        ? (primary?.reason ?? alt?.reason ?? 'Granted.')
        : (primary?.reason ?? 'Access denied.'),
      capability: rule.capability,
    };
  }
  return out;
}

export function useAward360TabAccess(
  perms: Award360Permissions,
): Record<Award360TabKey, Award360TabAccess> {
  return useMemo(() => computeAward360TabAccess(perms), [perms]);
}
