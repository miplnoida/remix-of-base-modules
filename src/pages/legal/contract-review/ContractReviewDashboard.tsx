import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileSignature, Eye, AlertTriangle } from "lucide-react";
import { listReviews, REVIEW_STATUSES, SOURCE_DEPARTMENTS, type ContractReview } from "@/services/legal/contractReviewService";
import { formatDateForDisplay } from "@/lib/format-config";

export default function ContractReviewDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ContractReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [dept, setDept] = useState<string>("");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    listReviews({
      status: status || undefined,
      source_department: dept || undefined,
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [status, dept]);

  const filtered = rows.filter(r =>
    !q ||
    r.contract_title.toLowerCase().includes(q.toLowerCase()) ||
    r.request_no.toLowerCase().includes(q.toLowerCase()) ||
    (r.counterparty_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const stats = {
    total: rows.length,
    inReview: rows.filter(r => r.status === "UNDER_LEGAL_REVIEW").length,
    pending: rows.filter(r => ["SUBMITTED_TO_LEGAL", "INTERNAL_COMMENTS_PENDING"].includes(r.status)).length,
    overdue: rows.filter(r => r.sla_due_at && new Date(r.sla_due_at) < new Date() && !["APPROVED_FINAL", "CLOSED", "REJECTED"].includes(r.status)).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" /> Contract Review</h1>
          <p className="text-sm text-muted-foreground">Internal contract, MOU, and advisory reviews by Legal</p>
        </div>
        <Button onClick={() => navigate("/legal/contract-review/new")}><Plus className="h-4 w-4 mr-1" /> New Review</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Under Review</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.inReview}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending Action</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.pending}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" />Overdue SLA</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">{stats.overdue}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="max-w-xs" placeholder="Search title, request #, counterparty" value={q} onChange={e => setQ(e.target.value)} />
            <Select value={status || "ALL"} onValueChange={v => setStatus(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {REVIEW_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dept || "ALL"} onValueChange={v => setDept(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                {SOURCE_DEPARTMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA Due</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reviews</TableCell></TableRow>}
              {filtered.map(r => {
                const overdue = r.sla_due_at && new Date(r.sla_due_at) < new Date() && !["APPROVED_FINAL", "CLOSED", "REJECTED"].includes(r.status);
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/legal/contract-review/${r.id}`)}>
                    <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                    <TableCell className="font-medium">{r.contract_title}</TableCell>
                    <TableCell className="text-xs">{r.contract_type.replaceAll("_", " ")}</TableCell>
                    <TableCell>{r.source_department}</TableCell>
                    <TableCell>{r.counterparty_name ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "APPROVED_FINAL" ? "default" : r.status === "REJECTED" ? "destructive" : "secondary"}>{r.status.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell className={overdue ? "text-destructive font-semibold" : ""}>{r.sla_due_at ? formatDateForDisplay(r.sla_due_at) : "—"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></TableCell>
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
