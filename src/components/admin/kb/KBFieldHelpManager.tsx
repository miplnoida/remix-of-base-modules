import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['draft', 'in_review', 'published', 'stale', 'archived'];
const SOURCE_TYPES = ['database', 'c3_config', 'derived', 'manual_entry', 'system_calculated', 'external_api'];

interface FieldForm {
  module_key: string;
  screen_key: string;
  component_key: string;
  field_key: string;
  field_label: string;
  short_help: string;
  full_help: string;
  example_value: string;
  source_type: string;
  impact_of_change: string;
  status: string;
}

const emptyForm: FieldForm = {
  module_key: '', screen_key: '', component_key: '', field_key: '', field_label: '',
  short_help: '', full_help: '', example_value: '', source_type: 'manual_entry', impact_of_change: '', status: 'draft',
};

export function KBFieldHelpManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm);

  const { data: fields = [] } = useQuery({
    queryKey: ['kb-field-help-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kb_field_help').select('*').order('module_key').order('screen_key');
      if (error) throw error;
      return data;
    },
  });

  const modules = [...new Set(fields.map(f => f.module_key))];
  const filtered = fields.filter(f => {
    if (filterModule !== 'all' && f.module_key !== filterModule) return false;
    if (search && !f.field_label.toLowerCase().includes(search.toLowerCase()) && !f.field_key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        module_key: form.module_key,
        screen_key: form.screen_key || null,
        component_key: form.component_key || null,
        field_key: form.field_key,
        field_label: form.field_label,
        short_help: form.short_help,
        full_help: form.full_help || null,
        example_value: form.example_value || null,
        source_type: form.source_type,
        impact_of_change: form.impact_of_change || null,
        status: form.status,
      };
      if (editingId) {
        const { error } = await supabase.from('kb_field_help').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kb_field_help').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Field help updated' : 'Field help created');
      qc.invalidateQueries({ queryKey: ['kb-field-help-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_field_help').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Field help deleted');
      qc.invalidateQueries({ queryKey: ['kb-field-help-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (f: any) => {
    setEditingId(f.id);
    setForm({
      module_key: f.module_key, screen_key: f.screen_key || '', component_key: f.component_key || '',
      field_key: f.field_key, field_label: f.field_label, short_help: f.short_help,
      full_help: f.full_help || '', example_value: f.example_value || '', source_type: f.source_type || 'manual_entry',
      impact_of_change: f.impact_of_change || '', status: f.status,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search field help..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Field Help</Button>
        </div>

        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Label</TableHead>
                <TableHead>Field Key</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.field_label}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{f.field_key}</TableCell>
                  <TableCell><Badge variant="outline">{f.module_key}</Badge></TableCell>
                  <TableCell className="text-sm">{f.screen_key || '—'}</TableCell>
                  <TableCell className="text-sm">{f.source_type}</TableCell>
                  <TableCell><Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No field help entries</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Edit Field Help' : 'New Field Help'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Module Key *</Label><Input value={form.module_key} onChange={e => setForm(f => ({ ...f, module_key: e.target.value }))} /></div>
              <div><Label>Screen Key</Label><Input value={form.screen_key} onChange={e => setForm(f => ({ ...f, screen_key: e.target.value }))} /></div>
              <div><Label>Component Key</Label><Input value={form.component_key} onChange={e => setForm(f => ({ ...f, component_key: e.target.value }))} /></div>
              <div><Label>Field Key *</Label><Input value={form.field_key} onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))} /></div>
              <div><Label>Field Label *</Label><Input value={form.field_label} onChange={e => setForm(f => ({ ...f, field_label: e.target.value }))} /></div>
              <div>
                <Label>Source Type</Label>
                <Select value={form.source_type} onValueChange={v => setForm(f => ({ ...f, source_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Short Help *</Label><Input value={form.short_help} onChange={e => setForm(f => ({ ...f, short_help: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Full Help (Markdown)</Label><Textarea value={form.full_help} onChange={e => setForm(f => ({ ...f, full_help: e.target.value }))} rows={6} className="font-mono text-sm" /></div>
              <div><Label>Example Value</Label><Input value={form.example_value} onChange={e => setForm(f => ({ ...f, example_value: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['draft', 'in_review', 'published', 'stale', 'archived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Impact of Change</Label><Textarea value={form.impact_of_change} onChange={e => setForm(f => ({ ...f, impact_of_change: e.target.value }))} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.module_key || !form.field_key || !form.field_label || !form.short_help || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
