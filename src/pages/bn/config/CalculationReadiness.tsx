import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

interface Row {
  product_id: string;
  benefit_code: string;
  benefit_name: string;
  product_status: string;
  version_id: string | null;
  version_no: number | null;
  version_status: string | null;
  binding_id: string | null;
  binding_active: boolean | null;
  calculation_stage: string | null;
  formula_version_id: string | null;
  formula_code: string | null;
  formula_template_code: string | null;
  output_variable: string | null;
  var_mappings: number;
  required_variables: number;
  parameters: number;
  rate_tables_referenced: number;
  last_sim_at: string | null;
  last_sim_status: string | null;
  legacy_calc_config: boolean;
}

type Health = 'ready' | 'partial' | 'missing' | 'legacy';

function classify(r: Row): Health {
  if (!r.binding_id || !r.binding_active) return 'missing';
  if (r.legacy_calc_config && !r.formula_version_id) return 'legacy';
  if (r.required_variables > 0 && r.var_mappings < r.required_variables) return 'partial';
  if (!r.formula_version_id) return 'partial';
  return 'ready';
}

const healthMeta: Record<Health, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertTriangle },
  missing: { label: 'No Binding', cls: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
  legacy: { label: 'Legacy Only', cls: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle },
};

export default function CalculationReadiness() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Health>('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [prodR, verR, bindR, mapR, parR, fvR, ftR, simR] = await Promise.all([
        sb.from('bn_product').select('id, benefit_code, benefit_name, status'),
        sb.from('bn_product_version').select('id, product_id, version_number, status, calculation_config'),
        sb.from('bn_product_formula_binding').select('id, product_id, product_version_id, formula_version_id, formula_template_id, calculation_stage, output_variable, is_active'),
        sb.from('bn_product_formula_variable_mapping').select('id, binding_id, variable_name, source_type, rate_table_code'),
        sb.from('bn_product_parameter').select('id, product_id'),
        sb.from('bn_formula_version').select('id, formula_code, formula_template_id, steps_json'),
        sb.from('bn_formula_template').select('id, template_code, required_variables'),
        sb.from('bn_sim_run').select('id, product_id, status, created_at').order('created_at', { ascending: false }).limit(500),
      ]);
      if (!alive) return;

      const products = prodR.data ?? [];
      const versions = verR.data ?? [];
      const bindings = bindR.data ?? [];
      const mappings = mapR.data ?? [];
      const params = parR.data ?? [];
      const fvs = fvR.data ?? [];
      const fts = ftR.data ?? [];
      const sims = simR.data ?? [];

      const ftById = new Map<string, any>(fts.map((t: any) => [t.id, t]));
      const fvById = new Map<string, any>(fvs.map((v: any) => [v.id, v]));

      const out: Row[] = [];
      for (const p of products) {
        const pvs = versions.filter((v: any) => v.product_id === p.id);
        const activePv = pvs.find((v: any) => v.status === 'active') ?? pvs.sort((a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0))[0];
        const pv = activePv ?? null;
        const bs = bindings.filter((b: any) => b.product_id === p.id && (!pv || b.product_version_id === pv.id));
        const b = bs.find((x: any) => x.is_active) ?? bs[0] ?? null;
        const fv = b?.formula_version_id ? fvById.get(b.formula_version_id) : null;
        const ft = b?.formula_template_id ? ftById.get(b.formula_template_id) : null;
        const mapCount = b ? mappings.filter((m: any) => m.binding_id === b.id).length : 0;
        const required = Array.isArray(ft?.required_variables) ? ft.required_variables.length : 0;
        const paramCount = params.filter((pp: any) => pp.product_id === p.id).length;
        const rateRefs = b ? mappings.filter((m: any) => m.binding_id === b.id && m.source_type === 'rate_table').length : 0;
        const lastSim = sims.find((s: any) => s.product_id === p.id);
        const hasLegacy = !!(pv?.calculation_config && typeof pv.calculation_config === 'object' && Object.keys(pv.calculation_config).length > 0);

        out.push({
          product_id: p.id,
          benefit_code: p.benefit_code,
          benefit_name: p.benefit_name,
          product_status: p.status,
          version_id: pv?.id ?? null,
          version_no: pv?.version_number ?? null,
          version_status: pv?.status ?? null,
          binding_id: b?.id ?? null,
          binding_active: b?.is_active ?? null,
          calculation_stage: b?.calculation_stage ?? null,
          formula_version_id: b?.formula_version_id ?? null,
          formula_code: fv?.formula_code ?? null,
          formula_template_code: ft?.template_code ?? null,
          output_variable: b?.output_variable ?? null,
          var_mappings: mapCount,
          required_variables: required,
          parameters: paramCount,
          rate_tables_referenced: rateRefs,
          last_sim_at: lastSim?.created_at ?? null,
          last_sim_status: lastSim?.status ?? null,
          legacy_calc_config: hasLegacy,
        });
      }
      out.sort((a, b) => a.benefit_code.localeCompare(b.benefit_code));
      setRows(out);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const h = classify(r);
      if (filter !== 'all' && h !== filter) return false;
      if (!q) return true;
      return (
        r.benefit_code.toLowerCase().includes(q) ||
        r.benefit_name.toLowerCase().includes(q) ||
        (r.formula_code ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, ready: 0, partial: 0, missing: 0, legacy: 0 };
    rows.forEach((r) => { c[classify(r)]++; });
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Product Calculation Readiness
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Per-product audit of formula bindings, variable mappings, parameters, referenced
            rate/matrix tables, last simulation outcome, and any remaining legacy calculation
            config. Use this report to confirm every benefit product is fully driven by the
            database-configured calculation engine.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['all', 'ready', 'partial', 'missing', 'legacy'] as const).map((k) => (
          <Card
            key={k}
            className={`cursor-pointer transition ${filter === k ? 'border-primary ring-1 ring-primary' : ''}`}
            onClick={() => setFilter(k)}
          >
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{k === 'all' ? 'Total' : healthMeta[k].label}</div>
              <div className="text-2xl font-semibold mt-1">{counts[k]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Products</CardTitle>
          <Input
            placeholder="Search by code, name, or formula…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading readiness data…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No products match.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Formula</TableHead>
                    <TableHead className="text-right">Vars</TableHead>
                    <TableHead className="text-right">Params</TableHead>
                    <TableHead className="text-right">Rate Tables</TableHead>
                    <TableHead>Legacy</TableHead>
                    <TableHead>Last Simulation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const h = classify(r);
                    const meta = healthMeta[h];
                    const Icon = meta.icon;
                    return (
                      <TableRow key={r.product_id}>
                        <TableCell>
                          <Badge className={`gap-1 ${meta.cls}`} variant="outline">
                            <Icon className="h-3 w-3" /> {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.benefit_code}</div>
                          <div className="text-xs text-muted-foreground">{r.benefit_name}</div>
                        </TableCell>
                        <TableCell>
                          {r.version_no != null ? (
                            <div className="text-sm">v{r.version_no}<span className="text-xs text-muted-foreground ml-1">({r.version_status})</span></div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.formula_code ? (
                            <div className="text-sm">
                              <div className="font-mono text-xs">{r.formula_code}</div>
                              {r.formula_template_code && <div className="text-xs text-muted-foreground">{r.formula_template_code}</div>}
                            </div>
                          ) : <Badge variant="outline" className="text-xs">Unbound</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {r.var_mappings}{r.required_variables ? ` / ${r.required_variables}` : ''}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{r.parameters}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{r.rate_tables_referenced}</TableCell>
                        <TableCell>
                          {r.legacy_calc_config
                            ? <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">Present</Badge>
                            : <span className="text-xs text-muted-foreground">Clean</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.last_sim_at ? (
                            <>
                              <div>{new Date(r.last_sim_at).toLocaleDateString()}</div>
                              <div className="text-muted-foreground">{r.last_sim_status}</div>
                            </>
                          ) : <span className="text-muted-foreground">Never</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/bn/config/calculation?tab=bindings&product=${r.product_id}`}>
                              Open <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
