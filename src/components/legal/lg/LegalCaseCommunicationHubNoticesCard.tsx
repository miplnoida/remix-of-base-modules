/**
 * EPIC L4 — Communication Hub notices evidence for a Legal case.
 *
 * Read-only card shown on the LG case detail Overview tab. Lists sent
 * Communication Hub notices linked to this case (via entity_id or
 * case_reference fallback) and deep-links back into the Communication Hub
 * operations pages. No send, resend, or retry actions are exposed.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchLegalCaseCommunications,
  maskEmailForDisplay,
  type LegalCaseCommunicationRow,
} from "@/services/legal/legalCommunicationHubEvidenceService";
import {
  getLegalAssignmentAutomationMode,
  setLegalAssignmentAutomationMode,
  type LegalAssignmentAutomationMode,
} from "@/modules/legal/communication/legalAssignmentWorkflow";
import { useState } from "react";
import { toast } from "sonner";

function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "yyyy-MM-dd HH:mm");
  } catch {
    return String(ts);
  }
}

interface Props {
  caseId: string | null | undefined;
  caseReference: string | null | undefined;
}

export function LegalCaseCommunicationHubNoticesCard({ caseId, caseReference }: Props) {
  const q = useQuery({
    queryKey: ["legal-case-comm-hub-notices", caseId, caseReference],
    queryFn: () => fetchLegalCaseCommunications(caseId ?? null, caseReference ?? null),
    enabled: Boolean(caseId || caseReference),
  });

  const rows: LegalCaseCommunicationRow[] = q.data ?? [];
  const automationMode = getLegalAssignmentAutomationMode();
  const latest = rows[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
  const [automationMode, setAutomationModeState] = useState<LegalAssignmentAutomationMode>(getLegalAssignmentAutomationMode());
  const latest = rows[0];

  const onModeChange = (v: LegalAssignmentAutomationMode) => {
    setLegalAssignmentAutomationMode(v);
    setAutomationModeState(v);
    toast.success(`Assignment automation set to ${v}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" /> Communication Hub Notices
          </CardTitle>
          <CardDescription className="text-xs">
            Read-only. Sent internal notices linked to this case via the Communication Hub spine.
          </CardDescription>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>Assignment automation:</span>
            <select
              className="h-6 text-[11px] border rounded px-1 bg-background"
              value={automationMode}
              onChange={(e) => onModeChange(e.target.value as LegalAssignmentAutomationMode)}
            >
              <option value="disabled">disabled</option>
              <option value="prepare_only">prepare_only (no email)</option>
              <option value="auto_live_internal">auto_live_internal (send)</option>
            </select>
            {latest ? (
              <span>Last: {latest.status ?? "—"} {latest.request_no ? `· ${latest.request_no}` : ""}</span>
            ) : (
              <span>No notices yet</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading ? (
          <div className="text-xs text-muted-foreground">Loading Communication Hub notices…</div>
        ) : q.error ? (
          <div className="text-xs text-destructive">
            Failed to load notices: {(q.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No Communication Hub notices have been sent for this case yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Request</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Mode</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Sent / Delivered</TableHead>
                  <TableHead className="text-xs">Provider msg</TableHead>
                  <TableHead className="text-xs">Template</TableHead>
                  <TableHead className="text-xs text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.request_id}>
                    <TableCell className="font-mono text-[11px]">{r.request_no}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.module_code}</div>
                      <div className="text-muted-foreground">{r.event_code}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {maskEmailForDisplay(r.recipient_email)}
                      {r.recipient_name ? (
                        <div className="text-[10px] text-muted-foreground">{r.recipient_name}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={r.test_mode ? "outline" : "destructive"} className="text-[10px]">
                        {r.test_mode ? "TEST" : "LIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={
                          r.status === "sent" || r.status === "delivered"
                            ? "default"
                            : r.status === "failed" || r.status === "bounced"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {r.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] leading-tight">
                      <div>{fmt(r.sent_at)}</div>
                      {r.delivered_at ? (
                        <div className="text-muted-foreground">delivered {fmt(r.delivered_at)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {r.provider_message_id
                        ? `${r.provider_message_id.slice(0, 12)}…`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {r.template_version_id
                        ? `${r.template_version_id.slice(0, 8)}…`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                        <Link to={r.request_detail_url} title="Open Request Detail">
                          Request <ExternalLink className="h-3 w-3 ml-0.5" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                        <Link to={r.delivery_monitor_url} title="Open Delivery Monitor">
                          Delivery
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                        <Link to={r.lifecycle_log_url} title="Open Lifecycle Log">
                          Lifecycle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LegalCaseCommunicationHubNoticesCard;
