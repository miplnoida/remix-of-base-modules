/**
 * EPIC-06D — Recovery Strategy Types admin.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { listStrategyTypes, upsertStrategyType } from "@/services/legal/lgRecoveryCampaignService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

export default function LgRecoveryStrategyTypesAdmin() {
  const { can } = useLgAccess();
  const { user } = useSupabaseAuth();
  const actor = user?.email ?? user?.id ?? "system";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lg-strategy-types"], queryFn: listStrategyTypes });
  const [newRow, setNewRow] = useState({ code: "", name: "", description: "", playbook: "[]" });

  const save = useMutation({
    mutationFn: async () => {
      let playbook: any = [];
      try { playbook = JSON.parse(newRow.playbook || "[]"); } catch { throw new Error("Invalid playbook JSON"); }
      await upsertStrategyType({
        code: newRow.code, name: newRow.name, description: newRow.description,
        playbook_json: playbook,
      }, actor);
    },
    onSuccess: () => { toast.success("Strategy saved"); qc.invalidateQueries({ queryKey: ["lg-strategy-types"] }); setNewRow({ code: "", name: "", description: "", playbook: "[]" }); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  if (!can("configureRecoveryStrategy")) return <div className="p-6">Access denied.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recovery Strategy Types</CardTitle>
          <CardDescription>Define playbooks that drive Next Recommended Action.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Playbook steps</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-xs">{r.description}</TableCell>
                  <TableCell>{r.playbook_json?.length ?? 0}</TableCell>
                  <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Add new strategy</div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Code" value={newRow.code} onChange={(e) => setNewRow({ ...newRow, code: e.target.value.toUpperCase() })} />
              <Input placeholder="Name" value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} />
            </div>
            <Input placeholder="Description" value={newRow.description} onChange={(e) => setNewRow({ ...newRow, description: e.target.value })} />
            <Textarea placeholder='Playbook JSON e.g. [{"step":1,"action":"CALL","sla_days":3}]' value={newRow.playbook} onChange={(e) => setNewRow({ ...newRow, playbook: e.target.value })} rows={4} />
            <div className="flex justify-end"><Button size="sm" disabled={!newRow.code || !newRow.name} onClick={() => save.mutate()}>Add</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
