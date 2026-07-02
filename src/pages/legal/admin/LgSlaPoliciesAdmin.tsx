/**
 * EPIC-06C Phase 4 — SLA Policies admin.
 * CRUD on `lg_sla_policy`.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateSlaCache, listSlaPolicies, type SlaPolicy } from "@/services/legal/lgSlaPolicyService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

export default function LgSlaPoliciesAdmin() {
  const { can } = useLgAccess();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<SlaPolicy>>>({});

  const q = useQuery({ queryKey: ["lg-sla-policies"], queryFn: listSlaPolicies });

  const save = useMutation({
    mutationFn: async (row: SlaPolicy) => {
      const patch = edits[row.scope_code] ?? {};
      const { error } = await sb.from("lg_sla_policy").update(patch).eq("scope_code", row.scope_code);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA policy saved");
      invalidateSlaCache();
      qc.invalidateQueries({ queryKey: ["lg-sla-policies"] });
      setEdits({});
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const canEdit = can("configurePolicy" as any) || can("manageTemplates" as any);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SLA Policies</CardTitle>
          <CardDescription>
            Configure hours, reminders, and escalation thresholds for judicial scopes.
            Changes take effect within 60 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Reminder (h)</TableHead>
                <TableHead>Escalate L1 (h)</TableHead>
                <TableHead>Escalate L2 (h)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((row) => {
                const patch = edits[row.scope_code] ?? {};
                const merged = { ...row, ...patch };
                const dirty = !!edits[row.scope_code];
                const upd = (k: keyof SlaPolicy, v: any) =>
                  setEdits((s) => ({ ...s, [row.scope_code]: { ...(s[row.scope_code] ?? {}), [k]: v } }));
                return (
                  <TableRow key={row.scope_code}>
                    <TableCell className="font-mono text-xs">{row.scope_code}</TableCell>
                    <TableCell><Input type="number" className="h-8 w-24" value={merged.hours ?? 0} disabled={!canEdit}
                      onChange={(e) => upd("hours", Number(e.target.value))} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-24" value={merged.reminder_frequency_hours ?? 0} disabled={!canEdit}
                      onChange={(e) => upd("reminder_frequency_hours", Number(e.target.value))} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-24" value={merged.escalation_level_1_hours ?? 0} disabled={!canEdit}
                      onChange={(e) => upd("escalation_level_1_hours", Number(e.target.value))} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-24" value={merged.escalation_level_2_hours ?? 0} disabled={!canEdit}
                      onChange={(e) => upd("escalation_level_2_hours", Number(e.target.value))} /></TableCell>
                    <TableCell><Switch checked={merged.active} disabled={!canEdit} onCheckedChange={(v) => upd("active", v)} /></TableCell>
                    <TableCell>
                      <Button size="sm" disabled={!dirty || !canEdit || save.isPending} onClick={() => save.mutate(row)}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!canEdit && <p className="text-xs text-muted-foreground mt-3">Read-only. Requires legal admin permission.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
