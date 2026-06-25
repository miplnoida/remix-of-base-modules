import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldAlert, Wrench, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCode } from "@/hooks/useUserCode";
import {
  auditAllCases,
  repairCase,
  type CaseIntegrityRow,
} from "@/services/legal/legalCaseIntegrityService";

export default function LegalAdminCaseIntegrity() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const audit = useQuery<CaseIntegrityRow[]>({
    queryKey: ["lg-case-integrity-all"],
    queryFn: () => auditAllCases(),
    staleTime: 30_000,
  });

  const repair = useMutation({
    mutationFn: (caseId: string) => repairCase(caseId, { userCode }),
    onSuccess: (res, caseId) => {
      toast({
        title: "Repair complete",
        description: `Parties +${res.parties_added}/~${res.parties_updated}, actions +${res.actions_created}, docs +${res.documents_linked}`,
      });
      qc.invalidateQueries({ queryKey: ["lg-case-integrity-all"] });
      qc.invalidateQueries({ queryKey: ["lg-case-integrity", caseId] });
    },
    onError: (e: any) => toast({ title: "Repair failed", description: e?.message, variant: "destructive" }),
    onSettled: () => setBusyId(null),
  });

  const rows = (audit.data ?? []).filter(
    (r) =>
      !filter ||
      r.lg_case_no.toLowerCase().includes(filter.toLowerCase()) ||
      (r.source_module ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
            Legal Case Integrity
          </h1>
          <p className="text-sm text-muted-foreground">
            Detect broken referrals (zero amounts, missing parties, unlinked docs, missing actions) and re-import source data.
          </p>
        </div>
        <Button variant="outline" onClick={() => audit.refetch()} disabled={audit.isFetching}>
          {audit.isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Re-scan
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Broken cases ({rows.length})</span>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Filter by case no or source"
                className="pl-8 h-9 w-64"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Scanning cases…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broken cases detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case No</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Source Exp.</TableHead>
                  <TableHead className="text-right">Parties</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Docs</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.lg_case_id}>
                    <TableCell className="font-medium">{r.lg_case_no}</TableCell>
                    <TableCell>{r.source_module ?? "—"}</TableCell>
                    <TableCell className="text-right">{(r.claim_amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(r.source_exposure ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.parties_count}</TableCell>
                    <TableCell className="text-right">{r.actions_count}</TableCell>
                    <TableCell className="text-right">
                      {r.documents_count}
                      {r.source_documents > r.documents_count && (
                        <span className="text-xs text-muted-foreground"> /{r.source_documents}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {r.issues.map((i) => (
                          <Badge
                            key={i.code}
                            variant={i.severity === "ERROR" ? "destructive" : "secondary"}
                            className="text-[10px]"
                            title={i.message}
                          >
                            {i.code}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.lg_case_id}
                        onClick={() => {
                          setBusyId(r.lg_case_id);
                          repair.mutate(r.lg_case_id);
                        }}
                      >
                        {busyId === r.lg_case_id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Wrench className="h-4 w-4 mr-1" />
                        )}
                        Repair
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
