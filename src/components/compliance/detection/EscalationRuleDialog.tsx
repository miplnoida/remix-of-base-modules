import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowRight, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ESCALATION_FAMILIES,
  STATE_MACHINE,
  EXECUTION_MODES,
  PREREQUISITES,
  DERIVED_METRICS,
  getAllowedTransitions,
  getStageColor,
  type ExecutionMode,
} from './escalationConstants';

interface EscalationRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  from_status: string;
  to_status: string;
  condition_expression: string | null;
  days_threshold: number | null;
  amount_threshold: number | null;
  auto_escalate: boolean | null;
  requires_approval: boolean | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
}

interface ViolationType {
  id: string;
  code: string;
  name: string;
}

function generateNextCode(existingCodes: string[], prefix: string): string {
  const nums = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: EscalationRule | null;
  violationTypes: ViolationType[];
  onSave: (data: any) => void;
  saving: boolean;
  existingCodes: string[];
}

export const EnhancedEscalationRuleDialog = ({ open, onOpenChange, rule, violationTypes, onSave, saving, existingCodes }: Props) => {
  const isEdit = !!rule;

  const [form, setForm] = useState({
    rule_code: '',
    name: '',
    description: '',
    family: 'case_progression',
    from_status: 'OPEN',
    to_status: 'UNDER_REVIEW',
    execution_mode: 'RECOMMEND' as ExecutionMode,
    days_threshold: '' as string | number,
    amount_threshold: '' as string | number,
    trigger_metric: '',
    trigger_operator: '>',
    trigger_value: '',
    prerequisites: [] as string[],
    condition_expression: '',
    is_enabled: true,
    violation_type_id: '',
  });

  useEffect(() => {
    if (open) {
      const autoCode = isEdit ? (rule?.rule_code || '') : generateNextCode(existingCodes, 'ER-');
      // Derive execution mode from auto_escalate + requires_approval
      let mode: ExecutionMode = 'RECOMMEND';
      if (rule?.auto_escalate && !rule?.requires_approval) mode = 'AUTO';
      else if (!rule?.auto_escalate && !rule?.requires_approval) mode = 'RECOMMEND';
      else if (rule?.requires_approval) mode = 'MANUAL';

      // Parse condition to extract trigger metric
      let triggerMetric = '', triggerOp = '>', triggerVal = '';
      const condExpr = rule?.condition_expression || '';
      const condMatch = condExpr.match(/^(\w+)\s*(>=|<=|!=|==|>|<)\s*(.+?)(?:\s+AND|$)/);
      if (condMatch) {
        triggerMetric = condMatch[1];
        triggerOp = condMatch[2];
        triggerVal = condMatch[3].trim();
      }

      setForm({
        rule_code: autoCode,
        name: rule?.name || '',
        description: rule?.description || '',
        family: 'case_progression',
        from_status: rule?.from_status || 'OPEN',
        to_status: rule?.to_status || 'UNDER_REVIEW',
        execution_mode: mode,
        days_threshold: rule?.days_threshold ?? '',
        amount_threshold: rule?.amount_threshold ?? '',
        trigger_metric: triggerMetric,
        trigger_operator: triggerOp,
        trigger_value: triggerVal,
        prerequisites: [],
        condition_expression: rule?.condition_expression || '',
        is_enabled: rule?.is_enabled ?? true,
        violation_type_id: rule?.violation_type_id || '',
      });
    }
  }, [open, rule]);

  // Get allowed transitions for selected from_status
  const allowedToStates = useMemo(() => getAllowedTransitions(form.from_status), [form.from_status]);
  const fromState = STATE_MACHINE.find(s => s.value === form.from_status);
  const toState = STATE_MACHINE.find(s => s.value === form.to_status);

  // When from_status changes, reset to_status if not in allowed list
  useEffect(() => {
    if (!allowedToStates.find(s => s.value === form.to_status) && allowedToStates.length > 0) {
      setForm(p => ({ ...p, to_status: allowedToStates[0].value }));
    }
  }, [form.from_status]);

  // Build condition expression from trigger metric
  useEffect(() => {
    if (form.trigger_metric && form.trigger_value) {
      setForm(p => ({ ...p, condition_expression: `${p.trigger_metric} ${p.trigger_operator} ${p.trigger_value}` }));
    }
  }, [form.trigger_metric, form.trigger_operator, form.trigger_value]);

  const handlePrereqToggle = (prereq: string) => {
    setForm(p => ({
      ...p,
      prerequisites: p.prerequisites.includes(prereq)
        ? p.prerequisites.filter(pr => pr !== prereq)
        : [...p.prerequisites, prereq],
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.from_status || !form.to_status) {
      toast.error('Please check the form for valid information!', {
        description: 'Name, From Status, and To Status are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    onSave({
      rule_code: form.rule_code,
      name: form.name,
      description: form.description || null,
      from_status: form.from_status,
      to_status: form.to_status,
      condition_expression: form.condition_expression || null,
      days_threshold: form.days_threshold !== '' ? Number(form.days_threshold) : null,
      amount_threshold: form.amount_threshold !== '' ? Number(form.amount_threshold) : null,
      auto_escalate: form.execution_mode === 'AUTO',
      requires_approval: form.execution_mode === 'MANUAL',
      is_enabled: form.is_enabled,
      violation_type_id: form.violation_type_id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
          </DialogTitle>
          <DialogDescription>
            Define when and how violations and cases should progress through the enforcement lifecycle. Transitions are governed by a controlled state machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Section 1: Identity ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Rule Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rule Code</Label>
                <Input value={form.rule_code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Warning to Demand Notice" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Business description of this escalation..." rows={2} />
            </div>
          </div>

          <Separator />

          {/* ── Section 2: Escalation Family ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
              Escalation Family
              <span className="text-xs text-muted-foreground font-normal">— What type of escalation is this?</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ESCALATION_FAMILIES.map(fam => (
                <button
                  key={fam.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, family: fam.value }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.family === fam.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{fam.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{fam.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Section 3: Stage Transition ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
              Stage Transition
              <span className="text-xs text-muted-foreground font-normal">— Only valid transitions are allowed</span>
            </h3>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
              <div className="space-y-1.5">
                <Label>From Stage <span className="text-destructive">*</span></Label>
                <Select value={form.from_status} onValueChange={v => setForm(p => ({ ...p, from_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATE_MACHINE.filter(s => s.allowedNextStates.length > 0).map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <span>{s.label}</span>
                          <Badge variant="outline" className={`text-[9px] h-4 ${getStageColor(s.stage)}`}>{s.stage}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fromState && <p className="text-[10px] text-muted-foreground">{fromState.description}</p>}
              </div>
              <div className="pt-8">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label>To Stage <span className="text-destructive">*</span></Label>
                <Select value={form.to_status} onValueChange={v => setForm(p => ({ ...p, to_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedToStates.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <span>{s.label}</span>
                          <Badge variant="outline" className={`text-[9px] h-4 ${getStageColor(s.stage)}`}>{s.stage}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {toState && <p className="text-[10px] text-muted-foreground">{toState.description}</p>}
              </div>
            </div>
            {/* Transition summary */}
            <div className="mt-3 bg-muted/50 rounded-lg p-3 flex items-center gap-3 text-sm">
              {fromState && (
                <Badge variant="outline" className={getStageColor(fromState.stage)}>{fromState.label}</Badge>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {toState && (
                <Badge variant="outline" className={getStageColor(toState.stage)}>{toState.label}</Badge>
              )}
              {toState?.approvalRequired && (
                <Badge variant="destructive" className="text-[10px] ml-auto"><AlertTriangle className="h-3 w-3 mr-1" /> Approval Required</Badge>
              )}
              {toState?.noticePrerequisite && (
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-400">Notice Prerequisite</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Section 4: Trigger Criteria ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
              Trigger Criteria
              <span className="text-xs text-muted-foreground font-normal">— When should this escalation fire?</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Days Threshold</Label>
                <Input type="number" value={form.days_threshold} onChange={e => setForm(p => ({ ...p, days_threshold: e.target.value }))} placeholder="e.g. 14" />
                <p className="text-[10px] text-muted-foreground">Days that must pass before this escalation triggers</p>
              </div>
              <div className="space-y-1.5">
                <Label>Amount Threshold ($)</Label>
                <Input type="number" value={form.amount_threshold} onChange={e => setForm(p => ({ ...p, amount_threshold: e.target.value }))} placeholder="e.g. 25000" />
                <p className="text-[10px] text-muted-foreground">Minimum exposure amount to trigger</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Derived Metric Trigger <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="flex gap-2">
                <Select value={form.trigger_metric || '__pick__'} onValueChange={v => setForm(p => ({ ...p, trigger_metric: v === '__pick__' ? '' : v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select metric..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__">Select metric...</SelectItem>
                    {DERIVED_METRICS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <span>{m.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">({m.group})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.trigger_operator} onValueChange={v => setForm(p => ({ ...p, trigger_operator: v }))}>
                  <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['>', '>=', '<', '<=', '==', '!='].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-28" type="number" value={form.trigger_value} onChange={e => setForm(p => ({ ...p, trigger_value: e.target.value }))} placeholder="Value" />
              </div>
              {form.trigger_metric && (() => {
                const m = DERIVED_METRICS.find(d => d.value === form.trigger_metric);
                return m ? <p className="text-[10px] text-muted-foreground">{m.description} — <span className="italic">{m.computation}</span></p> : null;
              })()}
            </div>
          </div>

          <Separator />

          {/* ── Section 5: Prerequisites ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">5</span>
              Prerequisites
              <span className="text-xs text-muted-foreground font-normal">— Conditions that must be true before escalation can proceed</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PREREQUISITES.map(prereq => (
                <label
                  key={prereq.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.prerequisites.includes(prereq.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Checkbox
                    checked={form.prerequisites.includes(prereq.value)}
                    onCheckedChange={() => handlePrereqToggle(prereq.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{prereq.label}</p>
                    <p className="text-[11px] text-muted-foreground">{prereq.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Section 6: Execution Mode & Scope ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">6</span>
              Execution & Scope
            </h3>
            <div className="space-y-3">
              <Label>Execution Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {EXECUTION_MODES.map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, execution_mode: mode.value }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.execution_mode === mode.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{mode.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{mode.description}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 mt-3">
                <Label>Linked Violation Type <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Select value={form.violation_type_id || '__none__'} onValueChange={v => setForm(p => ({ ...p, violation_type_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All violation types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All Violation Types</SelectItem>
                    {violationTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} – {vt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox checked={form.is_enabled} onCheckedChange={c => setForm(p => ({ ...p, is_enabled: !!c }))} />
                <Label className="font-normal text-sm">Enabled</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
