import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hash, Plus, Edit, Trash2, CheckCircle, Loader2 } from 'lucide-react';
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

interface NumberTemplate {
  id: string;
  name: string;
  template_pattern: string;
  description: string | null;
  applies_to: string | null;
  is_default: boolean | null;
  padding_length: number | null;
  prefix: string | null;
  reset_frequency: string | null;
  is_active: boolean | null;
}

const APPLIES_TO_OPTIONS = [
  { value: 'Violation', label: 'Violations' },
  { value: 'Case', label: 'Cases' },
  { value: 'Inspection', label: 'Inspections' },
  { value: 'Notice', label: 'Notices' },
  { value: 'Referral', label: 'Legal Referrals' },
  { value: 'Waiver', label: 'Waivers' },
  { value: 'PaymentPlan', label: 'Payment Plans' },
];

const RESET_FREQUENCIES = [
  { value: 'yearly', label: 'Yearly (resets each January)' },
  { value: 'monthly', label: 'Monthly (resets each month)' },
  { value: 'never', label: 'Never (continuous sequence)' },
];

const PATTERN_VARIABLES = [
  { token: '{YYYY}', desc: 'Year (e.g. 2026)' },
  { token: '{MM}', desc: 'Month (e.g. 03)' },
  { token: '{NNNNN}', desc: '5-digit padded sequence' },
  { token: '{NNNN}', desc: '4-digit padded sequence' },
  { token: '{NNN}', desc: '3-digit padded sequence' },
  { token: '{TERRITORY}', desc: 'SK or NV' },
];

const generateExample = (pattern: string): string => {
  const now = new Date();
  return pattern
    .replace('{YYYY}', now.getFullYear().toString())
    .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{NNNNN}', '00001')
    .replace('{NNNN}', '0001')
    .replace('{NNN}', '001')
    .replace('{TERRITORY}', 'SK');
};

const emptyForm = {
  name: '',
  template_pattern: '',
  description: '',
  applies_to: 'Violation',
  is_default: false,
  padding_length: '5',
  prefix: '',
  reset_frequency: 'yearly',
  is_active: true,
};

const NumberTemplates = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NumberTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NumberTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['ce_number_templates'],
    queryFn: async (): Promise<NumberTemplate[]> => {
      const { data, error } = await supabase
        .from('ce_number_templates')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as NumberTemplate[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ce_number_templates').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_number_templates'] });
      toast.success('Scheme updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await supabase.from('ce_number_templates').update(data as any).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_number_templates').insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_number_templates'] });
      toast.success(editing ? 'Numbering scheme updated' : 'Numbering scheme created');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error('Failed to save', { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ce_number_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_number_templates'] });
      toast.success('Numbering scheme deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error('Failed to delete', { description: err.message }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (tmpl: NumberTemplate) => {
    setEditing(tmpl);
    setForm({
      name: tmpl.name,
      template_pattern: tmpl.template_pattern,
      description: tmpl.description || '',
      applies_to: tmpl.applies_to || 'Violation',
      is_default: tmpl.is_default ?? false,
      padding_length: String(tmpl.padding_length ?? 5),
      prefix: tmpl.prefix || '',
      reset_frequency: tmpl.reset_frequency || 'yearly',
      is_active: tmpl.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.template_pattern) {
      toast.error('Please check the form for valid information!', {
        description: 'Name and Pattern are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    saveMutation.mutate({
      name: form.name,
      template_pattern: form.template_pattern,
      description: form.description || null,
      applies_to: form.applies_to,
      is_default: form.is_default,
      padding_length: Number(form.padding_length) || 5,
      prefix: form.prefix || null,
      reset_frequency: form.reset_frequency,
      is_active: form.is_active,
    });
  };

  // Auto-build pattern from prefix
  const handlePrefixChange = (prefix: string) => {
    setForm(p => ({
      ...p,
      prefix,
      template_pattern: prefix ? `${prefix}-{YYYY}-{NNNNN}` : p.template_pattern,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Reference Numbering Schemes</h1>
          </div>
          <p className="text-muted-foreground">Configure auto-numbering patterns for violations, cases, inspections, notices, and legal referrals</p>
        </div>
        <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Scheme</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pattern Variables</CardTitle>
          <CardDescription>Use these tokens when building your numbering pattern. The system auto-generates sequential reference numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {PATTERN_VARIABLES.map(pv => (
              <Badge key={pv.token} variant="outline" className="font-mono text-xs py-1 px-3">{pv.token} = {pv.desc}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {templates.map((tmpl) => (
          <Card key={tmpl.id} className={`hover:shadow-sm transition-shadow ${!tmpl.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{tmpl.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{tmpl.applies_to}</Badge>
                      <Badge variant="outline" className="text-[10px]">Reset: {tmpl.reset_frequency}</Badge>
                      {tmpl.is_default && <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Default</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">Pattern: <span className="font-mono text-foreground">{tmpl.template_pattern}</span></span>
                      <span className="text-sm text-muted-foreground">Preview: <span className="font-mono font-medium text-primary">{generateExample(tmpl.template_pattern)}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Switch
                    checked={tmpl.is_active ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: tmpl.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tmpl)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(tmpl)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No numbering schemes configured. Click "Add Scheme" to create one.</div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Numbering Scheme' : 'Add Numbering Scheme'}</DialogTitle>
            <DialogDescription>Define how reference numbers are generated for compliance records.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Scheme Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Violation Number Format" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this numbering scheme..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Applies To</Label>
                <Select value={form.applies_to} onValueChange={v => setForm(p => ({ ...p, applies_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reset Frequency</Label>
                <Select value={form.reset_frequency} onValueChange={v => setForm(p => ({ ...p, reset_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESET_FREQUENCIES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prefix</Label>
                <Input value={form.prefix} onChange={e => handlePrefixChange(e.target.value.toUpperCase())} placeholder="VIO" />
                <p className="text-[11px] text-muted-foreground">Short identifier (auto-updates pattern below)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Padding Length</Label>
                <Select value={form.padding_length} onValueChange={v => setForm(p => ({ ...p, padding_length: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['3', '4', '5', '6'].map(n => <SelectItem key={n} value={n}>{n} digits</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pattern <span className="text-destructive">*</span></Label>
              <Input
                value={form.template_pattern}
                onChange={e => setForm(p => ({ ...p, template_pattern: e.target.value }))}
                placeholder="VIO-{YYYY}-{NNNNN}"
                className="font-mono"
              />
              {form.template_pattern && (
                <div className="bg-muted/50 rounded px-3 py-1.5 mt-1">
                  <p className="text-[11px] text-muted-foreground">Preview:</p>
                  <p className="text-sm font-mono font-medium text-primary">{generateExample(form.template_pattern)}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_default} onCheckedChange={c => setForm(p => ({ ...p, is_default: !!c }))} />
                <Label className="font-normal text-sm">Default scheme for this type</Label>
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
            <AlertDialogTitle>Delete Numbering Scheme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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

export default NumberTemplates;
