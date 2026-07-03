/**
 * Phase D — Master Data Consumption
 *
 * Admin surface listing distinct free-text values stored in legacy Legal
 * columns that are not yet present in their target reference groups. Powered
 * by the `lg_list_unmapped_reference_values` PL/pgSQL helper.
 *
 * The mapping/repair action is presented as a link to the standard Legal
 * Reference Data admin page where the value can be added to the group. Once
 * seeded, the row disappears from this list on refresh.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LG_REF } from '@/hooks/legal/useLegalReferenceData';

const sb = supabase as any;

/**
 * The canonical set of legacy free-text columns we track. Each row targets a
 * (table, column) → reference-group triple; add new entries here as more
 * screens move to master-driven selectors.
 */
const LEGACY_TARGETS: Array<{
  id: string;
  section: string;
  table: string;
  column: string;
  group: string;
  label: string;
}> = [
  { id: 'hearing-type',   section: 'Court Operations',        table: 'lg_hearing',   column: 'hearing_type_code', group: LG_REF.HEARING_TYPE,    label: 'Hearing type' },
  { id: 'hearing-outcome',section: 'Court Operations',        table: 'lg_hearing',   column: 'outcome_code',      group: LG_REF.HEARING_OUTCOME, label: 'Hearing outcome' },
  { id: 'order-type',     section: 'Judicial Orders',         table: 'lg_order',     column: 'order_type_code',   group: LG_REF.ORDER_TYPE,      label: 'Order type' },
  { id: 'liability-type', section: 'Recoverable Liabilities', table: 'lg_liability', column: 'liability_type',    group: LG_REF.LIABILITY_TYPE,  label: 'Liability type' },
  { id: 'fund-type',      section: 'Recoverable Liabilities', table: 'lg_liability', column: 'fund_type',         group: LG_REF.FUND_TYPE,       label: 'Fund type' },
  { id: 'closure-reason', section: 'Matter Workspace',        table: 'lg_case',      column: 'closure_reason',    group: LG_REF.CLOSURE_REASON,  label: 'Closure reason' },
];

interface UnmappedRow { stored_value: string; occurrences: number }

function useUnmapped(target: typeof LEGACY_TARGETS[number]) {
  return useQuery({
    queryKey: ['legal-legacy-unmapped', target.id],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc('lg_list_unmapped_reference_values', {
        p_table_name: target.table,
        p_column_name: target.column,
        p_group_code: target.group,
        p_limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as UnmappedRow[];
    },
  });
}

function TargetCard({ target }: { target: typeof LEGACY_TARGETS[number] }) {
  const q = useUnmapped(target);
  const rows = q.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {target.label}
              <Badge variant="outline" className="font-mono text-[10px]">{target.group}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {target.section} · <span className="font-mono">{target.table}.{target.column}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={rows.length === 0 ? 'secondary' : 'destructive'}>
              {q.isLoading ? '…' : `${rows.length} unmapped`}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {q.error && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{(q.error as Error).message}</AlertDescription>
          </Alert>
        )}
        {!q.isLoading && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">✅ All stored values are covered by the master.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto border rounded divide-y">
            {rows.map((r) => (
              <div key={r.stored_value} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="font-mono">{r.stored_value}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-muted-foreground">{r.occurrences} row(s)</span>
                  <Button asChild size="sm" variant="outline" className="h-6 px-2 text-[11px]">
                    <Link to={`/legal/config/reference-data?group=${encodeURIComponent(target.group)}&seed=${encodeURIComponent(r.stored_value)}`}>
                      Map <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LegalReferenceLegacyValues() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const n = search.trim().toLowerCase();
    if (!n) return LEGACY_TARGETS;
    return LEGACY_TARGETS.filter(
      (t) =>
        t.label.toLowerCase().includes(n) ||
        t.section.toLowerCase().includes(n) ||
        t.group.toLowerCase().includes(n) ||
        t.column.includes(n) ||
        t.table.includes(n),
    );
  }, [search]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal — Legacy Reference Values</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Distinct free-text values stored before the master-data consumption
          rollout. Map each one to an existing reference value (or add a new
          one) via the Reference Data admin. This page reads live data — after
          mapping, refresh to confirm the row is gone.
        </p>
      </div>

      <div className="max-w-sm">
        <Label htmlFor="q" className="text-xs">Filter</Label>
        <Input id="q" placeholder="Search by section, group, table…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <TargetCard key={t.id} target={t} />
        ))}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Soft validation only.</strong> The <code>lg_validate_reference()</code>
          helper is warn-only for now; unknown values are surfaced here but
          writes are not blocked. Per-column CHECK triggers can be added once
          this list is empty for the target column.
        </AlertDescription>
      </Alert>
    </div>
  );
}
