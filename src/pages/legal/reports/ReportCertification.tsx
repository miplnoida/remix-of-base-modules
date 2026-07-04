/**
 * EPIC-09C Part 9 — Report Certification
 * Manage certified/draft/deprecated status, business owner, financial source,
 * data freshness and last-validated timestamp per report.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEGAL_REPORTS } from "@/config/legalReportDefinitions";
import { listCertifications, upsertCertification, type ReportCertification } from "@/services/legal/lgReportGovernanceService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { toast } from "sonner";

const STATUS: ReportCertification["certification_status"][] = ["certified", "draft", "deprecated"];
const TONE: Record<string, "default" | "secondary" | "destructive"> = { certified: "default", draft: "secondary", deprecated: "destructive" };

export default function ReportCertificationPage() {
  const qc = useQueryClient();
  const access = useLgAccess();
  const canManage = access.can("manageReportCertification");
  const q = useQuery({ queryKey: ["cert"], queryFn: listCertifications });
  const [edits, setEdits] = useState<Record<string, Partial<ReportCertification>>>({});

  const merged = useMemo(() => {
    const map = new Map((q.data ?? []).map((r) => [r.report_code, r]));
    return LEGAL_REPORTS.map((def) => {
      const existing = map.get(def.code);
      return {
        def,
        cert: existing ?? {
          report_code: def.code,
          certification_status: def.certification ?? "draft",
          business_owner: def.owner ?? null,
          financial_source: def.financialReconciled ? "v_lg_case_financials" : null,
          data_freshness_minutes: null,
          last_validated_at: null,
          last_validated_by: null,
          notes: null,
        } as ReportCertification,
      };
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: (input: Partial<ReportCertification> & { report_code: string }) => upsertCertification(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cert"] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const patch = (code: string, p: Partial<ReportCertification>) =>
    setEdits((prev) => ({ ...prev, [code]: { ...prev[code], ...p } }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Report Certification"
        subtitle="Certified reports are trusted for board reporting. Draft reports may be revised; deprecated reports are retained for reference only."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Certification" }]}
      />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All {LEGAL_REPORTS.length} Reports</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Report</TableHead><TableHead>Status</TableHead><TableHead>Business Owner</TableHead>
              <TableHead>Financial Source</TableHead><TableHead>Freshness (min)</TableHead>
              <TableHead>Last Validated</TableHead><TableHead className="w-20"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {merged.map(({ def, cert }) => {
                const draft = edits[def.code] ?? {};
                const merged = { ...cert, ...draft };
                return (
                  <TableRow key={def.code}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{def.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{def.code}</div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select value={merged.certification_status} onValueChange={(v) => patch(def.code, { certification_status: v as any })}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <Badge variant={TONE[merged.certification_status]} className="text-[10px]">{merged.certification_status}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Input disabled={!canManage} className="h-8 text-xs" value={merged.business_owner ?? ""} onChange={(e) => patch(def.code, { business_owner: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input disabled={!canManage} className="h-8 text-xs font-mono" value={merged.financial_source ?? ""} onChange={(e) => patch(def.code, { financial_source: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input disabled={!canManage} type="number" className="h-8 text-xs w-20" value={merged.data_freshness_minutes ?? ""} onChange={(e) => patch(def.code, { data_freshness_minutes: e.target.value ? Number(e.target.value) : null })} />
                    </TableCell>
                    <TableCell className="text-xs">{cert.last_validated_at ? new Date(cert.last_validated_at).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      {canManage && Object.keys(draft).length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => save.mutate({ report_code: def.code, ...draft })}>Save</Button>
                      )}
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
