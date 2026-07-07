import { PermissionWrapper } from "@/components/ui/permission-wrapper";
/**
 * Validation & Impact — Phase 6.
 *
 * Health surface for the generic configuration engine:
 *   - Coverage: rows per (domain, resource_type), split by scope tier
 *   - Missing GLOBAL fallbacks (the invariant from scope-precedence.md)
 *   - Duplicate priorities within the same scope tier
 *   - Effective window issues (expired / not-yet-active rows still marked active)
 *
 * Read-only: this page never mutates. Fixes are done in the Configuration Center.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { AssignmentRow, ScopeLevel } from "@/lib/configuration/resolver";
import { SCOPE_PRECEDENCE } from "@/lib/configuration/resolver";

interface CoverageKey { domain: string; resource_type: string; }

function ValidationImpactPageInner() {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["config_validation_rows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_configuration_assignment")
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });

  const report = useMemo(() => buildReport(rows), [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading engine state…
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Failed to load</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const healthy =
    report.missingGlobal.length === 0 &&
    report.duplicatePriority.length === 0 &&
    report.expired.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Validation &amp; Impact</h2>
        <p className="text-sm text-muted-foreground">
          Health check for the Configuration Center. Every (domain, resource_type) pair
          consumed at runtime must have a GLOBAL fallback and no ambiguous winners.
        </p>
      </div>

      {healthy ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Engine is healthy</AlertTitle>
          <AlertDescription>
            All active (domain, resource_type) pairs have a GLOBAL fallback, no duplicate priorities
            within a scope tier, and no expired rows still marked active.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{report.missingGlobal.length + report.duplicatePriority.length + report.expired.length} issue(s) found</AlertTitle>
          <AlertDescription>Review the sections below and fix in the Configuration Center.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Coverage by (domain, resource_type)</CardTitle></CardHeader>
        <CardContent>
          {report.coverage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table sticky>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Resource type</TableHead>
                    {SCOPE_PRECEDENCE.map((t) => <TableHead key={t} className="text-right">{t}</TableHead>)}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.coverage.map((c) => {
                    const total = SCOPE_PRECEDENCE.reduce((s, t) => s + (c.byTier[t] ?? 0), 0);
                    const missingGlobal = (c.byTier.GLOBAL ?? 0) === 0;
                    return (
                      <TableRow key={`${c.domain}|${c.resource_type}`}>
                        <TableCell><code className="text-xs">{c.domain}</code></TableCell>
                        <TableCell><code className="text-xs">{c.resource_type}</code></TableCell>
                        {SCOPE_PRECEDENCE.map((t) => (
                          <TableCell key={t} className="text-right text-xs">
                            {t === "GLOBAL" && missingGlobal
                              ? <Badge variant="destructive">0</Badge>
                              : (c.byTier[t] ?? 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <IssueList
        title="Missing GLOBAL fallback"
        emptyLabel="Every configured (domain, resource_type) has a GLOBAL row."
        items={report.missingGlobal.map((k) => `${k.domain} · ${k.resource_type}`)}
      />

      <IssueList
        title="Duplicate priority within scope tier"
        emptyLabel="Every scope tier has a clear winner."
        items={report.duplicatePriority.map(
          (d) => `${d.domain} · ${d.resource_type} · ${d.scope_level} · priority=${d.priority} (${d.count} rows)`,
        )}
      />

      <IssueList
        title="Effective-window issues"
        emptyLabel="All active rows are within their effective window."
        items={report.expired.map(
          (r) => `${r.domain} · ${r.resource_type} · ${r.scope_level} · row ${r.id.slice(0, 8)} · ${r.reason}`,
        )}
      />
    </div>
  );
}

function IssueList({ title, emptyLabel, items }: { title: string; emptyLabel: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {title}
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> {emptyLabel}
          </p>
        ) : (
          <ul className="text-sm space-y-1 list-disc pl-6">
            {items.map((i, idx) => <li key={idx}><code className="text-xs">{i}</code></li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------- Report builder -------------------------------

interface CoverageRow extends CoverageKey {
  byTier: Partial<Record<ScopeLevel, number>>;
}

interface DupRow extends CoverageKey {
  scope_level: ScopeLevel;
  priority: number;
  count: number;
}

interface ExpiredRow {
  id: string;
  domain: string;
  resource_type: string;
  scope_level: ScopeLevel;
  reason: string;
}

interface Report {
  coverage: CoverageRow[];
  missingGlobal: CoverageKey[];
  duplicatePriority: DupRow[];
  expired: ExpiredRow[];
}

function buildReport(rows: AssignmentRow[]): Report {
  const now = new Date();
  const coverageMap = new Map<string, CoverageRow>();
  const dupMap = new Map<string, DupRow>();
  const expired: ExpiredRow[] = [];

  for (const r of rows) {
    if (!r.is_active) continue;
    const key = `${r.domain}|${r.resource_type}`;
    if (!coverageMap.has(key)) {
      coverageMap.set(key, { domain: r.domain, resource_type: r.resource_type, byTier: {} });
    }
    const cov = coverageMap.get(key)!;
    cov.byTier[r.scope_level] = (cov.byTier[r.scope_level] ?? 0) + 1;

    const dk = `${key}|${r.scope_level}|${r.priority}`;
    if (!dupMap.has(dk)) {
      dupMap.set(dk, { domain: r.domain, resource_type: r.resource_type, scope_level: r.scope_level, priority: r.priority, count: 0 });
    }
    dupMap.get(dk)!.count += 1;

    if (r.effective_from && new Date(r.effective_from) > now) {
      expired.push({ id: r.id, domain: r.domain, resource_type: r.resource_type, scope_level: r.scope_level, reason: `active but effective_from ${r.effective_from} is in the future` });
    }
    if (r.effective_to && new Date(r.effective_to) < now) {
      expired.push({ id: r.id, domain: r.domain, resource_type: r.resource_type, scope_level: r.scope_level, reason: `active but effective_to ${r.effective_to} has passed` });
    }
  }

  const coverage = [...coverageMap.values()].sort((a, b) =>
    a.domain.localeCompare(b.domain) || a.resource_type.localeCompare(b.resource_type),
  );
  const missingGlobal = coverage
    .filter((c) => (c.byTier.GLOBAL ?? 0) === 0)
    .map(({ domain, resource_type }) => ({ domain, resource_type }));
  const duplicatePriority = [...dupMap.values()].filter((d) => d.count > 1);

  return { coverage, missingGlobal, duplicatePriority, expired };
}

export default function ValidationImpactPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <ValidationImpactPageInner />
    </PermissionWrapper>
  );
}
