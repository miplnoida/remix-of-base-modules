import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Coins, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useReimbursementLimits, useUpsertReimbursementLimit, useDeleteReimbursementLimit,
  useMedicalProcedures, useExpenseTypes,
} from '@/hooks/bn/useBnMedical';
import type { BnMedicalReimbursementLimit } from '@/types/bnMedical';
import { calculateReimbursement } from '@/lib/bn/medicalCalculator';
import { useUserCode } from '@/hooks/useUserCode';

const CAP_TYPES = ['PER_CLAIM', 'PER_PROCEDURE', 'PER_EXPENSE', 'ANNUAL', 'LIFETIME'] as const;
const JURISDICTIONS = ['LOCAL', 'REGIONAL', 'INTERNATIONAL', 'ANY'] as const;

export default function ReimbursementLimitsPage() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: limits = [] } = useReimbursementLimits();
  const { data: procedures = [] } = useMedicalProcedures();
  const { data: expenseTypes = [] } = useExpenseTypes();
  const upsert = useUpsertReimbursementLimit();
  const del = useDeleteReimbursementLimit();

  const procName = useMemo(() => new Map(procedures.map((p: any) => [p.id, `${p.procedure_code} — ${p.procedure_name}`])), [procedures]);
  const expName = useMemo(() => new Map(expenseTypes.map((e: any) => [e.id, `${e.expense_code} — ${e.expense_name}`])), [expenseTypes]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnMedicalReimbursementLimit>>({});

  const openNew = () => {
    setEditing({
      country_code: 'SKN', jurisdiction_level: 'LOCAL', cap_type: 'PER_EXPENSE',
      cap_amount: 0, reimbursement_percent: 100, currency_code: 'XCD',
      effective_from: new Date().toISOString().slice(0, 10), is_active: true,
    });
    setOpen(true);
  };
  const upd = (f: keyof BnMedicalReimbursementLimit, v: unknown) => setEditing((p) => ({ ...p, [f]: v }));
  const save = async () => {
    try { await upsert.mutateAsync({ ...editing, modified_by: userCode, ...(editing.id ? {} : { created_by: userCode }) } as any); toast({ title: 'Saved' }); setOpen(false); }
    catch (e: any) { toast({ title: 'Validation', description: e?.message, variant: 'destructive' }); }
  };

  // Simulation state
  const [simExpense, setSimExpense] = useState({
    procedure_id: '', expense_type_id: '', jurisdiction_level: 'LOCAL',
    claimed_amount: 1000, approved_amount: 1000, currency_code: 'XCD',
  });
  const [simResult, setSimResult] = useState<any>(null);

  const runSim = () => {
    const expDefaults = new Map(expenseTypes.map((e: any) => [e.id, e.default_cap ?? null]));
    const result = calculateReimbursement(
      [{ claim_id: 'sim', ...simExpense } as any],
      limits as any,
      expDefaults,
      { countryCode: 'SKN', baseCurrency: 'XCD' }
    );
    setSimResult(result);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Coins className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Reimbursement Limits</h1>
          <p className="t-page-subtitle mt-1">Per-claim, per-procedure, per-expense, annual and lifetime caps with reimbursement percentage.</p>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="simulate" className="gap-2"><FlaskConical className="h-4 w-4" /> Simulate</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Active Limits</CardTitle><CardDescription>Overlapping active rules for the same scope are blocked by the database.</CardDescription></div>
              <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Limit</Button>
            </CardHeader>
            <CardContent>
              {limits.length === 0 ? <p className="text-muted-foreground py-6 text-center">No reimbursement limits configured.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Cap Type</TableHead><TableHead>Procedure</TableHead><TableHead>Expense</TableHead><TableHead>Country</TableHead><TableHead>Jurisdiction</TableHead><TableHead>Cap</TableHead><TableHead>%</TableHead><TableHead>Currency</TableHead><TableHead>Effective</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {limits.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell><Badge variant="outline">{l.cap_type}</Badge></TableCell>
                        <TableCell className="text-sm">{l.procedure_id ? procName.get(l.procedure_id) : '—'}</TableCell>
                        <TableCell className="text-sm">{l.expense_type_id ? expName.get(l.expense_type_id) : '—'}</TableCell>
                        <TableCell>{l.country_code}</TableCell>
                        <TableCell><Badge variant="outline">{l.jurisdiction_level}</Badge></TableCell>
                        <TableCell className="font-mono">{l.cap_amount}</TableCell>
                        <TableCell>{l.reimbursement_percent}%</TableCell>
                        <TableCell>{l.currency_code}</TableCell>
                        <TableCell className="text-xs">{l.effective_from}{l.effective_to ? ` → ${l.effective_to}` : ''}</TableCell>
                        <TableCell>{l.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...l }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(l.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Reimbursement Simulator</CardTitle><CardDescription>Test reimbursement against current active rules without changing any data.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Procedure</Label>
                  <Select value={simExpense.procedure_id || ''} onValueChange={(v) => setSimExpense((p) => ({ ...p, procedure_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{procName.get(p.id)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expense Type</Label>
                  <Select value={simExpense.expense_type_id || ''} onValueChange={(v) => setSimExpense((p) => ({ ...p, expense_type_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{expenseTypes.map((e: any) => <SelectItem key={e.id} value={e.id}>{expName.get(e.id)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select value={simExpense.jurisdiction_level} onValueChange={(v) => setSimExpense((p) => ({ ...p, jurisdiction_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['LOCAL','REGIONAL','INTERNATIONAL'].map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Claimed</Label><Input type="number" value={simExpense.claimed_amount} onChange={(e) => setSimExpense((p) => ({ ...p, claimed_amount: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Approved</Label><Input type="number" value={simExpense.approved_amount} onChange={(e) => setSimExpense((p) => ({ ...p, approved_amount: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={simExpense.currency_code} onChange={(e) => setSimExpense((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={runSim}>Run Simulation</Button></div>

              {simResult && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="text-muted-foreground">Total Claimed</div><div className="text-lg font-semibold">{simResult.total_claimed}</div></div>
                    <div><div className="text-muted-foreground">Total Approved</div><div className="text-lg font-semibold">{simResult.total_approved}</div></div>
                    <div><div className="text-muted-foreground">Total Payable</div><div className="text-lg font-semibold text-primary">{simResult.total_payable}</div></div>
                  </div>
                  {simResult.cap_applied && <Badge>Cap applied: {simResult.cap_applied}</Badge>}
                  <div>
                    <div className="text-sm font-medium mb-1">Calculation Trace</div>
                    <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs">{JSON.stringify(simResult.trace, null, 2)}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Reimbursement Limit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cap Type *</Label>
              <Select value={editing.cap_type} onValueChange={(v) => upd('cap_type', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAP_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jurisdiction *</Label>
              <Select value={editing.jurisdiction_level} onValueChange={(v) => upd('jurisdiction_level', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JURISDICTIONS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Procedure</Label>
              <Select value={editing.procedure_id || '__none__'} onValueChange={(v) => upd('procedure_id', v === '__none__' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{procName.get(p.id)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select value={editing.expense_type_id || '__none__'} onValueChange={(v) => upd('expense_type_id', v === '__none__' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {expenseTypes.map((e: any) => <SelectItem key={e.id} value={e.id}>{expName.get(e.id)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Country *</Label><Input value={editing.country_code || ''} onChange={(e) => upd('country_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Currency *</Label><Input value={editing.currency_code || ''} onChange={(e) => upd('currency_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Cap Amount *</Label><Input type="number" step="0.01" value={editing.cap_amount ?? 0} onChange={(e) => upd('cap_amount', Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Reimbursement % *</Label><Input type="number" step="0.01" value={editing.reimbursement_percent ?? 100} onChange={(e) => upd('reimbursement_percent', Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Effective From *</Label><Input type="date" value={editing.effective_from || ''} onChange={(e) => upd('effective_from', e.target.value)} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={editing.effective_to || ''} onChange={(e) => upd('effective_to', e.target.value || null)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => upd('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
