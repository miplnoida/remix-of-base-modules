/**
 * Country Pack — Payment Capability Summary
 * Read-only widget that surfaces the new per-method capability fields:
 *   - is_method_enabled
 *   - allow_third_party_payee
 *   - allow_provider_direct_pay
 *   - cheque_stock_required / cheque_format_template_id
 *   - EFT format completeness
 * Used inside CountryPackDashboard. No editing here — Stage S6 will add the
 * full editor; this widget is the diagnostic surface that lets ops see at a
 * glance which methods are nationally capable.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  listCountryPaymentCapabilities,
  getCountryCurrencyPolicy,
  type CountryPaymentMethodCapability,
} from '@/services/bn/payment/countryPaymentCapabilityService';

interface Props {
  countryCode: string;
}

const FORMAT_FIELDS: (keyof CountryPaymentMethodCapability)[] = [
  'bank_file_format', 'header_record_format', 'detail_record_format', 'trailer_record_format',
];

const Flag: React.FC<{ on: boolean; label: string }> = ({ on, label }) => (
  <Badge variant={on ? 'default' : 'outline'} className="gap-1">
    {on ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </Badge>
);

const PaymentCapabilitySummary: React.FC<Props> = ({ countryCode }) => {
  const { data: methods = [] } = useQuery({
    queryKey: ['bn', 'country-payment-capabilities', countryCode],
    queryFn: () => listCountryPaymentCapabilities(countryCode),
    enabled: !!countryCode,
  });

  const { data: currencyPolicy } = useQuery({
    queryKey: ['bn', 'country-currency-policy', countryCode],
    queryFn: () => getCountryCurrencyPolicy(countryCode),
    enabled: !!countryCode,
  });

  const issues = useMemo(() => {
    const out: string[] = [];
    if (!methods.length) out.push('No payment methods defined at country level');
    for (const m of methods) {
      if (!m.is_method_enabled) continue;
      if (m.payment_method === 'EFT') {
        const missing = FORMAT_FIELDS.filter((f) => !m[f]);
        if (missing.length) out.push(`EFT: format incomplete (${missing.join(', ')})`);
      }
      if (m.payment_method === 'CHEQUE' && m.cheque_stock_required && !m.cheque_format_template_id) {
        out.push('CHEQUE: stock required but no cheque format template selected');
      }
    }
    return out;
  }, [methods]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Payment Capability
          {issues.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="h-3 w-3" /> {issues.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {currencyPolicy && (
          <div className="text-xs text-muted-foreground">
            Default currency: <span className="font-mono">{currencyPolicy.currency_code}</span>
            {currencyPolicy.allow_foreign_currency_products && (
              <> · Alt allowed: <span className="font-mono">{(currencyPolicy.allowed_alt_currencies ?? []).join(', ') || '—'}</span></>
            )}
          </div>
        )}

        {methods.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No payment methods configured.</div>
        ) : (
          <div className="space-y-2">
            {methods.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-mono text-xs min-w-[80px]">{m.payment_method}</span>
                <Flag on={m.is_method_enabled} label="Enabled" />
                {m.is_default && <Badge variant="secondary" className="text-[10px]">Default {m.default_priority ? `#${m.default_priority}` : ''}</Badge>}
                <Flag on={m.allow_third_party_payee} label="3rd-party payee" />
                <Flag on={m.allow_provider_direct_pay} label="Provider direct" />
                {m.payment_method === 'EFT' && (
                  <Flag on={FORMAT_FIELDS.every((f) => !!m[f])} label="EFT format" />
                )}
                {m.payment_method === 'CHEQUE' && (
                  <Flag on={!m.cheque_stock_required || !!m.cheque_format_template_id} label="Cheque stock" />
                )}
              </div>
            ))}
          </div>
        )}

        {issues.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-destructive space-y-0.5">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentCapabilitySummary;
