import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listReferrals, type LegalReferralRow } from "@/services/legal/legalReferralUnifiedService";
import type { SlaStatus } from "@/services/legal/legalReferralSlaService";
import { useLegalReferralsRealtime } from "@/hooks/useLegalReferralsRealtime";

const sb = supabase as any;

export type ReferralStatusValue = LegalReferralRow["status"];

/** Row consumed by the Enterprise Workbench grid. */
export interface ReferralWorkbenchRow extends LegalReferralRow {
  matter_type: string | null;
  origin_department: string | null;
  assigned_workbasket_code: string | null;
  assigned_team_code: string | null;
  assigned_officer_code: string | null;
  assigned_at: string | null;
  reassignment_count: number;
  sla_due_date: string | null;
  sla_status: SlaStatus | null;
  reminder_at: string | null;
  escalation_at: string | null;
  days_remaining: number | null;
  last_activity_at: string;
  current_stage: string | null;
}

const TERMINAL: ReferralStatusValue[] = ["REJECTED", "CLOSED", "LEGAL_CASE_CREATED"];
const WAITING_ON_LEGAL: ReferralStatusValue[] = [
  "SUBMITTED_TO_LEGAL",
  "RECEIVED_BY_LEGAL",
  "INFO_RESPONDED",
  "UNDER_LEGAL_REVIEW",
  "ACCEPTED",
];

export function isTerminal(status: ReferralStatusValue) {
  return TERMINAL.includes(status);
}
export function isWaitingOnLegal(status: ReferralStatusValue) {
  return WAITING_ON_LEGAL.includes(status);
}

function daysBetween(future: string | null): number | null {
  if (!future) return null;
  const ms = new Date(future).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Loads referrals + open info-requests + linked intake/case enrichment and decorates them
 * with matter type, current stage, assigned officer, assignment timestamps and SLA fields
 * required by the Enterprise Workbench. Subscribes to realtime so cards/queues refresh
 * automatically on inserts, status changes, assignments, and info-request updates.
 *
 * Field resolution priority (most authoritative first):
 *   matter_type:     lg_case.case_type_code → lg_case_intake.matter_type_code → recommended_case_type_code
 *   current_stage:   lg_case.current_stage_code → lg_case_intake.recommended_stage_code
 *   assigned_team:   lg_case.assigned_team_code → legal_referral.legal_team_code
 *   assigned_officer:current lg_case_assignment.assigned_to_user_id → lg_case.assigned_legal_officer_id
 *                    (resolved to profiles.user_code for display)
 *   assigned_at:     current lg_case_assignment.assigned_at
 *   reassignment_count: count(lg_case_assignment) - 1 for the case
 */
export function useLegalReferralsWorkbenchData() {
  useLegalReferralsRealtime();

  const referralsQuery = useQuery({
    queryKey: ["legal-referrals-workbench", "all"],
    queryFn: () => listReferrals({}),
  });

  const infoRequestsQuery = useQuery({
    queryKey: ["legal-referrals-info-open"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("legal_referral_info_request")
        .select("legal_referral_id,due_date,reminder_at,escalation_at,sla_status,status,updated_at")
        .eq("status", "PENDING_SOURCE_RESPONSE")
        .order("due_date", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const intakeIds = useMemo(
    () => Array.from(new Set((referralsQuery.data ?? []).map((r) => r.lg_intake_id).filter(Boolean))) as string[],
    [referralsQuery.data]
  );
  const caseIds = useMemo(
    () => Array.from(new Set((referralsQuery.data ?? []).map((r) => r.legal_case_id).filter(Boolean))) as string[],
    [referralsQuery.data]
  );

  const intakeQuery = useQuery({
    queryKey: ["legal-referrals-workbench-intakes", intakeIds],
    enabled: intakeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_case_intake")
        .select("id,matter_type_code,recommended_case_type_code,recommended_stage_code,recommended_team_code,recommended_workbasket_code")
        .in("id", intakeIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const caseQuery = useQuery({
    queryKey: ["legal-referrals-workbench-cases", caseIds],
    enabled: caseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_case")
        .select("id,case_type_code,current_stage_code,assigned_legal_officer_id,assigned_team_code")
        .in("id", caseIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ["legal-referrals-workbench-assignments", caseIds],
    enabled: caseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_case_assignment")
        .select("lg_case_id,assigned_to_user_id,assigned_at,is_current")
        .in("lg_case_id", caseIds)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const officerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of (caseQuery.data ?? []) as any[]) if (c.assigned_legal_officer_id) ids.add(c.assigned_legal_officer_id);
    for (const a of (assignmentsQuery.data ?? []) as any[]) if (a.assigned_to_user_id) ids.add(a.assigned_to_user_id);
    return Array.from(ids);
  }, [caseQuery.data, assignmentsQuery.data]);

  const profilesQuery = useQuery({
    queryKey: ["legal-referrals-workbench-profiles", officerIds],
    enabled: officerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb.from("profiles").select("id,user_code,full_name").in("id", officerIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const intakeMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const i of (intakeQuery.data ?? []) as any[]) m.set(i.id, i);
    return m;
  }, [intakeQuery.data]);

  const caseMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of (caseQuery.data ?? []) as any[]) m.set(c.id, c);
    return m;
  }, [caseQuery.data]);

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of (profilesQuery.data ?? []) as any[]) m.set(p.id, p);
    return m;
  }, [profilesQuery.data]);

  const caseAssignmentsMap = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const a of (assignmentsQuery.data ?? []) as any[]) {
      const arr = m.get(a.lg_case_id) ?? [];
      arr.push(a);
      m.set(a.lg_case_id, arr);
    }
    return m;
  }, [assignmentsQuery.data]);

  const openByReferral = useMemo(() => {
    const m = new Map<string, any>();
    for (const ir of infoRequestsQuery.data ?? []) {
      const cur = m.get(ir.legal_referral_id);
      if (!cur || (ir.due_date && (!cur.due_date || ir.due_date < cur.due_date))) {
        m.set(ir.legal_referral_id, ir);
      }
    }
    return m;
  }, [infoRequestsQuery.data]);

  const rows: ReferralWorkbenchRow[] = useMemo(() => {
    const base = referralsQuery.data ?? [];
    return base.map((r) => {
      const open = openByReferral.get(r.id);
      const due = open?.due_date ?? null;
      const slaStatus: SlaStatus | null =
        (open?.sla_status as SlaStatus | undefined) ??
        (r.pending_info_request_count > 0 ? "ON_TIME" : null);

      const intake = r.lg_intake_id ? intakeMap.get(r.lg_intake_id) : null;
      const lgCase = r.legal_case_id ? caseMap.get(r.legal_case_id) : null;
      const assignments = r.legal_case_id ? caseAssignmentsMap.get(r.legal_case_id) ?? [] : [];
      const currentAssignment = assignments.find((a) => a.is_current) ?? assignments[0] ?? null;

      const officerUserId =
        currentAssignment?.assigned_to_user_id ??
        lgCase?.assigned_legal_officer_id ??
        null;
      const officerProfile = officerUserId ? profileMap.get(officerUserId) : null;

      const matterType =
        lgCase?.case_type_code ??
        intake?.matter_type_code ??
        intake?.recommended_case_type_code ??
        null;

      const currentStage =
        lgCase?.current_stage_code ??
        intake?.recommended_stage_code ??
        null;

      const assignedTeam =
        lgCase?.assigned_team_code ??
        r.legal_team_code ??
        intake?.recommended_team_code ??
        null;

      const assignedWorkbasket =
        r.legal_workbasket_code ??
        intake?.recommended_workbasket_code ??
        null;

      return {
        ...r,
        matter_type: matterType,
        origin_department: r.source_module,
        assigned_workbasket_code: assignedWorkbasket,
        assigned_team_code: assignedTeam,
        assigned_officer_code: officerProfile?.user_code ?? officerProfile?.full_name ?? null,
        assigned_at: currentAssignment?.assigned_at ?? null,
        reassignment_count: Math.max(0, assignments.length - 1),
        sla_due_date: due,
        sla_status: slaStatus,
        reminder_at: open?.reminder_at ?? null,
        escalation_at: open?.escalation_at ?? null,
        days_remaining: daysBetween(due),
        last_activity_at: r.last_status_at ?? r.updated_at ?? r.created_at,
        current_stage: currentStage,
      };
    });
  }, [referralsQuery.data, openByReferral, intakeMap, caseMap, caseAssignmentsMap, profileMap]);

  return {
    rows,
    isLoading: referralsQuery.isLoading,
    isError: referralsQuery.isError,
    errorMessage: (referralsQuery.error as any)?.message,
    refetch: () => {
      referralsQuery.refetch();
      infoRequestsQuery.refetch();
      intakeQuery.refetch();
      caseQuery.refetch();
      assignmentsQuery.refetch();
      profilesQuery.refetch();
    },
  };
}
