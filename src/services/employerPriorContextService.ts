/**
 * Employer Prior-Context Service
 *
 * Surfaces an employer's compliance history so audit reports and the
 * violation-creation wizard can show:
 *   - prior open violations (any type)
 *   - prior violations of the same type (repeat-offence pattern)
 *   - prior audit visits (last N completed inspections)
 *   - prior arrangements / installment plans (active or recent)
 *
 * This is read-only and safe to call from both the report payload assembler
 * and from interactive dialogs.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PriorViolationRow {
  id: string;
  violationNumber?: string | null;
  violationType?: string | null;
  violationTypeId?: string | null;
  status?: string | null;
  priority?: string | null;
  summary?: string | null;
  totalAmount?: number | null;
  createdAt?: string | null;
  dueDate?: string | null;
  inspectionId?: string | null;
}

export interface PriorVisitRow {
  id: string;
  inspectionNumber: string;
  status: string;
  scheduledDate?: string | null;
  visitDate?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  inspectorName?: string | null;
  findingsCount?: number;
  violationsCount?: number;
}

export interface PriorArrangementRow {
  id: string;
  arrangementNumber?: string | null;
  status?: string | null;
  totalDebt?: number | null;
  totalPaid?: number | null;
  installmentAmount?: number | null;
  installmentsPaid?: number | null;
  numberOfInstallments?: number | null;
  nextDueDate?: string | null;
  missedPayments?: number | null;
  breachDetected?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface EmployerPriorContext {
  employerId: string;
  priorOpenViolations: PriorViolationRow[];
  priorSameTypeViolations: PriorViolationRow[];
  priorVisits: PriorVisitRow[];
  priorArrangements: PriorArrangementRow[];
  /** Convenience: true if there's anything noteworthy worth showing. */
  hasAnyContext: boolean;
}

const VIOLATION_OPEN_STATUSES = ['Open', 'Pending', 'Under Review', 'Notice Issued', 'Escalated'];

export const employerPriorContextService = {
  /**
   * Fetch full prior context for an employer.
   * - excludeInspectionId lets the current audit's own violations stay out of "prior" lists.
   * - sameTypeId narrows the same-type list to one violation_type_id.
   */
  async getForEmployer(opts: {
    employerId: string;
    excludeInspectionId?: string;
    sameTypeId?: string | null;
    visitLimit?: number;
  }): Promise<EmployerPriorContext> {
    const { employerId, excludeInspectionId, sameTypeId, visitLimit = 5 } = opts;

    const empty: EmployerPriorContext = {
      employerId,
      priorOpenViolations: [],
      priorSameTypeViolations: [],
      priorVisits: [],
      priorArrangements: [],
      hasAnyContext: false,
    };
    if (!employerId) return empty;

    const violationsBase = (supabase as any)
      .from('ce_violations')
      .select('id, violation_number, violation_type, violation_type_id, status, priority, summary, total_amount, created_at, due_date, inspection_id')
      .eq('employer_id', employerId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(20);

    const openQ = excludeInspectionId
      ? violationsBase.in('status', VIOLATION_OPEN_STATUSES).neq('inspection_id', excludeInspectionId)
      : violationsBase.in('status', VIOLATION_OPEN_STATUSES);

    const sameTypeQ = sameTypeId
      ? (supabase as any)
          .from('ce_violations')
          .select('id, violation_number, violation_type, violation_type_id, status, priority, summary, total_amount, created_at, due_date, inspection_id')
          .eq('employer_id', employerId)
          .eq('violation_type_id', sameTypeId)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
          .limit(10)
      : null;

    const visitsQ = (supabase as any)
      .from('ce_inspections')
      .select('id, inspection_number, status, scheduled_date, visit_date, actual_start, actual_end, inspector_name')
      .eq('employer_id', employerId)
      .order('actual_end', { ascending: false, nullsFirst: false })
      .limit(visitLimit);

    const arrangementsQ = (supabase as any)
      .from('ce_payment_arrangements')
      .select('id, arrangement_number, status, total_debt, total_paid, installment_amount, installments_paid, number_of_installments, next_due_date, missed_payments, breach_detected, start_date, end_date')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(10);

    const [openRes, sameRes, visitsRes, arrRes] = await Promise.all([
      openQ,
      sameTypeQ ?? Promise.resolve({ data: [] }),
      visitsQ,
      arrangementsQ,
    ]);

    const mapVio = (r: any): PriorViolationRow => ({
      id: r.id,
      violationNumber: r.violation_number,
      violationType: r.violation_type,
      violationTypeId: r.violation_type_id,
      status: r.status,
      priority: r.priority,
      summary: r.summary,
      totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
      createdAt: r.created_at,
      dueDate: r.due_date,
      inspectionId: r.inspection_id,
    });

    const priorVisitsRaw = (visitsRes.data ?? []).filter((v: any) => v.id !== excludeInspectionId);
    // Hydrate counts in a single round-trip
    const visitIds = priorVisitsRaw.map((v: any) => v.id);
    let countsByVisit: Record<string, { findings: number; violations: number }> = {};
    if (visitIds.length) {
      const [findings, violationsForCount] = await Promise.all([
        (supabase as any).from('ce_inspection_findings').select('inspection_id').in('inspection_id', visitIds),
        (supabase as any).from('ce_violations').select('inspection_id').in('inspection_id', visitIds).or('is_deleted.is.null,is_deleted.eq.false'),
      ]);
      visitIds.forEach((id) => (countsByVisit[id] = { findings: 0, violations: 0 }));
      (findings.data ?? []).forEach((r: any) => { if (countsByVisit[r.inspection_id]) countsByVisit[r.inspection_id].findings++; });
      (violationsForCount.data ?? []).forEach((r: any) => { if (countsByVisit[r.inspection_id]) countsByVisit[r.inspection_id].violations++; });
    }

    const priorVisits: PriorVisitRow[] = priorVisitsRaw.map((v: any) => ({
      id: v.id,
      inspectionNumber: v.inspection_number,
      status: v.status,
      scheduledDate: v.scheduled_date,
      visitDate: v.visit_date,
      actualStart: v.actual_start,
      actualEnd: v.actual_end,
      inspectorName: v.inspector_name,
      findingsCount: countsByVisit[v.id]?.findings ?? 0,
      violationsCount: countsByVisit[v.id]?.violations ?? 0,
    }));

    const priorArrangements: PriorArrangementRow[] = (arrRes.data ?? []).map((a: any) => ({
      id: a.id,
      arrangementNumber: a.arrangement_number,
      status: a.status,
      totalDebt: a.total_debt != null ? Number(a.total_debt) : null,
      totalPaid: a.total_paid != null ? Number(a.total_paid) : null,
      installmentAmount: a.installment_amount != null ? Number(a.installment_amount) : null,
      installmentsPaid: a.installments_paid,
      numberOfInstallments: a.number_of_installments,
      nextDueDate: a.next_due_date,
      missedPayments: a.missed_payments,
      breachDetected: a.breach_detected,
      startDate: a.start_date,
      endDate: a.end_date,
    }));

    const priorOpenViolations = (openRes.data ?? []).map(mapVio);
    const priorSameTypeViolations = (sameRes.data ?? []).map(mapVio);

    return {
      employerId,
      priorOpenViolations,
      priorSameTypeViolations,
      priorVisits,
      priorArrangements,
      hasAnyContext:
        priorOpenViolations.length > 0 ||
        priorSameTypeViolations.length > 0 ||
        priorVisits.length > 0 ||
        priorArrangements.length > 0,
    };
  },
};
