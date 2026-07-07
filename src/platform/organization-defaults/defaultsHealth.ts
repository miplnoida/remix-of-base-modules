/**
 * Epic OM-9.5 — Organisation Default health inspection.
 *
 * Detects missing, inactive, or incompatible organisation-level defaults
 * consumed by every department, letter, email, report, and template.
 * Uses the same OM-6 canonical resolver runtime consumers do.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type OrgDefaultHealthSeverity = 'ok' | 'info' | 'warning' | 'error';
export type OrgDefaultSourceType =
  | 'ORG_PROFILE_COLUMN'
  | 'GUIDED_ASSIGNMENT'
  | 'SYSTEM_FALLBACK'
  | 'MISSING';

export interface OrgDefaultFinding {
  settingKey: string;
  label: string;
  severity: OrgDefaultHealthSeverity;
  source: OrgDefaultSourceType;
  message: string;
  resourceId?: string | null;
  resourceCode?: string | null;
  resourceName?: string | null;
  isActive?: boolean | null;
}

export interface OrgDefaultHealthReport {
  ranAt: string;
  findings: OrgDefaultFinding[];
  summary: { ok: number; warnings: number; errors: number };
}

interface AssetLookup {
  table: string;
  column: string; // fk column on core_organization
  key: string;
  label: string;
  hasCode?: boolean;
  required?: 'error' | 'warning'; // severity when missing
}

const ASSET_LOOKUPS: AssetLookup[] = [
  { table: 'comm_letterhead',        column: 'default_letterhead_id',       key: 'default_letterhead',       label: 'Default Letterhead',       hasCode: true,  required: 'error'   },
  { table: 'comm_email_signature',   column: 'default_email_signature_id',  key: 'default_email_signature',  label: 'Default Email Signature',  hasCode: true,  required: 'error'   },
  { table: 'comm_disclaimer',        column: 'default_disclaimer_id',       key: 'default_disclaimer',       label: 'Default Disclaimer',       hasCode: false, required: 'warning' },
  { table: 'comm_print_footer',      column: 'default_print_footer_id',     key: 'default_print_footer',     label: 'Default Print Footer',     hasCode: false, required: 'warning' },
  { table: 'core_office_locations',  column: 'default_location_id',         key: 'default_location',         label: 'Default Location',         hasCode: true,  required: 'warning' },
];

export async function validateOrganisationDefaultsHealth(): Promise<OrgDefaultHealthReport> {
  const findings: OrgDefaultFinding[] = [];
  const { data: orgRow, error: orgErr } = await db
    .from('core_organization')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (orgErr || !orgRow) {
    return {
      ranAt: new Date().toISOString(),
      findings: [{ settingKey: 'organization', label: 'Organisation', severity: 'error', source: 'MISSING', message: orgErr?.message ?? 'No organisation record found.' }],
      summary: { ok: 0, warnings: 0, errors: 1 },
    };
  }

  for (const spec of ASSET_LOOKUPS) {
    const id = orgRow[spec.column];
    if (!id) {
      findings.push({
        settingKey: spec.key,
        label: spec.label,
        severity: spec.required ?? 'warning',
        source: 'MISSING',
        message: `${spec.label} is not configured.`,
      });
      continue;
    }
    const cols = spec.hasCode ? 'id, name, code, is_active' : 'id, name, is_active';
    const { data: asset } = await db.from(spec.table).select(cols).eq('id', id).maybeSingle();
    if (!asset) {
      findings.push({
        settingKey: spec.key, label: spec.label, severity: 'error', source: 'ORG_PROFILE_COLUMN',
        message: `${spec.label} references a missing ${spec.table} row (id ${id}).`,
        resourceId: id,
      });
      continue;
    }
    if (asset.is_active === false) {
      findings.push({
        settingKey: spec.key, label: spec.label, severity: 'warning', source: 'ORG_PROFILE_COLUMN',
        message: `${spec.label} is set to an inactive resource (${asset.code ?? asset.name}).`,
        resourceId: asset.id, resourceCode: asset.code ?? null, resourceName: asset.name, isActive: false,
      });
      continue;
    }
    findings.push({
      settingKey: spec.key, label: spec.label, severity: 'ok', source: 'ORG_PROFILE_COLUMN',
      message: `${spec.label} resolves to ${asset.code ?? asset.name}.`,
      resourceId: asset.id, resourceCode: asset.code ?? null, resourceName: asset.name, isActive: true,
    });
  }

  // Language / channel / retention — soft warnings only.
  if (!orgRow.default_language) {
    findings.push({ settingKey: 'default_language', label: 'Default Language', severity: 'warning', source: 'MISSING', message: 'Default Language is not configured.' });
  } else {
    findings.push({ settingKey: 'default_language', label: 'Default Language', severity: 'ok', source: 'ORG_PROFILE_COLUMN', message: `Default Language = ${orgRow.default_language}.`, resourceCode: orgRow.default_language, resourceName: orgRow.default_language });
  }

  // ORG-scope guided-assignment coverage (informational only).
  const { data: assignments } = await db
    .from('core_configuration_assignment')
    .select('resource_type,is_active')
    .eq('scope_level', 'ORG')
    .eq('is_active', true);
  const covered = new Set((assignments ?? []).map((r: any) => r.resource_type));
  const wanted = ['LETTERHEAD', 'EMAIL_SIGNATURE', 'DISCLAIMER', 'PRINT_FOOTER', 'LANGUAGE', 'LOCATION'];
  const missingCoverage = wanted.filter((w) => !covered.has(w));
  if (missingCoverage.length) {
    findings.push({
      settingKey: 'guided_assignments',
      label: 'ORG-scope Guided Assignments',
      severity: 'info',
      source: 'GUIDED_ASSIGNMENT',
      message: `Missing ORG-scope guided assignment(s): ${missingCoverage.join(', ')}. Re-run the OM-9.5 seed to align.`,
    });
  }

  const summary = findings.reduce(
    (acc, f) => {
      if (f.severity === 'ok' || f.severity === 'info') acc.ok += 1;
      else if (f.severity === 'warning') acc.warnings += 1;
      else if (f.severity === 'error') acc.errors += 1;
      return acc;
    },
    { ok: 0, warnings: 0, errors: 0 },
  );

  return { ranAt: new Date().toISOString(), findings, summary };
}
