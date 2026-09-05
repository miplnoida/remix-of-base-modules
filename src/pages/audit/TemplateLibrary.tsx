/**
 * Internal Audit Template Library — one simple front door.
 *
 * This page does NOT store or edit template content. It is a searchable
 * register over the canonical specialist stores, plus governed lifecycle
 * actions (new version / clone / approve / retire / default / create from an
 * existing audit) and a Where Used view for audit programmes.
 * Communication templates remain owned by Omni-Comms and are linked, not copied.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, ExternalLink, Copy, GitBranch, CheckCircle2, Archive, Star, Trash2, FilePlus2, Library,
} from 'lucide-react';
import {
  useTemplateLibrary, useTemplateLibraryPermissions, useProgrammeUsage,
  useProgrammeProcedures, useProgrammeTemplateActions, useHarvestableEngagements,
  type LibraryItem, type TemplateFamilyKey,
} from '@/hooks/useIATemplateLibrary';

const FAMILY_LABELS: Record<TemplateFamilyKey | 'all', string> = {
  all: 'All',
  programme: 'Audit Programmes',
  checklist: 'Preparation Checklists',
  audit_plan: 'Audit Plan',
  document: 'Report & Document',
  section: 'Section Library',
  communication: 'Communications',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Approved: 'default',
  Published: 'default',
  Active: 'default',
  Draft: 'secondary',
  Configured: 'secondary',
  Superseded: 'outline',
  Retired: 'destructive',
  Inactive: 'outline',
};

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const { canManage } = useTemplateLibraryPermissions();
  const { data: items = [], isLoading } = useTemplateLibrary();
  const actions = useProgrammeTemplateActions();

  const [family, setFamily] = useState<TemplateFamilyKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [includeRetired, setIncludeRetired] = useState(false);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [dialog, setDialog] = useState<null | 'clone' | 'version' | 'retire' | 'fromAudit'>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (family !== 'all' && i.family !== family) return false;
      if (!includeRetired && ['Retired', 'Superseded', 'Inactive'].includes(i.status)) return false;
      if (!q) return true;
      return [i.name, i.code, i.area].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, family, search, includeRetired]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((i) => { c[i.family] = (c[i.family] ?? 0) + 1; });
    return c;
  }, [items]);

  const openDialog = (kind: typeof dialog, item?: LibraryItem) => {
    if (item) setSelected(item);
    setForm({});
    setDialog(kind);
  };

  const submit = async () => {
    if (!dialog) return;
    const programId = selected?.id;
    try {
      if (dialog === 'clone') {
        await actions.mutateAsync({ action: 'clone', programId, name: form.name, code: form.code, auditArea: form.area });
      } else if (dialog === 'version') {
        await actions.mutateAsync({ action: 'createVersion', programId, changeSummary: form.notes });
      } else if (dialog === 'retire') {
        await actions.mutateAsync({ action: 'retire', programId, reason: form.notes });
      } else if (dialog === 'fromAudit') {
        await actions.mutateAsync({
          action: 'createFromAudit', engagementId: form.engagementId,
          name: form.name, code: form.code, auditArea: form.area,
        });
      }
      setDialog(null);
    } catch { /* toast handled in hook */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6" /> Template Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find and govern every reusable Internal Audit template. Content is edited in its own
            specialist editor; this page handles discovery, versions, defaults and where each
            template is used.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog('fromAudit')}>
              <FilePlus2 className="h-4 w-4 mr-2" /> Create from existing audit
            </Button>
            <Button variant="outline" onClick={() => navigate('/audit/document-templates')}>
              <ExternalLink className="h-4 w-4 mr-2" /> Document & output settings
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by name, code or area…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={includeRetired ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeRetired((v) => !v)}
            >
              {includeRetired ? 'Showing history' : 'Show retired & superseded'}
            </Button>
          </div>
          <Tabs value={family} onValueChange={(v) => setFamily(v as any)} className="mt-3">
            <TabsList className="flex-wrap">
              {(Object.keys(FAMILY_LABELS) as (TemplateFamilyKey | 'all')[]).map((k) => (
                <TabsTrigger key={k} value={k} className="gap-2">
                  {FAMILY_LABELS[k]}
                  {k !== 'communication' && (
                    <span className="text-xs text-muted-foreground">{counts[k] ?? 0}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {family === 'communication' ? (
            <div className="text-sm text-muted-foreground space-y-3 py-6">
              <p>
                Audit letters, notifications and emails are managed centrally in the
                communication template library so wording, branding and delivery stay consistent
                across the organisation.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/notification-templates?tab=core&module=AUDIT')}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Open audit communication templates
              </Button>
            </div>
          ) : isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading templates…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No templates match your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow
                    key={`${i.family}-${i.id}`}
                    className="cursor-pointer"
                    onClick={() => setSelected(i)}
                  >
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {i.name}
                        {i.isDefault && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3" /> Default
                          </Badge>
                        )}
                      </div>
                      {i.code && <div className="text-xs text-muted-foreground">{i.code}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{FAMILY_LABELS[i.family]}</TableCell>
                    <TableCell className="text-sm">{i.area ?? '—'}</TableCell>
                    <TableCell className="text-sm">{i.version ? `V${i.version}` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[i.status] ?? 'secondary'}>{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{i.itemCount ?? '—'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(i.editorPath)}
                        title="Open specialist editor"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <TemplateDetail
          item={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onAction={(kind) => openDialog(kind, selected)}
          onSimpleAction={(action) => actions.mutate({ action, programId: selected.id })}
          busy={actions.isPending}
        />
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'clone' && 'Clone template'}
              {dialog === 'version' && 'Create new version'}
              {dialog === 'retire' && 'Retire template'}
              {dialog === 'fromAudit' && 'Create template from an existing audit'}
            </DialogTitle>
            <DialogDescription>
              {dialog === 'version' &&
                'The current version stays untouched for audits already using it. A new draft is created for you to edit.'}
              {dialog === 'clone' &&
                'Creates an independent draft copy you can adapt for another area.'}
              {dialog === 'retire' &&
                'The template stays in history and audits that used it are unaffected, but it can no longer be selected.'}
              {dialog === 'fromAudit' &&
                'Copies only the methodology (objectives, procedures, criteria and sampling plan). No samples, evidence, exceptions, findings or results are copied.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {dialog === 'fromAudit' && <EngagementPicker value={form.engagementId} onChange={(v) => setForm((f) => ({ ...f, engagementId: v }))} />}
            {(dialog === 'clone' || dialog === 'fromAudit') && (
              <>
                <div>
                  <Label>Template name</Label>
                  <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Template code</Label>
                  <Input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <Label>Audit area</Label>
                  <Input value={form.area ?? ''} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
                </div>
              </>
            )}
            {(dialog === 'version' || dialog === 'retire') && (
              <div>
                <Label>{dialog === 'version' ? 'What is changing?' : 'Reason'}</Label>
                <Textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submit} disabled={actions.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EngagementPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const { data = [] } = useHarvestableEngagements();
  return (
    <div>
      <Label>Audit to copy the methodology from</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select an audit" /></SelectTrigger>
        <SelectContent>
          {data.map((row: any) => (
            <SelectItem key={row.engagement_id} value={row.engagement_id}>
              {row.ia_audit_engagements?.engagement_name ?? row.programme_name}
              {row.ia_audit_engagements?.engagement_code ? ` (${row.ia_audit_engagements.engagement_code})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TemplateDetail({
  item, canManage, onClose, onAction, onSimpleAction, busy,
}: {
  item: LibraryItem;
  canManage: boolean;
  onClose: () => void;
  onAction: (kind: 'clone' | 'version' | 'retire') => void;
  onSimpleAction: (action: 'approve' | 'setDefault' | 'deleteDraft') => void;
  busy: boolean;
}) {
  const isProgramme = item.family === 'programme';
  const { data: usage = [] } = useProgrammeUsage(isProgramme ? item.id : undefined);
  const { data: procedures = [] } = useProgrammeProcedures(isProgramme ? item.id : undefined);
  const navigate = useNavigate();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.name}
            <Badge variant={STATUS_VARIANT[item.status] ?? 'secondary'}>{item.status}</Badge>
            {item.version && <Badge variant="outline">V{item.version}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {FAMILY_LABELS[item.family]}
            {item.code ? ` · ${item.code}` : ''}
            {item.area ? ` · ${item.area}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(item.editorPath)}>
            <ExternalLink className="h-4 w-4 mr-2" /> Open editor
          </Button>
          {isProgramme && canManage && (
            <>
              {item.status === 'Draft' && (
                <Button size="sm" disabled={busy} onClick={() => onSimpleAction('approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
              )}
              {['Approved', 'Published'].includes(item.status) && (
                <>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('version')}>
                    <GitBranch className="h-4 w-4 mr-2" /> New version
                  </Button>
                  {!item.isDefault && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onSimpleAction('setDefault')}>
                      <Star className="h-4 w-4 mr-2" /> Set as default
                    </Button>
                  )}
                </>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('clone')}>
                <Copy className="h-4 w-4 mr-2" /> Clone
              </Button>
              {item.status !== 'Retired' && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('retire')}>
                  <Archive className="h-4 w-4 mr-2" /> Retire
                </Button>
              )}
              {item.status === 'Draft' && (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSimpleAction('deleteDraft')}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete draft
                </Button>
              )}
            </>
          )}
        </div>

        {isProgramme && (
          <div className="space-y-4 pt-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Procedures ({procedures.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {procedures.length === 0 && <p className="text-sm text-muted-foreground">No procedures defined yet.</p>}
                {procedures.map((p: any) => (
                  <div key={p.id} className="text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{p.procedure_no}. {p.title}</span>
                    {p.test_type && <span className="text-muted-foreground"> · {p.test_type}</span>}
                    {p.is_key && <Badge variant="outline" className="ml-2">Key</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Where used ({usage.length})</CardTitle></CardHeader>
              <CardContent>
                {usage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not yet used by any audit.</p>
                ) : (
                  <div className="space-y-2">
                    {usage.map((u: any) => (
                      <div key={u.engagement_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <button className="text-left hover:underline" onClick={() => navigate(`/audit/engagements/${u.engagement_id}`)}>
                          {u.engagement_name} {u.engagement_code ? `(${u.engagement_code})` : ''}
                        </button>
                        <span className="text-muted-foreground">V{u.version} · {u.programme_status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
