/**
 * Test Eligibility Dialog (Phase 2)
 *
 * Two modes:
 *  1. Sample Scenario (default) — no claim needed. Lists every fact used by
 *     the product's active rules; the user enters values; the operator engine
 *     evaluates each rule. Ideal during product-catalogue building.
 *  2. Real Claim — runs the production fact resolver against an existing
 *     claim (UUID or claim_number).
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FlaskConical, PlayCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { runProductEligibilityTest, type ProductTestResult } from '@/services/bn/eligibility/productEligibilityTest';
import { useBnEligibilityRules } from '@/hooks/bn/useBnProduct';
import { getFact } from '@/services/bn/eligibility/eligibilityFactRegistry';
import { OPERATORS, type EligibilityOperator } from '@/services/bn/eligibility/operators';
import type { BnEligibilityRule } from '@/types/bn';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: string;
  productCode?: string | null;
}

const db = supabase as any;

const OPERATOR_ALIASES: Record<string, string> = {
  EQUALS: '=', NOT_EQUALS: '!=', GREATER_THAN: '>', GREATER_OR_EQUAL: '>=',
  LESS_THAN: '<', LESS_OR_EQUAL: '<=', BETWEEN: 'between', IN: 'in', NOT_IN: 'in',
  BOOLEAN: '=', EXISTS: 'exists', CONTAINS: 'in',
};

interface SimRow {
  rule: BnEligibilityRule;
  factKey: string | null;
  factLabel: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  result: 'PASS' | 'FAIL' | 'SKIPPED';
  message?: string;
}

export function TestEligibilityDialog({ open, onOpenChange, versionId, productCode }: Props) {
  const { toast } = useToast();
  const { data: rules = [] } = useBnEligibilityRules(versionId);

  // ── Sample mode state ──────────────────────────────────────────────────
  const factsUsed = useMemo(() => {
    const set = new Map<string, { fact: ReturnType<typeof getFact>; label: string; dataType: string }>();
    for (const r of rules) {
      if (!r.is_active) continue;
      const rd = (r.rule_definition || {}) as Record<string, unknown>;
      const key = (rd.field_key ?? (r as any).fact_key) as string | undefined;
      if (!key || set.has(key)) continue;
      const f = getFact(key);
      set.set(key, { fact: f, label: f?.label ?? key, dataType: f?.data_type ?? 'string' });
    }
    return Array.from(set.entries()).map(([k, v]) => ({ factKey: k, ...v }));
  }, [rules]);

  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [simRows, setSimRows] = useState<SimRow[] | null>(null);

  // Reset state on open/version change
  useEffect(() => {
    if (open) { setSampleValues({}); setSimRows(null); setRealResult(null); }
  }, [open, versionId]);

  const evaluateSample = () => {
    const rows: SimRow[] = [];
    for (const r of rules) {
      if (!r.is_active) continue;
      const rd = (r.rule_definition || {}) as Record<string, any>;
      const factKey = (rd.field_key ?? (r as any).fact_key) as string | null;
      const factDef = factKey ? getFact(factKey) : undefined;
      const opKey = (OPERATOR_ALIASES[rd.operator] ?? rd.operator) as EligibilityOperator;
      const opDef = OPERATORS[opKey];

      let expected: unknown = rd.value;
      if (rd.operator === 'BETWEEN' || opKey === 'between') expected = [rd.range_from ?? rd.value_from, rd.range_to ?? rd.value_to];
      if (rd.operator === 'IN' || rd.operator === 'NOT_IN') expected = rd.values;

      const raw = factKey ? sampleValues[factKey] : undefined;
      const actual = coerceSample(raw, factDef?.data_type);

      let result: SimRow['result'] = 'SKIPPED';
      let message: string | undefined;
      if (!factKey) { message = 'No fact linked'; }
      else if (!opDef) { message = `Unknown operator "${rd.operator}"`; }
      else if (raw === undefined || raw === '') { message = 'No sample value provided'; }
      else {
        const pass = opDef.evaluate(actual, expected);
        result = pass ? 'PASS' : 'FAIL';
      }

      rows.push({
        rule: r,
        factKey,
        factLabel: factDef?.label ?? factKey ?? '—',
        operator: String(rd.operator ?? ''),
        expected,
        actual: actual ?? raw ?? null,
        result,
        message,
      });
    }
    setSimRows(rows);
  };

  // ── Real-claim mode state ──────────────────────────────────────────────
  const [claimRef, setClaimRef] = useState('');
  const [runningReal, setRunningReal] = useState(false);
  const [realResult, setRealResult] = useState<ProductTestResult | null>(null);

  const resolveClaimId = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return trimmed;
    const { data } = await db.from('bn_claim').select('id').eq('claim_number', trimmed).maybeSingle();
    return (data as any)?.id ?? null;
  };

  const runReal = async () => {
    if (!claimRef.trim()) { toast({ title: 'Enter a claim ID or number', variant: 'destructive' }); return; }
    setRunningReal(true); setRealResult(null);
    try {
      const id = await resolveClaimId(claimRef);
      if (!id) { toast({ title: 'Claim not found', description: `No claim matches "${claimRef}"`, variant: 'destructive' }); return; }
      const res = await runProductEligibilityTest(versionId, id);
      setRealResult(res);
    } catch (e: any) {
      toast({ title: 'Test failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally { setRunningReal(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const sampleOverall = useMemo(() => {
    if (!simRows) return null;
    if (simRows.some((r) => r.result === 'FAIL')) return 'FAIL';
    if (simRows.some((r) => r.result === 'SKIPPED')) return 'INCOMPLETE';
    return 'PASS';
  }, [simRows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Test Eligibility
          </DialogTitle>
          <DialogDescription>
            Validate this product's eligibility rules. Use <strong>Sample Scenario</strong> while
            building the catalogue (no claim needed), or <strong>Real Claim</strong> once test
            data exists.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sample" className="w-full">
          <TabsList>
            <TabsTrigger value="sample" className="gap-2"><Sparkles className="h-4 w-4" /> Sample Scenario</TabsTrigger>
            <TabsTrigger value="real" className="gap-2"><PlayCircle className="h-4 w-4" /> Real Claim</TabsTrigger>
          </TabsList>

          {/* SAMPLE MODE */}
          <TabsContent value="sample" className="space-y-4 pt-2">
            {factsUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No active rules to test. Add rules first.
              </p>
            ) : (
              <>
                <div className="rounded border p-3 bg-muted/30">
                  <div className="text-sm font-medium mb-2">Provide a sample value for each fact</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {factsUsed.map((f) => (
                      <div key={f.factKey} className="space-y-1">
                        <Label className="text-xs">
                          {f.label}
                          <span className="ml-1 text-muted-foreground">({f.dataType})</span>
                        </Label>
                        <Input
                          placeholder={placeholderFor(f.dataType)}
                          value={sampleValues[f.factKey] ?? ''}
                          onChange={(e) => setSampleValues((p) => ({ ...p, [f.factKey]: e.target.value }))}
                        />
                        <div className="text-[10px] font-mono text-muted-foreground">{f.factKey}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={evaluateSample} className="gap-2">
                      <PlayCircle className="h-4 w-4" /> Evaluate
                    </Button>
                  </div>
                </div>

                {simRows && (
                  <ResultPanel
                    overall={
                      sampleOverall === 'PASS' ? <Badge className="bg-emerald-600 text-white">All rules pass</Badge>
                      : sampleOverall === 'FAIL' ? <Badge variant="destructive">Failed</Badge>
                      : <Badge variant="outline" className="border-amber-400 text-amber-700">Incomplete — some facts had no value</Badge>
                    }
                    rows={simRows.map((r) => ({
                      key: r.rule.id,
                      name: r.rule.rule_name,
                      code: r.rule.rule_code,
                      expected: `${r.operator} ${fmt(r.expected)}`,
                      actual: fmt(r.actual),
                      source: r.factKey ?? '—',
                      result: r.result,
                      message: r.message,
                    }))}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* REAL MODE */}
          <TabsContent value="real" className="space-y-4 pt-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="claim-ref">Claim ID (UUID) or claim number</Label>
                <Input
                  id="claim-ref"
                  placeholder="e.g. 1a2b3c4d-… or CLAIM-2026-000123"
                  value={claimRef}
                  onChange={(e) => setClaimRef(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runReal(); }}
                />
              </div>
              <Button onClick={runReal} disabled={runningReal} className="gap-2">
                {runningReal ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Run Test
              </Button>
            </div>

            {realResult && (
              <ResultPanel
                overall={
                  realResult.overall === 'PASS' ? <Badge className="bg-emerald-600 text-white">All rules passed</Badge>
                  : realResult.overall === 'FAIL' ? <Badge variant="destructive">Failed</Badge>
                  : <Badge variant="outline" className="border-amber-400 text-amber-700">Blocked — facts unresolvable</Badge>
                }
                subtitle={
                  <>
                    Claim <span className="font-mono">{realResult.claim_id.slice(0, 8)}…</span>
                    {realResult.product_code && <> · Product {realResult.product_code}</>}
                    {realResult.snapshot_refreshed && <> · contribution snapshot refreshed</>}
                  </>
                }
                rows={realResult.rows.map((r, i) => ({
                  key: `${r.rule_code}-${i}`,
                  name: r.rule_name,
                  code: r.rule_code,
                  expected: `${r.operator} ${fmt(r.expected)}`,
                  actual: fmt(r.actual),
                  source: r.source ?? '—',
                  result: r.result,
                  message: r.message,
                }))}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function ResultPanel({
  overall, subtitle, rows,
}: {
  overall: React.ReactNode;
  subtitle?: React.ReactNode;
  rows: Array<{
    key: string; name: string; code: string; expected: string; actual: string;
    source: string; result: 'PASS' | 'FAIL' | 'SKIPPED'; message?: string;
  }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        {overall}
        {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No rules evaluated.</p>
      ) : (
        <ScrollArea className="max-h-[420px] rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Source / Fact</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} className={r.result === 'FAIL' ? 'bg-destructive/5' : r.result === 'SKIPPED' ? 'bg-amber-50/40' : ''}>
                  <TableCell>
                    {r.result === 'PASS' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : r.result === 'FAIL' ? <XCircle className="h-4 w-4 text-destructive" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.code}</div>
                    {r.message && <div className="text-xs text-muted-foreground mt-0.5 italic">{r.message}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.expected}</TableCell>
                  <TableCell className="font-mono text-xs">{r.actual}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.source}</TableCell>
                  <TableCell>
                    <Badge variant={r.result === 'PASS' ? 'default' : r.result === 'FAIL' ? 'destructive' : 'outline'} className="text-[10px]">
                      {r.result}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}

function placeholderFor(dataType?: string): string {
  switch (dataType) {
    case 'number': return 'e.g. 42';
    case 'date': return 'YYYY-MM-DD';
    case 'bool': return 'true / false';
    case 'enum': return 'enum value';
    default: return 'sample value';
  }
}

function coerceSample(raw: string | undefined, dataType?: string): unknown {
  if (raw === undefined || raw === '') return null;
  switch (dataType) {
    case 'number': {
      const n = Number(raw); return Number.isFinite(n) ? n : raw;
    }
    case 'bool': {
      const v = raw.trim().toLowerCase();
      if (['true', 'yes', 'y', '1'].includes(v)) return true;
      if (['false', 'no', 'n', '0'].includes(v)) return false;
      return raw;
    }
    case 'date': return raw; // operators handle ISO strings
    default: return raw;
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.map(fmt).join(' … ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default TestEligibilityDialog;
