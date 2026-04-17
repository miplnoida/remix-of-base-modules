import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Plus, Pencil, Trash2, Eye, RefreshCw, Upload, AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react';
import { EntityModal } from '@/components/common/EntityModal';
import { useUserCode } from '@/hooks/useUserCode';
import {
  useEmailTemplates,
  useSaveEmailTemplate,
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useToggleEmailTemplateActive,
  usePublishAll,
  usePendingCount,
  useRetrySync,
} from '@/hooks/useSettingsConfiguration';
import Editor from '@monaco-editor/react';
import type { EmailTemplateRow } from '@/services/wizSettingsService';
import { SandboxDialog } from '@/components/c3Management/email-templates/SandboxDialog';

const FROM_MODULES = ['registration', 'authentication', 'payments', 'contributions', 'administration'];

const getVarsArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string') {
    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

const extractTokens = (text: string): string[] => {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches).map((m) => m[1])));
};

const SyncBadge: React.FC<{ row: EmailTemplateRow }> = ({ row }) => {
  if (row.sync_error) return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
  if (row.is_synced) return <Badge variant="outline" className="gap-1 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3" />Synced</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
};

const PreviewIframe: React.FC<{ subject: string; html: string; vars: string[] }> = ({ subject, html, vars }) => {
  const sample = useMemo(() => {
    const obj: Record<string, string> = {};
    vars.forEach((v) => { obj[v] = `<sample-${v}>`; });
    let s = subject; let h = html;
    Object.entries(obj).forEach(([k, val]) => {
      const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
      s = s.replace(re, val); h = h.replace(re, val);
    });
    return { s, h };
  }, [subject, html, vars]);

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <div className="px-3 py-2 bg-muted text-xs border-b"><strong>Subject:</strong> {sample.s}</div>
      <iframe sandbox="" title="email-preview" srcDoc={sample.h} className="w-full h-[400px] bg-white" />
    </div>
  );
};

interface EditorState {
  open: boolean;
  mode: 'create' | 'edit';
  row: EmailTemplateRow | null;
  form: {
    template_key: string;
    template_name: string;
    subject: string;
    html_body: string;
    text_body: string;
    from_module: string;
    variables: string;
    is_active: boolean;
  };
}

const emptyForm = {
  template_key: '', template_name: '', subject: '', html_body: '<div></div>',
  text_body: '', from_module: 'registration', variables: '', is_active: true,
};

const EmailTemplates: React.FC = () => {
  const { userCode } = useUserCode();
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: templates = [], isLoading } = useEmailTemplates();
  const pendingCount = usePendingCount();
  const saveMutation = useSaveEmailTemplate();
  const createMutation = useCreateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();
  const toggleMutation = useToggleEmailTemplateActive();
  const publishMutation = usePublishAll();
  const retryMutation = useRetrySync();

  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'create', row: null, form: emptyForm });
  const [previewRow, setPreviewRow] = useState<EmailTemplateRow | null>(null);
  const [sandbox, setSandbox] = useState<{ open: boolean; templateId: string | null }>({ open: false, templateId: null });

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (moduleFilter !== 'all' && t.from_module !== moduleFilter) return false;
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.template_key.toLowerCase().includes(q) ||
          t.template_name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, moduleFilter, statusFilter, search]);

  const openCreate = () => setEditor({ open: true, mode: 'create', row: null, form: emptyForm });
  const openEdit = (row: EmailTemplateRow) => setEditor({
    open: true, mode: 'edit', row,
    form: {
      template_key: row.template_key,
      template_name: row.template_name,
      subject: row.subject,
      html_body: row.html_body,
      text_body: row.text_body || '',
      from_module: row.from_module,
      variables: getVarsArray(row.variables).join(', '),
      is_active: row.is_active,
    },
  });

  const handleSave = () => {
    const f = editor.form;
    const vars = f.variables.split(',').map((v) => v.trim()).filter(Boolean);
    const code = userCode || 'system';
    if (editor.mode === 'create') {
      createMutation.mutate({
        payload: {
          template_key: f.template_key, template_name: f.template_name,
          subject: f.subject, html_body: f.html_body, text_body: f.text_body || null,
          from_module: f.from_module, variables: vars, is_active: f.is_active,
        }, userCode: code,
      }, { onSuccess: () => setEditor({ ...editor, open: false }) });
    } else if (editor.row) {
      saveMutation.mutate({
        id: editor.row.id, userCode: code,
        updates: {
          template_name: f.template_name, subject: f.subject, html_body: f.html_body,
          text_body: f.text_body || null, from_module: f.from_module,
          variables: vars, is_active: f.is_active,
        },
      }, { onSuccess: () => setEditor({ ...editor, open: false }) });
    }
  };

  const formVars = useMemo(() => editor.form.variables.split(',').map((v) => v.trim()).filter(Boolean), [editor.form.variables]);
  const tokensInBody = useMemo(() => extractTokens(`${editor.form.subject} ${editor.form.html_body}`), [editor.form.subject, editor.form.html_body]);
  const undeclaredVars = tokensInBody.filter((t) => !formVars.includes(t));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" />Email Templates</h1>
          <p className="text-sm text-muted-foreground">Manage transactional email templates for the C3 Wizard portal.</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
          <Button variant="outline" onClick={() => setSandbox({ open: true, templateId: null })}>
            <Send className="h-4 w-4 mr-2" />
            Test Email
          </Button>
          <Button variant="outline" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || pendingCount === 0}>
            {publishMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Publish All
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Template</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs">Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {FROM_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <Input placeholder="Key, name, or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates match the current filters.</TableCell></TableRow>
                  ) : filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.template_key}</TableCell>
                      <TableCell>{t.template_name}</TableCell>
                      <TableCell><Badge variant="outline">{t.from_module}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate" title={t.subject}>{t.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SyncBadge row={t} />
                          {t.sync_error && (
                            <Button size="sm" variant="ghost" onClick={() => retryMutation.mutate({ table: 'template', id: t.id })} disabled={retryMutation.isPending}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={t.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, isActive: v, userCode: userCode || 'system' })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSandbox({ open: true, templateId: t.id })} title="Send test email" disabled={!t.is_active}><Send className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewRow(t)} title="Preview"><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (confirm(`Delete template "${t.template_key}"?`)) deleteMutation.mutate({ id: t.id, userCode: userCode || 'system' });
                          }} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Modal */}
      <EntityModal
        open={editor.open}
        onOpenChange={(o) => setEditor({ ...editor, open: o })}
        title={editor.mode === 'create' ? 'Create Email Template' : `Edit: ${editor.row?.template_key}`}
        mode={editor.mode === 'create' ? 'create' : 'edit'}
        maxWidth="max-w-5xl"
        onSave={handleSave}
        onCancel={() => setEditor({ ...editor, open: false })}
        isSaving={saveMutation.isPending || createMutation.isPending}
      >
        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="html">HTML Body</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Key *</Label>
                <Input value={editor.form.template_key} disabled={editor.mode === 'edit'}
                  onChange={(e) => setEditor({ ...editor, form: { ...editor.form, template_key: e.target.value } })}
                  placeholder="e.g. account_activation" />
              </div>
              <div>
                <Label>From Module *</Label>
                <Select value={editor.form.from_module} onValueChange={(v) => setEditor({ ...editor, form: { ...editor.form, from_module: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FROM_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Template Name *</Label>
              <Input value={editor.form.template_name} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, template_name: e.target.value } })} />
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={editor.form.subject} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, subject: e.target.value } })} />
            </div>
            <div>
              <Label>Variables (comma-separated)</Label>
              <Input value={editor.form.variables} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, variables: e.target.value } })}
                placeholder="name, email, code" />
              {undeclaredVars.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ Tokens used in body but not declared: {undeclaredVars.join(', ')}</p>
              )}
            </div>
            <div>
              <Label>Plain Text Body (optional)</Label>
              <Textarea rows={4} value={editor.form.text_body} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, text_body: e.target.value } })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editor.form.is_active} onCheckedChange={(v) => setEditor({ ...editor, form: { ...editor.form, is_active: v } })} />
              <Label>Active</Label>
            </div>
          </TabsContent>
          <TabsContent value="html">
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="500px"
                defaultLanguage="html"
                value={editor.form.html_body}
                onChange={(v) => setEditor({ ...editor, form: { ...editor.form, html_body: v || '' } })}
                options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              />
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <PreviewIframe subject={editor.form.subject} html={editor.form.html_body} vars={formVars} />
          </TabsContent>
        </Tabs>
      </EntityModal>

      {/* Standalone preview */}
      <EntityModal
        open={!!previewRow}
        onOpenChange={(o) => !o && setPreviewRow(null)}
        title={previewRow ? `Preview: ${previewRow.template_key}` : ''}
        mode="view"
        maxWidth="max-w-4xl"
      >
        {previewRow && (
          <PreviewIframe subject={previewRow.subject} html={previewRow.html_body} vars={getVarsArray(previewRow.variables)} />
        )}
      </EntityModal>
    </div>
  );
};

export default EmailTemplates;
