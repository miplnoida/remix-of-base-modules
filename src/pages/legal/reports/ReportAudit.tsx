/**
 * EPIC-09C Part 12 — Report & Dashboard Audit
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listReportAudit, type LegalReportAuditEvent } from "@/services/legal/lgReportGovernanceService";

const EVENTS: LegalReportAuditEvent[] = [
  "dashboard_view", "report_open", "export", "print", "email",
  "schedule_create", "schedule_delete", "dashboard_share",
  "dashboard_modify", "filter_change", "drilldown", "certification_change",
];

export default function ReportAudit() {
  const [event, setEvent] = useState<string>("__all");
  const { data, isLoading } = useQuery({
    queryKey: ["report-audit", event],
    queryFn: () => listReportAudit({ limit: 300, event_type: event === "__all" ? undefined : (event as LegalReportAuditEvent) }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Report Audit"
        subtitle="Every dashboard view, report open, export, share, filter change and certification change is logged."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Audit" }]}
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Enterprise Audit Log</CardTitle>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All events</SelectItem>
                {EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Event</TableHead><TableHead>Report</TableHead>
              <TableHead>Actor</TableHead><TableHead>Metadata</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Loading…</TableCell></TableRow>
                : data?.length ? data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.occurred_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{r.event_type}</Badge></TableCell>
                    <TableCell className="text-xs">{r.report_code ?? r.dashboard_id ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{String(r.actor_user_id).slice(0, 8)}…</TableCell>
                    <TableCell className="text-[10px] font-mono truncate max-w-[300px]">{JSON.stringify(r.metadata_json ?? {})}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No audit events recorded.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
