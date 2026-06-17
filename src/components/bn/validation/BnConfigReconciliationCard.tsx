/**
 * BnConfigReconciliationCard — renders the 7 cross-cutting reconciliation
 * checks (formula variables, LOOKUP tables/dims, medical source, product
 * bindings, legacy config, seeded formulas) from
 * bnConfigurationReconciliationService.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { runReconciliationChecks, type ReconCheck } from '@/services/bn/bnConfigurationReconciliationService';

const VARIANT = { PASS: 'default', WARN: 'secondary', FAIL: 'destructive' } as const;
const ICON = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  WARN: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  FAIL: <XCircle className="h-4 w-4 text-destructive" />,
};

export function BnConfigReconciliationCard() {
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState<ReconCheck[]>([]);

  const run = async () => {
    setLoading(true);
    try { setChecks(await runReconciliationChecks()); }
    catch (e) { toast.error('Reconciliation failed', { description: e instanceof Error ? e.message : String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void run(); }, []);

  const fails = checks.filter((c) => c.status === 'FAIL').length;
  const warns = checks.filter((c) => c.status === 'WARN').length;
  const passes = checks.filter((c) => c.status === 'PASS').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Configuration Reconciliation</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cross-cutting checks across Formula Library, Rate/Matrix Tables, Medical Reimbursement and Product Catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <div className="flex gap-1">
              {passes > 0 && <Badge variant="default">{passes} pass</Badge>}
              {warns > 0 && <Badge variant="secondary">{warns} warn</Badge>}
              {fails > 0 && <Badge variant="destructive">{fails} fail</Badge>}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !checks.length ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Running checks…</div>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-md border p-3">
                <div className="mt-0.5">{ICON[c.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.label}</span>
                    <Badge variant={VARIANT[c.status]} className="text-[10px]">{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.message}</p>
                  {c.details?.length ? (
                    <ul className="text-xs text-muted-foreground mt-2 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                      {c.details.map((d, i) => <li key={i} className="font-mono break-all">{d}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
