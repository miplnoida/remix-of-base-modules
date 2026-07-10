/**
 * EPIC CH-P4 — Communication Hub automation settings governance page.
 *
 * Lists shared automation flags per module (currently the Legal assignment
 * automation flag). Admins can switch mode; auto_live_internal requires
 * typed confirmation. All changes are audited via the RPC.
 *
 * No sending is performed here.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useListAutomationSettings,
  useSetAutomationSetting,
  expectedTypedConfirmation,
  type ModuleAutomationSetting,
} from "./services/moduleAutomationSettingsService";

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  try { return format(new Date(ts), "yyyy-MM-dd HH:mm"); } catch { return String(ts); }
}

export default function CommHubAutomationSettingsPage() {
  const list = useListAutomationSettings();
  const setMut = useSetAutomationSetting();
  const [editing, setEditing] = useState<{ setting: ModuleAutomationSetting; value: string } | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const beginEdit = (setting: ModuleAutomationSetting, value: string) => {
    if (value === setting.setting_value) return;
    setEditing({ setting, value });
    setReason("");
    setTyped("");
  };

  const submit = async () => {
    if (!editing) return;
    const expected = expectedTypedConfirmation(editing.setting.module_code, editing.value);
    if (reason.trim().length < 3) return toast.error("Reason required (min 3 chars)");
    if (expected && typed !== expected) return toast.error(`Typed confirmation must be: ${expected}`);
    const res = await setMut.mutateAsync({
      moduleCode: editing.setting.module_code,
      settingKey: editing.setting.setting_key,
      settingValue: editing.value,
      reason,
      typedConfirmation: expected ? typed : null,
      environmentScope: editing.setting.environment_scope,
    });
    if (!res.ok) {
      toast.error(`Blocked: ${res.error}${res.expected ? ` — expected: ${res.expected}` : ""}`);
      return;
    }
    toast.success(`${editing.setting.setting_key} set to ${editing.value}`);
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Automation Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Shared, DB-backed automation flags for module workflow → Communication Hub triggers.
            Changes are audited in communication_hub_control_audit.
          </p>
          <div className="text-[11px] text-muted-foreground pt-1 flex gap-2">
            <Link className="underline" to="/admin/communication-hub/governance">Governance</Link>
            <Link className="underline" to="/admin/communication-hub/governance/send-policies">Send Policies</Link>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
          <RefreshCw className={`h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Registered settings</CardTitle>
          <CardDescription className="text-xs">One row per (module, setting, environment).</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : list.error ? (
            <div className="text-xs text-destructive">Failed to load: {(list.error as Error).message}</div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="text-xs text-muted-foreground">No settings registered yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Setting</TableHead>
                  <TableHead className="text-xs">Current</TableHead>
                  <TableHead className="text-xs">Allowed</TableHead>
                  <TableHead className="text-xs">Env</TableHead>
                  <TableHead className="text-xs">Risk</TableHead>
                  <TableHead className="text-xs">Approval</TableHead>
                  <TableHead className="text-xs">Updated</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(list.data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-medium">{s.module_code}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-mono">{s.setting_key}</div>
                      {s.description && (
                        <div className="text-[10px] text-muted-foreground">{s.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.setting_value === "auto_live_internal" ? "destructive" : "outline"} className="text-[10px]">
                        {s.setting_value}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono">
                      {(s.allowed_values ?? []).join(", ")}
                    </TableCell>
                    <TableCell className="text-[10px]">{s.environment_scope}</TableCell>
                    <TableCell className="text-[10px]">{s.risk_level}</TableCell>
                    <TableCell className="text-[10px]">
                      {s.requires_approval ? (s.approved_at ? `approved ${fmt(s.approved_at)}` : "pending") : "n/a"}
                    </TableCell>
                    <TableCell className="text-[10px] leading-tight">
                      <div>{fmt(s.updated_at)}</div>
                      <div className="text-muted-foreground font-mono">{s.updated_by?.slice(0, 8) ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {s.allowed_values.map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={v === s.setting_value ? "default" : "outline"}
                            className="h-6 px-2 text-[10px]"
                            onClick={() => beginEdit(s, v)}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Change {editing.setting.module_code} · {editing.setting.setting_key} → <code>{editing.value}</code>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {editing.value === "auto_live_internal" && (
              <div className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> This enables automatic live internal emails when workflow events occur.
              </div>
            )}
            <div>
              <Label className="text-xs">Reason (audited)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change?" />
            </div>
            {editing.value === "auto_live_internal" && (
              <div>
                <Label className="text-xs">Typed confirmation</Label>
                <Input
                  className="font-mono"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={expectedTypedConfirmation(editing.setting.module_code, editing.value) ?? ""}
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={submit} disabled={setMut.isPending}>Confirm change</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
