import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Inbox } from "lucide-react";
import { listReviews, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";

type Bucket = "new" | "mine" | "team" | "info-requested" | "under-review" | "final-advice" | "closed";

function buildTitles(moduleName: string, departmentName: string): Record<Bucket, { title: string; desc: string }> {
  return {
    "new":            { title: "New Requests",         desc: `Newly submitted ${moduleName} Advice / Contract Review requests` },
    "mine":           { title: "My Workbasket",        desc: "Requests assigned to me" },
    "team":           { title: "Team Workbasket",      desc: `All open requests across the ${departmentName} team` },
    "info-requested": { title: "Info Requested",       desc: "Awaiting source-department response" },
    "under-review":   { title: "Under Review",         desc: `Active ${moduleName.toLowerCase()} review in progress` },
    "final-advice":   { title: "Final Advice Issued",  desc: "Approved / final advice issued" },
    "closed":         { title: "Closed",               desc: "Closed requests" },
  };
}

export default function AdviceWorkbench({ bucket: bucketProp }: { bucket?: Bucket } = {}) {
  const params = useParams();
  const bucket: Bucket = (bucketProp ?? (params.bucket as Bucket)) || "team";
  const nav = useNavigate();
  const { userCode } = useUserCode();
  const labels = useLegalEnterpriseLabels();
  const [rows, setRows] = useState<ContractReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listReviews({}).then((d) => { setRows(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    switch (bucket) {
      case "new":            return rows.filter(r => r.status === "SUBMITTED_TO_LEGAL");
      case "mine":           return rows.filter(r => userCode && r.assigned_to_user_code === userCode);
      case "team":           return rows.filter(r => !["APPROVED_FINAL","CLOSED","REJECTED"].includes(r.status));
      case "info-requested": return rows.filter(r => r.status === "INFO_REQUESTED");
      case "under-review":   return rows.filter(r => ["LEGAL_TRIAGE","UNDER_REVIEW","LEGAL_COMMENTS_ISSUED","SOURCE_RESPONSE_RECEIVED","THIRD_PARTY_REVIEW","FINAL_LEGAL_REVIEW"].includes(r.status));
      case "final-advice":   return rows.filter(r => ["APPROVED_FINAL","APPROVED_WITH_COMMENTS"].includes(r.status));
      case "closed":         return rows.filter(r => ["CLOSED","REJECTED"].includes(r.status));
      default:               return rows;
    }
  }, [rows, bucket, userCode]);

  const meta = buildTitles(labels.moduleName, labels.departmentName)[bucket];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" /> {meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.desc}</p>
        </div>
        <Button onClick={() => nav("/legal/contract-review/new")}><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>{filtered.length} request{filtered.length === 1 ? "" : "s"}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests in this bucket.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => nav(`/legal/contract-review/${r.id}`)}>
                  <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                  <TableCell>{r.contract_type?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{r.contract_title}</TableCell>
                  <TableCell>{r.source_department}</TableCell>
                  <TableCell><Badge variant="outline">{r.status?.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-xs">{r.sla_due_at ? new Date(r.sla_due_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
