/**
 * Epic OM-9.7.5 — Brand Asset Governance
 *
 * Central selection policy: is a given media asset legally selectable for
 * *official* output right now? All asset pickers (AssetPickerDialog,
 * AssetPickerField, Portal Branding, Letterhead editor, Email/Notification
 * branding selectors, Organisation Profile defaults, Department Profile
 * overrides, Template branding) must run this check.
 */
import { isOfficialCategory } from './officialCategories';

export interface SelectableAssetInput {
  is_active?: boolean | null;
  approval_status?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  category?: string | null;
}

export interface SelectableResult {
  selectable: boolean;
  reason?: string;
}

/**
 * Rule (from Epic OM-9.7.5, Fix 2):
 *   is_active = true
 *   approval_status = 'approved'
 *   effective_from <= today (if present)
 *   effective_to   >= today (if present)
 *   category matches expected slot (checked by caller)
 *
 * Non-official categories still require is_active + not-expired but may be
 * used in draft state (documented, low-risk assets like inline diagrams).
 */
export function evaluateSelectableAsset(
  asset: SelectableAssetInput,
  opts: { requireApproved?: boolean; today?: Date } = {},
): SelectableResult {
  const today = opts.today ?? new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  if (asset.is_active === false) return { selectable: false, reason: 'INACTIVE' };

  const status = asset.approval_status ?? 'approved';
  const requireApproved = opts.requireApproved ?? isOfficialCategory(asset.category);
  if (requireApproved && status !== 'approved') {
    return { selectable: false, reason: `NOT_APPROVED (${status})` };
  }
  if (status === 'archived') return { selectable: false, reason: 'ARCHIVED' };
  if (status === 'rejected') return { selectable: false, reason: 'REJECTED' };

  if (asset.effective_from) {
    const t = new Date(asset.effective_from).getTime();
    if (!Number.isNaN(t) && t > today0) return { selectable: false, reason: 'NOT_YET_EFFECTIVE' };
  }
  if (asset.effective_to) {
    const t = new Date(asset.effective_to).getTime();
    if (!Number.isNaN(t) && t < today0) return { selectable: false, reason: 'EXPIRED' };
  }

  return { selectable: true };
}

/** Convenience: filter a list of assets down to those selectable for official use. */
export function filterSelectableAssets<T extends SelectableAssetInput>(
  assets: T[],
  opts: { requireApproved?: boolean; today?: Date } = {},
): T[] {
  return assets.filter((a) => evaluateSelectableAsset(a, opts).selectable);
}
