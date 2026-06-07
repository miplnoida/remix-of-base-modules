/**
 * RegistryConformanceCard — "Registry / Database Drift" report.
 * - Surfaces structural ERRORS (null/duplicate rules, invalid roles, orphans).
 * - Surfaces drift WARNINGS (DB has values registry doesn't, and vice versa).
 * - Provides a "Generate Registry Suggestions from DB" dev export (JSON download).
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  runRegistryValidation,
  generateRegistrySuggestions,
  type RegistryValidationReport,
  type RegistryFinding,
} from '@/services/bn/bnRegistryValidationService';

import { formatAuditTimestamp, formatNumber } from '@/lib/culture/culture';
const CATEGORY_LABEL: Record<RegistryFinding['category'], string> = {
  TRANSITION: 'Transition Matrix',
  FORMULA_VARIABLE: 'Formula Variables',
  ELIGIBILITY_KEY: 'Eligibility Field Keys',
  SMART_FIELD_TYPE: 'Smart Field Types',
  WORKFLOW_ROLE: 'Workflow Roles',
  ORPHAN_REFERENCE: 'Orphan / Inactive Refs',
};

export function RegistryConformanceCard() {
  const [report, setReport] = useState<RegistryValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<RegistryFinding['category'] | 'ALL'>('ALL');

  const run = async () => {
    setLoading(true);
    try {
      const r = await runRegistryValidation();
      setReport(r);
      if (r.errors === 0 && r.warnings === 0) toast.success('No drift or structural issues detected');
      else toast.message(`${r.errors} error(s), ${r.warnings} warning(s)`);
    } catch (e: any) {
      toast.error('Drift check failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const exportSuggestions = async () => {
    setExporting(true);
    try {
      const data = await generateRegistrySuggestions();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bn-transition-registry-suggestion-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Registry suggestion exported', {
        description: 'Dev preview only — review before updating transitionRegistry.ts',
      });
    } catch (e: any) {
      toast.error('Export failed', { description: e.message });
    } finally {
      setExporting(false);
    }
  };

  const findings = report
    ? filter === 'ALL'
      ? report.findings
      : report.findings.filter((f) => f.category === filter)
    : [];

  const categories: RegistryFinding['category'][] = [
    'TRANSITION', 'FORMULA_VARIABLE', 'ELIGIBILITY_KEY', 'SMART_FIELD_TYPE', 'WORKFLOW_ROLE', 'ORPHAN_REFERENCE',
  ];

  const drift = report?.drift;
  const hasDrift =
    drift &&
    (drift.statusesInDbMissingFromRegistry.length ||
      drift.actionsInDbMissingFromRegistry.length ||
      drift.statusesInRegistryUnusedInDb.length ||
      drift.actionsInRegistryUnusedInDb.length);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Registry / Database Drift
          </CardTitle>
          <CardDescription>
            The database transition matrix is the runtime source of truth. This report flags
            structural errors (nulls, duplicates, invalid roles, orphan refs) and shows where the
            typed registries have drifted from the live DB.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportSuggestions} disabled={exporting} variant="outline" size="sm">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate Registry Suggestions from DB
          </Button>
          <Button onClick={run} disabled={loading} size="sm">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {report ? 'Re-run' : 'Run Checks'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report ? (
          <p className="text-sm text-muted-foreground py-4">
            Click <strong>Run Checks</strong> to evaluate the live BN configuration.
          </p>
        ) : (
          <>
            <Alert variant={report.errors > 0 ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {report.errors} error(s), {report.warnings} warning(s)
              </AlertTitle>
              <AlertDescription>Last run: {formatAuditTimestamp(report.ranAt)}</AlertDescription>
            </Alert>

            {hasDrift && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Registry vs DB Drift</CardTitle>
                  <CardDescription className="text-xs">
                    Differences between typed registry constants and live transition rules. These
                    are informational — claim processing uses the DB, not the registry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <DriftList title="Statuses in DB, missing from registry" items={drift!.statusesInDbMissingFromRegistry} tone="warning" />
                  <DriftList title="Actions in DB, missing from registry" items={drift!.actionsInDbMissingFromRegistry} tone="warning" />
                  <DriftList title="Statuses in registry, unused in DB" items={drift!.statusesInRegistryUnusedInDb} tone="muted" />
                  <DriftList title="Actions in registry, unused in DB" items={drift!.actionsInRegistryUnusedInDb} tone="muted" />
                </CardContent>
              </Card>
            )}

            {report.findings.length === 0 ? (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>No structural issues</AlertTitle>
                <AlertDescription>All active BN configuration passes structural checks.</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filter === 'ALL' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFilter('ALL')}
                  >
                    All ({report.findings.length})
                  </Badge>
                  {categories.map((c) => {
                    const n = report.findings.filter((f) => f.category === c).length;
                    if (n === 0) return null;
                    return (
                      <Badge
                        key={c}
                        variant={filter === c ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFilter(c)}
                      >
                        {CATEGORY_LABEL[c]} ({n})
                      </Badge>
                    );
                  })}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Category</TableHead>
                      <TableHead className="w-[100px]">Severity</TableHead>
                      <TableHead className="w-[200px]">Entity</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findings.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{CATEGORY_LABEL[f.category]}</TableCell>
                        <TableCell>
                          <Badge variant={f.severity === 'ERROR' ? 'destructive' : 'secondary'}>
                            {f.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{f.entity}</TableCell>
                        <TableCell className="text-sm">{f.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DriftList({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'muted' }) {
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-muted-foreground italic">none</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((v) => (
            <Badge
              key={v}
              variant={tone === 'warning' ? 'secondary' : 'outline'}
              className="font-mono text-[10px]"
            >
              {v}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
