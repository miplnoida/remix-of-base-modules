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
 * Loads referrals + open info-requests and decorates them with assignment + SLA fields
 * required by the Enterprise Workbench. Subscribes to realtime so cards/queues
 * refresh automatically on inserts, status changes, assignments, and info-request updates.
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
      const anyR = r as any;
      return {
        ...r,
        matter_type: anyR.matter_type ?? anyR.case_type_code ?? null,
        origin_department: r.source_module,
        assigned_workbasket_code: r.legal_workbasket_code,
        assigned_team_code: r.legal_team_code,
        assigned_officer_code:
          anyR.assigned_to_user_code ?? anyR.assigned_officer_code ?? null,
        assigned_at: anyR.assigned_at ?? null,
        reassignment_count: anyR.reassignment_count ?? 0,
        sla_due_date: due,
        sla_status: slaStatus,
        reminder_at: open?.reminder_at ?? null,
        escalation_at: open?.escalation_at ?? null,
        days_remaining: daysBetween(due),
        last_activity_at: r.last_status_at ?? r.updated_at ?? r.created_at,
        current_stage: anyR.current_stage ?? anyR.stage_code ?? null,
      };
    });
  }, [referralsQuery.data, openByReferral]);

  return {
    rows,
    isLoading: referralsQuery.isLoading,
    isError: referralsQuery.isError,
    errorMessage: (referralsQuery.error as any)?.message,
    refetch: () => {
      referralsQuery.refetch();
      infoRequestsQuery.refetch();
    },
  };
}
