/**
 * EPIC L4 + EPIC CH-P4 — Communication Hub notices evidence + shared automation setting.
 *
 * Reads the DB-backed automation setting via useAutomationSetting.
 * Mode changes flow through the shared governance service (with reason +
 * typed confirmation for auto_live_internal).
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, ExternalLink, RefreshCw, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  useAutomationSetting,
  useSetAutomationSetting,
  expectedTypedConfirmation,
} from "@/pages/admin/communicationHub/services/moduleAutomationSettingsService";
import { LEGAL_ASSIGNMENT_AUTOMATION_KEY } from "@/modules/legal/communication/legalAssignmentWorkflow";

const MODULE = "LEGAL";

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

  const settingQ = useAutomationSetting(MODULE, LEGAL_ASSIGNMENT_AUTOMATION_KEY);
  const setMut = useSetAutomationSetting();

  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const rows: LegalCaseCommunicationRow[] = q.data ?? [];
  const setting = settingQ.data ?? null;
  const currentMode = setting?.setting_value ?? "prepare_only";
  const allowed = setting?.allowed_values ?? ["disabled", "prepare_only", "auto_live_internal"];
  const latest = rows[0];

  const beginChange = (value: string) => {
    if (value === currentMode) return;
    setPendingValue(value);
    setReason("");
    setTyped("");
  };

  const confirmChange = async () => {
    if (!pendingValue) return;
    if (reason.trim().length < 3) {
      toast.error("Reason (min 3 chars) required");
      return;
    }
    const expected = expectedTypedConfirmation(MODULE, pendingValue);
    if (expected && typed !== expected) {
      toast.error(`Typed confirmation must be: ${expected}`);
      return;
    }
    const res = await setMut.mutateAsync({
      moduleCode: MODULE,
      settingKey: LEGAL_ASSIGNMENT_AUTOMATION_KEY,
      settingValue: pendingValue,
      reason,
      typedConfirmation: expected ? typed : null,
    });
    if (!res.ok) {
      toast.error(`Change blocked: ${res.error}${res.expected ? ` — expected: ${res.expected}` : ""}`);
      return;
    }
    toast.success(`Automation set to ${pendingValue}`);
    setPendingValue(null);
    setReason("");
    setTyped("");
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
            <span>Assignment automation (DB shared):</span>
            <Badge variant="outline" className="text-[10px]">{settingQ.isLoading ? "…" : currentMode}</Badge>
            <Link
              to="/admin/communication-hub/governance/automation-settings"
              className="text-primary underline text-[10px] inline-flex items-center gap-0.5"
            >
              <Settings className="h-3 w-3" /> Governance
            </Link>
            {latest ? (
              <span>· Last: {latest.status ?? "—"} {latest.request_no ? `· ${latest.request_no}` : ""}</span>
            ) : (
              <span>· No notices yet</span>
            )}
          </div>
          <div className="flex items-center gap-1 pt-1">
            {allowed.map((v) => (
              <Button
                key={v}
                variant={v === currentMode ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => beginChange(v)}
                disabled={setMut.isPending || settingQ.isLoading}
              >
                {v}
              </Button>
            ))}
          </div>
          {pendingValue && (
            <div className="mt-2 space-y-1 border rounded p-2 bg-muted/40">
              <div className="text-[11px] font-medium">Change to <code>{pendingValue}</code></div>
              <input
                className="w-full h-7 text-[11px] border rounded px-2 bg-background"
                placeholder="Reason (required, min 3 chars)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {pendingValue === "auto_live_internal" && (
                <>
                  <div className="text-[10px] text-destructive">
                    This enables automatic live internal emails when workflow events occur.
                  </div>
                  <input
                    className="w-full h-7 text-[11px] border rounded px-2 bg-background font-mono"
                    placeholder={expectedTypedConfirmation(MODULE, "auto_live_internal") ?? ""}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                  />
                </>
              )}
              <div className="flex gap-1">
                <Button size="sm" className="h-6 px-2 text-[10px]" onClick={confirmChange} disabled={setMut.isPending}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setPendingValue(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
