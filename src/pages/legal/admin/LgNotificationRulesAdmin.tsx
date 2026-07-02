/**
 * EPIC-06C Phase 4 — Notification Rules admin.
 * Toggle channels and templates per judicial event.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateNotificationRuleCache } from "@/services/legal/lgNotificationRuleEngine";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

interface Rule {
  event_code: string;
  event_label: string;
  in_app: boolean;
  email: boolean;
  doc_queue: boolean;
  task_queue: boolean;
  template_code: string | null;
  active: boolean;
}

export default function LgNotificationRulesAdmin() {
  const { can } = useLgAccess();
  const canEdit = can("configurePolicy" as any) || can("manageTemplates" as any);
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<Rule>>>({});

  const q = useQuery({
    queryKey: ["lg-notification-rules"],
    queryFn: async () => {
      const { data, error } = await sb.from("lg_notification_rule").select("*").order("event_code");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Rule) => {
      const patch = edits[row.event_code] ?? {};
      const { error } = await sb.from("lg_notification_rule").update(patch).eq("event_code", row.event_code);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule saved");
      invalidateNotificationRuleCache();
      qc.invalidateQueries({ queryKey: ["lg-notification-rules"] });
      setEdits({});
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification Rules</CardTitle>
          <CardDescription>
            Enable channels for each judicial event. Doc queue requires a mapped template registry entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>In-App</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Doc Queue</TableHead>
                <TableHead>Task Queue</TableHead>
                <TableHead>Template Code</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((row) => {
                const patch = edits[row.event_code] ?? {};
                const merged = { ...row, ...patch };
                const dirty = !!edits[row.event_code];
                const upd = (k: keyof Rule, v: any) =>
                  setEdits((s) => ({ ...s, [row.event_code]: { ...(s[row.event_code] ?? {}), [k]: v } }));
                return (
                  <TableRow key={row.event_code}>
                    <TableCell>
                      <div className="font-mono text-xs">{row.event_code}</div>
                      <div className="text-xs text-muted-foreground">{row.event_label}</div>
                    </TableCell>
                    <TableCell><Switch checked={merged.in_app} disabled={!canEdit} onCheckedChange={(v) => upd("in_app", v)} /></TableCell>
                    <TableCell><Switch checked={merged.email} disabled={!canEdit} onCheckedChange={(v) => upd("email", v)} /></TableCell>
                    <TableCell><Switch checked={merged.doc_queue} disabled={!canEdit} onCheckedChange={(v) => upd("doc_queue", v)} /></TableCell>
                    <TableCell><Switch checked={merged.task_queue} disabled={!canEdit} onCheckedChange={(v) => upd("task_queue", v)} /></TableCell>
                    <TableCell><Input className="h-8" value={merged.template_code ?? ""} disabled={!canEdit}
                      onChange={(e) => upd("template_code", e.target.value || null)} /></TableCell>
                    <TableCell><Switch checked={merged.active} disabled={!canEdit} onCheckedChange={(v) => upd("active", v)} /></TableCell>
                    <TableCell>
                      <Button size="sm" disabled={!dirty || !canEdit || save.isPending} onClick={() => save.mutate(row)}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
