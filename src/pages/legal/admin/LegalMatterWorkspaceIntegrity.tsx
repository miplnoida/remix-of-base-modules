import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { runMatterWorkspaceIntegrity } from "@/services/legal/legalMatterWorkspaceService";

const CHECK_LABELS: Record<string, { label: string; description: string }> = {
  MISSING_MATTER_TYPE:    { label: "Missing matter type",     description: "Referral has no matter_type_code." },
  REFERRAL_WITHOUT_LINK:  { label: "Referral without link",   description: "Referral has no linked intake or case." },
  INTAKE_WITHOUT_REFERRAL:{ label: "Intake without referral", description: "Intake exists without a source referral." },
  CASE_WITHOUT_SOURCE:    { label: "Case without source",     description: "Case is not linked to a referral or intake." },
  INVALID_ASSIGNEE:       { label: "Invalid assignee",        description: "Assignment points to an unknown user profile." },
  SLA_MISSING:            { label: "SLA missing",             description: "Pending source request has no SLA due date." },
  DOC_COUNT_LOW:          { label: "No documents",            description: "Open case has no documents or letters recorded." },
};

export default function LegalMatterWorkspaceIntegrity() {
  const { capability } = useLegalCapability();
  const query = useQuery({
    queryKey: ["legal-matter-workspace-integrity", capability.role],
    queryFn: () => runMatterWorkspaceIntegrity(capability),
    staleTime: 30_000,
  });

  const [filter, setFilter] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const issues = query.data?.issues ?? [];
  const counts = query.data?.countsByCode ?? {};

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (activeCode && i.code !== activeCode) return false;
      if (filter.trim()) {
        const t = filter.trim().toLowerCase();
        return i.matter_no.toLowerCase().includes(t) || i.message.toLowerCase().includes(t);
      }
      return true;
    });
  }, [issues, filter, activeCode]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Matter Workspace Integrity</h1>
          <p className="text-sm text-muted-foreground">
            Read-only checks across legal referrals, intakes, cases and assignments to surface unlinked or incomplete matters.
          </p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(CHECK_LABELS).map(([code, meta]) => {
          const n = counts[code] ?? 0;
          const isActive = activeCode === code;
          return (
            <Card
              key={code}
              className={`cursor-pointer transition-shadow ${isActive ? "ring-2 ring-primary" : "hover:shadow-sm"}`}
              onClick={() => setActiveCode(isActive ? null : code)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{meta.label}</span>
                  <Badge variant={n > 0 ? "destructive" : "secondary"}>{n}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {meta.description}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter issues by matter or message…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {activeCode && (
          <Button variant="ghost" size="sm" onClick={() => setActiveCode(null)}>
            Clear check filter
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {activeCode ? `${CHECK_LABELS[activeCode]?.label ?? activeCode} · ${filtered.length}` : `All issues · ${filtered.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {query.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : query.isError ? (
            <div className="text-destructive text-sm">Failed to load integrity report.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-10">No issues detected.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i, idx) => (
                  <TableRow key={`${i.matter_id}-${i.code}-${idx}`}>
                    <TableCell className="text-xs"><Badge variant="outline">{CHECK_LABELS[i.code]?.label ?? i.code}</Badge></TableCell>
                    <TableCell className="font-medium">{i.matter_no}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.message}</TableCell>
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
