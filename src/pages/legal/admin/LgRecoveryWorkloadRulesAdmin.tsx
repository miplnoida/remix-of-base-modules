/**
 * EPIC-06D — Recovery Workload Rules admin.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listWorkloadRules, upsertWorkloadRule } from "@/services/legal/lgRecoveryCampaignService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

export default function LgRecoveryWorkloadRulesAdmin() {
  const { can } = useLgAccess();
  const { user } = useSupabaseAuth();
  const actor = user?.email ?? user?.id ?? "system";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lg-workload-rules"], queryFn: listWorkloadRules });
  const [row, setRow] = useState({ code: "", name: "", max_active_assignments: 50, max_high_priority: 10, warning_threshold_pct: 80, critical_threshold_pct: 100 });
  const save = useMutation({
    mutationFn: () => upsertWorkloadRule(row as any, actor),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["lg-workload-rules"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  if (!can("configureWorkloadRules")) return <div className="p-6">Access denied.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Recovery Workload Rules</CardTitle><CardDescription>Capacity thresholds that drive workload balancer warnings.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead>
              <TableHead>Max Active</TableHead><TableHead>Max High Pri</TableHead>
              <TableHead>Warn %</TableHead><TableHead>Crit %</TableHead>
              <TableHead>Default</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.max_active_assignments}</TableCell>
                  <TableCell>{r.max_high_priority}</TableCell>
                  <TableCell>{r.warning_threshold_pct}</TableCell>
                  <TableCell>{r.critical_threshold_pct}</TableCell>
                  <TableCell>{r.is_default ? "Yes" : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-6 border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Add rule</div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Code" value={row.code} onChange={(e) => setRow({ ...row, code: e.target.value.toUpperCase() })} />
              <Input placeholder="Name" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
              <Input type="number" placeholder="Max Active" value={row.max_active_assignments} onChange={(e) => setRow({ ...row, max_active_assignments: Number(e.target.value) })} />
              <Input type="number" placeholder="Max High Priority" value={row.max_high_priority} onChange={(e) => setRow({ ...row, max_high_priority: Number(e.target.value) })} />
              <Input type="number" placeholder="Warning %" value={row.warning_threshold_pct} onChange={(e) => setRow({ ...row, warning_threshold_pct: Number(e.target.value) })} />
              <Input type="number" placeholder="Critical %" value={row.critical_threshold_pct} onChange={(e) => setRow({ ...row, critical_threshold_pct: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end"><Button size="sm" disabled={!row.code || !row.name} onClick={() => save.mutate()}>Add</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
