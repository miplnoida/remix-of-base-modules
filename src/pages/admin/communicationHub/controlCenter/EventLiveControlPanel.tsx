/**
 * Event Live Control panel — Phase 1C-B9-B-A-2.
 *
 * Lists every row in `communication_hub_event_live_control` and lets an
 * admin move an event between:
 *   disabled | dry_run_only | live_manual_only | live_cron_allowed
 *
 * All writes go through the SECURITY DEFINER RPC `set_event_live_control`,
 * which enforces:
 *  - caller has the Admin role
 *  - non-empty reason
 *  - typed confirmation for any move INTO a live status
 *  - phase guardrails: only COMM_HUB/ADMIN_TEST_NOTICE may go
 *    `live_manual_only`; `live_cron_allowed` is refused for every event
 *
 * This panel never sends email, never touches gates, never invokes cron.
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import { AbsoluteTime } from "../components/tableFormatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, ShieldCheck, RefreshCcw, Zap } from "lucide-react";

type EventStatus = "disabled" | "dry_run_only" | "live_manual_only" | "live_cron_allowed";
type RiskLevel = "low" | "medium" | "high" | "sensitive";

interface Row {
  id: string;
  module_code: string;
  event_code: string;
  status: EventStatus;
  risk_level: RiskLevel;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<EventStatus, string> = {
  disabled: "Disabled",
  dry_run_only: "Dry-run only",
  live_manual_only: "Live — manual only",
  live_cron_allowed: "Live — cron allowed",
};

const STATUS_VARIANT: Record<EventStatus, "outline" | "secondary" | "default" | "destructive"> = {
  disabled: "outline",
  dry_run_only: "secondary",
  live_manual_only: "destructive",
  live_cron_allowed: "destructive",
};

const RISK_VARIANT: Record<RiskLevel, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  sensitive: "destructive",
};

const SENSITIVE_MODULES = new Set(["BENEFITS", "LEGAL", "COMPLIANCE", "FINANCE", "MEDICAL"]);

function expectedTyped(module: string, event: string, status: EventStatus) {
  return `ENABLE ${status} FOR ${module}/${event}`;
}

export function EventLiveControlPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [newStatus, setNewStatus] = useState<EventStatus>("dry_run_only");
  const [newRisk, setNewRisk] = useState<RiskLevel>("low");
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await (supabase as any)
        .from("communication_hub_event_live_control")
        .select("id, module_code, event_code, status, risk_level, reason, changed_by, changed_at, updated_at")
        .order("module_code").order("event_code");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message ?? "unknown");
      setLoadError(err);
      toast.error(`Failed to load event live control: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(r: Row) {
    setEditing(r);
    setNewStatus(r.status);
    setNewRisk(r.risk_level);
    setReason("");
    setTyped("");
  }

  const isLiveTarget = newStatus === "live_manual_only" || newStatus === "live_cron_allowed";
  const needTyped = isLiveTarget;
  const typedExpected = editing ? expectedTyped(editing.module_code, editing.event_code, newStatus) : "";
  const canSave =
    !!editing &&
    reason.trim().length > 0 &&
    (!needTyped || typed === typedExpected) &&
    !saving;

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const actorId = userRes?.user?.id;
      if (!actorId) throw new Error("not authenticated");
      const { data, error } = await (supabase as any).rpc("set_event_live_control", {
        p_module_code: editing.module_code,
        p_event_code: editing.event_code,
        p_new_status: newStatus,
        p_reason: reason.trim(),
        p_risk_level: newRisk,
        p_typed_confirmation: needTyped ? typed : null,
        p_actor_user_id: actorId,
      });
      if (error) throw error;
      toast.success(`Event ${editing.module_code}/${editing.event_code} → ${STATUS_LABEL[newStatus]}`);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(`Failed: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Event Live Control
        </CardTitle>
        <CardDescription>
          Per-event live-send permission. Events default to dry-run; live requires an explicit change here plus every gate open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Guardrails</AlertTitle>
          <AlertDescription className="text-xs">
            Only the internal Admin Test Notice event may currently be moved to live-manual. Cron-allowed live is refused for every event. Sensitive business modules must stay disabled or dry-run.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module / Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Last changed</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                    No event live-control rows yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {r.module_code}<span className="text-muted-foreground"> / </span>{r.event_code}
                    {SENSITIVE_MODULES.has(r.module_code) && (
                      <Badge variant="destructive" className="ml-2">sensitive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={RISK_VARIANT[r.risk_level]}>{r.risk_level}</Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[24ch] truncate" title={r.reason ?? ""}>
                    {r.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{new Date(r.changed_at).toLocaleString()}</div>
                    <div className="text-muted-foreground font-mono">
                      {r.changed_by ? r.changed_by.slice(0, 8) + "…" : "system"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Zap className="h-3.5 w-3.5 mr-1" /> Change
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change event live status</DialogTitle>
            <DialogDescription>
              {editing && (
                <>
                  <code>{editing.module_code}/{editing.event_code}</code> — current status:
                  <Badge variant={STATUS_VARIANT[editing.status]} className="ml-1">
                    {STATUS_LABEL[editing.status]}
                  </Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as EventStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="dry_run_only">Dry-run only</SelectItem>
                  <SelectItem value="live_manual_only">Live — manual only</SelectItem>
                  <SelectItem value="live_cron_allowed">Live — cron allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Risk level</Label>
              <Select value={newRisk} onValueChange={(v) => setNewRisk(v as RiskLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="sensitive">Sensitive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason (required, audited)</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            {needTyped && (
              <div className="space-y-1.5">
                <Label>Typed confirmation — must equal <code>{typedExpected}</code></Label>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={typedExpected} />
              </div>
            )}

            {editing && SENSITIVE_MODULES.has(editing.module_code) && isLiveTarget && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Sensitive module</AlertTitle>
                <AlertDescription className="text-xs">
                  Sensitive module — server will refuse this change under current guardrails.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button
              variant={isLiveTarget ? "destructive" : "default"}
              onClick={save}
              disabled={!canSave}
            >
              Apply change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
