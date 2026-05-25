import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, HelpCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

/** Major Compliance screens needing contextual help. Keep in sync with menu. */
export const COMPLIANCE_SCREEN_KEYS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard / Command Center' },
  { key: 'work-queue', label: 'My Work Queue' },
  { key: 'violations', label: 'Violations' },
  { key: 'cases', label: 'Compliance Cases' },
  { key: 'notices', label: 'Notices And Communications' },
  { key: 'arrangements', label: 'Payment Arrangements' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'legal', label: 'Legal Escalations' },
  { key: 'risk', label: 'Risk And Employer Profile' },
  { key: 'reports', label: 'Reports' },
  { key: 'administration', label: 'Administration' },
  { key: 'setup-wizard', label: 'Setup Wizard' },
];

const MODULE_KEY = 'compliance';

interface HelpForm {
  screen_key: string;
  title: string;
  purpose: string;
  intended_users: string;
  required_setup: string;
  next_steps: string;
  common_mistakes: string;
  examples: string;
  is_active: boolean;
}

const empty: HelpForm = {
  screen_key: '', title: '', purpose: '', intended_users: '',
  required_setup: '', next_steps: '', common_mistakes: '', examples: '',
  is_active: true,
};

/** Serialize structured sections into the kb_articles.content markdown field. */
function buildContent(f: HelpForm): string {
  const sec = (heading: string, body: string) =>
    body.trim() ? `## ${heading}\n${body.trim()}\n` : '';
  return [
    sec('Who should use it', f.intended_users),
    sec('Required setup before use', f.required_setup),
    sec('Next steps', f.next_steps),
    sec('Common mistakes', f.common_mistakes),
    sec('Examples', f.examples),
  ].filter(Boolean).join('\n').trim() || f.purpose;
}

/** Parse the structured sections back out of content markdown. */
function parseContent(content: string): Partial<HelpForm> {
  const out: Partial<HelpForm> = {};
  const map: Record<string, keyof HelpForm> = {
    'Who should use it': 'intended_users',
    'Required setup before use': 'required_setup',
    'Next steps': 'next_steps',
    'Common mistakes': 'common_mistakes',
    'Examples': 'examples',
  };
  const re = /^##\s+(.+?)\s*$/gm;
  const matches = [...content.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const key = map[heading];
    if (!key) continue;
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : content.length;
    (out as any)[key] = content.slice(start, end).trim();
  }
  return out;
}

export default function ComplianceHelpAdmin() {
  const qc = useQueryClient();
  const auth = useSupabaseAuth() as any;
  const userCode: string | null = auth?.profile?.user_code ?? null;
  const [canEdit, setCanEdit] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await auth?.hasPermission?.('compliance', 'manage');
        if (!cancelled) setCanEdit(!!ok);
      } catch {
        if (!cancelled) setCanEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HelpForm>(empty);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['ce-help-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('module_key', MODULE_KEY)
        .eq('article_type', 'screen_help')
        .order('screen_key');
      if (error) throw error;
      return data as any[];
    },
  });

  const coverage = useMemo(() => {
    const set = new Set(topics.map(t => t.screen_key));
    return COMPLIANCE_SCREEN_KEYS.map(s => ({ ...s, present: set.has(s.key) }));
  }, [topics]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.screen_key.trim()) throw new Error('Screen key is required');
      if (!form.title.trim()) throw new Error('Title is required');
      const payload: any = {
        module_key: MODULE_KEY,
        screen_key: form.screen_key.trim(),
        article_type: 'screen_help',
        title: form.title.trim(),
        summary: form.purpose.trim() || null,
        content: buildContent(form),
        audience: 'all_users',
        status: form.is_active ? 'published' : 'draft',
        updated_by: userCode || null,
      };
      if (editingId) {
        const { error } = await supabase.from('kb_articles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.created_by = userCode || null;
        const { error } = await supabase.from('kb_articles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Help topic updated' : 'Help topic created');
      qc.invalidateQueries({ queryKey: ['ce-help-admin'] });
      qc.invalidateQueries({ queryKey: ['ce-help'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Help topic deleted');
      qc.invalidateQueries({ queryKey: ['ce-help-admin'] });
      qc.invalidateQueries({ queryKey: ['ce-help'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  function openCreate(screenKey = '') {
    setEditingId(null);
    setForm({ ...empty, screen_key: screenKey });
    setDialogOpen(true);
  }

  function openEdit(row: any) {
    const parsed = parseContent(row.content || '');
    setEditingId(row.id);
    setForm({
      screen_key: row.screen_key || '',
      title: row.title || '',
      purpose: row.summary || '',
      intended_users: parsed.intended_users || '',
      required_setup: parsed.required_setup || '',
      next_steps: parsed.next_steps || '',
      common_mistakes: parsed.common_mistakes || '',
      examples: parsed.examples || '',
      is_active: row.status === 'published',
    });
    setDialogOpen(true);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Help And Instructions"
        subtitle="Manage contextual help shown on every major Compliance & Enforcement screen"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Administration' },
          { label: 'Help And Instructions' },
        ]}
        actions={
          <Button onClick={() => openCreate()} disabled={!canEdit}>
            <Plus className="h-4 w-4 mr-2" /> New Help Topic
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Screen Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {coverage.map(c => (
              <div key={c.key} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{c.key}</div>
                </div>
                {c.present ? (
                  <Badge variant="secondary">Present</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openCreate(c.key)} disabled={!canEdit}>Add</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> Help Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : topics.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No help topics yet. Click "Add" on a screen above to create one.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Screen Key</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.screen_key}</TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">{t.summary}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'published' ? 'default' : 'secondary'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)} disabled={!canEdit}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          if (confirm(`Delete help topic for ${t.screen_key}?`)) deleteMutation.mutate(t.id);
                        }} disabled={!canEdit}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Help Topic' : 'New Help Topic'}</DialogTitle>
            <DialogDescription>
              Structured content stored in the knowledge base (module: compliance). All sections appear in the contextual help drawer on the matching screen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Screen Key *</Label>
              <Input
                value={form.screen_key}
                onChange={(e) => setForm({ ...form, screen_key: e.target.value })}
                placeholder="e.g. violations"
                list="ce-screen-keys"
              />
              <datalist id="ce-screen-keys">
                {COMPLIANCE_SCREEN_KEYS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </datalist>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Purpose</Label>
            <Textarea rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="What this screen is for, in one or two sentences" />
          </div>
          <div>
            <Label>Who should use it</Label>
            <Textarea rows={2} value={form.intended_users} onChange={(e) => setForm({ ...form, intended_users: e.target.value })} placeholder="Describe the intended users by responsibility (no role names)" />
          </div>
          <div>
            <Label>Required setup before use</Label>
            <Textarea rows={3} value={form.required_setup} onChange={(e) => setForm({ ...form, required_setup: e.target.value })} placeholder="Configuration, data, or prerequisites" />
          </div>
          <div>
            <Label>Next steps</Label>
            <Textarea rows={3} value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} placeholder="What the user should do after completing this screen" />
          </div>
          <div>
            <Label>Common mistakes</Label>
            <Textarea rows={3} value={form.common_mistakes} onChange={(e) => setForm({ ...form, common_mistakes: e.target.value })} />
          </div>
          <div>
            <Label>Examples</Label>
            <Textarea rows={3} value={form.examples} onChange={(e) => setForm({ ...form, examples: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="active" />
            <Label htmlFor="active">Active (publish to users)</Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canEdit}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
