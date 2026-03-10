import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Edit, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ViolationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  severity_default: string | null;
  auto_detect: boolean | null;
  grace_period_days: number | null;
  applicable_funds: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const CATEGORIES = ['Filing', 'Payment', 'Registration', 'Reporting', 'Audit', 'Fraud', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const FUNDS = ['SS', 'LV', 'EI', 'SV'];

const emptyForm = {
  code: '',
  name: '',
  description: '',
  category: 'Filing',
  severity_default: 'Medium',
  auto_detect: false,
  grace_period_days: '0',
  applicable_funds: [] as string[],
  is_active: true,
  sort_order: '0',
};

function generateNextCode(existingCodes: string[]): string {
  const nums = existingCodes
    .filter(c => c.startsWith('VT-'))
    .map(c => parseInt(c.replace('VT-', ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `VT-${String(next).padStart(3, '0')}`;
}

const ViolationTypes = () => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ViolationType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ViolationType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: violationTypes = [], isLoading } = useQuery({
    queryKey: ['ce_violation_types'],
    queryFn: async (): Promise<ViolationType[]> => {
      const { data, error } = await supabase
        .from('ce_violation_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ViolationType[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ce_violation_types').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success('Violation type updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await supabase.from('ce_violation_types').update(data as any).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_violation_types').insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success(editing ? 'Violation type updated' : 'Violation type created');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error('Failed to save', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ce_violation_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_types'] });
      toast.success('Violation type deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error('Failed to delete', { description: err.message }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      code: generateNextCode(violationTypes.map(v => v.code)),
      sort_order: String(violationTypes.length + 1),
    });
    setDialogOpen(true);
  };

  const openEdit = (vt: ViolationType) => {
    setEditing(vt);
    setForm({
      code: vt.code,
      name: vt.name,
      description: vt.description || '',
      category: vt.category || 'Filing',
      severity_default: vt.severity_default || 'Medium',
      auto_detect: vt.auto_detect ?? false,
      grace_period_days: String(vt.grace_period_days ?? 0),
      applicable_funds: vt.applicable_funds || [],
      is_active: vt.is_active ?? true,
      sort_order: String(vt.sort_order ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error('Please check the form for valid information!', {
        description: 'Name is required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    saveMutation.mutate({
      code: form.code,
      name: form.name,
      description: form.description || null,
      category: form.category,
      severity_default: form.severity_default,
      auto_detect: form.auto_detect,
      grace_period_days: Number(form.grace_period_days) || 0,
      applicable_funds: form.applicable_funds.length > 0 ? form.applicable_funds : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = [...new Set(violationTypes.map(v => v.category).filter(Boolean))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Violation Types</h1>
          </div>
          <p className="text-muted-foreground">Configure violation type definitions used across the compliance module</p>
        </div>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Violation Type</Button>
      </div>

      <div className="flex gap-3">
        {categories.map(cat => (
          <Badge key={cat} variant="outline" className="py-1 px-3">
            {cat}: {violationTypes.filter(v => v.category === cat).length}
          </Badge>
        ))}
      </div>

      <div className="grid gap-3">
        {violationTypes.map((vt) => (
          <Card key={vt.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{vt.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{vt.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{vt.category}</Badge>
                      {vt.auto_detect && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Detect</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{vt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex gap-1">
                    {(vt.applicable_funds || []).map(f => <Badge key={f} variant="outline" className="text-[10px] h-5">{f}</Badge>)}
                  </div>
                  <Badge variant={
                    vt.severity_default === 'Critical' ? 'destructive' :
                    vt.severity_default === 'High' ? 'default' : 'secondary'
                  } className="text-[10px]">
                    {vt.severity_default}
                  </Badge>
                  <Switch
                    checked={vt.is_active ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: vt.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setExpandedCode(expandedCode === vt.code ? null : vt.code)}>
                    {expandedCode === vt.code ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(vt)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(vt)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {expandedCode === vt.code && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{vt.category}</span></div>
                  <div><span className="text-muted-foreground">Grace Period:</span> <span className="font-medium text-foreground">{vt.grace_period_days} days</span></div>
                  <div><span className="text-muted-foreground">Auto-Detection:</span> <span className="font-medium text-foreground">{vt.auto_detect ? 'Yes' : 'No (Manual)'}</span></div>
                  <div><span className="text-muted-foreground">Applicable Funds:</span> <span className="font-medium text-foreground">{(vt.applicable_funds || []).join(', ')}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {violationTypes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No violation types configured</div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Violation Type' : 'Add Violation Type'}</DialogTitle>
            <DialogDescription>Define a compliance violation type with its detection rules and severity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
                <p className="text-[11px] text-muted-foreground">Auto-generated</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Late C3 Filing" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this violation type..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Severity</Label>
                <Select value={form.severity_default} onValueChange={v => setForm(p => ({ ...p, severity_default: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Grace Period (days)</Label>
              <Input type="number" value={form.grace_period_days} onChange={e => setForm(p => ({ ...p, grace_period_days: e.target.value }))} placeholder="0" />
              <p className="text-[11px] text-muted-foreground">Days after deadline before violation is triggered</p>
            </div>
            <div className="space-y-1.5">
              <Label>Applicable Funds</Label>
              <div className="flex gap-4">
                {FUNDS.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.applicable_funds.includes(f)}
                      onCheckedChange={(checked) => {
                        setForm(p => ({
                          ...p,
                          applicable_funds: checked
                            ? [...p.applicable_funds, f]
                            : p.applicable_funds.filter(x => x !== f),
                        }));
                      }}
                    />
                    <Label className="font-normal text-sm">{f}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.auto_detect} onCheckedChange={c => setForm(p => ({ ...p, auto_detect: !!c }))} />
                <Label className="font-normal text-sm">Auto-Detect (via Rule Engine)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_active} onCheckedChange={c => setForm(p => ({ ...p, is_active: !!c }))} />
                <Label className="font-normal text-sm">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Violation Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.code} - {deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ViolationTypes;
