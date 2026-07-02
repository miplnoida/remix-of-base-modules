/**
 * EPIC-06D — Recovery Campaign Types admin.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listCampaignTypes, upsertCampaignType } from "@/services/legal/lgRecoveryCampaignService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

export default function LgRecoveryCampaignTypesAdmin() {
  const { can } = useLgAccess();
  const { user } = useSupabaseAuth();
  const actor = user?.email ?? user?.id ?? "system";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lg-campaign-types"], queryFn: listCampaignTypes });
  const [row, setRow] = useState({ code: "", name: "", description: "" });
  const save = useMutation({
    mutationFn: () => upsertCampaignType(row, actor),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["lg-campaign-types"] }); setRow({ code: "", name: "", description: "" }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  if (!can("configureRecoveryCampaign")) return <div className="p-6">Access denied.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Recovery Campaign Types</CardTitle><CardDescription>Category master for recovery campaigns.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-xs">{r.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-6 border rounded p-3 space-y-2">
            <div className="font-medium text-sm">Add new type</div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Code" value={row.code} onChange={(e) => setRow({ ...row, code: e.target.value.toUpperCase() })} />
              <Input placeholder="Name" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
              <Input placeholder="Description" value={row.description} onChange={(e) => setRow({ ...row, description: e.target.value })} />
            </div>
            <div className="flex justify-end"><Button size="sm" disabled={!row.code || !row.name} onClick={() => save.mutate()}>Add</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
