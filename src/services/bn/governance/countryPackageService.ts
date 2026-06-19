/**
 * Country Configuration Package — Phase 6.
 *
 * Reproducible snapshot of the BN config in force at a moment in time.
 * Once activated, items are immutable (enforced by DB trigger).
 */
import { supabase } from '@/integrations/supabase/client';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';

const db = supabase as any;

export interface CountryPackage {
  id: string;
  country_code: string;
  package_code: string;
  label: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ACTIVE' | 'RETIRED' | 'REJECTED';
  activated_at: string | null;
  activated_by: string | null;
  immutable_hash: string | null;
  notes: string | null;
}

export async function buildDraft(input: {
  countryCode: string;
  packageCode: string;
  label: string;
  notes?: string;
  createdBy: string;
}): Promise<CountryPackage> {
  const { data, error } = await db
    .from('bn_country_config_package')
    .insert({
      country_code: input.countryCode,
      package_code: input.packageCode,
      label: input.label,
      notes: input.notes ?? null,
      created_by: input.createdBy,
      updated_by: input.createdBy,
      status: 'DRAFT',
    })
    .select('*')
    .single();
  if (error) throw error;

  await writeBnAudit({
    module: 'BN_CONFIG',
    action: 'CREATE',
    entityType: 'bn_country_config_package',
    entityId: data.id,
    performedBy: input.createdBy,
    afterValue: data,
  });
  return data as CountryPackage;
}

/** Freeze constituent rows into package items, then activate. */
export async function activate(packageId: string, performedBy: string): Promise<void> {
  const { data: pkg, error: pkgErr } = await db
    .from('bn_country_config_package')
    .select('*')
    .eq('id', packageId)
    .single();
  if (pkgErr) throw pkgErr;
  if (pkg.status === 'ACTIVE') return;

  // Snapshot helpers — pull from each constituent table for the country.
  const country = pkg.country_code;
  const sources: Array<{ entity_type: string; query: () => Promise<any[]>; versionField?: string }> = [
    { entity_type: 'bn_country_legal_ref',         query: () => db.from('bn_country_legal_ref').select('*').eq('country_code', country).then((r: any) => r.data ?? []) },
    { entity_type: 'bn_country_participant_type',  query: () => db.from('bn_country_participant_type').select('*').eq('country_code', country).then((r: any) => r.data ?? []) },
    { entity_type: 'bn_formula_version',           query: () => db.from('bn_formula_version').select('*').then((r: any) => r.data ?? []) },
    { entity_type: 'bn_rate_table',                query: () => db.from('bn_rate_table').select('*').then((r: any) => r.data ?? []), versionField: 'version_no' },
    { entity_type: 'bn_medical_tariff_table',      query: () => db.from('bn_medical_tariff_table').select('*').then((r: any) => r.data ?? []), versionField: 'version_no' },
    { entity_type: 'bn_product_version',           query: () => db.from('bn_product_version').select('*').then((r: any) => r.data ?? []) },
    { entity_type: 'bn_eligibility_rule',          query: () => db.from('bn_eligibility_rule').select('*').then((r: any) => r.data ?? []) },
    { entity_type: 'bn_rule_catalogue',            query: () => db.from('bn_rule_catalogue').select('*').then((r: any) => r.data ?? []) },
  ];

  const items: any[] = [];
  let payloadAcc = '';
  for (const s of sources) {
    const rows = await s.query();
    for (const r of rows) {
      items.push({
        package_id: packageId,
        entity_type: s.entity_type,
        entity_id: String(r.id),
        entity_version: s.versionField ? String(r[s.versionField] ?? '') : null,
        snapshot_json: r,
      });
      payloadAcc += JSON.stringify(r);
    }
  }
  if (items.length > 0) {
    const { error: insErr } = await db.from('bn_country_config_package_item').insert(items);
    if (insErr) throw insErr;
  }

  // Compute a stable hash (browser/node-safe — uses Web Crypto).
  let hash = '';
  try {
    const buf = new TextEncoder().encode(payloadAcc);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    hash = `len:${payloadAcc.length}`;
  }

  const { error: updErr } = await db
    .from('bn_country_config_package')
    .update({
      status: 'ACTIVE',
      activated_at: new Date().toISOString(),
      activated_by: performedBy,
      immutable_hash: hash,
      updated_by: performedBy,
    })
    .eq('id', packageId);
  if (updErr) throw updErr;

  await writeBnAudit({
    module: 'BN_CONFIG',
    action: 'PUBLISH',
    entityType: 'bn_country_config_package',
    entityId: packageId,
    performedBy,
    payload: { item_count: items.length, immutable_hash: hash },
    critical: true,
  });
}

export async function getActiveForCountry(countryCode: string): Promise<CountryPackage | null> {
  const { data, error } = await db
    .from('bn_country_config_package')
    .select('*')
    .eq('country_code', countryCode)
    .eq('status', 'ACTIVE')
    .order('activated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CountryPackage) ?? null;
}

export async function attachToClaim(claimId: string, packageId: string): Promise<void> {
  const { error } = await db.from('bn_claim').update({ country_config_package_id: packageId }).eq('id', claimId);
  if (error) throw error;
}
