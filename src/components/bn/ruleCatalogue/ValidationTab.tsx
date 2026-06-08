import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import { validateAllRules, type CheckResult } from '@/services/bn/ruleValidationService';
import type { RuleCatalogueItem } from '@/services/bn/ruleCatalogueService';
import type { EligibilityFact } from '@/services/bn/eligibilityFactService';
import { LegalConfidenceBadge } from './LegalConfidenceBadge';


function ResultIcon({ r }: { r: CheckResult }) {
  if (r === 'PASS') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (r === 'WARNING') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function ValidationTab({ rules, facts }: { rules: RuleCatalogueItem[]; facts: EligibilityFact[] }) {
  const reports = useMemo(() => validateAllRules(rules, facts), [rules, facts]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | CheckResult>('ALL');
  const [search, setSearch] = useState('');

  const filtered = reports.filter(r => {
    if (statusFilter !== 'ALL' && r.overall !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.rule_code.toLowerCase().includes(s) && !r.rule_name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const pass = reports.filter(r => r.overall === 'PASS').length;
  const warn = reports.filter(r => r.overall === 'WARNING').length;
  const fail = reports.filter(r => r.overall === 'FAIL').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rule Validation (Metadata)</CardTitle>
        <p className="text-sm text-muted-foreground">No claim or runtime data required. Validates rule structure, fact linkage, operator compatibility, value format, and effective dates.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">PASS</div><div className="text-2xl font-bold text-emerald-600">{pass}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">WARNING</div><div className="text-2xl font-bold text-amber-600">{warn}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">FAIL</div><div className="text-2xl font-bold text-destructive">{fail}</div></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search rule" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Outcomes</SelectItem>
              <SelectItem value="PASS">PASS</SelectItem>
              <SelectItem value="WARNING">WARNING</SelectItem>
              <SelectItem value="FAIL">FAIL</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('ALL'); }}>Reset</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Checks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(rep => (
              <TableRow key={rep.rule_id}>
                <TableCell><div className="font-mono text-xs">{rep.rule_code}</div><div className="text-xs text-muted-foreground">{rep.rule_name}</div></TableCell>
                <TableCell>
                  <Badge variant={rep.overall === 'PASS' ? 'default' : rep.overall === 'WARNING' ? 'secondary' : 'destructive'}>{rep.overall}</Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {rep.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <ResultIcon r={c.result} />
                        <span className="font-mono w-36">{c.check}</span>
                        <span className="text-muted-foreground">{c.message}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
