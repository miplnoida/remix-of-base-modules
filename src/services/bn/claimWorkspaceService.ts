/**
 * BN Claim Workspace Service
 *
 * Aggregates everything an employee needs to work a claim:
 *   - application payload (bn_claim_application)
 *   - person / employer / contribution snapshots
 *   - intake validations
 *
 * Snapshots are point-in-time copies captured at submission and must not
 * be re-derived from live master tables.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ClaimApplicationRow {
  id: string;
  claim_id: string;
  application_channel: string;
  submitted_by_type: string;
  submitted_by_user_id: string | null;
  submitted_at: string;
  declaration_accepted: boolean;
  raw_application_json: Record<string, any> | null;
  source_ip: string | null;
  user_agent: string | null;
}

export interface PersonSnapshot {
  ssn: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  person_status: string | null;
  address_json: Record<string, any> | null;
  phone: string | null;
  email: string | null;
  captured_at: string;
}

export interface EmployerSnapshot {
  employer_regno: string | null;
  employer_name: string | null;
  employer_status: string | null;
  address_json: Record<string, any> | null;
  captured_at: string;
}

export interface ContributionSnapshot {
  period_from: string | null;
  period_to: string | null;
  total_weeks: number;
  paid_weeks: number;
  credited_weeks: number;
  total_wages: number;
  average_weekly_wage: number;
  contribution_json: Record<string, any> | null;
  captured_at: string;
}

export interface IntakeValidationRow {
  id: string;
  check_code: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string | null;
  details_json: Record<string, any> | null;
  checked_at: string;
}

export interface ClaimWorkspaceBundle {
  application: ClaimApplicationRow | null;
  person: PersonSnapshot | null;
  employer: EmployerSnapshot | null;
  contribution: ContributionSnapshot | null;
  validations: IntakeValidationRow[];
}

export async function fetchClaimWorkspaceBundle(claimId: string): Promise<ClaimWorkspaceBundle> {
  const [appRes, personRes, employerRes, contribRes, validationsRes] = await Promise.all([
    db.from('bn_claim_application').select('*').eq('claim_id', claimId).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('bn_claim_person_snapshot').select('*').eq('claim_id', claimId).order('captured_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('bn_claim_employer_snapshot').select('*').eq('claim_id', claimId).order('captured_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('bn_claim_contribution_snapshot').select('*').eq('claim_id', claimId).order('captured_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('bn_claim_intake_validation').select('*').eq('claim_id', claimId).order('checked_at', { ascending: false }),
  ]);

  return {
    application: appRes.data ?? null,
    person: personRes.data ?? null,
    employer: employerRes.data ?? null,
    contribution: contribRes.data ?? null,
    validations: (validationsRes.data ?? []) as IntakeValidationRow[],
  };
}
