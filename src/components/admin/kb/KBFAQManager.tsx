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
const AUDIENCES = ['all_users', 'admin', 'officer', 'supervisor', 'legal', 'technical'];

interface FAQForm {
  module_key: string;
  screen_key: string;
  question: string;
  answer: string;
  audience: string;
  tags: string;
  status: string;
  sort_order: number;
}

const emptyForm: FAQForm = {
  module_key: '', screen_key: '', question: '', answer: '', audience: 'all_users', tags: '', status: 'draft', sort_order: 0,
};

export function KBFAQManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FAQForm>(emptyForm);

  const { data: faqs = [] } = useQuery({
    queryKey: ['kb-faqs-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kb_faqs').select('*').order('module_key').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const modules = [...new Set(faqs.map(f => f.module_key))];

  const filtered = faqs.filter(f => {
    if (filterModule !== 'all' && f.module_key !== filterModule) return false;
    if (search && !f.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        module_key: form.module_key,
        screen_key: form.screen_key || null,
        question: form.question,
        answer: form.answer,
        audience: form.audience,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        status: form.status,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('kb_faqs').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kb_faqs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'FAQ updated' : 'FAQ created');
      qc.invalidateQueries({ queryKey: ['kb-faqs-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('FAQ deleted');
      qc.invalidateQueries({ queryKey: ['kb-faqs-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (f: any) => {
    setEditingId(f.id);
    setForm({
      module_key: f.module_key, screen_key: f.screen_key || '',
      question: f.question, answer: f.answer,
      audience: f.audience || 'all_users', tags: (f.tags || []).join(', '),
      status: f.status, sort_order: f.sort_order,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search FAQs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add FAQ</Button>
        </div>

        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-[300px] truncate font-medium">{f.question}</TableCell>
                  <TableCell><Badge variant="outline">{f.module_key}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.screen_key || '—'}</TableCell>
                  <TableCell className="text-sm">{f.audience || '—'}</TableCell>
                  <TableCell><Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this FAQ?')) deleteMutation.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No FAQs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Edit FAQ' : 'New FAQ'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Module Key *</Label>
                <Input value={form.module_key} onChange={e => setForm(f => ({ ...f, module_key: e.target.value }))} />
              </div>
              <div>
                <Label>Screen Key</Label>
                <Input value={form.screen_key} onChange={e => setForm(f => ({ ...f, screen_key: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Question *</Label>
                <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Answer (Markdown) *</Label>
                <Textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={8} className="font-mono text-sm" />
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.module_key || !form.question || !form.answer || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
