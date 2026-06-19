/**
 * Product Catalog — Payment Hierarchy Health Card
 * Reads v_bn_product_effective_payment_config and surfaces products that
 * currently violate V1 / V2 / V3 (drift after country capability changes).
 * Pure read-only diagnostic; editing happens on each product's page.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface Row {
  channel_config_id: string;
  product_id: string;
  benefit_code: string;
  country_code: string;
  country_currency: string;
  effective_currency: string;
  allow_foreign_currency_products: boolean;
  allowed_alt_currencies: string[];
  product_allowed_methods: string[];
  country_enabled_methods: string[];
  default_payment_method: string | null;
}

interface Props {
  countryCode?: string; // optional filter ('ALL' shows everything)
}

const PaymentHierarchyHealth: React.FC<Props> = ({ countryCode }) => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['bn', 'effective-payment-config', countryCode],
    queryFn: async (): Promise<Row[]> => {
      let q = db.from('v_bn_product_effective_payment_config').select('*');
      if (countryCode && countryCode !== 'ALL') q = q.eq('country_code', countryCode);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const violations = useMemo(() => {
    const out: { row: Row; rule: 'V1' | 'V2' | 'V3'; message: string }[] = [];
    for (const r of rows) {
      const enabled = new Set(r.country_enabled_methods ?? []);
      const disallowed = (r.product_allowed_methods ?? []).filter((m) => !enabled.has(m));
      for (const m of disallowed) {
        out.push({ row: r, rule: 'V1', message: `${r.benefit_code}: method "${m}" no longer enabled in ${r.country_code}` });
      }
      if (r.default_payment_method && !(r.product_allowed_methods ?? []).includes(r.default_payment_method)) {
        out.push({ row: r, rule: 'V2', message: `${r.benefit_code}: default "${r.default_payment_method}" not in allowed methods` });
      }
      if (r.effective_currency !== r.country_currency) {
        const altOk = r.allow_foreign_currency_products && (r.allowed_alt_currencies ?? []).includes(r.effective_currency);
        if (!altOk) {
          out.push({ row: r, rule: 'V3', message: `${r.benefit_code}: currency ${r.effective_currency} not allowed (country ${r.country_currency})` });
        }
      }
    }
    return out;
  }, [rows]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Payment Hierarchy Health
          {!isLoading && (violations.length === 0
            ? <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" /> Clean</Badge>
            : <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" /> {violations.length}</Badge>)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Checking…</div>
        ) : violations.length === 0 ? (
          <div className="text-xs text-muted-foreground">All {rows.length} product channel configs align with their Country Pack.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {violations.slice(0, 12).map((v, i) => (
              <li key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="font-mono text-[10px] min-w-[28px] justify-center">{v.rule}</Badge>
                <span>{v.message}</span>
              </li>
            ))}
            {violations.length > 12 && (
              <li className="text-muted-foreground italic">…and {violations.length - 12} more</li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHierarchyHealth;
