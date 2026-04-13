/**
 * Employer Compliance Summary — Read-Only Service
 *
 * Pure read layer. No writes, no side effects.
 * Calls ce_get_employer_compliance_summary RPC.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Payload Shape ──────────────────────────────────────────────

export interface EmployerComplianceSummary {
  /** Whether an ACTIVE arrangement exists */
  hasActiveArrangement: boolean;
  /** Current arrangement status (ACTIVE, COMPLETED, DEFAULTED, DRAFT, etc.) or null */
  arrangementStatus: string | null;
  /** Arrangement reference number */
  arrangementNumber: string | null;
  /** Arrangement UUID for deep linking */
  arrangementId: string | null;
  /** Total debt on the arrangement */
  totalDebt: number;
  /** Total paid so far */
  totalPaid: number;
  /** Next installment due date */
  nextDueDate: string | null;
  /** Count of overdue installments */
  overdueInstallmentCount: number;
  /** Total outstanding amount across unpaid installments */
  outstandingInstallmentAmount: number;
  /** Whether a breach has been flagged */
  breachDetected: boolean;
  /** Count of unresolved breaches */
  unresolvedBreachCount: number;
  /** Count of open compliance cases */
  linkedOpenCaseCount: number;
  /** Operational warning message or null if clean */
  warningMessage: string | null;
}

/** Safe defaults when no data exists */
export const EMPTY_COMPLIANCE_SUMMARY: EmployerComplianceSummary = {
  hasActiveArrangement: false,
  arrangementStatus: null,
  arrangementNumber: null,
  arrangementId: null,
  totalDebt: 0,
  totalPaid: 0,
  nextDueDate: null,
  overdueInstallmentCount: 0,
  outstandingInstallmentAmount: 0,
  breachDetected: false,
  unresolvedBreachCount: 0,
  linkedOpenCaseCount: 0,
  warningMessage: null,
};

// ── Fetch ──────────────────────────────────────────────────────

export async function fetchEmployerComplianceSummary(
  employerId: string,
): Promise<EmployerComplianceSummary> {
  const { data, error } = await supabase.rpc(
    'ce_get_employer_compliance_summary' as any,
    { p_employer_id: employerId },
  );

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ...EMPTY_COMPLIANCE_SUMMARY };

  return {
    hasActiveArrangement: Boolean(row.has_active_arrangement),
    arrangementStatus: row.arrangement_status ?? null,
    arrangementNumber: row.arrangement_number ?? null,
    arrangementId: row.arrangement_id ?? null,
    totalDebt: Number(row.total_debt ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    nextDueDate: row.next_due_date ?? null,
    overdueInstallmentCount: Number(row.overdue_installment_count ?? 0),
    outstandingInstallmentAmount: Number(row.outstanding_installment_amount ?? 0),
    breachDetected: Boolean(row.breach_detected),
    unresolvedBreachCount: Number(row.unresolved_breach_count ?? 0),
    linkedOpenCaseCount: Number(row.linked_open_case_count ?? 0),
    warningMessage: row.warning_message ?? null,
  };
}
