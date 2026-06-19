/**
 * Cycle × Method matrix editor.
 * Rows = payment cycles, Columns = country-enabled payment methods.
 * Toggle = enabled / disabled for that combination.
 *
 * Country method config remains the source of truth for EFT/cheque mechanics;
 * this widget only narrows availability per cycle.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { listCountryPaymentCapabilities } from '@/services/bn/payment/countryPaymentCapabilityService';
import {
  listCycleMethods,
  toggleCycleMethod,
  PAYMENT_CYCLES,
  type PaymentCycle,
} from '@/services/bn/payment/countryPaymentCycleMethodService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  countryCode: string;
}

export default function PaymentCycleMethodMatrix({ countryCode }: Props) {
  const { user } = useAuth() as any;
  const performedBy = user?.user_code || user?.email || 'SYSTEM';
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const capQ = useQuery({
    queryKey: ['bn', 'country-payment-cap', countryCode],
    queryFn: () => listCountryPaymentCapabilities(countryCode),
    enabled: !!countryCode,
  });
  const cycleQ = useQuery({
    queryKey: ['bn', 'country-cycle-methods', countryCode],
    queryFn: () => listCycleMethods(countryCode),
    enabled: !!countryCode,
  });

  const enabledMethods = useMemo(
    () => (capQ.data ?? []).filter((m: any) => m.is_active && m.is_method_enabled).map((m: any) => m.payment_method),
    [capQ.data],
  );

  const lookup = useMemo(() => {
    const map = new Map<string, { enabled: boolean; hasRow: boolean }>();
    for (const r of cycleQ.data ?? []) {
      map.set(`${r.payment_cycle}|${r.payment_method}`, { enabled: r.is_enabled, hasRow: true });
    }
    return map;
  }, [cycleQ.data]);

  const mut = useMutation({
    mutationFn: async (vars: { cycle: PaymentCycle; method: string; enabled: boolean }) => {
      setSubmitting(`${vars.cycle}|${vars.method}`);
      return toggleCycleMethod(countryCode, vars.cycle, vars.method, vars.enabled, performedBy);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'country-cycle-methods', countryCode] });
      toast({ title: 'Cycle availability updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
    onSettled: () => setSubmitting(null),
  });

  const cycleHasOverride = (cycle: PaymentCycle) =>
    (cycleQ.data ?? []).some((r) => r.payment_cycle === cycle);

  if (capQ.isLoading || cycleQ.isLoading) {
    return (
      <Card><CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading cycle availability…
      </CardContent></Card>
    );
  }

  if (!enabledMethods.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Cycle Availability
        </CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No country-enabled payment methods to configure. Enable methods in Country Payment Config first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cycle Availability</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Restrict which enabled methods are usable per payment cycle. A cycle with <em>no rows</em>{' '}
          falls back to all enabled country methods.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Cycle</th>
                {enabledMethods.map((m) => (
                  <th key={m} className="text-center p-2 font-medium">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAYMENT_CYCLES.map((cycle) => {
                const hasOverride = cycleHasOverride(cycle);
                return (
                  <tr key={cycle} className="border-b last:border-0">
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        {cycle}
                        {!hasOverride && (
                          <Badge variant="outline" className="text-[10px]">inherits all</Badge>
                        )}
                      </div>
                    </td>
                    {enabledMethods.map((method) => {
                      const key = `${cycle}|${method}`;
                      const row = lookup.get(key);
                      // No row → falls back to enabled (treated as enabled). Toggle creates row.
                      const checked = row ? row.enabled : true;
                      const isBusy = submitting === key;
                      return (
                        <td key={method} className="text-center p-2">
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            <Switch
                              checked={checked}
                              onCheckedChange={(v) =>
                                mut.mutate({ cycle, method, enabled: v })
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
