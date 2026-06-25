import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileSignature } from "lucide-react";
import { listReviews, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

export default function MyContractReviews() {
  const nav = useNavigate();
  const { userCode } = useUserCode();
  const [rows, setRows] = useState<ContractReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userCode) return;
    setLoading(true);
    listReviews({ mineUserCode: userCode }).then(setRows).finally(() => setLoading(false));
  }, [userCode]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" /> My Contract Review Requests</h1>
        <Button onClick={() => nav("/legal/contract-review/new")}><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>My Requests & Assignments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Request #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>SLA</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No requests yet</TableCell></TableRow>}
              {rows.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => nav(`/legal/contract-review/${r.id}`)}>
                  <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                  <TableCell className="font-medium">{r.contract_title}</TableCell>
                  <TableCell className="text-xs">{r.contract_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{r.source_department}</TableCell>
                  <TableCell><Badge>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>{r.sla_due_at ? formatDateForDisplay(r.sla_due_at) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
