/**
 * Country Pack — Payment Capability Summary
 *
 * Read-only diagnostic widget that explains *why* a country shows N payment
 * methods. Surfaces four buckets:
 *   1. Available in Reference Data (bn_payment_method)
 *   2. Configured for Country     (bn_country_payment_config row exists)
 *   3. Enabled for Country        (is_method_enabled = true)
 *   4. Disabled for Country       (configured but is_method_enabled = false)
 *
 * Also flags:
 *   - reference methods with NO country row (gap)
 *   - EFT enabled but format incomplete
 *   - CHEQUE enabled but stock/template missing
 *   - more than one default method
 *   - default method not enabled
 *   - country has zero enabled methods
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';
import {
  listCountryPaymentCapabilities,
  getCountryCurrencyPolicy,
  listReferencePaymentMethods,
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

  const { data: reference = [] } = useQuery({
    queryKey: ['bn', 'reference-payment-methods'],
    queryFn: () => listReferencePaymentMethods(),
    staleTime: 5 * 60_000,
  });

  const { data: currencyPolicy } = useQuery({
    queryKey: ['bn', 'country-currency-policy', countryCode],
    queryFn: () => getCountryCurrencyPolicy(countryCode),
    enabled: !!countryCode,
  });

  const configuredCodes = useMemo(() => new Set(methods.map((m) => m.payment_method)), [methods]);
  const enabledMethods = useMemo(() => methods.filter((m) => m.is_method_enabled), [methods]);
  const disabledMethods = useMemo(() => methods.filter((m) => !m.is_method_enabled), [methods]);
  const missingFromCountry = useMemo(
    () => reference.filter((r) => r.active && !configuredCodes.has(r.method_code)),
    [reference, configuredCodes],
  );

  const issues = useMemo(() => {
    const out: string[] = [];
    if (!enabledMethods.length) out.push('Country has NO enabled payment methods — products cannot pay');
    const defaults = enabledMethods.filter((m) => m.is_default);
    if (defaults.length === 0 && enabledMethods.length > 0) out.push('No default method selected among enabled methods');
    if (defaults.length > 1) out.push(`More than one default method (${defaults.map((d) => d.payment_method).join(', ')})`);
    const orphanedDefault = methods.find((m) => m.is_default && !m.is_method_enabled);
    if (orphanedDefault) out.push(`Default method "${orphanedDefault.payment_method}" is disabled`);
    for (const m of enabledMethods) {
      if (m.payment_method === 'EFT') {
        const missing = FORMAT_FIELDS.filter((f) => !m[f]);
        if (missing.length) out.push(`EFT enabled but format incomplete (${missing.join(', ')})`);
      }
      if (m.payment_method === 'CHEQUE' && m.cheque_stock_required && !m.cheque_format_template_id) {
        out.push('CHEQUE enabled but no cheque format template selected');
      }
    }
    if (missingFromCountry.length) {
      out.push(`Reference methods with no country row: ${missingFromCountry.map((r) => r.method_code).join(', ')}`);
    }
    return out;
  }, [methods, enabledMethods, missingFromCountry]);

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
      <CardContent className="space-y-4 text-sm">
        {currencyPolicy && (
          <div className="text-xs text-muted-foreground">
            Default currency: <span className="font-mono">{currencyPolicy.currency_code}</span>
            {currencyPolicy.allow_foreign_currency_products && (
              <> · Alt allowed: <span className="font-mono">{(currencyPolicy.allowed_alt_currencies ?? []).join(', ') || '—'}</span></>
            )}
          </div>
        )}

        {/* Bucket totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Bucket label="Reference (active)" count={reference.filter((r) => r.active).length} tone="muted" />
          <Bucket label="Configured" count={methods.length} tone="muted" />
          <Bucket label="Enabled" count={enabledMethods.length} tone="ok" />
          <Bucket label="Disabled" count={disabledMethods.length} tone="warn" />
        </div>

        {/* Enabled methods */}
        <Section title="Enabled for Country" empty={enabledMethods.length === 0}>
          {enabledMethods.map((m) => (
            <Row key={m.id} m={m} />
          ))}
        </Section>

        {/* Disabled methods (always visible — never silently hidden) */}
        <Section title="Disabled for Country" empty={disabledMethods.length === 0}>
          {disabledMethods.map((m) => (
            <Row key={m.id} m={m} muted />
          ))}
        </Section>

        {/* Reference methods with no country row */}
        {missingFromCountry.length > 0 && (
          <Section title="Available in Reference Data — not yet configured">
            {missingFromCountry.map((r) => (
              <div key={r.method_code} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Circle className="h-3 w-3" />
                <span className="font-mono">{r.method_code}</span>
                <span>{r.method_name}</span>
                <Badge variant="outline" className="text-[10px]">Not configured</Badge>
              </div>
            ))}
          </Section>
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

const Bucket: React.FC<{ label: string; count: number; tone: 'ok' | 'warn' | 'muted' }> = ({ label, count, tone }) => {
  const cls =
    tone === 'ok' ? 'bg-primary/10 text-primary border-primary/20'
    : tone === 'warn' ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-muted text-muted-foreground border-border';
  return (
    <div className={`rounded border px-2 py-1.5 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-75">{label}</div>
      <div className="text-lg font-semibold leading-none">{count}</div>
    </div>
  );
};

const Section: React.FC<{ title: string; empty?: boolean; children?: React.ReactNode }> = ({ title, empty, children }) => (
  <div className="space-y-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
    {empty ? (
      <div className="text-xs italic text-muted-foreground">None.</div>
    ) : (
      <div className="space-y-1.5">{children}</div>
    )}
  </div>
);

const Row: React.FC<{ m: CountryPaymentMethodCapability; muted?: boolean }> = ({ m, muted }) => (
  <div className={`flex flex-wrap items-center gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0 ${muted ? 'opacity-70' : ''}`}>
    <span className="font-mono text-xs min-w-[120px]">{m.payment_method}</span>
    <span className="text-xs text-muted-foreground min-w-[140px]">{m.method_label}</span>
    <Flag on={m.is_method_enabled} label={m.is_method_enabled ? 'Enabled' : 'Disabled'} />
    {m.is_default && <Badge variant="secondary" className="text-[10px]">Default {m.default_priority ? `#${m.default_priority}` : ''}</Badge>}
    {m.allow_third_party_payee && <Badge variant="outline" className="text-[10px]">3rd-party payee</Badge>}
    {m.allow_provider_direct_pay && <Badge variant="outline" className="text-[10px]">Provider direct</Badge>}
    {m.payment_method === 'EFT' && (
      <Flag on={FORMAT_FIELDS.every((f) => !!m[f])} label="EFT format" />
    )}
    {m.payment_method === 'CHEQUE' && (
      <Flag on={!m.cheque_stock_required || !!m.cheque_format_template_id} label="Cheque stock" />
    )}
  </div>
);

export default PaymentCapabilitySummary;
