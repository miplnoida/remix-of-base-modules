import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calculator, Table as TableIcon, Variable, Layers, Beaker, ShieldCheck, Settings2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RateTableEditor } from './RateTableEditor';

type Formula = { id: string; template_code: string; template_name: string; category: string | null; governance_status: string };
type RateTable = { id: string; table_code: string; table_name: string; table_type: string; lookup_mode: string; status: string; country_code: string; version_no: number };
type Binding = { id: string; product_id: string | null; product_version_id: string | null; calculation_stage: string; sequence_no: number; output_variable: string | null; formula_template_id: string };
type Variable = { id: string; variable_code: string; display_name: string; category: string | null; data_type: string | null; unit: string | null; is_active: boolean };

const TAB_KEYS = ['formulas','variables','rate-tables','matrix','parameters','bindings','simulation','validation'] as const;
type TabKey = typeof TAB_KEYS[number];

export default function CalculationSetup() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get('tab') as TabKey) || 'formulas';
  const [tab, setTab] = useState<TabKey>(TAB_KEYS.includes(initial) ? initial : 'formulas');
  const [loading, setLoading] = useState(true);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [rateTables, setRateTables] = useState<RateTable[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [fT, rT, bT, vT] = await Promise.all([
        sb.from('bn_formula_template').select('id, template_code, template_name, category, governance_status').order('template_code'),
        sb.from('bn_rate_table').select('id, table_code, table_name, table_type, lookup_mode, status, country_code, version_no').order('table_code'),
        sb.from('bn_product_formula_binding').select('id, product_id, product_version_id, calculation_stage, sequence_no, output_variable, formula_template_id').order('calculation_stage').order('sequence_no'),
        sb.from('bn_formula_variable_registry').select('id, variable_code, display_name, category, data_type, unit, is_active').eq('is_active', true).order('category').order('variable_code'),
      ]);
      if (!alive) return;
      setFormulas((fT.data ?? []) as Formula[]);
      setRateTables((rT.data ?? []) as RateTable[]);
      setBindings((bT.data ?? []) as Binding[]);
      setVariables((vT.data ?? []) as Variable[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const switchTab = (t: TabKey) => {
    setTab(t);
    setParams((p) => { p.set('tab', t); return p; }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculation Setup
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure formulas, rate / tier / matrix tables, variable registry, product
            parameters, and product formula bindings used by the Benefit Calculation Engine.
            Every rate, share, cap and threshold lives in the database — nothing is hardcoded.
          </p>
        </div>
        <Button variant="outline" onClick={() => nav('/bn/config/formulas')}>Legacy Formula Editor</Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => switchTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="formulas"><Calculator className="h-4 w-4 mr-1" />Formulas</TabsTrigger>
          <TabsTrigger value="variables"><Variable className="h-4 w-4 mr-1" />Variables</TabsTrigger>
          <TabsTrigger value="rate-tables"><TableIcon className="h-4 w-4 mr-1" />Rate / Tier</TabsTrigger>
          <TabsTrigger value="matrix"><Layers className="h-4 w-4 mr-1" />Matrix</TabsTrigger>
          <TabsTrigger value="parameters"><Settings2 className="h-4 w-4 mr-1" />Parameters</TabsTrigger>
          <TabsTrigger value="bindings">Bindings</TabsTrigger>
          <TabsTrigger value="simulation"><Beaker className="h-4 w-4 mr-1" />Simulation</TabsTrigger>
          <TabsTrigger value="validation"><ShieldCheck className="h-4 w-4 mr-1" />Validation</TabsTrigger>
        </TabsList>

        {loading ? (
          <Card className="mt-4"><CardContent className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
        ) : (
          <>
            <TabsContent value="formulas">
              <ListCard title="Formula Library" count={formulas.length}>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {formulas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.template_code}</TableCell>
                        <TableCell>{f.template_name}</TableCell>
                        <TableCell><Badge variant="outline">{f.category ?? '—'}</Badge></TableCell>
                        <TableCell><Badge variant={f.governance_status === 'ACTIVE' ? 'default' : 'secondary'}>{f.governance_status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!formulas.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No formulas yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ListCard>
            </TabsContent>

            <TabsContent value="variables">
              <ListCard title="Variable Registry" count={variables.length}>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {variables.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.variable_code}</TableCell>
                        <TableCell>{v.display_name}</TableCell>
                        <TableCell><Badge variant="outline">{v.category ?? '—'}</Badge></TableCell>
                        <TableCell>{v.data_type ?? '—'}</TableCell>
                        <TableCell>{v.unit ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!variables.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No variables seeded</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ListCard>
            </TabsContent>

            <TabsContent value="rate-tables">
              <ListCard title="Rate / Tier Tables" count={rateTables.filter((r) => ['TIER','RATE_TABLE','LOOKUP','CAP_TABLE','CONDITION_TABLE'].includes(r.table_type)).length}>
                <RateTablesList rows={rateTables.filter((r) => ['TIER','RATE_TABLE','LOOKUP','CAP_TABLE','CONDITION_TABLE'].includes(r.table_type))} />
              </ListCard>
            </TabsContent>

            <TabsContent value="matrix">
              <ListCard title="Matrix / Share Tables" count={rateTables.filter((r) => ['MATRIX','SHARE_TABLE'].includes(r.table_type)).length}>
                <RateTablesList rows={rateTables.filter((r) => ['MATRIX','SHARE_TABLE'].includes(r.table_type))} />
              </ListCard>
            </TabsContent>

            <TabsContent value="parameters">
              <PlaceholderCard
                title="Product Parameters"
                hint="Manage per-product configurable values (replacement rates, grant amounts, unit sizes, flat weekly rates)."
                link={() => nav('/bn/config/product-parameters')}
              />
            </TabsContent>

            <TabsContent value="bindings">
              <ListCard title="Product Formula Bindings" count={bindings.length}>
                <Table>
                  <TableHeader><TableRow><TableHead>Product Version</TableHead><TableHead>Stage</TableHead><TableHead>Seq</TableHead><TableHead>Output</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bindings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.product_version_id ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline">{b.calculation_stage}</Badge></TableCell>
                        <TableCell>{b.sequence_no}</TableCell>
                        <TableCell>{b.output_variable ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!bindings.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No bindings yet — link products to formulas from the Product Catalog</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ListCard>
            </TabsContent>

            <TabsContent value="simulation">
              <PlaceholderCard
                title="Simulation"
                hint="Run a benefit calculation against synthetic facts and view the full step-by-step trace."
              />
            </TabsContent>

            <TabsContent value="validation">
              <PlaceholderCard
                title="Validation"
                hint="Checks every formula's variables are registered, rate tables have no gaps/overlaps, and products have complete bindings."
                link={() => nav('/bn/config/validation')}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function ListCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle><Badge variant="secondary">{count}</Badge></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PlaceholderCard({ title, hint, link }: { title: string; hint: string; link?: () => void }) {
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {link && <Button variant="outline" onClick={link}>Open</Button>}
      </CardContent>
    </Card>
  );
}

function RateTablesList({ rows }: { rows: RateTable[] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Mode</TableHead><TableHead>Country</TableHead><TableHead>v</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.table_code}</TableCell>
            <TableCell>{r.table_name}</TableCell>
            <TableCell><Badge variant="outline">{r.table_type}</Badge></TableCell>
            <TableCell>{r.lookup_mode}</TableCell>
            <TableCell>{r.country_code}</TableCell>
            <TableCell>{r.version_no}</TableCell>
            <TableCell><Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
          </TableRow>
        ))}
        {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No tables yet</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}
