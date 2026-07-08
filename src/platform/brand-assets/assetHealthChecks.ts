/**
 * Epic OM-9.7.5 — Brand Asset Health
 *
 * Read-only scans over comm_media_asset / comm_letterhead / assignments to
 * surface asset governance issues in a single place. Designed to be called
 * from the Communication Assets Health tab and the Release Readiness suite.
 */
import { supabase } from '@/integrations/supabase/client';
import { evaluateSelectableAsset } from './assetSelectionPolicy';
import { isOfficialCategory } from './officialCategories';

const db = supabase as any;

export type AssetHealthSeverity = 'OK' | 'INFO' | 'WARNING' | 'BLOCKER';

export interface AssetHealthIssue {
  code: string;
  severity: AssetHealthSeverity;
  message: string;
  asset_id?: string;
  asset_name?: string;
  category?: string;
  ref_type?: string;
  ref_code?: string;
}

export interface AssetHealthReport {
  ran_at: string;
  total_assets: number;
  official_assets: number;
  approved_assets: number;
  unused_approved: number;
  issues: AssetHealthIssue[];
}

const nowIso = () => new Date().toISOString();

/** Main scan. Non-destructive; safe to run on demand. */
export async function runBrandAssetHealth(): Promise<AssetHealthReport> {
  const issues: AssetHealthIssue[] = [];

  const { data: assets = [], error } = await db
    .from('comm_media_asset')
    .select(
      'id,name,asset_code,category,is_active,approval_status,effective_from,effective_to,external_url,link_last_status',
    );
  if (error) throw error;

  const official = (assets as any[]).filter((a) => isOfficialCategory(a.category));
  const approved = (assets as any[]).filter((a) => a.approval_status === 'approved');

  // --- individual asset checks ---
  const seenCodes = new Map<string, string>();
  for (const a of assets as any[]) {
    if (!a.category) {
      issues.push({ code: 'ASSET_NO_CATEGORY', severity: 'WARNING', message: 'Asset has no category', asset_id: a.id, asset_name: a.name });
    }
    if (!a.asset_code) {
      issues.push({ code: 'ASSET_NO_CODE', severity: 'INFO', message: 'Asset has no stable asset_code', asset_id: a.id, asset_name: a.name });
    } else if (seenCodes.has(a.asset_code)) {
      issues.push({
        code: 'ASSET_DUP_CODE',
        severity: 'WARNING',
        message: `Duplicate asset_code "${a.asset_code}" (also on ${seenCodes.get(a.asset_code)})`,
        asset_id: a.id,
        asset_name: a.name,
      });
    } else {
      seenCodes.set(a.asset_code, a.name);
    }
    if (a.link_last_status && String(a.link_last_status).toLowerCase().includes('fail')) {
      issues.push({
        code: 'ASSET_EXTERNAL_LINK_FAILED',
        severity: 'WARNING',
        message: `External URL last-check failed: ${a.external_url ?? ''}`.trim(),
        asset_id: a.id,
        asset_name: a.name,
        category: a.category,
      });
    }
    // Expired but still active
    const ev = evaluateSelectableAsset(a);
    if (!ev.selectable && a.is_active && a.approval_status === 'approved' && ev.reason === 'EXPIRED') {
      issues.push({
        code: 'ASSET_EXPIRED_STILL_ACTIVE',
        severity: 'WARNING',
        message: 'Asset is past effective_to but still marked active',
        asset_id: a.id,
        asset_name: a.name,
        category: a.category,
      });
    }
  }

  // --- letterhead consumption checks ---
  const { data: lhs = [] } = await db
    .from('comm_letterhead')
    .select('id,letterhead_code,name,design_config,is_active');
  const assetByCode = new Map<string, any>();
  for (const a of assets as any[]) if (a.asset_code) assetByCode.set(a.asset_code, a);

  const LH_SLOTS: Array<{ key: string; expected: string[] }> = [
    { key: 'logo_asset_code', expected: ['logo', 'logo_small'] },
    { key: 'seal_asset_code', expected: ['seal'] },
    { key: 'header_asset_code', expected: ['letterhead_header'] },
    { key: 'footer_asset_code', expected: ['letterhead_footer'] },
    { key: 'watermark_asset_code', expected: ['watermark'] },
    { key: 'signature_asset_code', expected: ['signature'] },
  ];
  for (const lh of lhs as any[]) {
    const cfg = (lh.design_config ?? {}) as Record<string, any>;
    for (const slot of LH_SLOTS) {
      const code = cfg[slot.key];
      if (!code) continue;
      const asset = assetByCode.get(code);
      if (!asset) {
        issues.push({
          code: 'LETTERHEAD_ASSET_MISSING',
          severity: 'BLOCKER',
          message: `Letterhead "${lh.name}" references missing ${slot.key}="${code}"`,
          ref_type: 'LETTERHEAD',
          ref_code: lh.letterhead_code,
        });
        continue;
      }
      if (!slot.expected.includes(asset.category)) {
        issues.push({
          code: 'LETTERHEAD_ASSET_CATEGORY_MISMATCH',
          severity: 'WARNING',
          message: `Letterhead "${lh.name}" ${slot.key} uses category=${asset.category}, expected one of ${slot.expected.join(', ')}`,
          asset_id: asset.id,
          asset_name: asset.name,
          ref_type: 'LETTERHEAD',
          ref_code: lh.letterhead_code,
        });
      }
      const ev = evaluateSelectableAsset(asset);
      if (!ev.selectable) {
        issues.push({
          code: 'LETTERHEAD_ASSET_NOT_SELECTABLE',
          severity: 'BLOCKER',
          message: `Letterhead "${lh.name}" ${slot.key} points to asset that is not selectable (${ev.reason})`,
          asset_id: asset.id,
          asset_name: asset.name,
          ref_type: 'LETTERHEAD',
          ref_code: lh.letterhead_code,
        });
      }
    }
  }

  // --- unused approved (very rough — asset_code not present in any letterhead design_config) ---
  const usedCodes = new Set<string>();
  for (const lh of lhs as any[]) {
    const cfg = (lh.design_config ?? {}) as Record<string, any>;
    for (const k of Object.keys(cfg)) {
      const v = cfg[k];
      if (typeof v === 'string') usedCodes.add(v);
    }
  }
  const unusedApproved = (assets as any[]).filter(
    (a) => a.approval_status === 'approved' && a.is_active && a.asset_code && !usedCodes.has(a.asset_code),
  );
  for (const a of unusedApproved.slice(0, 25)) {
    issues.push({
      code: 'ASSET_UNUSED_APPROVED',
      severity: 'INFO',
      message: 'Approved active asset has no letterhead reference (may still be used via profile/assignment)',
      asset_id: a.id,
      asset_name: a.name,
      category: a.category,
    });
  }

  return {
    ran_at: nowIso(),
    total_assets: assets.length,
    official_assets: official.length,
    approved_assets: approved.length,
    unused_approved: unusedApproved.length,
    issues,
  };
}
