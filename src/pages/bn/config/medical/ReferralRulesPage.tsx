import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReferralRules, useUpsertReferralRule, useDeleteReferralRule, useMedicalProcedures } from '@/hooks/bn/useBnMedical';
import type { BnMedicalReferralRule } from '@/types/bnMedical';
import { useUserCode } from '@/hooks/useUserCode';

const LOCAL_ACTIONS = ['PROCESS_LOCAL', 'REQUIRE_PRE_AUTHORIZATION', 'REQUIRE_BOARD_APPROVAL'];
const REGIONAL_ACTIONS = ['REQUIRE_REGIONAL_REFERRAL', 'REQUIRE_BOARD_APPROVAL', 'REQUIRE_PRE_AUTHORIZATION'];
const INTERNATIONAL_ACTIONS = ['REQUIRE_INTERNATIONAL_REFERRAL', 'REQUIRE_BOARD_APPROVAL', 'REQUIRE_PRE_AUTHORIZATION', 'NOT_COVERED'];

export default function ReferralRulesPage() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: rules = [] } = useReferralRules();
  const { data: procedures = [] } = useMedicalProcedures();
  const upsert = useUpsertReferralRule();
  const del = useDeleteReferralRule();
  const procName = useMemo(() => new Map(procedures.map((p: any) => [p.id, `${p.procedure_code} — ${p.procedure_name}`])), [procedures]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnMedicalReferralRule>>({});

  const openNew = () => {
    setEditing({
      country_code: 'SKN',
      local_available_action: 'PROCESS_LOCAL',
      regional_available_action: 'REQUIRE_REGIONAL_REFERRAL',
      international_action: 'REQUIRE_INTERNATIONAL_REFERRAL',
      requires_specialist_report: false, requires_board_approval: false, requires_pre_authorization: false,
      effective_from: new Date().toISOString().slice(0, 10), is_active: true,
    });
    setOpen(true);
  };

  const upd = (f: keyof BnMedicalReferralRule, v: unknown) => setEditing((p) => ({ ...p, [f]: v }));

  const save = async () => {
    if (!editing.procedure_id || !editing.country_code) {
      toast({ title: 'Validation', description: 'Procedure and country are required.', variant: 'destructive' }); return;
    }
    try { await upsert.mutateAsync({ ...editing, modified_by: userCode, ...(editing.id ? {} : { created_by: userCode }) } as any); toast({ title: 'Saved' }); setOpen(false); }
    catch (e: any) { toast({ title: 'Error', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <GitBranch className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Referral & Recommendation Rules</h1>
          <p className="text-sm text-muted-foreground">Configure what happens when a procedure is locally / regionally / internationally available.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Rules</CardTitle><CardDescription>One rule per procedure × country, effective dated.</CardDescription></div>
          <Button onClick={openNew} className="gap-2" disabled={!procedures.length}><Plus className="h-4 w-4" /> Add Rule</Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? <p className="text-muted-foreground py-6 text-center">No rules configured.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Procedure</TableHead><TableHead>Country</TableHead><TableHead>Local</TableHead><TableHead>Regional</TableHead><TableHead>International</TableHead><TableHead>Specialist</TableHead><TableHead>Board</TableHead><TableHead>Pre-Auth</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{procName.get(r.procedure_id) || r.procedure_id}</TableCell>
                    <TableCell>{r.country_code}</TableCell>
                    <TableCell><Badge variant="outline">{r.local_available_action}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{r.regional_available_action}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{r.international_action}</Badge></TableCell>
                    <TableCell>{r.requires_specialist_report ? '✓' : '—'}</TableCell>
                    <TableCell>{r.requires_board_approval ? '✓' : '—'}</TableCell>
                    <TableCell>{r.requires_pre_authorization ? '✓' : '—'}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...r }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Referral Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Procedure *</Label>
              <Select value={editing.procedure_id} onValueChange={(v) => upd('procedure_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>{procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{procName.get(p.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Country *</Label><Input value={editing.country_code || ''} onChange={(e) => upd('country_code', e.target.value.toUpperCase())} /></div>
            <div />
            <div className="space-y-2">
              <Label>If Locally Available</Label>
              <Select value={editing.local_available_action} onValueChange={(v) => upd('local_available_action', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>If Regionally Available</Label>
              <Select value={editing.regional_available_action} onValueChange={(v) => upd('regional_available_action', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>If Internationally Available</Label>
              <Select value={editing.international_action} onValueChange={(v) => upd('international_action', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERNATIONAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={editing.effective_from || ''} onChange={(e) => upd('effective_from', e.target.value)} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={editing.effective_to || ''} onChange={(e) => upd('effective_to', e.target.value || null)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_specialist_report ?? false} onCheckedChange={(v) => upd('requires_specialist_report', v)} /><Label>Specialist report</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_board_approval ?? false} onCheckedChange={(v) => upd('requires_board_approval', v)} /><Label>Board approval</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_pre_authorization ?? false} onCheckedChange={(v) => upd('requires_pre_authorization', v)} /><Label>Pre-authorization</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => upd('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
