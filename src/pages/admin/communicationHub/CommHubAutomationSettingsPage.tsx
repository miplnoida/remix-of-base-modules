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
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
import CommunicationHubWorkspaceShell from "./components/CommunicationHubWorkspaceShell";
import CommunicationHubDataTable, { type HubTableColumn } from "./components/CommunicationHubDataTable";
import { AbsoluteTime } from "./components/tableFormatters";
import {
  useListAutomationSettings,
  useSetAutomationSetting,
  expectedTypedConfirmation,
  type ModuleAutomationSetting,
} from "./services/moduleAutomationSettingsService";


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
    <CommunicationHubWorkspaceShell
      title="Automation Settings"
      purpose="Control whether modules automatically send, prepare only, or remain disabled. Changes require safeguards and audit trail."
      risk="high-risk"
      permissionModule="system_administration"
    >
      <div className="flex items-center justify-end">
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
          {(() => {
            const rows = list.data ?? [];
            const error = list.error ? (list.error as Error) : null;
            const columns: HubTableColumn<ModuleAutomationSetting>[] = [
              {
                key: "module_event",
                header: "Module / Setting",
                sticky: "left",
                sortable: true,
                sortValue: (s) => `${s.module_code}:${s.setting_key}`,
                cell: (s) => (
                  <div className="text-xs">
                    <div className="font-medium">{s.module_code}</div>
                    <div className="font-mono text-[11px]">{s.setting_key}</div>
                    {s.description && (
                      <div className="text-[10px] text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "current",
                header: "Automation mode",
                sortable: true,
                sortValue: (s) => s.setting_value,
                cell: (s) => (
                  <Badge
                    variant={s.setting_value === "auto_live_internal" ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {s.setting_value}
                  </Badge>
                ),
              },
              {
                key: "allowed",
                header: "Allowed",
                cell: (s) => (
                  <div className="text-[10px] font-mono">{(s.allowed_values ?? []).join(", ")}</div>
                ),
              },
              {
                key: "env",
                header: "Env",
                sortable: true,
                sortValue: (s) => s.environment_scope,
                cell: (s) => <span className="text-[10px]">{s.environment_scope}</span>,
              },
              {
                key: "risk",
                header: "Risk",
                sortable: true,
                sortValue: (s) => s.risk_level,
                cell: (s) => <span className="text-[10px]">{s.risk_level}</span>,
              },
              {
                key: "approval",
                header: "Approval",
                cell: (s) => (
                  <span className="text-[10px]">
                    {s.requires_approval
                      ? (s.approved_at ? <>approved <AbsoluteTime value={s.approved_at} /></> : "pending")
                      : "n/a"}
                  </span>
                ),
              },
              {
                key: "updated",
                header: "Updated",
                sortable: true,
                sortValue: (s) => s.updated_at ?? "",
                cell: (s) => (
                  <div className="text-[10px] leading-tight">
                    <AbsoluteTime value={s.updated_at} />
                    <div className="text-muted-foreground font-mono">{s.updated_by?.slice(0, 8) ?? "—"}</div>
                  </div>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                sticky: "right",
                cell: (s) => (
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
                ),
              },
            ];
            return (
              <CommunicationHubDataTable
                screenKey="comm-hub.automation-settings"
                columns={columns}
                rows={rows}
                getRowKey={(s) => s.id}
                loading={list.isLoading}
                error={error}
                onRetry={() => void list.refetch()}
                defaultSort={{ key: "module_event", direction: "asc" }}
                emptyMessage="No automation settings configured."
              />
            );
          })()}
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
    </CommunicationHubWorkspaceShell>
  );
}
