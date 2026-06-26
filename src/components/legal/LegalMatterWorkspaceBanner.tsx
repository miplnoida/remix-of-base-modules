/**
 * LegalMatterWorkspaceBanner
 *
 * Drop-in header that surfaces unified workspace context (identity, party,
 * status, assignment, SLA, counts) for any Legal screen. Reads through
 * useLegalMatterWorkspace — service-driven, capability-aware.
 */
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLegalMatterWorkspace, type LegalMatterRef } from "@/hooks/legal/useLegalMatterWorkspace";
import { LMW_FALLBACK } from "@/types/legalMatterWorkspace";

interface Props {
  matterRef: LegalMatterRef | null | undefined;
  compact?: boolean;
}

function Stat({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={bold ? "font-semibold text-sm" : "font-medium text-sm"}>{value}</div>
    </div>
  );
}

function slaVariant(s: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (s === "OVERDUE" || s === "ESCALATED") return "destructive";
  if (s === "AT_RISK") return "secondary";
  return "outline";
}

export function LegalMatterWorkspaceBanner({ matterRef, compact }: Props) {
  const { data: ws, isLoading, error } = useLegalMatterWorkspace(matterRef);

  if (!matterRef) return null;

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading matter workspace…
        </CardContent>
      </Card>
    );
  }

  if (error || !ws) {
    return (
      <Card className="border-dashed border-destructive/40">
        <CardContent className="py-3 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> Matter workspace unavailable.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="legal-matter-workspace-banner">
      <CardContent className={compact ? "pt-3 pb-3" : "pt-4 pb-4"}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase text-muted-foreground tracking-wide">
                {ws.identity.lifecycle_object_type}
              </span>
              <span className="font-semibold text-base">{ws.identity.matter_no}</span>
              <Badge variant="outline">{ws.classification.category}</Badge>
              <Badge variant="secondary">{ws.status.overall_status}</Badge>
              {ws.status.current_stage_code && (
                <Badge variant="outline">{ws.status.current_stage_code}</Badge>
              )}
              {ws.sla.sla_status && (
                <Badge variant={slaVariant(ws.sla.sla_status)}>
                  SLA: {ws.sla.sla_status}
                  {ws.sla.overdue_days != null && ws.sla.overdue_days > 0 ? ` (${ws.sla.overdue_days}d)` : ""}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {ws.classification.matter_type_name || ws.classification.matter_type_code || LMW_FALLBACK.notApplicable}
              {" · "}
              Source: {ws.source.source_module}
              {ws.source.source_reference_no ? ` (${ws.source.source_reference_no})` : ""}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <Stat label="Primary Party" value={ws.party.primary_display_name || LMW_FALLBACK.unknownParty} />
          <Stat label="Owner" value={ws.assignment.owner_name || ws.assignment.owner_user_code || LMW_FALLBACK.pendingAssignment} />
          <Stat label="Team / Workbasket" value={`${ws.assignment.team_code ?? "—"} / ${ws.assignment.workbasket_code ?? "—"}`} />
          <Stat label="SLA Due" value={ws.sla.due_date || LMW_FALLBACK.notApplicable} />
          <Stat label="Documents" value={ws.counts.document_count} />
          <Stat label="Letters" value={ws.counts.letter_count} />
          <Stat label="Pending Info" value={ws.counts.pending_info_request_count} bold />
        </div>
      </CardContent>
    </Card>
  );
}

export default LegalMatterWorkspaceBanner;
