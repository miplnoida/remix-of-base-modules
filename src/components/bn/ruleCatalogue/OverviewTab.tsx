import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { computeAllRuleReadiness, computeCoverageTypeReadiness, isFactReady } from '@/services/bn/readinessService';
import { useCoverageTypes, useCoverageTypeRules } from '@/hooks/bn/useCoverageTypes';
import type { RuleCatalogueItem } from '@/services/bn/ruleCatalogueService';
import type { EligibilityFact } from '@/services/bn/eligibilityFactService';

interface Props {
  rules: RuleCatalogueItem[];
  facts: EligibilityFact[];
}

export function OverviewTab({ rules, facts }: Props) {
  const { data: coverageTypes = [] } = useCoverageTypes();
  const { data: coverageRules = [] } = useCoverageTypeRules();
  const factsReady = useMemo(() => facts.filter(isFactReady).length, [facts]);
  const factsPartial = useMemo(() => facts.filter(f => f.implementation_status === 'PARTIAL').length, [facts]);
  const factsMissing = useMemo(() => facts.filter(f => f.implementation_status === 'NOT_IMPLEMENTED').length, [facts]);

  const ruleReadiness = useMemo(() => computeAllRuleReadiness(rules, facts), [rules, facts]);
  const rulesReady = ruleReadiness.filter(r => r.band === 'READY').length;
  const rulesWarning = ruleReadiness.filter(r => r.band === 'WARNING').length;
  const rulesBlocked = ruleReadiness.filter(r => r.band === 'BLOCKED').length;

  const ctReadiness = useMemo(
    () => computeCoverageTypeReadiness(coverageTypes, coverageRules, ruleReadiness),
    [coverageTypes, coverageRules, ruleReadiness],
  );

  const topBlocked = ruleReadiness.filter(r => r.band === 'BLOCKED').slice(0, 8);

  const Kpi = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'good' | 'warn' | 'bad' }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-destructive' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Facts" value={facts.length} />
        <Kpi label="Facts Ready" value={factsReady} tone="good" />
        <Kpi label="Facts Partial" value={factsPartial} tone="warn" />
        <Kpi label="Facts Missing" value={factsMissing} tone="bad" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Rules" value={rules.length} />
        <Kpi label="Rules Ready" value={rulesReady} tone="good" />
        <Kpi label="Rules Warning" value={rulesWarning} tone="warn" />
        <Kpi label="Rules Blocked" value={rulesBlocked} tone="bad" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-semibold mb-3">Coverage Type Readiness</div>
          {ctReadiness.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No coverage types defined yet. Create one in the Coverage Types tab.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Ready / Warn / Blocked</TableHead>
                  <TableHead className="w-72">Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ctReadiness.map(c => (
                  <TableRow key={c.coverage_type_id}>
                    <TableCell><div className="font-mono text-xs">{c.coverage_code}</div><div className="text-xs text-muted-foreground">{c.coverage_name}</div></TableCell>
                    <TableCell>{c.assigned}</TableCell>
                    <TableCell className="text-xs">
                      <span className="text-emerald-600">{c.ready}</span> / <span className="text-amber-600">{c.warning}</span> / <span className="text-destructive">{c.blocked}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={c.percent} className="h-2" />
                        <Badge variant={c.band === 'READY' ? 'default' : c.band === 'WARNING' ? 'secondary' : 'destructive'}>{c.percent}%</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm font-semibold mb-3">Top Blocked Rules</div>
          {topBlocked.length === 0 ? (
            <p className="text-sm text-emerald-700">All rules are publish-ready.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Missing Facts</TableHead>
                  <TableHead className="w-40">Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBlocked.map(r => (
                  <TableRow key={r.rule_id}>
                    <TableCell><div className="font-mono text-xs">{r.rule_code}</div><div className="text-xs text-muted-foreground">{r.rule_name}</div></TableCell>
                    <TableCell className="text-xs text-destructive">{r.missing_facts.join(', ') || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.percent} className="h-2" />
                        <Badge variant="destructive">{r.percent}%</Badge>
                      </div>
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
