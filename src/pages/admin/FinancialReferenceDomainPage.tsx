/**
 * Financial Reference Domain Pack — canonical admin shell (Epic 2.4).
 * Route: /admin/financial-reference (registered in app_modules as financial_reference_domain).
 *
 * Tabs: Currencies · Exchange Rates · Banks · Bank Branches · Payment Channels ·
 *       Settlement Methods · Account Types · Tax References · Chart of Accounts ·
 *       External Codes · Country Availability.
 *
 * Country selector consumes the Geography Domain Pack (useCountries) — NO parallel
 * country source is introduced. Codes align with the Enterprise Reference Framework.
 */
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useCountries } from '@/hooks/geography/useGeography';
import {
  useCurrencies,
  useExchangeRates,
  useBanks,
  useBankBranches,
  usePaymentChannels,
  useSettlementMethods,
  useAccountTypes,
  useTaxReferences,
  useChartOfAccountRefs,
  useFinancialExternalCodes,
  useCountryFinancialAvailability,
} from '@/hooks/financial/useFinancialReference';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
      No {label} configured yet. Seed via the reference framework or import action.
    </div>
  );
}

function DataTable({
  columns, rows, empty,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  empty: string;
}) {
  if (!rows?.length) return <EmptyState label={empty} />;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top">
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancialReferenceDomainPage() {
  const { data: countries = [], isLoading: cLoading } = useCountries();
  const [countryCode, setCountryCode] = useState<string>('');
  const effectiveCountry = countryCode || countries[0]?.country_code || '';
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const currencies = useCurrencies();
  const fx = useExchangeRates();
  const banks = useBanks(effectiveCountry || null);
  const branches = useBankBranches(selectedBankId || null);
  const channels = usePaymentChannels(effectiveCountry || null);
  const settlement = useSettlementMethods();
  const accountTypes = useAccountTypes();
  const taxRefs = useTaxReferences(effectiveCountry || null);
  const coa = useChartOfAccountRefs(effectiveCountry || null);
  const extCodes = useFinancialExternalCodes();
  const availability = useCountryFinancialAvailability(effectiveCountry || null);

  const countryOptions = useMemo(
    () => countries.map((c: any) => ({ value: c.country_code, label: `${c.country_name} (${c.country_code})` })),
    [countries],
  );
  const bankOptions = useMemo(
    () => (banks.data ?? []).map((b) => ({ value: b.id, label: `${b.bank_name} (${b.bank_code})` })),
    [banks.data],
  );

  return (
    <PermissionWrapper moduleName="financial_reference_domain">
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Financial Reference"
          subtitle="Shared Social Security financial reference foundation — currencies, FX, banks, branches, payment channels, settlement, account types, tax and chart-of-account references, external codes, and country availability. Read-only shell; no payment execution or GL posting."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Administration' },
            { label: 'Platform', href: '/admin/platform' },
            { label: 'Financial Reference' },
          ]}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active country (via Geography Domain Pack)</CardTitle>
            <CardDescription>
              Country list is served by <code>useCountries()</code> from the Geography Domain Pack.
              Financial Reference does not maintain its own country source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <Select value={effectiveCountry} onValueChange={setCountryCode} disabled={cLoading || !countries.length}>
                <SelectTrigger>
                  <SelectValue placeholder={cLoading ? 'Loading…' : countries.length ? 'Select country' : 'No countries registered yet'} />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="currencies" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="currencies">Currencies</TabsTrigger>
            <TabsTrigger value="fx">Exchange Rates</TabsTrigger>
            <TabsTrigger value="banks">Banks</TabsTrigger>
            <TabsTrigger value="branches">Bank Branches</TabsTrigger>
            <TabsTrigger value="channels">Payment Channels</TabsTrigger>
            <TabsTrigger value="settlement">Settlement Methods</TabsTrigger>
            <TabsTrigger value="accounts">Account Types</TabsTrigger>
            <TabsTrigger value="tax">Tax References</TabsTrigger>
            <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="external">External Codes</TabsTrigger>
            <TabsTrigger value="availability">Country Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="currencies">
            <DataTable
              empty="currencies"
              rows={currencies.data ?? []}
              columns={[
                { key: 'currency_code', label: 'Code' },
                { key: 'currency_name', label: 'Name' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'numeric_code', label: 'Numeric' },
                { key: 'minor_unit', label: 'Minor Unit' },
                { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
              ]}
            />
          </TabsContent>

          <TabsContent value="fx">
            <DataTable
              empty="exchange rates"
              rows={fx.data ?? []}
              columns={[
                { key: 'from_currency', label: 'From' },
                { key: 'to_currency', label: 'To' },
                { key: 'rate', label: 'Rate' },
                { key: 'rate_date', label: 'Date' },
                { key: 'source', label: 'Source' },
              ]}
            />
          </TabsContent>

          <TabsContent value="banks">
            <DataTable
              empty="banks"
              rows={banks.data ?? []}
              columns={[
                { key: 'bank_code', label: 'Code' },
                { key: 'bank_name', label: 'Name' },
                { key: 'country_code', label: 'Country' },
                { key: 'swift_bic', label: 'SWIFT/BIC' },
                { key: 'national_code', label: 'National Code' },
                { key: 'legacy_ref', label: 'Legacy Ref' },
              ]}
            />
          </TabsContent>

          <TabsContent value="branches" className="space-y-3">
            <div className="max-w-sm">
              <Select value={selectedBankId} onValueChange={setSelectedBankId} disabled={!bankOptions.length}>
                <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                <SelectContent>
                  {bankOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DataTable
              empty="bank branches"
              rows={branches.data ?? []}
              columns={[
                { key: 'branch_code', label: 'Code' },
                { key: 'branch_name', label: 'Name' },
                { key: 'city', label: 'City' },
                { key: 'routing_number', label: 'Routing' },
                { key: 'swift_bic', label: 'SWIFT/BIC' },
              ]}
            />
          </TabsContent>

          <TabsContent value="channels">
            <DataTable
              empty="payment channels"
              rows={channels.data ?? []}
              columns={[
                { key: 'channel_code', label: 'Code' },
                { key: 'channel_name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'direction', label: 'Direction' },
                { key: 'country_code', label: 'Country' },
              ]}
            />
          </TabsContent>

          <TabsContent value="settlement">
            <DataTable
              empty="settlement methods"
              rows={settlement.data ?? []}
              columns={[
                { key: 'method_code', label: 'Code' },
                { key: 'method_name', label: 'Name' },
                { key: 'description', label: 'Description' },
              ]}
            />
          </TabsContent>

          <TabsContent value="accounts">
            <DataTable
              empty="account types"
              rows={accountTypes.data ?? []}
              columns={[
                { key: 'account_code', label: 'Code' },
                { key: 'account_name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'description', label: 'Description' },
              ]}
            />
          </TabsContent>

          <TabsContent value="tax">
            <DataTable
              empty="tax references"
              rows={taxRefs.data ?? []}
              columns={[
                { key: 'tax_code', label: 'Code' },
                { key: 'tax_name', label: 'Name' },
                { key: 'tax_authority', label: 'Authority' },
                { key: 'country_code', label: 'Country' },
              ]}
            />
          </TabsContent>

          <TabsContent value="coa">
            <DataTable
              empty="chart-of-account references"
              rows={coa.data ?? []}
              columns={[
                { key: 'account_code', label: 'Code' },
                { key: 'account_name', label: 'Name' },
                { key: 'account_type', label: 'Type' },
                { key: 'parent_code', label: 'Parent' },
                { key: 'country_code', label: 'Country' },
              ]}
            />
          </TabsContent>

          <TabsContent value="external">
            <DataTable
              empty="external financial codes"
              rows={extCodes.data ?? []}
              columns={[
                { key: 'system_code', label: 'System' },
                { key: 'entity_type', label: 'Entity' },
                { key: 'local_ref', label: 'Local Ref' },
                { key: 'external_code', label: 'External Code' },
              ]}
            />
          </TabsContent>

          <TabsContent value="availability">
            <DataTable
              empty="country availability rules"
              rows={availability.data ?? []}
              columns={[
                { key: 'entity_type', label: 'Entity' },
                { key: 'entity_ref', label: 'Ref' },
                { key: 'is_available', label: 'Available', render: (r) => (r.is_available ? 'Yes' : 'No') },
                { key: 'effective_from', label: 'From' },
                { key: 'effective_to', label: 'To' },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
