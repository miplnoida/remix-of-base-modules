/**
 * RegistryConformanceCard — runs client-side BN registry checks and lists findings.
 * Surfaces gaps that aren't caught by server-side product validation.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  runRegistryValidation,
  type RegistryValidationReport,
  type RegistryFinding,
} from '@/services/bn/bnRegistryValidationService';

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
  const [filter, setFilter] = useState<RegistryFinding['category'] | 'ALL'>('ALL');

  const run = async () => {
    setLoading(true);
    try {
      const r = await runRegistryValidation();
      setReport(r);
      if (r.errors === 0 && r.warnings === 0) {
        toast.success('Registry conformance: clean');
      } else {
        toast.message(`${r.errors} error(s), ${r.warnings} warning(s)`);
      }
    } catch (e: any) {
      toast.error('Registry check failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const findings = report
    ? filter === 'ALL'
      ? report.findings
      : report.findings.filter((f) => f.category === filter)
    : [];

  const categories: RegistryFinding['category'][] = [
    'TRANSITION',
    'FORMULA_VARIABLE',
    'ELIGIBILITY_KEY',
    'SMART_FIELD_TYPE',
    'WORKFLOW_ROLE',
    'ORPHAN_REFERENCE',
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Registry Conformance Checks
          </CardTitle>
          <CardDescription>
            Cross-checks transitions, formulas, eligibility keys, smart-field types, workflow roles
            and orphan references against the typed registries. Fix offenders in their source
            library (or remove inactive refs from Product Catalog).
          </CardDescription>
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {report ? 'Re-run' : 'Run Checks'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report ? (
          <p className="text-sm text-muted-foreground py-4">
            Click <strong>Run Checks</strong> to evaluate the live BN configuration against the
            registries.
          </p>
        ) : report.findings.length === 0 ? (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>All active BN configuration conforms to the registries</AlertTitle>
            <AlertDescription>
              Last run: {new Date(report.ranAt).toLocaleString()}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant={report.errors > 0 ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {report.errors} error(s), {report.warnings} warning(s)
              </AlertTitle>
              <AlertDescription>
                Last run: {new Date(report.ranAt).toLocaleString()}
              </AlertDescription>
            </Alert>

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
      </CardContent>
    </Card>
  );
}
