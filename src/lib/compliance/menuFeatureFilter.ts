/**
 * Compliance menu feature-flag filter (Phase 1 — runtime visibility).
 *
 * Hides Compliance menu items whose route is gated by a DB feature flag
 * that is OFF. Direct URL access is still protected by ComplianceFeatureGate
 * (renders <FeatureDisabled />) — this is purely sidebar visibility.
 *
 * Rules (Phase 1 only):
 *   - /compliance/violations/verification-queue → compliance.core.verification_queue
 *   - /compliance/arrangements (and any /compliance/arrangements/*) → compliance.payment.arrangement
 *   - /compliance/admin/automation/jobs → compliance.risk.automation_jobs
 *   - /compliance/reports/automation-jobs → compliance.risk.automation_jobs
 *
 * Setup control-plane pages (Feature Toggles, Feature Toggle Diagnostics,
 * automation history, employer-jobs reference, etc.) are NOT in the rule
 * list and remain visible.
 *
 * Fail-open: if the DB flag cache hasn't loaded yet we don't hide anything,
 * matching the helper behaviour in featureToggles.ts.
 */
import { hasComplianceDbFlagsLoaded, getComplianceDbFlag } from './featureFlagCache';

interface MenuItemLike {
  id?: string;
  title: string;
  url?: string;
  subItems?: MenuItemLike[];
}

interface Rule {
  prefix: string;
  flag: string;
}

const RULES: Rule[] = [
  { prefix: '/compliance/violations/verification-queue', flag: 'compliance.core.verification_queue' },
  { prefix: '/compliance/arrangements', flag: 'compliance.payment.arrangement' },
  { prefix: '/compliance/admin/automation/jobs', flag: 'compliance.risk.automation_jobs' },
  { prefix: '/compliance/reports/automation-jobs', flag: 'compliance.risk.automation_jobs' },
];

function normalizeRoute(url?: string): string {
  if (!url) return '';
  let p = url.trim();
  if (/^https?:\/\//i.test(p)) {
    try { p = new URL(p).pathname; } catch { /* noop */ }
  }
  return p.replace(/\/+$/, '');
}

/** Returns true when the URL is blocked by an OFF feature flag. */
function isUrlDisabledByFlag(url?: string): boolean {
  const norm = normalizeRoute(url);
  if (!norm) return false;
  for (const r of RULES) {
    if (norm === r.prefix || norm.startsWith(r.prefix + '/')) {
      const v = getComplianceDbFlag(r.flag);
      if (v === false) return true;
    }
  }
  return false;
}

export function filterComplianceMenuByFeatureFlags<T extends MenuItemLike>(items: T[]): T[] {
  if (!hasComplianceDbFlagsLoaded()) return items;

  const walk = (node: T): T | null => {
    if (isUrlDisabledByFlag(node.url)) return null;

    if (node.subItems && node.subItems.length > 0) {
      const kept = node.subItems
        .map((c) => walk(c as T))
        .filter((c): c is T => c !== null);

      // Drop empty groups (no surviving children AND no own destination URL)
      if (kept.length === 0 && !node.url) return null;

      return { ...node, subItems: kept };
    }

    return node;
  };

  return items.map(walk).filter((n): n is T => n !== null);
}
