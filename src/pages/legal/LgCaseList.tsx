import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Loader2, Scale } from "lucide-react";
import { useLgCases, useLgReference } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { formatDateForDisplay } from "@/lib/format-config";
import { NewCaseDialog } from "@/components/legal/lg/NewCaseDialog";

export default function LgCaseList() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const [params, setParams] = useSearchParams();
  const [newOpen, setNewOpen] = useState(false);

  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";

  const { data: cases = [], isLoading } = useLgCases({
    search: search || undefined,
    current_stage_code: stage || undefined,
    status_code: status || undefined,
    priority_code: priority || undefined,
  });
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");
  const { data: statuses = [] } = useLgReference("LG_CASE_STATUS");

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    const head = ["lg_case_no", "case_type_code", "current_stage_code", "status_code", "priority_code", "next_hearing_date", "claim_amount", "outstanding_amount_snapshot", "opened_date"];
    const rows = [head.join(",")].concat(cases.map((c) => head.map((h) => JSON.stringify((c as any)[h] ?? "")).join(",")));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `legal-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const stageLabel = useMemo(() => (code: string) => stages.find((s) => s.code === code)?.label ?? code, [stages]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" /> Legal Cases</h1>
            <p className="text-sm text-muted-foreground">All legal cases tracked in lg_case.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={isLoading || cases.length === 0}><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button
              onClick={() => setNewOpen(true)}
              disabled={!access.can("createCase")}
              title={!access.can("createCase") ? "You do not have permission to create cases" : undefined}
            >
              <Plus className="h-4 w-4 mr-1" /> New Case
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search case no, court no, summary…" value={search} onChange={(e) => setParam("q", e.target.value)} />
            </div>
            <Select value={stage || "ALL"} onValueChange={(v) => setParam("stage", v === "ALL" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stages</SelectItem>
                {stages.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || "ALL"} onValueChange={(v) => setParam("status", v === "ALL" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(statuses.length ? statuses : [{ code: "OPEN", label: "Open" }, { code: "CLOSED", label: "Closed" }, { code: "SETTLED", label: "Settled" }]).map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority || "ALL"} onValueChange={(v) => setParam("priority", v === "ALL" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Next Hearing</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /> Loading…</TableCell></TableRow>
                ) : cases.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No cases match these filters.</TableCell></TableRow>
                ) : cases.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/legal/lg/cases/${c.id}`)}>
                    <TableCell className="font-medium">{c.lg_case_no}</TableCell>
                    <TableCell>{c.case_type_code}</TableCell>
                    <TableCell>{stageLabel(c.current_stage_code)}</TableCell>
                    <TableCell><Badge variant="outline">{c.status_code}</Badge></TableCell>
                    <TableCell><Badge variant={c.priority_code === "HIGH" || c.priority_code === "URGENT" ? "destructive" : "secondary"}>{c.priority_code}</Badge></TableCell>
                    <TableCell>{c.next_hearing_date ? formatDateForDisplay(c.next_hearing_date) : "—"}</TableCell>
                    <TableCell className="text-right">{c.outstanding_amount_snapshot ? Number(c.outstanding_amount_snapshot).toFixed(2) : "—"}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/legal/lg/cases/${c.id}`); }}>Open</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <NewCaseDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
