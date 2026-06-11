/**
 * ValidationPanel — health check for the BN Calculation Framework.
 *
 * Surfaces:
 *  1. Active bindings missing variable mappings (vs formula required_parameters)
 *  2. Mappings pointing at RATE_TABLE / MATRIX_TABLE codes that don't exist or are inactive
 *  3. Rate tables with no rows (effectively non-functional)
 *  4. Product versions that have NO active binding at all
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

interface Issue { kind: string; severity: 'ERROR' | 'WARN'; subject: string; detail: string }

export function ValidationPanel() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState({ bindings: 0, mappings: 0, rateTables: 0, productVersions: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, mRes, fRes, rtRes, rtrRes, pvRes] = await Promise.all([
        sb.from('bn_product_formula_binding').select('id, formula_template_id, product_version_id, calculation_stage, sequence_no, is_active').eq('is_active', true),
        sb.from('bn_product_formula_variable_mapping').select('binding_id, variable_name, source_type, rate_table_code'),
        sb.from('bn_formula_template').select('id, template_code, required_parameters'),
        sb.from('bn_rate_table').select('id, table_code, status'),
        sb.from('bn_rate_table_row').select('rate_table_id'),
        sb.from('bn_product_version').select('id, version_no, product_id, status').eq('status', 'ACTIVE'),
      ]);

      const bindings = bRes.data ?? [];
      const mappings = mRes.data ?? [];
      const templates = fRes.data ?? [];
      const rateTables = rtRes.data ?? [];
      const rateRows = rtrRes.data ?? [];
      const versions = pvRes.data ?? [];

      const tplById = new Map(templates.map((t: { id: string; template_code: string; required_parameters: string[] | null }) => [t.id, t]));
      const tableByCode = new Map(rateTables.map((r: { table_code: string; status: string }) => [r.table_code, r]));
      const rowCountByTable = new Map<string, number>();
      for (const row of rateRows) {
        rowCountByTable.set(row.rate_table_id, (rowCountByTable.get(row.rate_table_id) ?? 0) + 1);
      }
      const mapsByBinding = new Map<string, Array<{ variable_name: string; source_type: string; rate_table_code: string | null }>>();
      for (const m of mappings) {
        const arr = mapsByBinding.get(m.binding_id) ?? [];
        arr.push(m);
        mapsByBinding.set(m.binding_id, arr);
      }

      const issuesOut: Issue[] = [];

      // 1. bindings missing required vars
      for (const b of bindings) {
        const tpl = tplById.get(b.formula_template_id) as { template_code: string; required_parameters: string[] | null } | undefined;
        if (!tpl) continue;
        const req = Array.isArray(tpl.required_parameters) ? tpl.required_parameters : [];
        const have = new Set((mapsByBinding.get(b.id) ?? []).map((m) => m.variable_name));
        const missing = req.filter((v) => !have.has(v));
        if (missing.length) {
          issuesOut.push({
            kind: 'BINDING_MISSING_VARS',
            severity: 'ERROR',
            subject: `${tpl.template_code} @ ${b.calculation_stage}#${b.sequence_no}`,
            detail: `Missing variable mappings: ${missing.join(', ')}`,
          });
        }
      }

      // 2. mappings → invalid rate tables
      for (const m of mappings) {
        if (m.source_type !== 'RATE_TABLE' && m.source_type !== 'MATRIX_TABLE') continue;
        if (!m.rate_table_code) {
          issuesOut.push({ kind: 'MAPPING_NO_TABLE', severity: 'ERROR', subject: m.variable_name, detail: `${m.source_type} mapping without a rate_table_code` });
          continue;
        }
        const t = tableByCode.get(m.rate_table_code) as { status: string } | undefined;
        if (!t) issuesOut.push({ kind: 'MAPPING_BAD_TABLE', severity: 'ERROR', subject: m.variable_name, detail: `Rate table "${m.rate_table_code}" does not exist` });
        else if (t.status !== 'ACTIVE') issuesOut.push({ kind: 'MAPPING_INACTIVE_TABLE', severity: 'WARN', subject: m.variable_name, detail: `Rate table "${m.rate_table_code}" status = ${t.status}` });
      }

      // 3. rate tables with no rows
      for (const t of rateTables) {
        if ((rowCountByTable.get(t.id) ?? 0) === 0) {
          issuesOut.push({ kind: 'EMPTY_RATE_TABLE', severity: 'WARN', subject: t.table_code, detail: 'Rate table has no rows' });
        }
      }

      // 4. active product versions without any binding
      const versionsWithBindings = new Set(bindings.map((b: { product_version_id: string | null }) => b.product_version_id).filter(Boolean));
      for (const v of versions) {
        if (!versionsWithBindings.has(v.id)) {
          issuesOut.push({ kind: 'PV_NO_BINDING', severity: 'WARN', subject: `v${v.version_no} (${v.id.slice(0, 8)})`, detail: 'Active product version has no formula binding' });
        }
      }

      setIssues(issuesOut);
      setStats({ bindings: bindings.length, mappings: mappings.length, rateTables: rateTables.length, productVersions: versions.length });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const errors = issues.filter((i) => i.severity === 'ERROR');
  const warns = issues.filter((i) => i.severity === 'WARN');

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Configuration Validation</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Re-check
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Active bindings" value={stats.bindings} />
          <Stat label="Variable mappings" value={stats.mappings} />
          <Stat label="Rate tables" value={stats.rateTables} />
          <Stat label="Active versions" value={stats.productVersions} />
        </div>

        <div className="flex items-center gap-2">
          {errors.length === 0 && warns.length === 0
            ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> All clear</Badge>
            : (
              <>
                {errors.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{errors.length} error(s)</Badge>}
                {warns.length > 0 && <Badge variant="secondary">{warns.length} warning(s)</Badge>}
              </>
            )}
        </div>

        <div className="space-y-2">
          {issues.map((iss, i) => (
            <div key={i} className={`rounded border p-2 text-xs ${iss.severity === 'ERROR' ? 'border-destructive/40 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-medium">{iss.subject}</span>
                <Badge variant={iss.severity === 'ERROR' ? 'destructive' : 'secondary'} className="text-[10px]">{iss.kind}</Badge>
              </div>
              <div className="text-muted-foreground">{iss.detail}</div>
            </div>
          ))}
          {!issues.length && !loading && <p className="text-sm text-muted-foreground">No issues found.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
