/**
 * Test Eligibility Dialog (Phase 2)
 *
 * Lets the user pick a real claim by ID/reference and runs every active
 * eligibility rule for the given product version against it using the
 * production fact resolver. Shows per-rule pass/fail with source + reason.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FlaskConical, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { runProductEligibilityTest, type ProductTestResult } from '@/services/bn/eligibility/productEligibilityTest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: string;
  productCode?: string | null;
}

const db = supabase as any;

export function TestEligibilityDialog({ open, onOpenChange, versionId, productCode }: Props) {
  const { toast } = useToast();
  const [claimRef, setClaimRef] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProductTestResult | null>(null);

  const resolveClaimId = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    // UUID? use directly.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return trimmed;
    // Otherwise treat as claim_reference / number.
    const { data } = await db
      .from('bn_claim')
      .select('id')
      .or(`claim_reference.eq.${trimmed},claim_number.eq.${trimmed}`)
      .maybeSingle();
    return (data as any)?.id ?? null;
  };

  const handleRun = async () => {
    if (!claimRef.trim()) {
      toast({ title: 'Enter a claim ID or reference', variant: 'destructive' });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const claimId = await resolveClaimId(claimRef);
      if (!claimId) {
        toast({ title: 'Claim not found', description: `No claim matches "${claimRef}"`, variant: 'destructive' });
        return;
      }
      const res = await runProductEligibilityTest(versionId, claimId);
      setResult(res);
    } catch (e: any) {
      toast({ title: 'Test failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const overallBadge = () => {
    if (!result) return null;
    if (result.overall === 'PASS')
      return <Badge className="bg-emerald-600 text-white">All rules passed</Badge>;
    if (result.overall === 'FAIL')
      return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline" className="border-amber-400 text-amber-700">Blocked / missing facts</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Test Eligibility
          </DialogTitle>
          <DialogDescription>
            Runs every active eligibility rule for this product version against a real claim,
            using the same fact resolver as production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="claim-ref">Claim ID or reference</Label>
              <Input
                id="claim-ref"
                placeholder="e.g. 1a2b3c4d-… or CLAIM-2026-000123"
                value={claimRef}
                onChange={(e) => setClaimRef(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRun(); }}
              />
            </div>
            <Button onClick={handleRun} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run Test
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                {overallBadge()}
                <span className="text-muted-foreground">
                  Claim <span className="font-mono">{result.claim_id.slice(0, 8)}…</span>
                  {result.product_code && <> · Product {result.product_code}</>}
                  {result.snapshot_refreshed && <> · contribution snapshot refreshed</>}
                </span>
              </div>

              {result.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active eligibility rules to evaluate.
                </p>
              ) : (
                <ScrollArea className="max-h-[420px] rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, i) => (
                        <TableRow key={i} className={row.result === 'FAIL' ? 'bg-destructive/5' : row.result === 'SKIPPED' ? 'bg-amber-50/40' : ''}>
                          <TableCell>
                            {row.result === 'PASS' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : row.result === 'FAIL' ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{row.rule_name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{row.rule_code}</div>
                            {row.message && (
                              <div className="text-xs text-muted-foreground mt-0.5 italic">{row.message}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.operator} {formatVal(row.expected)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatVal(row.actual)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.source ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={row.result === 'PASS' ? 'default' : row.result === 'FAIL' ? 'destructive' : 'outline'} className="text-[10px]">
                              {row.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.map((x) => formatVal(x)).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default TestEligibilityDialog;
