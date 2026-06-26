import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { legalMatterWorkspaceService } from "@/services/legal/legalMatterWorkspaceService";
import type { SlaStatus } from "@/services/legal/legalReferralSlaService";
import type { LegalReferralRow } from "@/services/legal/legalReferralUnifiedService";
import type { LegalMatterWorkspace } from "@/types/legalMatterWorkspace";
import { LMW_FALLBACK } from "@/types/legalMatterWorkspace";
import { useLegalReferralsRealtime } from "@/hooks/useLegalReferralsRealtime";

export type ReferralStatusValue = LegalReferralRow["status"];

/** Row consumed by the Enterprise Workbench grid. Sourced from
 *  legalMatterWorkspaceService.listForWorkbench — Phase 1 of the
 *  Legal Matter Workspace read layer. */
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
  primary_display_name: string | null;
  workspace: LegalMatterWorkspace;
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

function toRow(ws: LegalMatterWorkspace): ReferralWorkbenchRow {
  const status = (ws.status.referral_status ?? "SUBMITTED_TO_LEGAL") as ReferralStatusValue;
  const slaRaw = ws.sla.sla_status;
  const sla: SlaStatus | null = slaRaw === null ? null : (slaRaw as SlaStatus);

  const base: LegalReferralRow = {
    id: ws.identity.referral_id ?? ws.identity.matter_id,
    referral_no: ws.identity.matter_no,
    source_module: (ws.source.source_module as LegalReferralRow["source_module"]) ?? "BENEFITS",
    source_record_type: ws.source.source_record_type,
    source_record_id: ws.source.source_record_id,
    source_reference_no: ws.source.source_reference_no,
    primary_entity_type: ws.party.primary_entity_type,
    primary_entity_id: ws.party.primary_entity_id,
    submitted_by: ws.source.submitted_by,
    submitted_workbasket_code: null,
    submitted_team_code: ws.source.submitted_department,
    legal_workbasket_code: ws.assignment.workbasket_code,
    legal_team_code: ws.assignment.team_code,
    status,
    legal_case_id: ws.identity.legal_case_id,
    lg_intake_id: ws.identity.intake_id,
    summary: null,
    priority_code: null,
    exposure_amount: null,
    pending_info_request_count: ws.counts.pending_info_request_count,
    last_status_at: ws.latest.last_activity_at ?? new Date(0).toISOString(),
    created_at: ws.source.submitted_at ?? new Date(0).toISOString(),
    updated_at: ws.latest.last_activity_at ?? new Date(0).toISOString(),
  };

  return {
    ...base,
    matter_type: ws.classification.matter_type_code ?? LMW_FALLBACK.notApplicable,
    origin_department: ws.source.source_module ?? null,
    assigned_workbasket_code: ws.assignment.workbasket_code,
    assigned_team_code: ws.assignment.team_code,
    assigned_officer_code: ws.assignment.owner_user_code ?? ws.assignment.owner_name ?? null,
    assigned_at: ws.assignment.assigned_at,
    reassignment_count: ws.assignment.reassignment_count,
    sla_due_date: ws.sla.due_date,
    sla_status: sla,
    reminder_at: null,
    escalation_at: ws.sla.escalation_status ? ws.sla.due_date : null,
    days_remaining: daysBetween(ws.sla.due_date),
    last_activity_at: ws.latest.last_activity_at ?? base.created_at,
    current_stage: ws.status.current_stage_code,
    primary_display_name: ws.party.primary_display_name,
    workspace: ws,
  };
}

export function useLegalReferralsWorkbenchData() {
  useLegalReferralsRealtime();
  const { capability } = useLegalCapability();

  const query = useQuery({
    queryKey: ["legal-matter-workspace-workbench", capability.role],
    queryFn: () => legalMatterWorkspaceService.listForWorkbench({ limit: 1000 }, capability),
    staleTime: 15_000,
  });

  const rows: ReferralWorkbenchRow[] = useMemo(() => {
    return (query.data?.items ?? []).map(toRow);
  }, [query.data]);

  return {
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: (query.error as any)?.message,
    refetch: () => { query.refetch(); },
  };
}
