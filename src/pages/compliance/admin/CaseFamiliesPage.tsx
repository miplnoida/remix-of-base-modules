import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { Pencil, Plus, Layers, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  listCaseFamilies,
  upsertCaseFamily,
  toggleCaseFamilyActive,
  DEFAULT_GROUPING_RULE,
  type CaseFamily,
  type GroupingRule,
} from '@/services/caseFamiliesService';

const PERMISSION = 'manage_compliance';
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

interface EditorState {
  open: boolean;
  family: Partial<CaseFamily> | null;
}

function emptyFamily(): Partial<CaseFamily> {
  return {
    code: '',
    name: '',
    description: '',
    violation_categories: [],
    allowed_violation_type_ids: [],
    grouping_rule: { ...DEFAULT_GROUPING_RULE },
    default_severity: 'Medium',
    default_workflow_id: null,
    default_officer_queue_id: null,
    default_notice_sequence_id: null,
    auto_create_case: true,
    merge_allowed: true,
    reopen_allowed: true,
    legal_eligible: false,
    manual_intake_on_no_match: true,
    is_active: true,
    sort_order: 0,
  };
}

export default function CaseFamiliesPage() {
  return (
    <PermissionWrapper moduleName={PERMISSION}>
      <CaseFamiliesInner />
    </PermissionWrapper>
  );
}

function CaseFamiliesInner() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editor, setEditor] = useState<EditorState>({ open: false, family: null });

  const familiesQ = useQuery({ queryKey: ['case-families'], queryFn: listCaseFamilies });

  const violationTypesQ = useQuery({
    queryKey: ['violation-types-min'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_violation_types')
        .select('id, code, name, category')
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
  });

  const queuesQ = useQuery({
    queryKey: ['assignment-queues-min'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_assignment_queues')
        .select('id, queue_code, queue_name')
        .eq('is_active', true)
        .order('queue_name');
      return data ?? [];
    },
  });

  const noticeTemplatesQ = useQuery({
    queryKey: ['notice-templates-min'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ce_notice_templates')
        .select('id, template_code, template_name')
        .order('template_name');
      return data ?? [];
    },
  });

  const workflowsQ = useQuery({
    queryKey: ['workflows-min'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_definitions')
        .select('id, name')
        .order('name');
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: Partial<CaseFamily>) =>
      upsertCaseFamily(f as any, userCode || 'SYSTEM'),
    onSuccess: () => {
      toast.success('Case family saved');
      qc.invalidateQueries({ queryKey: ['case-families'] });
      setEditor({ open: false, family: null });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save case family'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleCaseFamilyActive(id, active, userCode || 'SYSTEM'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-families'] }),
  });

  const families = familiesQ.data ?? [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Case Families
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure how confirmed violations are grouped into cases.
          </p>
        </div>
        <PermissionButton
          moduleName={PERMISSION}
          actionName="create"
          onClick={() => setEditor({ open: true, family: emptyFamily() })}
        >
          <Plus className="h-4 w-4 mr-1" /> New Case Family
        </PermissionButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Families</CardTitle>
          <CardDescription>
            Grouping rules and defaults applied when a violation is confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {familiesQ.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : families.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" /> No case families configured.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Default Severity</TableHead>
                  <TableHead>Auto Create</TableHead>
                  <TableHead>Merge</TableHead>
                  <TableHead>Reopen</TableHead>
                  <TableHead>Legal</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{f.name}</div>
                      {f.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {f.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{f.default_severity}</Badge>
                    </TableCell>
                    <TableCell>{f.auto_create_case ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{f.merge_allowed ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{f.reopen_allowed ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{f.legal_eligible ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={f.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: f.id, active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionButton
                        moduleName={PERMISSION}
                        actionName="edit"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditor({ open: true, family: { ...f } })}
                      >
                        <Pencil className="h-4 w-4" />
                      </PermissionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editor.open && editor.family && (
        <Editor
          key={(editor.family as any).id ?? 'new'}
          state={editor}
          onClose={() => setEditor({ open: false, family: null })}
          onSave={(f) => save.mutate(f)}
          saving={save.isPending}
          violationTypes={violationTypesQ.data ?? []}
          queues={queuesQ.data ?? []}
          notices={noticeTemplatesQ.data ?? []}
          workflows={workflowsQ.data ?? []}
        />
      )}
    </div>
  );
}


function Editor({
  state,
  onClose,
  onSave,
  saving,
  violationTypes,
  queues,
  notices,
  workflows,
}: {
  state: EditorState;
  onClose: () => void;
  onSave: (f: Partial<CaseFamily>) => void;
  saving: boolean;
  violationTypes: any[];
  queues: any[];
  notices: any[];
  workflows: any[];
}) {
  const f = state.family;
  if (!f) return null;
  const [local, setLocal] = useState<Partial<CaseFamily>>(f);
  const rule: GroupingRule = local.grouping_rule ?? { ...DEFAULT_GROUPING_RULE };
  const setRule = (k: keyof GroupingRule, v: any) =>
    setLocal({ ...local, grouping_rule: { ...rule, [k]: v } });

  const categories = Array.from(
    new Set(violationTypes.map((t) => t.category).filter(Boolean)),
  );

  const toggleArr = (arr: any[], val: any) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{local.id ? 'Edit Case Family' : 'New Case Family'}</DialogTitle>
          <DialogDescription>
            Configuration drives violation-to-case grouping. No code changes required.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basics">
          <TabsList>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="scope">Scope</TabsTrigger>
            <TabsTrigger value="grouping">Grouping Rule</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="flags">Flags</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code">
                <Input
                  value={local.code ?? ''}
                  onChange={(e) => setLocal({ ...local, code: e.target.value.toUpperCase() })}
                  placeholder="FILING_DEFAULT"
                />
              </Field>
              <Field label="Name">
                <Input
                  value={local.name ?? ''}
                  onChange={(e) => setLocal({ ...local, name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                rows={3}
                value={local.description ?? ''}
                onChange={(e) => setLocal({ ...local, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sort Order">
                <Input
                  type="number"
                  value={local.sort_order ?? 0}
                  onChange={(e) => setLocal({ ...local, sort_order: Number(e.target.value) })}
                />
              </Field>
              <Field label="Default Severity">
                <Select
                  value={local.default_severity ?? 'Medium'}
                  onValueChange={(v) => setLocal({ ...local, default_severity: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="scope" className="space-y-3">
            <div>
              <Label className="mb-2 block">Allowed Violation Types</Label>
              <div className="border rounded-md p-2 max-h-56 overflow-y-auto space-y-1">
                {violationTypes.map((t) => {
                  const checked = (local.allowed_violation_type_ids ?? []).includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setLocal({
                            ...local,
                            allowed_violation_type_ids: toggleArr(
                              local.allowed_violation_type_ids ?? [],
                              t.id,
                            ),
                          })
                        }
                      />
                      <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                      <span>{t.name}</span>
                    </label>
                  );
                })}
                {violationTypes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active violation types.</p>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Violation Categories (fallback match)</Label>
              <div className="border rounded-md p-2 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const checked = (local.violation_categories ?? []).includes(c);
                  return (
                    <label key={c} className="flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setLocal({
                            ...local,
                            violation_categories: toggleArr(local.violation_categories ?? [], c),
                          })
                        }
                      />
                      {c}
                    </label>
                  );
                })}
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">No categories defined.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="grouping" className="space-y-2">
            <BoolRow label="Same employer" v={rule.sameEmployer} onChange={(v) => setRule('sameEmployer', v)} />
            <BoolRow label="Same fund" v={rule.sameFund} onChange={(v) => setRule('sameFund', v)} />
            <BoolRow label="Same contribution period" v={rule.sameContributionPeriod} onChange={(v) => setRule('sameContributionPeriod', v)} />
            <BoolRow label="Same violation type" v={rule.sameViolationType} onChange={(v) => setRule('sameViolationType', v)} />
            <BoolRow label="Same case family" v={rule.sameCaseFamily} onChange={(v) => setRule('sameCaseFamily', v)} />
            <BoolRow label="Open case only" v={rule.openCaseOnly} onChange={(v) => setRule('openCaseOnly', v)} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Field label="Date range (days, 0 = ignore)">
                <Input type="number" value={rule.dateRangeDays} onChange={(e) => setRule('dateRangeDays', Number(e.target.value))} />
              </Field>
              <Field label="Max open case age (days, 0 = ignore)">
                <Input type="number" value={rule.maxOpenCaseAgeDays} onChange={(e) => setRule('maxOpenCaseAgeDays', Number(e.target.value))} />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="defaults" className="space-y-3">
            <Field label="Default Workflow">
              <Select
                value={local.default_workflow_id ?? '__none'}
                onValueChange={(v) => setLocal({ ...local, default_workflow_id: v === '__none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Officer Queue">
              <Select
                value={local.default_officer_queue_id ?? '__none'}
                onValueChange={(v) => setLocal({ ...local, default_officer_queue_id: v === '__none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {queues.map((q) => <SelectItem key={q.id} value={q.id}>{q.queue_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Notice Sequence (first notice template)">
              <Select
                value={local.default_notice_sequence_id ?? '__none'}
                onValueChange={(v) => setLocal({ ...local, default_notice_sequence_id: v === '__none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {notices.map((n) => <SelectItem key={n.id} value={n.id}>{n.template_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Escalation threshold (days)">
                <Input type="number" value={local.escalation_threshold_days ?? 90} onChange={(e) => setLocal({ ...local, escalation_threshold_days: Number(e.target.value) })} />
              </Field>
              <Field label="Escalation threshold amount">
                <Input type="number" value={local.escalation_threshold_amount ?? 50000} onChange={(e) => setLocal({ ...local, escalation_threshold_amount: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Reopen window (days)">
              <Input type="number" value={local.reopen_window_days ?? 30} onChange={(e) => setLocal({ ...local, reopen_window_days: Number(e.target.value) })} />
            </Field>
          </TabsContent>

          <TabsContent value="flags" className="space-y-3">
            <BoolRow label="Auto-create case when no match" v={local.auto_create_case ?? true} onChange={(v) => setLocal({ ...local, auto_create_case: v })} />
            <BoolRow label="Send to manual intake if not auto-created" v={local.manual_intake_on_no_match ?? true} onChange={(v) => setLocal({ ...local, manual_intake_on_no_match: v })} />
            <BoolRow label="Merge allowed" v={local.merge_allowed ?? true} onChange={(v) => setLocal({ ...local, merge_allowed: v })} />
            <BoolRow label="Reopen allowed" v={local.reopen_allowed ?? true} onChange={(v) => setLocal({ ...local, reopen_allowed: v })} />
            <BoolRow label="Legal eligible" v={local.legal_eligible ?? false} onChange={(v) => setLocal({ ...local, legal_eligible: v })} />
            <BoolRow label="Active" v={local.is_active ?? true} onChange={(v) => setLocal({ ...local, is_active: v })} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <PermissionButton
            moduleName={PERMISSION}
            actionName="edit"
            disabled={saving || !local.code || !local.name}
            onClick={() => onSave(local)}
          >
            {saving ? 'Saving…' : 'Save'}
          </PermissionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function BoolRow({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}
