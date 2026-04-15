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
import { Plus, Edit2, Trash2, Search, Eye, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { KBContentPreview } from './KBContentPreview';

const ARTICLE_TYPES = ['module_overview', 'screen_help', 'field_help', 'faq', 'process_guide', 'troubleshooting', 'release_note', 'best_practice'];
const STATUSES = ['draft', 'in_review', 'published', 'stale', 'archived'];
const AUDIENCES = ['all_users', 'admin', 'officer', 'supervisor', 'legal', 'technical'];

interface ArticleForm {
  module_key: string;
  submodule_key: string;
  screen_key: string;
  article_type: string;
  title: string;
  summary: string;
  content: string;
  audience: string;
  tags: string;
  status: string;
  sort_order: number;
}

const emptyForm: ArticleForm = {
  module_key: '', submodule_key: '', screen_key: '', article_type: 'screen_help',
  title: '', summary: '', content: '', audience: 'all_users', tags: '', status: 'draft', sort_order: 0,
};

export function KBArticleManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['kb-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .order('module_key')
        .order('screen_key')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const modules = [...new Set(articles.map(a => a.module_key))];

  const filtered = articles.filter(a => {
    if (filterModule !== 'all' && a.module_key !== filterModule) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.screen_key?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        module_key: form.module_key,
        submodule_key: form.submodule_key || null,
        screen_key: form.screen_key || null,
        article_type: form.article_type,
        title: form.title,
        summary: form.summary || null,
        content: form.content,
        audience: form.audience,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        status: form.status,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from('kb_articles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kb_articles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Article updated' : 'Article created');
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Article deleted');
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      module_key: a.module_key,
      submodule_key: a.submodule_key || '',
      screen_key: a.screen_key || '',
      article_type: a.article_type,
      title: a.title,
      summary: a.summary || '',
      content: a.content,
      audience: a.audience || 'all_users',
      tags: (a.tags || []).join(', '),
      status: a.status,
      sort_order: a.sort_order,
    });
    setDialogOpen(true);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'in_review': return 'outline';
      case 'stale': return 'destructive';
      case 'archived': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Article</Button>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium max-w-[250px] truncate">{a.title}</TableCell>
                  <TableCell><Badge variant="outline">{a.module_key}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.screen_key || '—'}</TableCell>
                  <TableCell className="text-sm">{a.article_type}</TableCell>
                  <TableCell className="text-sm">{a.audience || '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(a.status)}>{a.status}</Badge></TableCell>
                  <TableCell>v{a.version}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setPreviewContent(a.content); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this article?')) deleteMutation.mutate(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No articles found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Article' : 'New Article'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Module Key *</Label>
                <Input value={form.module_key} onChange={e => setForm(f => ({ ...f, module_key: e.target.value }))} placeholder="e.g. compliance" />
              </div>
              <div>
                <Label>Submodule Key</Label>
                <Input value={form.submodule_key} onChange={e => setForm(f => ({ ...f, submodule_key: e.target.value }))} placeholder="optional" />
              </div>
              <div>
                <Label>Screen Key</Label>
                <Input value={form.screen_key} onChange={e => setForm(f => ({ ...f, screen_key: e.target.value }))} placeholder="e.g. rule-engine-detection" />
              </div>
              <div>
                <Label>Article Type *</Label>
                <Select value={form.article_type} onValueChange={v => setForm(f => ({ ...f, article_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ARTICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Summary</Label>
                <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Content (Markdown) *</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={12} className="font-mono text-sm" />
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
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="rules, compliance" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.module_key || !form.title || !form.content || saveMutation.isPending}>
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
