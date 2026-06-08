/**
 * Audit tab — comprehensive validation report for facts and rules.
 * Read-only: every row shows issue type, current value, suggested fix, and severity.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEligibilityFacts } from '@/hooks/bn/useEligibilityFacts';
import { useRuleCatalogue } from '@/hooks/bn/useRuleCatalogue';
import { useDataSources, useDataFields } from '@/hooks/bn/useDataDictionary';
import { auditRuleCatalogue, type AuditIssue } from '@/services/bn/ruleCatalogueAuditService';

export function AuditTab() {
  const { data: facts = [], isLoading: l1 } = useEligibilityFacts();
  const { data: rules = [], isLoading: l2 } = useRuleCatalogue();
  const { data: sources = [] } = useDataSources();
  const { data: fields = [] } = useDataFields();
  const loading = l1 || l2;

  const report = useMemo(
    () => auditRuleCatalogue(facts as any, rules as any, sources as any, fields as any),
    [facts, rules, sources, fields],
  );

  const [subjectFilter, setSubjectFilter] = useState<'ALL' | 'FACT' | 'RULE'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'BLOCKER' | 'WARNING'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => report.issues.filter(i => {
    if (subjectFilter !== 'ALL' && i.subject !== subjectFilter) return false;
    if (severityFilter !== 'ALL' && i.severity !== severityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!i.subject_key.toLowerCase().includes(s) &&
          !i.issue_type.toLowerCase().includes(s) &&
          !i.message.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [report.issues, subjectFilter, severityFilter, search]);

  const c = report.counts;
  const allGood = c.invalidFacts === 0 && c.invalidRules === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {allGood ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
            <CardTitle>Catalogue Audit</CardTitle>
            <Badge variant={allGood ? 'default' : 'destructive'} className="ml-2">
              {allGood ? 'All clear' : `${c.invalidFacts + c.invalidRules} item(s) need attention`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <Stat label="Total Facts" value={c.totalFacts} />
            <Stat label="Valid Facts" value={c.validFacts} tone="ok" />
            <Stat label="Invalid Facts" value={c.invalidFacts} tone={c.invalidFacts ? 'bad' : 'ok'} />
            <Stat label="Facts Missing Resolver" value={c.factsMissingResolver} tone={c.factsMissingResolver ? 'bad' : 'ok'} />
            <Stat label="Facts w/ Invalid Source" value={c.factsInvalidSourceMapping} tone={c.factsInvalidSourceMapping ? 'bad' : 'ok'} />
            <Stat label="Total Rules" value={c.totalRules} />
            <Stat label="Valid Rules" value={c.validRules} tone="ok" />
            <Stat label="Invalid Rules" value={c.invalidRules} tone={c.invalidRules ? 'bad' : 'ok'} />
            <Stat label="Rules Missing Fact" value={c.rulesMissingFact} tone={c.rulesMissingFact ? 'bad' : 'ok'} />
            <Stat label="Facts w/ Unsupported Op" value={c.factsUnsupportedOperators} tone={c.factsUnsupportedOperators ? 'bad' : 'ok'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <CardTitle className="flex-1">Issues</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search key, type, message" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={subjectFilter} onValueChange={v => setSubjectFilter(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All subjects</SelectItem>
                <SelectItem value="FACT">Facts</SelectItem>
                <SelectItem value="RULE">Rules</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={v => setSeverityFilter(v as any)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All severity</SelectItem>
                <SelectItem value="BLOCKER">Blocker</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No issues match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Suggested Fix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i, idx) => <IssueRow key={`${i.subject_id}-${idx}`} i={i} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'bad' }) {
  const color = tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function IssueRow({ i }: { i: AuditIssue }) {
  return (
    <TableRow>
      <TableCell><Badge variant={i.severity === 'BLOCKER' ? 'destructive' : 'secondary'}>{i.severity}</Badge></TableCell>
      <TableCell><Badge variant="outline">{i.subject}</Badge></TableCell>
      <TableCell className="font-mono text-xs">{i.subject_key}</TableCell>
      <TableCell className="text-xs">{i.issue_type}</TableCell>
      <TableCell className="text-xs">{i.message}</TableCell>
      <TableCell className="font-mono text-xs">{i.current_value ?? '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{i.suggested_fix ?? ''}</TableCell>
    </TableRow>
  );
}
