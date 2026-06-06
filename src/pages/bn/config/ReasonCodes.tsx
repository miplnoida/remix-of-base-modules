import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { toast } from 'sonner';
import type { BnReasonCode } from '@/types/bn';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';

const db = supabase as any;

const CATEGORIES = ['DENIAL', 'SUSPENSION', 'SEND_BACK', 'ESCALATION', 'OVERRIDE', 'DISCONTINUATION'];
const ACTIONS = ['SUBMIT', 'VERIFY', 'APPROVE', 'DENY', 'SUSPEND', 'SEND_BACK', 'ESCALATE', 'HOLD', 'RELEASE', 'REOPEN', 'DISCONTINUE', 'DISALLOW', 'WITHDRAW', 'CLOSE'];

export default function ReasonCodes() {
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<BnReasonCode | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [form, setForm] = useState({
    reason_code: '',
    reason_label: '',
    reason_category: 'DENIAL',
    applicable_actions: [] as string[],
    requires_narrative: false,
    is_active: true,
  });

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ['bn', 'reason-codes-admin'],
    queryFn: async () => {
      const { data, error } = await db.from('bn_reason_code').select('*').order('reason_category').order('reason_code');
      if (error) throw error;
      return data as BnReasonCode[];
    },
  });

  const otherCodes = reasons
    .filter(r => r.id !== editItem?.id)
    .map(r => r.reason_code);

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (isNew) {
        if (otherCodes.map(c => c.toUpperCase()).includes(item.reason_code?.trim().toUpperCase())) {
          throw new Error('Another reason code already uses this code.');
        }
        const { data, error } = await db.from('bn_reason_code').insert({ ...item, entered_by: userCode }).select().single();
        if (error) throw error;
        audit.log({ entityType: 'bn_reason_code', entityId: data?.id ?? 'new', action: 'CREATE', after: item });
        return data;
      } else {
        const before = editItem;
        const { data, error } = await db.from('bn_reason_code').update({ ...item, modified_by: userCode, modified_at: new Date().toISOString() }).eq('id', editItem!.id).select().single();
        if (error) throw error;
        audit.log({ entityType: 'bn_reason_code', entityId: editItem!.id, action: 'UPDATE', before, after: item });
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'reason-codes-admin'] });
      toast.success(isNew ? 'Reason code created' : 'Reason code updated');
      setEditItem(null);
    },
    onError: (err: any) => toast.error(err.message),
  });


  const openNew = () => {
    setIsNew(true);
    setForm({ reason_code: '', reason_label: '', reason_category: 'DENIAL', applicable_actions: [], requires_narrative: false, is_active: true });
    setEditItem({} as any);
  };

  const openEdit = (item: BnReasonCode) => {
    setIsNew(false);
    setForm({
      reason_code: item.reason_code,
      reason_label: item.reason_label,
      reason_category: item.reason_category,
      applicable_actions: item.applicable_actions || [],
      requires_narrative: item.requires_narrative,
      is_active: item.is_active,
    });
    setEditItem(item);
  };

  const filtered = reasons.filter(r =>
    r.reason_code.toLowerCase().includes(search.toLowerCase()) ||
    r.reason_label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAction = (action: string) => {
    setForm(prev => ({
      ...prev,
      applicable_actions: prev.applicable_actions.includes(action)
        ? prev.applicable_actions.filter(a => a !== action)
        : [...prev.applicable_actions, action],
    }));
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Reason Codes</h1>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Reason Code</Button>
        </div>

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable reason master used by denial, suspension, waiver, overpayment, reopen, document rejection and medical review outcome actions."
        />



        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search reason codes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Narrative</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reason_code}</TableCell>
                    <TableCell>{r.reason_label}</TableCell>
                    <TableCell><Badge variant="outline">{r.reason_category}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(r.applicable_actions || []).map(a => (
                          <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{r.requires_narrative ? 'Yes' : 'No'}</TableCell>
                    <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No reason codes found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{isNew ? 'Add Reason Code' : 'Edit Reason Code'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code</label>
                <Input value={form.reason_code} onChange={e => setForm(p => ({ ...p, reason_code: e.target.value.toUpperCase() }))} disabled={!isNew} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Label</label>
                <Input value={form.reason_label} onChange={e => setForm(p => ({ ...p, reason_label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Category</label>
                <Select value={form.reason_category} onValueChange={v => setForm(p => ({ ...p, reason_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Applicable Actions</label>
                <div className="flex flex-wrap gap-1">
                  {ACTIONS.map(a => (
                    <Badge
                      key={a}
                      variant={form.applicable_actions.includes(a) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAction(a)}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.requires_narrative} onCheckedChange={v => setForm(p => ({ ...p, requires_narrative: v }))} />
                <label className="text-sm">Requires Narrative</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <label className="text-sm">Active</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
