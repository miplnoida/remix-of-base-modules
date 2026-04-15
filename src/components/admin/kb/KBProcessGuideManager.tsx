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
import { Plus, Edit2, Trash2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { KBContentPreview } from './KBContentPreview';

const STATUSES = ['draft', 'in_review', 'published', 'stale', 'archived'];

interface GuideForm {
  module_key: string;
  submodule_key: string;
  process_name: string;
  trigger_description: string;
  steps_json: string;
  roles_involved: string;
  expected_outcome: string;
  estimated_duration: string;
  prerequisites: string;
  tags: string;
  status: string;
  sort_order: number;
}

const emptyForm: GuideForm = {
  module_key: '', submodule_key: '', process_name: '', trigger_description: '',
  steps_json: '[\n  { "step": 1, "title": "", "description": "", "role": "" }\n]',
  roles_involved: '', expected_outcome: '', estimated_duration: '', prerequisites: '', tags: '', status: 'draft', sort_order: 0,
};

export function KBProcessGuideManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GuideForm>(emptyForm);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const { data: guides = [] } = useQuery({
    queryKey: ['kb-guides-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kb_process_guides').select('*').order('module_key').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const modules = [...new Set(guides.map(g => g.module_key))];
  const filtered = guides.filter(g => {
    if (filterModule !== 'all' && g.module_key !== filterModule) return false;
    if (search && !g.process_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let steps;
      try { steps = JSON.parse(form.steps_json); } catch { throw new Error('Steps must be valid JSON'); }
      const payload: any = {
        module_key: form.module_key,
        submodule_key: form.submodule_key || null,
        process_name: form.process_name,
        trigger_description: form.trigger_description || null,
        steps,
        roles_involved: form.roles_involved ? form.roles_involved.split(',').map(r => r.trim()) : [],
        expected_outcome: form.expected_outcome || null,
        estimated_duration: form.estimated_duration || null,
        prerequisites: form.prerequisites ? form.prerequisites.split(',').map(p => p.trim()) : [],
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        status: form.status,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('kb_process_guides').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kb_process_guides').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Guide updated' : 'Guide created');
      qc.invalidateQueries({ queryKey: ['kb-guides-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_process_guides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Guide deleted');
      qc.invalidateQueries({ queryKey: ['kb-guides-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (g: any) => {
    setEditingId(g.id);
    setForm({
      module_key: g.module_key, submodule_key: g.submodule_key || '',
      process_name: g.process_name, trigger_description: g.trigger_description || '',
      steps_json: JSON.stringify(g.steps, null, 2),
      roles_involved: (g.roles_involved || []).join(', '), expected_outcome: g.expected_outcome || '',
      estimated_duration: g.estimated_duration || '', prerequisites: (g.prerequisites || []).join(', '),
      tags: (g.tags || []).join(', '), status: g.status, sort_order: g.sort_order,
    });
    setDialogOpen(true);
  };

  const previewGuide = (g: any) => {
    const steps = Array.isArray(g.steps) ? g.steps : [];
    const md = `# ${g.process_name}\n\n**Trigger:** ${g.trigger_description || 'N/A'}\n\n**Roles:** ${(g.roles_involved || []).join(', ')}\n\n**Duration:** ${g.estimated_duration || 'N/A'}\n\n## Steps\n\n${steps.map((s: any, i: number) => `${i + 1}. **${s.title || s.step_title || ''}** — ${s.description || ''}`).join('\n')}\n\n**Expected Outcome:** ${g.expected_outcome || 'N/A'}`;
    setPreviewContent(md);
    setPreviewOpen(true);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search guides..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Guide</Button>
        </div>

        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Process Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium max-w-[250px] truncate">{g.process_name}</TableCell>
                  <TableCell><Badge variant="outline">{g.module_key}</Badge></TableCell>
                  <TableCell className="text-sm">{(g.roles_involved || []).join(', ') || '—'}</TableCell>
                  <TableCell className="text-sm">{g.estimated_duration || '—'}</TableCell>
                  <TableCell><Badge variant={g.status === 'published' ? 'default' : 'secondary'}>{g.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => previewGuide(g)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(g.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No guides found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Edit Process Guide' : 'New Process Guide'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Module Key *</Label><Input value={form.module_key} onChange={e => setForm(f => ({ ...f, module_key: e.target.value }))} /></div>
              <div><Label>Submodule Key</Label><Input value={form.submodule_key} onChange={e => setForm(f => ({ ...f, submodule_key: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Process Name *</Label><Input value={form.process_name} onChange={e => setForm(f => ({ ...f, process_name: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Trigger Description</Label><Input value={form.trigger_description} onChange={e => setForm(f => ({ ...f, trigger_description: e.target.value }))} /></div>
              <div className="col-span-2">
                <Label>Steps (JSON Array) *</Label>
                <Textarea value={form.steps_json} onChange={e => setForm(f => ({ ...f, steps_json: e.target.value }))} rows={10} className="font-mono text-sm" />
              </div>
              <div><Label>Roles Involved (comma-separated)</Label><Input value={form.roles_involved} onChange={e => setForm(f => ({ ...f, roles_involved: e.target.value }))} /></div>
              <div><Label>Estimated Duration</Label><Input value={form.estimated_duration} onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} placeholder="e.g. 15 minutes" /></div>
              <div className="col-span-2"><Label>Expected Outcome</Label><Textarea value={form.expected_outcome} onChange={e => setForm(f => ({ ...f, expected_outcome: e.target.value }))} rows={3} /></div>
              <div><Label>Prerequisites (comma-separated)</Label><Input value={form.prerequisites} onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.module_key || !form.process_name || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <KBContentPreview open={previewOpen} onOpenChange={setPreviewOpen} content={previewContent} />
      </CardContent>
    </Card>
  );
}
