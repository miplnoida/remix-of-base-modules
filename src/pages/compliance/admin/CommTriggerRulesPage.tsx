/**
 * Comm Trigger Rules — Admin Page
 *
 * Configure when, where, and how the audit-communication trigger engine
 * fires. Rules are read by `commTriggerRuleService.evaluateForVisit` and
 * surfaced in every visit workspace.
 *
 * Editing strategy: the condition predicate is JSON-edited (with a small
 * validator) — keeps the page single-file and lets advanced ops add new
 * fields without UI changes. Friendly fields (mode, cooldown, max-per-visit,
 * priority, active) are first-class.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { commTriggerRuleService } from '@/services/commTriggerRuleService';
import type { CommTriggerRule, TriggerMode } from '@/types/commTriggerRule';
import {
  FIELD_STAGE_ORDER, FIELD_STAGE_LABELS, type FieldExecutionStage,
} from '@/types/fieldStageMapping';

const COMM_TYPES = [
  'audit_intimation', 'books_required', 'visit_reminder',
  'additional_info_request', 'clarification_request', 'interim_findings',
  'evidence_summary', 'draft_findings',
  'final_report', 'violation_notice', 'corrective_action',
  'acknowledgment_request', 'dispute_instructions', 'due_date_reminder',
  'escalation_notice',
] as const;

const MODES: { value: TriggerMode; label: string; help: string }[] = [
  { value: 'SUGGEST',           label: 'Suggest',           help: 'Show as a suggestion in the visit workspace.' },
  { value: 'AUTO_CREATE_DRAFT', label: 'Auto-create draft', help: 'Automatically create a draft for review/approval.' },
  { value: 'AUTO_SEND',         label: 'Auto-send',         help: 'Send immediately if approval is not required.' },
];

interface EditState {
  open: boolean;
  rule: Partial<CommTriggerRule> | null;
  conditionText: string;
  conditionError: string | null;
}

export default function CommTriggerRulesPage() {
  const [rules, setRules] = useState<CommTriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>({ open: false, rule: null, conditionText: '{}', conditionError: null });
  const [saving, setSaving] = useState(false);
  const [stageFilter, setStageFilter] = useState<FieldExecutionStage | 'ALL'>('ALL');

  const load = async () => {
    setLoading(true);
    try {
      setRules(await commTriggerRuleService.listAll());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => stageFilter === 'ALL' ? rules : rules.filter((r) => r.field_stage === stageFilter),
    [rules, stageFilter],
  );

  const openCreate = () => setEdit({
    open: true,
    rule: {
      rule_code: '', rule_name: '', description: '',
      field_stage: 'visit_created', comm_type: 'audit_intimation',
      template_id: null, trigger_mode: 'SUGGEST',
      cooldown_hours: 24, max_per_visit: 1, requires_approval: true,
      priority: 100, is_active: true,
    },
    conditionText: '{\n  "all": []\n}',
    conditionError: null,
  });

  const openEdit = (r: CommTriggerRule) => setEdit({
    open: true,
    rule: { ...r },
    conditionText: JSON.stringify(r.condition_json || {}, null, 2),
    conditionError: null,
  });

  const validateCondition = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) return 'Condition must be a JSON object';
      return null;
    } catch (e: any) {
      return `Invalid JSON: ${e?.message || e}`;
    }
  };

  const handleSave = async () => {
    if (!edit.rule) return;
    const condErr = validateCondition(edit.conditionText);
    if (condErr) {
      setEdit({ ...edit, conditionError: condErr });
      return;
    }
    if (!edit.rule.rule_code?.trim() || !edit.rule.rule_name?.trim()) {
      toast.error('Rule code and name are required');
      return;
    }
    const condition_json = JSON.parse(edit.conditionText);
    setSaving(true);
    try {
      const payload: any = { ...edit.rule, condition_json };
      if (payload.id) {
        await commTriggerRuleService.update(payload.id, payload);
        toast.success('Rule updated');
      } else {
        await commTriggerRuleService.create(payload);
        toast.success('Rule created');
      }
      setEdit({ open: false, rule: null, conditionText: '{}', conditionError: null });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: CommTriggerRule) => {
    if (!confirm(`Delete rule "${r.rule_name}"? This cannot be undone.`)) return;
    try {
      await commTriggerRuleService.remove(r.id);
      toast.success('Rule deleted');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Communication Trigger Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure when audit communications are suggested, auto-drafted, or auto-sent.
            Rules are evaluated in every visit workspace against the live visit context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stageFilter} onValueChange={(v: any) => setStageFilter(v)}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All field stages</SelectItem>
              {FIELD_STAGE_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{FIELD_STAGE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New rule</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active rules</CardTitle>
          <CardDescription>
            Lower priority numbers run first. Cooldown / max-per-visit guards prevent duplicate
            sends within a single audit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No rules.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Comm type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead className="text-right">Cooldown (h)</TableHead>
                  <TableHead className="text-right">Max/visit</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[110px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.rule_name}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {FIELD_STAGE_LABELS[r.field_stage] || r.field_stage}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.comm_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={r.trigger_mode === 'SUGGEST' ? 'secondary' : 'default'} className="text-[10px]">
                        {r.trigger_mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.priority}</TableCell>
                    <TableCell className="text-right">{r.cooldown_hours}</TableCell>
                    <TableCell className="text-right">{r.max_per_visit}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={async (v) => {
                          try {
                            await commTriggerRuleService.update(r.id, { is_active: v });
                            load();
                          } catch (e: any) { toast.error(e?.message || 'Update failed'); }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={edit.open} onOpenChange={(o) => !o && setEdit({ ...edit, open: false })}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.rule?.id ? 'Edit rule' : 'New rule'}</DialogTitle>
            <DialogDescription>
              Predicate fields available on the visit context include:&nbsp;
              <code className="text-[11px]">sessionStarted, sessionClosed, daysUntilScheduled, reportStatus,
              hasViolations, hasInterimFindings, hasMissingDocuments, hasMissingEvidence,
              hasOpenClarifications, maxSeverity, hasOverdueItems, reminderCount,
              daysSinceLastReminder</code>.
            </DialogDescription>
          </DialogHeader>

          {edit.rule && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rule code</Label>
                  <Input
                    value={edit.rule.rule_code || ''}
                    onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, rule_code: e.target.value } })}
                    placeholder="e.g. VISIT_CREATED_INTIMATION"
                  />
                </div>
                <div>
                  <Label>Rule name</Label>
                  <Input
                    value={edit.rule.rule_name || ''}
                    onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, rule_name: e.target.value } })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={edit.rule.description || ''}
                  onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, description: e.target.value } })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Field stage</Label>
                  <Select
                    value={edit.rule.field_stage}
                    onValueChange={(v: FieldExecutionStage) => setEdit({ ...edit, rule: { ...edit.rule!, field_stage: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{FIELD_STAGE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Comm type</Label>
                  <Select
                    value={edit.rule.comm_type}
                    onValueChange={(v) => setEdit({ ...edit, rule: { ...edit.rule!, comm_type: v as any } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select
                    value={edit.rule.trigger_mode}
                    onValueChange={(v: TriggerMode) => setEdit({ ...edit, rule: { ...edit.rule!, trigger_mode: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={edit.rule.priority ?? 100}
                    onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, priority: Number(e.target.value) || 100 } })}
                  />
                </div>
                <div>
                  <Label>Cooldown (hours)</Label>
                  <Input
                    type="number"
                    value={edit.rule.cooldown_hours ?? 24}
                    onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, cooldown_hours: Number(e.target.value) || 0 } })}
                  />
                </div>
                <div>
                  <Label>Max per visit</Label>
                  <Input
                    type="number"
                    value={edit.rule.max_per_visit ?? 1}
                    onChange={(e) => setEdit({ ...edit, rule: { ...edit.rule!, max_per_visit: Number(e.target.value) || 0 } })}
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="mb-2">Requires approval</Label>
                  <Switch
                    checked={!!edit.rule.requires_approval}
                    onCheckedChange={(v) => setEdit({ ...edit, rule: { ...edit.rule!, requires_approval: v } })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={!!edit.rule.is_active}
                  onCheckedChange={(v) => setEdit({ ...edit, rule: { ...edit.rule!, is_active: v } })}
                />
                <Label>Active</Label>
              </div>

              <div>
                <Label>Condition (JSON predicate)</Label>
                <Textarea
                  rows={10}
                  className="font-mono text-xs"
                  value={edit.conditionText}
                  onChange={(e) => setEdit({ ...edit, conditionText: e.target.value, conditionError: null })}
                  spellCheck={false}
                />
                {edit.conditionError && (
                  <p className="text-xs text-destructive mt-1">{edit.conditionError}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Format: <code>{`{ "all": [{"field":"sessionStarted","op":"falsy"}] }`}</code> ·
                  Combinators: <code>all</code>, <code>any</code>, <code>not</code> ·
                  Ops: <code>eq, neq, gt, gte, lt, lte, truthy, falsy, in</code>.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit({ ...edit, open: false })}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
