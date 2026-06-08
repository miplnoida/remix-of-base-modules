/**
 * Runtime & Metadata Test Tab — Phase 2 of Rule Catalogue.
 *
 * Three sub-tabs:
 *  1. Metadata Test    — claim-independent. Validates a rule's structure,
 *                        fact linkage, resolver registration, operator,
 *                        snapshot/derivation metadata. No runtime needed.
 *  2. Single Rule      — runtime resolver test for one rule against an SSN
 *                        and claim (optional). Refreshes contribution
 *                        snapshot if the fact requires one.
 *  3. Product          — runs every active rule on a product version
 *                        against a real claim, with pickers (not raw UUIDs).
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FlaskConical, PlayCircle, CheckCircle2, AlertTriangle, XCircle, BadgeCheck, Search } from 'lucide-react';
import { toast } from 'sonner';

import type { RuleCatalogueItem } from '@/services/bn/ruleCatalogueService';
import type { EligibilityFact } from '@/services/bn/eligibilityFactService';
import { resolveFact } from '@/services/bn/eligibility/eligibilityFactResolver';
import { ensureContributionSnapshot } from '@/services/bn/eligibility/contributionSnapshotService';
import { runProductEligibilityTest, type ProductTestResult } from '@/services/bn/eligibility/productEligibilityTest';
import { validateAllRules } from '@/services/bn/ruleValidationService';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  rules: RuleCatalogueItem[];
  factByKey: Map<string, EligibilityFact>;
  facts: EligibilityFact[];
}

interface ProductVersionOption {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  version_number: number;
  status: string;
}

interface ClaimOption {
  id: string;
  claim_number: string | null;
  ssn: string;
  product_code: string | null;
  claim_date: string;
}

export function RuntimeTestTab({ rules, factByKey, facts }: Props) {
  return (
    <Tabs defaultValue="metadata">
      <TabsList>
        <TabsTrigger value="metadata" className="gap-2"><BadgeCheck className="h-4 w-4" /> Metadata Test</TabsTrigger>
        <TabsTrigger value="single" className="gap-2"><FlaskConical className="h-4 w-4" /> Single Rule (Runtime)</TabsTrigger>
        <TabsTrigger value="product" className="gap-2"><PlayCircle className="h-4 w-4" /> Product Eligibility (Runtime)</TabsTrigger>
      </TabsList>
      <TabsContent value="metadata"><MetadataTestPanel rules={rules} facts={facts} /></TabsContent>
      <TabsContent value="single"><SingleRulePanel rules={rules} factByKey={factByKey} /></TabsContent>
      <TabsContent value="product"><ProductTestPanel /></TabsContent>
    </Tabs>
  );
}

/* ---------------- Metadata Test (no claim) ---------------- */
function MetadataTestPanel({ rules, facts }: { rules: RuleCatalogueItem[]; facts: EligibilityFact[] }) {
  const [search, setSearch] = useState('');
  const issues = useMemo(() => validateAllRules(rules, facts), [rules, facts]);
  const byRule = useMemo(() => {
    const m = new Map<string, { rule: RuleCatalogueItem; items: ReturnType<typeof validateAllRules> }>();
    for (const r of rules) m.set(r.id, { rule: r, items: [] });
    for (const i of issues) {
      const e = m.get(i.rule_id); if (e) e.items.push(i);
    }
    return Array.from(m.values());
  }, [rules, issues]);

  const filtered = byRule.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.rule.rule_code.toLowerCase().includes(s) || b.rule.rule_name.toLowerCase().includes(s);
  });

  const failCount = issues.filter(i => i.severity === 'FAIL').length;
  const warnCount = issues.filter(i => i.severity === 'WARNING').length;
  const passCount = byRule.filter(b => b.items.length === 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metadata Test — Claim-Independent</CardTitle>
        <p className="text-sm text-muted-foreground">
          Verifies rule structure, fact linkage, registered resolver, operator compatibility, snapshot &amp; derivation metadata.
          No SSN, Claim ID, or runtime data required.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Rules Passing</div><div className="text-2xl font-bold text-emerald-600">{passCount}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Warnings</div><div className="text-2xl font-bold text-amber-600">{warnCount}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Failures</div><div className="text-2xl font-bold text-destructive">{failCount}</div></CardContent></Card>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search rules" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Fact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ rule, items }) => {
              const hasFail = items.some(i => i.severity === 'FAIL');
              const hasWarn = items.some(i => i.severity === 'WARNING');
              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="font-mono text-xs">{rule.rule_code}</div>
                    <div className="text-xs text-muted-foreground">{rule.rule_name}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rule.fact_key ?? '—'}</TableCell>
                  <TableCell>
                    {hasFail ? <Badge variant="destructive">FAIL</Badge>
                      : hasWarn ? <Badge variant="secondary">WARN</Badge>
                      : <Badge>PASS</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {items.length === 0 ? <span className="text-emerald-600">Metadata OK</span> : (
                      <ul className="space-y-0.5">
                        {items.map((i, idx) => (
                          <li key={idx} className={i.severity === 'FAIL' ? 'text-destructive' : 'text-amber-700'}>
                            • [{i.severity}] {i.code}: {i.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Single Rule (Runtime) ---------------- */
function SingleRulePanel({ rules, factByKey }: { rules: RuleCatalogueItem[]; factByKey: Map<string, EligibilityFact> }) {
  const [ruleId, setRuleId] = useState('');
  const [ssn, setSsn] = useState('');
  const [claimId, setClaimId] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const rule = rules.find(r => r.id === ruleId);
  const fact = rule?.fact_key ? factByKey.get(rule.fact_key) : null;

  const run = async () => {
    if (!rule) { toast.error('Pick a rule'); return; }
    if (!fact) { setResult({ outcome: 'WARN', title: 'Rule has no linked fact' }); return; }
    if (fact.implementation_status === 'NOT_IMPLEMENTED') {
      setResult({ outcome: 'WARN', title: 'Fact is NOT_IMPLEMENTED',
        details: [`Source: ${fact.source_table}.${fact.source_column}`, `Resolver: ${fact.resolver_function}`] });
      return;
    }
    setBusy(true);
    try {
      if (fact.requires_snapshot && claimId) await ensureContributionSnapshot(claimId);
      const r = await resolveFact(fact.fact_key, { ssn: ssn || null, claimId: claimId || null, claimDate, extras: {} });
      const op = rule.operator, expected = rule.value_from;
      const a = r.value, num = Number(a), expNum = Number(expected);
      let pass = false;
      switch (op) {
        case 'GREATER_OR_EQUAL': pass = num >= expNum; break;
        case 'GREATER_THAN': pass = num > expNum; break;
        case 'LESS_OR_EQUAL': pass = num <= expNum; break;
        case 'LESS_THAN': pass = num < expNum; break;
        case 'EQUALS': pass = String(a) === String(expected); break;
        case 'NOT_EQUALS': pass = String(a) !== String(expected); break;
        case 'BOOLEAN': pass = String(a).toLowerCase() === String(expected).toLowerCase(); break;
        case 'EXISTS': pass = a !== null && a !== undefined && a !== ''; break;
        case 'IN': pass = Array.isArray(rule.values) && rule.values.map(String).includes(String(a)); break;
        case 'BETWEEN': pass = num >= Number(rule.value_from) && num <= Number(rule.value_to); break;
      }
      const outcome = r.reason ? 'WARN' : pass ? 'PASS' : 'FAIL';
      setResult({
        outcome,
        title: r.reason ?? (pass ? 'Rule passed' : (rule.failure_message_text ?? 'Rule failed')),
        resolved: r.value, expected,
        details: [
          `Fact: ${fact.fact_key}`,
          `Resolver: ${fact.resolver_function}`,
          `Source: ${r.source_table}.${r.source_column}`,
          `Operator: ${op}`,
          `Fail action: ${rule.default_fail_action}`,
        ],
      });
    } catch (e: any) {
      setResult({ outcome: 'WARN', title: e?.message ?? 'Resolution failed' });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Rule — Runtime Simulation</CardTitle>
        <p className="text-sm text-muted-foreground">Resolves the fact against real BN/BEMA tables, then evaluates the operator.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rule</Label>
            <Select value={ruleId} onValueChange={setRuleId}>
              <SelectTrigger><SelectValue placeholder="Pick a catalogue rule" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.rule_code} — {r.rule_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {fact && (
              <div className="text-xs text-muted-foreground">
                Fact <span className="font-mono">{fact.fact_key}</span> • resolver <span className="font-mono">{fact.resolver_function}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2"><Label>SSN</Label><Input value={ssn} onChange={e => setSsn(e.target.value)} placeholder="6-digit" /></div>
            <div className="space-y-2"><Label>Claim ID</Label><Input value={claimId} onChange={e => setClaimId(e.target.value)} placeholder="uuid (opt)" /></div>
            <div className="space-y-2"><Label>Claim Date</Label><Input type="date" value={claimDate} onChange={e => setClaimDate(e.target.value)} /></div>
          </div>
        </div>
        <Button onClick={run} disabled={busy} className="gap-2"><FlaskConical className="h-4 w-4" /> {busy ? 'Resolving…' : 'Run Test'}</Button>
        {result && (
          <Alert variant={result.outcome === 'FAIL' ? 'destructive' : 'default'}>
            {result.outcome === 'PASS' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-semibold mb-1">{result.outcome}: {result.title}</div>
              {(result.resolved !== undefined || result.expected !== undefined) && (
                <div className="text-xs grid grid-cols-2 gap-1 mb-2">
                  <div>Resolved: <span className="font-mono">{String(result.resolved ?? '—')}</span></div>
                  <div>Expected: <span className="font-mono">{String(result.expected ?? '—')}</span></div>
                </div>
              )}
              {result.details && (
                <ul className="text-xs space-y-0.5">{result.details.map((d: string, i: number) => <li key={i} className="font-mono">• {d}</li>)}</ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Product Eligibility (Runtime) ---------------- */
function ProductTestPanel() {
  const [versions, setVersions] = useState<ProductVersionOption[]>([]);
  const [versionId, setVersionId] = useState('');
  const [ssnSearch, setSsnSearch] = useState('');
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [claimId, setClaimId] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ProductTestResult | null>(null);

  // Load active product versions on mount.
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('bn_product_version')
        .select('id, version_number, status, product:bn_product(code, name)')
        .in('status', ['ACTIVE', 'DRAFT', 'PUBLISHED'])
        .order('modified_at', { ascending: false })
        .limit(100);
      const rows: ProductVersionOption[] = ((data as any[]) ?? []).map(d => ({
        id: d.id,
        product_id: d.product?.id ?? '',
        product_code: d.product?.code ?? '',
        product_name: d.product?.name ?? '—',
        version_number: d.version_number,
        status: d.status,
      }));
      setVersions(rows);
    })();
  }, []);

  const searchClaims = async () => {
    if (!ssnSearch.trim() && !versionId) {
      toast.error('Enter an SSN or pick a product version');
      return;
    }
    let q = (supabase as any)
      .from('bn_claim')
      .select('id, claim_number, ssn, claim_date, product:bn_product(code)')
      .order('claim_date', { ascending: false })
      .limit(25);
    if (ssnSearch.trim()) q = q.ilike('ssn', `%${ssnSearch.trim()}%`);
    if (versionId) q = q.eq('product_version_id', versionId);
    const { data, error } = await q;
    if (error) { toast.error('Claim search failed', { description: error.message }); return; }
    setClaims(((data as any[]) ?? []).map(c => ({
      id: c.id, claim_number: c.claim_number, ssn: c.ssn,
      claim_date: c.claim_date, product_code: c.product?.code ?? null,
    })));
  };

  const run = async () => {
    if (!versionId || !claimId) { toast.error('Pick a product version and a claim'); return; }
    setBusy(true);
    try {
      const r = await runProductEligibilityTest(versionId, claimId);
      setRes(r);
    } catch (e: any) {
      toast.error(e?.message ?? 'Test failed');
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Eligibility — Runtime Simulation</CardTitle>
        <p className="text-sm text-muted-foreground">Refreshes the contribution snapshot, then evaluates every active rule of the chosen product version against a claim.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-1">
            <Label>Product Version</Label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue placeholder="Pick a product version" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.product_code} v{v.version_number} — {v.product_name} <span className="text-muted-foreground">({v.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Find Claim by SSN</Label>
            <div className="flex gap-2">
              <Input value={ssnSearch} onChange={e => setSsnSearch(e.target.value)} placeholder="SSN or partial" />
              <Button variant="outline" onClick={searchClaims} className="gap-1"><Search className="h-4 w-4" /> Find</Button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Claim</Label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger><SelectValue placeholder={claims.length ? 'Pick a claim' : 'Search first'} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {claims.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.claim_number ?? c.id.slice(0, 8)} • SSN {c.ssn} • {c.claim_date} {c.product_code ? `• ${c.product_code}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={run} disabled={busy} className="gap-2"><PlayCircle className="h-4 w-4" /> {busy ? 'Running…' : 'Run Eligibility'}</Button>
        {res && (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={res.overall === 'PASS' ? 'default' : 'destructive'}>{res.overall}</Badge>
              <span className="text-xs text-muted-foreground">Snapshot {res.snapshot_refreshed ? 'refreshed' : 'reused'} • Product: {res.product_code ?? '—'} • {res.rows.length} rule(s)</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Fact</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Fail Action</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {res.rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="font-mono text-xs">{r.rule_code}</div><div className="text-xs text-muted-foreground">{r.rule_name}</div></TableCell>
                    <TableCell className="font-mono text-xs">{r.fact_key ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.operator}</TableCell>
                    <TableCell className="font-mono text-xs">{Array.isArray(r.expected) ? r.expected.join(', ') : String(r.expected ?? '—')}</TableCell>
                    <TableCell className="font-mono text-xs">{String(r.actual ?? '—')}</TableCell>
                    <TableCell className="font-mono text-xs">{r.source ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.result === 'PASS' ? 'default' : r.result === 'FAIL' ? 'destructive' : 'secondary'}>{r.result}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.fail_action}</TableCell>
                    <TableCell className="text-xs">{r.message ?? '—'}</TableCell>
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
