import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { FileText, Plus, Pencil, Trash2, Copy, Eye, Loader2, Play } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNoticeTemplates,
  createNoticeTemplate,
  updateNoticeTemplate,
  deleteNoticeTemplate,
  toggleNoticeTemplate,
  duplicateNoticeTemplate,
  NoticeTemplateRow,
} from '@/services/noticeTemplateService';
import { supabase } from '@/integrations/supabase/client';

const CHANNELS: Array<{ value: string; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'letter', label: 'Letter' },
];

const emptyForm = {
  template_name: '', template_code: '', category: '', subject: '', body: '',
  channel: 'email', is_active: true,
};

function generateNextCode(existingCodes: string[], channel: string): string {
  const prefix = channel === 'email' ? 'EM' : channel === 'sms' ? 'SM' : 'LT';
  const nums = existingCodes
    .filter(c => c.includes(`-${prefix}-`))
    .map(c => { const m = c.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `TPL-${prefix}-${String(next).padStart(3, '0')}`;
}

// Sample merge data for live preview
const SAMPLE_MERGE_DATA: Record<string, string> = {
  employer_name: 'Caribbean Sugar Mills Ltd',
  employer_id: '100001',
  violation_number: 'VIO-2026-0042',
  violation_type: 'Late C3 Submission',
  amount_due: '$12,450.00',
  due_date: '15/04/2026',
  penalty_amount: '$1,245.00',
  interest_amount: '$312.50',
  hearing_date: '20/05/2026',
  hearing_location: 'Basseterre Magistrate Court',
  case_number: 'CASE-2026-0015',
  inspector_name: 'James Martinez',
  arrangement_id: 'ARR-2026-0003',
  installment_amount: '$2,075.00',
  next_payment_date: '01/05/2026',
  total_arrears: '$24,900.00',
  period: 'Jan-Mar 2026',
  current_date: new Date().toLocaleDateString('en-GB'),
  deadline_date: '30/04/2026',
};

function resolveTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

export default function ComplianceTemplates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [previewTemplate, setPreviewTemplate] = useState<NoticeTemplateRow | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['ce_notice_templates'],
    queryFn: fetchNoticeTemplates,
  });

  // Derive categories from DB templates
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats).sort();
  }, [templates]);

  // Derive available variables from DB templates
  const availableVariables = useMemo(() => {
    const vars = new Set<string>();
    templates.forEach(t => t.variables.forEach(v => vars.add(v)));
    return Array.from(vars).sort().map(v => `{{${v}}}`);
  }, [templates]);

  // Fetch sample employer for live preview
  const { data: sampleEmployers = [] } = useQuery({
    queryKey: ['sample_employers_for_preview'],
    queryFn: async () => {
      const { data } = await supabase.from('er_master').select('regno, name').eq('status', 'A').limit(10);
      return (data || []) as Array<{ regno: string; name: string }>;
    },
  });

  const [livePreviewEmployer, setLivePreviewEmployer] = useState('');
  const livePreviewData = useMemo(() => {
    const emp = sampleEmployers.find(e => e.regno === livePreviewEmployer);
    return {
      ...SAMPLE_MERGE_DATA,
      ...(emp ? { employer_name: emp.name, employer_id: emp.regno } : {}),
    };
  }, [livePreviewEmployer, sampleEmployers]);

  const createMut = useMutation({
    mutationFn: (data: Partial<NoticeTemplateRow>) => createNoticeTemplate(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_notice_templates'] }); toast.success('Template created'); setDialogOpen(false); },
    onError: () => toast.error('Failed to create template'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NoticeTemplateRow> }) => updateNoticeTemplate(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_notice_templates'] }); toast.success('Template updated'); setDialogOpen(false); },
    onError: () => toast.error('Failed to update template'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNoticeTemplate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_notice_templates'] }); toast.success('Template deleted'); },
    onError: () => toast.error('Failed to delete template'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleNoticeTemplate(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ce_notice_templates'] }),
    onError: () => toast.error('Failed to toggle template'),
  });

  const duplicateMut = useMutation({
    mutationFn: (t: NoticeTemplateRow) => {
      const newCode = generateNextCode(templates.map(x => x.template_code), t.channel);
      return duplicateNoticeTemplate(t, newCode);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_notice_templates'] }); toast.success('Template duplicated'); },
    onError: () => toast.error('Failed to duplicate template'),
  });

  const filtered = templates.filter(t =>
    (filterChannel === 'all' || t.channel === filterChannel) &&
    (filterCategory === 'all' || t.category === filterCategory)
  );

  const openAdd = () => {
    setEditingId(null);
    const code = generateNextCode(templates.map(x => x.template_code), 'email');
    setForm({ ...emptyForm, template_code: code });
    setDialogOpen(true);
  };

  const openEdit = (t: NoticeTemplateRow) => {
    setEditingId(t.id);
    setForm({ template_name: t.template_name, template_code: t.template_code, category: t.category, subject: t.subject || '', body: t.body, channel: t.channel, is_active: t.is_active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.template_name || !form.category || !form.body) {
      toast.error('Please check the form for valid information!', {
        description: 'Template name, category, and body are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    const vars = [...form.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    if (form.subject) {
      [...form.subject.matchAll(/\{\{(\w+)\}\}/g)].forEach(m => { if (!vars.includes(m[1])) vars.push(m[1]); });
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, data: { template_name: form.template_name, category: form.category, channel: form.channel, subject: form.subject, body: form.body, variables: vars, is_active: form.is_active } });
    } else {
      createMut.mutate({ template_code: form.template_code, template_name: form.template_name, category: form.category, channel: form.channel, subject: form.subject, body: form.body, variables: vars, is_active: form.is_active });
    }
  };

  const channelBadge = (ch: string) => {
    const colors: Record<string, string> = {
      email: 'bg-primary/10 text-primary border-primary/20',
      sms: 'bg-yellow-500/10 text-yellow-700 border-yellow-300',
      letter: 'bg-accent/10 text-accent-foreground border-accent/20',
    };
    return <Badge variant="outline" className={colors[ch] || ''}>{ch.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Notification Templates</h1>
          </div>
          <p className="text-muted-foreground">Manage templates for compliance notices, reminders, summons, and letters</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.template_name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.template_code}</code></TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{channelBadge(t.channel)}</TableCell>
                  <TableCell><Badge variant="secondary">{t.variables.length} vars</Badge></TableCell>
                  <TableCell>
                    <Switch checked={t.is_active} onCheckedChange={(v) => toggleMut.mutate({ id: t.id, is_active: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Raw Preview" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Live Preview" onClick={() => { setPreviewTemplate(t); setLivePreviewEmployer(sampleEmployers[0]?.regno || ''); setLivePreviewOpen(true); }}><Play className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicateMut.mutate(t)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Notification Template'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name <span className="text-destructive">*</span></Label>
              <Input value={form.template_name} onChange={e => setForm(p => ({ ...p, template_name: e.target.value }))} placeholder="e.g. Late Filing Notice" />
            </div>
            <div className="space-y-2">
              <Label>Template Code</Label>
              <Input value={form.template_code} readOnly className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={form.category || '__pick__'} onValueChange={v => setForm(p => ({ ...p, category: v === '__pick__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">Select...</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__new__" disabled className="text-xs text-muted-foreground italic">— Type below for new category —</SelectItem>
                </SelectContent>
              </Select>
              {!categories.includes(form.category) && form.category && form.category !== '__pick__' && (
                <p className="text-[11px] text-muted-foreground">New category: {form.category}</p>
              )}
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Or type a new category" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Channel <span className="text-destructive">*</span></Label>
              <Select value={form.channel} onValueChange={v => {
                setForm(p => ({
                  ...p, channel: v,
                  template_code: editingId ? p.template_code : generateNextCode(templates.map(x => x.template_code), v),
                }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Subject Line</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Notice of Non-Compliance - {{violation_number}}" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Body <span className="text-destructive">*</span></Label>
              <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={10} placeholder="Template body with {{variables}}..." />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Available Variables (click to insert)</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {availableVariables.map(v => (
                  <Badge key={v} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => setForm(p => ({ ...p, body: p.body + ' ' + v }))}>{v}</Badge>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raw Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Template Preview (Raw)</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                {channelBadge(previewTemplate.channel)}
                <Badge variant="outline">{previewTemplate.category}</Badge>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{previewTemplate.template_code}</code>
              </div>
              <div><Label className="text-xs text-muted-foreground">Subject</Label><p className="font-medium text-foreground">{previewTemplate.subject}</p></div>
              <div><Label className="text-xs text-muted-foreground">Body</Label><pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg border text-foreground">{previewTemplate.body}</pre></div>
              <div>
                <Label className="text-xs text-muted-foreground">Variables Used</Label>
                <div className="flex flex-wrap gap-1 mt-1">{previewTemplate.variables.map(v => <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Live Preview Dialog */}
      <Dialog open={livePreviewOpen} onOpenChange={setLivePreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Live Preview</DialogTitle>
            <DialogDescription>See how this template looks with real employer data</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                {channelBadge(previewTemplate.channel)}
                <Badge variant="outline">{previewTemplate.category}</Badge>
              </div>

              {/* Employer selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Select Employer for Preview</Label>
                <Select value={livePreviewEmployer || '__sample__'} onValueChange={v => setLivePreviewEmployer(v === '__sample__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Use sample data" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__sample__">— Sample Data —</SelectItem>
                    {sampleEmployers.map(e => (
                      <SelectItem key={e.regno} value={e.regno}>{e.name} ({e.regno})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolved subject */}
              {previewTemplate.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject (Resolved)</Label>
                  <p className="font-medium text-foreground mt-1">{resolveTemplate(previewTemplate.subject, livePreviewData)}</p>
                </div>
              )}

              {/* Resolved body */}
              <div>
                <Label className="text-xs text-muted-foreground">Body (Resolved)</Label>
                <div className="bg-background border rounded-lg p-6 mt-1">
                  <pre className="whitespace-pre-wrap text-sm text-foreground">{resolveTemplate(previewTemplate.body, livePreviewData)}</pre>
                </div>
              </div>

              {/* Merge data reference */}
              <div>
                <Label className="text-xs text-muted-foreground">Merge Data Used</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                  {previewTemplate.variables.map(v => (
                    <div key={v} className="flex justify-between py-0.5 border-b border-border/50">
                      <span className="font-mono text-muted-foreground">{`{{${v}}}`}</span>
                      <span className="text-foreground font-medium">{livePreviewData[v] || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
