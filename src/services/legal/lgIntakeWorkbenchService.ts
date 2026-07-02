/**
 * EPIC-03A — Legal Intake Workbench aggregation service.
 * Live Supabase data only.
 */
import { supabase } from "@/integrations/supabase/client";
import type { IntakeRow } from "./lgIntakeQualificationService";

const S: any = supabase;

export interface IntakeWorkbenchRow extends IntakeRow {
  referral_no?: string | null;
  employer_no?: string | null;
  ip_no?: string | null;
  outstanding_info_count: number;
  ageing_days: number;
  ageing_bucket: "0-3" | "4-7" | "8-14" | "15-30" | "30+";
  recommended_action: string;
  territory?: string | null;
}

function bucket(days: number): IntakeWorkbenchRow["ageing_bucket"] {
  if (days <= 3) return "0-3";
  if (days <= 7) return "4-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return "30+";
}

function computeRecommendedAction(r: IntakeRow, outstandingInfo: number): string {
  if (r.qualification_status === "APPROVED") return "Create Legal Case";
  if (r.qualification_status === "REJECTED") return "Closed — Rejected";
  if (r.qualification_status === "CONVERTED_TO_CASE") return "Open Case";
  if (r.qualification_status === "SUPERVISOR_REVIEW") return "Awaiting Supervisor";
  if (r.qualification_status === "INFO_REQUESTED" && outstandingInfo > 0) return "Chase outstanding info";
  if (!r.intake_officer_id) return "Assign Intake Officer";
  if (r.qualification_status === "NEW") return "Begin Qualification Review";
  if (!r.legal_issue || !r.recovery_type) return "Complete Legal Assessment";
  if (r.financial_exposure == null && r.financial_outstanding == null) return "Complete Financial Assessment";
  return "Continue Review";
}

export async function loadIntakeWorkbench(): Promise<IntakeWorkbenchRow[]> {
  const { data: intakes, error } = await S.from("lg_case_intake").select("*").order("submitted_at", { ascending: false });
  if (error) throw error;

  const ids: string[] = (intakes ?? []).map((i: any) => i.id);
  const referralIds = (intakes ?? []).map((i: any) => i.legal_referral_id).filter(Boolean);

  const [infoCounts, referrals] = await Promise.all([
    ids.length ? S.from("lg_intake_info_request").select("intake_id, status").in("intake_id", ids) : Promise.resolve({ data: [] }),
    referralIds.length ? S.from("legal_referral").select("id, referral_no").in("id", referralIds) : Promise.resolve({ data: [] }),
  ]);

  const openInfoByIntake = new Map<string, number>();
  ((infoCounts as any).data ?? []).forEach((r: any) => {
    if (r.status === "OPEN" || r.status === "OVERDUE") {
      openInfoByIntake.set(r.intake_id, (openInfoByIntake.get(r.intake_id) ?? 0) + 1);
    }
  });
  const refByI = new Map<string, string>();
  ((referrals as any).data ?? []).forEach((r: any) => refByI.set(r.id, r.referral_no));

  const now = Date.now();
  return (intakes ?? []).map((i: any): IntakeWorkbenchRow => {
    const outstanding = openInfoByIntake.get(i.id) ?? 0;
    const ageing = Math.max(0, Math.floor((now - new Date(i.submitted_at).getTime()) / 86_400_000));
    return {
      ...i,
      referral_no: i.legal_referral_id ? refByI.get(i.legal_referral_id) ?? null : null,
      employer_no: i.primary_entity_type === "EMPLOYER" ? i.primary_entity_id : null,
      ip_no: i.primary_entity_type === "INSURED_PERSON" ? i.primary_entity_id : null,
      outstanding_info_count: outstanding,
      ageing_days: ageing,
      ageing_bucket: bucket(ageing),
      recommended_action: computeRecommendedAction(i, outstanding),
    };
  });
}

export interface IntakeKpis {
  newReferrals: number;
  pendingQualification: number;
  waitingInformation: number;
  supervisorReview: number;
  acceptedToday: number;
  rejectedToday: number;
  convertedToCases: number;
  avgQualificationHours: number | null;
}

export function computeIntakeKpis(rows: IntakeWorkbenchRow[]): IntakeKpis {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startToday = today.getTime();
  const isToday = (d?: string | null) => !!d && new Date(d).getTime() >= startToday;

  const durations = rows
    .filter((r) => r.qualification_started_at && r.qualification_completed_at)
    .map((r) => (new Date(r.qualification_completed_at!).getTime() - new Date(r.qualification_started_at!).getTime()) / 3_600_000);
  const avg = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : null;

  return {
    newReferrals: rows.filter((r) => r.qualification_status === "NEW").length,
    pendingQualification: rows.filter((r) => r.qualification_status === "IN_REVIEW").length,
    waitingInformation: rows.filter((r) => r.qualification_status === "INFO_REQUESTED").length,
    supervisorReview: rows.filter((r) => r.qualification_status === "SUPERVISOR_REVIEW").length,
    acceptedToday: rows.filter((r) => r.qualification_result === "ACCEPTED" && isToday(r.qualification_completed_at)).length,
    rejectedToday: rows.filter((r) => r.qualification_result === "REJECTED" && isToday(r.qualification_completed_at)).length,
    convertedToCases: rows.filter((r) => r.qualification_status === "CONVERTED_TO_CASE").length,
    avgQualificationHours: avg,
  };
}
