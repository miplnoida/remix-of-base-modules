import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/platform/audit/auditService';
import type {
  EmployerLifecycleStatus,
  EmployerRegistryListFilters,
  EmployerRegistryRecord,
  EmployerRegistryStats,
} from './types';

const db = supabase as any;

function normaliseStatus(code: string | null | undefined): EmployerLifecycleStatus {
  if (!code) return 'UNKNOWN';
  const c = String(code).trim().toUpperCase();
  if (c === 'A' || c === 'ACTIVE') return 'ACTIVE';
  if (c === 'I' || c === 'INACTIVE') return 'INACTIVE';
  if (c === 'S' || c === 'SUSPENDED') return 'SUSPENDED';
  return 'UNKNOWN';
}

/**
 * Reads the legacy `au_er_master` table via adapter — READ-ONLY.
 * No modern employer table exists in this foundation epic.
 */
export async function listEmployers(
  filters: EmployerRegistryListFilters = {},
): Promise<EmployerRegistryRecord[]> {
  const limit = Math.min(filters.limit ?? 100, 500);
  let q = db
    .from('au_er_master')
    .select('regno, ername, erregdt, erstatus, ertype, erofficecode, eraddr1, erphone, eremail')
    .limit(limit);

  if (filters.search && filters.search.trim().length > 0) {
    const s = filters.search.trim();
    q = q.or(`ername.ilike.%${s}%,regno.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []).map((r: any): EmployerRegistryRecord => ({
    employerId: String(r.regno ?? ''),
    employerNumber: String(r.regno ?? ''),
    employerName: r.ername ?? '',
    employerType: r.ertype ?? null,
    registrationDate: r.erregdt ?? null,
    employerStatus: normaliseStatus(r.erstatus),
    officeCode: r.erofficecode ?? null,
    address: { line1: r.eraddr1 ?? null },
    contact: { phone: r.erphone ?? null, email: r.eremail ?? null },
    sourceTable: 'au_er_master',
    legacyMappingUsed: true,
  }));

  const filtered = filters.status
    ? rows.filter((r) => r.employerStatus === filters.status)
    : rows;

  // Foundational governance signal — one aggregate audit per query.
  void logAction({
    event_code: 'EMPLOYER_LEGACY_MAPPING_USED',
    action: 'READ',
    module_code: 'ER',
    domain_code: 'EMPLOYER',
    entity_type: 'au_er_master',
    outcome: 'SUCCESS',
    notes: `Employer Registry list read via legacy adapter (${filtered.length} rows).`,
  });

  return filtered;
}

export async function getEmployer(employerId: string): Promise<EmployerRegistryRecord | null> {
  const { data, error } = await db
    .from('au_er_master')
    .select('regno, ername, erregdt, erstatus, ertype, erofficecode, eraddr1, erphone, eremail')
    .eq('regno', employerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  await logAction({
    event_code: 'EMPLOYER_SENSITIVE_VIEWED',
    action: 'READ',
    module_code: 'ER',
    domain_code: 'EMPLOYER',
    entity_type: 'au_er_master',
    entity_id: String(data.regno ?? employerId),
    outcome: 'SUCCESS',
    notes: `Employer Registry detail viewed: ${data.regno}`,
  });

  return {
    employerId: String(data.regno ?? ''),
    employerNumber: String(data.regno ?? ''),
    employerName: data.ername ?? '',
    employerType: data.ertype ?? null,
    registrationDate: data.erregdt ?? null,
    employerStatus: normaliseStatus(data.erstatus),
    officeCode: data.erofficecode ?? null,
    address: { line1: data.eraddr1 ?? null },
    contact: { phone: data.erphone ?? null, email: data.eremail ?? null },
    sourceTable: 'au_er_master',
    legacyMappingUsed: true,
  };
}

export async function computeStats(rows: EmployerRegistryRecord[]): Promise<EmployerRegistryStats> {
  return {
    total: rows.length,
    active: rows.filter((r) => r.employerStatus === 'ACTIVE').length,
    suspended: rows.filter((r) => r.employerStatus === 'SUSPENDED').length,
    inactive: rows.filter((r) => r.employerStatus === 'INACTIVE').length,
  };
}

/**
 * Foundation epic: mutations do NOT write to the legacy employer row.
 * Instead they open a workflow instance (DRAFT approvals seeded) and audit the intent.
 */
export async function requestEmployerChange(input: {
  workflow_code:
    | 'EMPLOYER_REGISTRATION_APPROVAL'
    | 'EMPLOYER_STATUS_CHANGE_APPROVAL'
    | 'EMPLOYER_DEACTIVATION_APPROVAL'
    | 'EMPLOYER_SENSITIVE_CORRECTION_APPROVAL';
  employer_id?: string;
  payload: Record<string, unknown>;
  reason?: string;
}): Promise<void> {
  const eventMap = {
    EMPLOYER_REGISTRATION_APPROVAL: 'EMPLOYER_REGISTRY_CREATED',
    EMPLOYER_STATUS_CHANGE_APPROVAL: 'EMPLOYER_STATUS_CHANGED',
    EMPLOYER_DEACTIVATION_APPROVAL: 'EMPLOYER_REGISTRY_DEACTIVATED',
    EMPLOYER_SENSITIVE_CORRECTION_APPROVAL: 'EMPLOYER_REGISTRY_UPDATED',
  } as const;

  await logAction({
    event_code: eventMap[input.workflow_code],
    action: 'SUBMIT',
    module_code: 'ER',
    domain_code: 'EMPLOYER',
    entity_type: 'employer',
    entity_id: input.employer_id ?? null,
    outcome: 'SUCCESS',
    notes: `Submitted ${input.workflow_code}${input.reason ? ` — ${input.reason}` : ''}`,
    metadata: {
      workflow_code: input.workflow_code,
      payload: input.payload,
    },
  });
}
