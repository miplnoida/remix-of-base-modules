import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Cog, Plus, Zap, Calculator, TrendingUp, Edit, Loader2, Trash2, PlusCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Types ──

interface DetectionRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  trigger_event: string;
  condition_expression: string | null;
  frequency: string | null;
  priority: string | null;
  auto_create_violation: boolean | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
}

interface CalculationRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  applies_to: string;
  formula_expression: string;
  fund_type: string | null;
  source_config: string | null;
  is_enabled: boolean | null;
}

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
}

interface ViolationType {
  id: string;
  code: string;
  name: string;
}

interface VariableMapping {
  id: string;
  variable_key: string;
  display_name: string;
  description: string | null;
  data_type: string;
  variable_category: string;
  group_name: string;
  source_table: string | null;
  source_column: string | null;
  c3_config_key: string | null;
  computation_logic: string | null;
  applies_to_rule_type: string;
  sort_order: number;
}

// ── Predefined options for intelligent dropdowns ──

const TRIGGER_EVENTS = [
  { value: 'c3_deadline_passed', label: 'C3 Filing Deadline Passed', description: 'Triggers when C3 submission deadline has elapsed' },
  { value: 'payment_deadline_passed', label: 'Payment Deadline Passed', description: 'Triggers when contribution payment is overdue' },
  { value: 'registration_not_found', label: 'Unregistered Employer Detected', description: 'Business operating without SSB registration' },
  { value: 'employee_underreporting', label: 'Employee Count Discrepancy', description: 'Reported employees differ from field verification' },
  { value: 'wage_underreporting', label: 'Wage Underreporting Detected', description: 'Declared wages below minimum or industry norms' },
  { value: 'payment_plan_breach', label: 'Payment Plan Breach', description: 'Missed installment on an active payment arrangement' },
  { value: 'benefit_fraud_indicator', label: 'Benefit Fraud Indicator', description: 'Suspicious benefit claim patterns detected' },
  { value: 'audit_discrepancy_found', label: 'Audit Discrepancy Found', description: 'Field audit reveals compliance mismatch' },
  { value: 'cessation_without_clearance', label: 'Cessation Without Clearance', description: 'Employer ceased operations without settling liabilities' },
  { value: 'multiple_violations_threshold', label: 'Multiple Violations Threshold', description: 'Employer accumulates violation count past limit' },
  { value: 'contribution_gap_detected', label: 'Contribution Gap Detected', description: 'Missing contribution periods for active employees' },
  { value: 'late_registration', label: 'Late Employee Registration', description: 'Employee registered after statutory deadline' },
];

// Derived from backend mappings - these are fallbacks if DB hasn't loaded yet
function getConditionVariables(mappings: VariableMapping[]) {
  const filtered = mappings.filter(m => m.variable_category === 'condition' || m.variable_category === 'both');
  if (filtered.length === 0) return FALLBACK_CONDITION_VARIABLES;
  return filtered.map(m => ({
    value: m.variable_key,
    label: m.display_name,
    type: m.data_type,
    description: m.description,
    sourceTable: m.source_table,
    sourceColumn: m.source_column,
    c3ConfigKey: m.c3_config_key,
  }));
}

function getFormulaOperands(mappings: VariableMapping[]) {
  const filtered = mappings.filter(m => m.variable_category === 'formula' || m.variable_category === 'both');
  if (filtered.length === 0) return FALLBACK_FORMULA_OPERANDS;
  return filtered.map(m => ({
    value: m.variable_key,
    label: m.display_name,
    group: m.group_name,
    description: m.description,
    sourceTable: m.source_table,
    sourceColumn: m.source_column,
    c3ConfigKey: m.c3_config_key,
  }));
}

// Fallbacks in case DB query fails
const FALLBACK_CONDITION_VARIABLES = [
  { value: 'days_overdue', label: 'Days Overdue', type: 'number', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'months_overdue', label: 'Months Overdue', type: 'number', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'total_owed', label: 'Total Amount Owed ($)', type: 'number', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'violations_count', label: 'Active Violation Count', type: 'number', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'risk_score', label: 'Risk Score', type: 'number', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'is_registered', label: 'Is Registered', type: 'boolean', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'is_repeat_offender', label: 'Is Repeat Offender', type: 'boolean', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
];

const FALLBACK_FORMULA_OPERANDS = [
  { value: 'outstanding_amount', label: 'Outstanding Amount', group: 'Financial', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'ss_contribution', label: 'SS Contribution', group: 'Financial', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'levy_amount', label: 'Levy Amount', group: 'Financial', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'ss_fine_initial_rate', label: 'SS Fine Rate', group: 'Rate', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
  { value: 'months_overdue', label: 'Months Overdue', group: 'Time', description: null, sourceTable: null, sourceColumn: null, c3ConfigKey: null },
];

const CONDITION_OPERATORS = [
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '==', label: '=' },
  { value: '!=', label: '≠' },
];

const BOOLEAN_OPERATORS = [
  { value: '==', label: 'is' },
  { value: '!=', label: 'is not' },
];

const FORMULA_OPERATORS = [
  { value: '*', label: '×' },
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '/', label: '÷' },
];

// ── Auto-generate rule code ──

function generateNextCode(existingCodes: string[], prefix: string): string {
  const nums = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ── Condition Builder ──

interface ConditionRow {
  variable: string;
  operator: string;
  value: string;
  conjunction: 'AND' | 'OR';
}

function parseConditionExpression(expr: string | null): ConditionRow[] {
  if (!expr || !expr.trim()) return [{ variable: '', operator: '>', value: '', conjunction: 'AND' }];
  const parts = expr.split(/\s+(AND|OR)\s+/i);
  const rows: ConditionRow[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const segment = parts[i].trim();
    const conjunction = (parts[i + 1]?.toUpperCase() as 'AND' | 'OR') || 'AND';
    const match = segment.match(/^(\w+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
    if (match) {
      rows.push({ variable: match[1], operator: match[2], value: match[3].trim(), conjunction });
    } else {
      rows.push({ variable: '', operator: '>', value: segment, conjunction });
    }
  }
  return rows.length > 0 ? rows : [{ variable: '', operator: '>', value: '', conjunction: 'AND' }];
}

function buildConditionExpression(rows: ConditionRow[]): string {
  return rows
    .filter(r => r.variable && r.value)
    .map((r, i, arr) => {
      const cond = `${r.variable} ${r.operator} ${r.value}`;
      return i < arr.length - 1 ? `${cond} ${r.conjunction}` : cond;
    })
    .join(' ');
}

interface ConditionVar {
  value: string;
  label: string;
  type: string;
  description: string | null;
  sourceTable: string | null;
  sourceColumn: string | null;
  c3ConfigKey: string | null;
}

const ConditionBuilder = ({ value, onChange, variables }: { value: string; onChange: (v: string) => void; variables: ConditionVar[] }) => {
  const [rows, setRows] = useState<ConditionRow[]>(() => parseConditionExpression(value));

  const updateRow = (idx: number, field: keyof ConditionRow, val: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: val };
    setRows(updated);
    onChange(buildConditionExpression(updated));
  };

  const addRow = () => {
    const updated = [...rows, { variable: '', operator: '>', value: '', conjunction: 'AND' as const }];
    setRows(updated);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);
    onChange(buildConditionExpression(updated));
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const selectedVar = variables.find(v => v.value === row.variable);
        const isBool = selectedVar?.type === 'boolean';
        return (
          <div key={idx} className="space-y-1">
            {idx > 0 && (
              <Select value={rows[idx - 1].conjunction} onValueChange={v => updateRow(idx - 1, 'conjunction', v)}>
                <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Select value={row.variable || '__pick__'} onValueChange={v => updateRow(idx, 'variable', v === '__pick__' ? '' : v)}>
                <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Select field..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">Select field...</SelectItem>
                  {variables.map(v => (
                    <SelectItem key={v.value} value={v.value}>
                      <span>{v.label}</span>
                      {v.c3ConfigKey && <span className="text-muted-foreground ml-1 text-[10px]">(C3 Config)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={row.operator} onValueChange={v => updateRow(idx, 'operator', v)}>
                <SelectTrigger className="w-16 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(isBool ? BOOLEAN_OPERATORS : CONDITION_OPERATORS).map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isBool ? (
                <Select value={row.value || 'true'} onValueChange={v => updateRow(idx, 'value', v)}>
                  <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="w-28 h-9 text-sm"
                  type="number"
                  value={row.value}
                  onChange={e => updateRow(idx, 'value', e.target.value)}
                  placeholder="Value"
                />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeRow(idx)} disabled={rows.length <= 1}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {selectedVar?.description && (
              <p className="text-[10px] text-muted-foreground ml-1">
                {selectedVar.description}
                {selectedVar.sourceTable && <span className="italic"> → {selectedVar.sourceTable}.{selectedVar.sourceColumn}</span>}
              </p>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addRow}>
        <PlusCircle className="h-3.5 w-3.5" /> Add Condition
      </Button>
      {buildConditionExpression(rows) && (
        <div className="bg-muted/50 rounded px-3 py-1.5 mt-1">
          <p className="text-[11px] text-muted-foreground">Generated:</p>
          <p className="text-xs font-mono text-primary">{buildConditionExpression(rows)}</p>
        </div>
      )}
    </div>
  );
};

// ── Formula Builder ──

interface FormulaStep {
  operand: string;
  operator: string;
}

interface FormulaOperand {
  value: string;
  label: string;
  group: string;
  description: string | null;
  sourceTable: string | null;
  sourceColumn: string | null;
  c3ConfigKey: string | null;
}

function parseFormulaExpression(expr: string): FormulaStep[] {
  if (!expr || !expr.trim()) return [{ operand: '', operator: '*' }];
  const tokens = expr.split(/\s*([×+\-÷*/])\s*/).filter(Boolean);
  const steps: FormulaStep[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    steps.push({
      operand: tokens[i]?.trim() || '',
      operator: tokens[i + 1] === '×' ? '*' : tokens[i + 1] === '÷' ? '/' : tokens[i + 1] === '−' ? '-' : tokens[i + 1] || '*',
    });
  }
  return steps.length > 0 ? steps : [{ operand: '', operator: '*' }];
}

function buildFormulaExpression(steps: FormulaStep[]): string {
  return steps
    .filter(s => s.operand)
    .map((s, i, arr) => {
      const op = s.operator === '*' ? '×' : s.operator === '/' ? '÷' : s.operator === '-' ? '−' : s.operator;
      return i < arr.length - 1 ? `${s.operand} ${op}` : s.operand;
    })
    .join(' ');
}

const FormulaBuilder = ({ value, onChange, operands }: { value: string; onChange: (v: string) => void; operands: FormulaOperand[] }) => {
  const [steps, setSteps] = useState<FormulaStep[]>(() => parseFormulaExpression(value));

  const updateStep = (idx: number, field: keyof FormulaStep, val: string) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], [field]: val };
    setSteps(updated);
    onChange(buildFormulaExpression(updated));
  };

  const addStep = () => {
    const updated = [...steps, { operand: '', operator: '*' }];
    setSteps(updated);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== idx);
    setSteps(updated);
    onChange(buildFormulaExpression(updated));
  };

  const groups = Array.from(new Set(operands.map(o => o.group)));

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <Select value={steps[idx - 1].operator} onValueChange={v => updateStep(idx - 1, 'operator', v)}>
                <SelectTrigger className="w-14 h-9 text-sm text-center"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMULA_OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={step.operand || '__pick__'} onValueChange={v => updateStep(idx, 'operand', v === '__pick__' ? '' : v)}>
              <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Select operand..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__">Select operand...</SelectItem>
                {groups.map(g => (
                  <React.Fragment key={g}>
                    <SelectItem value={`__group_${g}__`} disabled className="text-xs font-semibold text-muted-foreground uppercase">{g}</SelectItem>
                    {operands.filter(o => o.group === g).map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span>{o.label}</span>
                        {o.c3ConfigKey && <span className="text-muted-foreground ml-1 text-[10px]">(C3)</span>}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStep(idx)} disabled={steps.length <= 1}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {step.operand && (() => {
            const op = operands.find(o => o.value === step.operand);
            return op?.description ? (
              <p className="text-[10px] text-muted-foreground ml-1">
                {op.description}
                {op.sourceTable && <span className="italic"> → {op.sourceTable}.{op.sourceColumn}</span>}
              </p>
            ) : null;
          })()}
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addStep}>
        <PlusCircle className="h-3.5 w-3.5" /> Add Operand
      </Button>
      {buildFormulaExpression(steps) && (
        <div className="bg-muted/50 rounded px-3 py-1.5 mt-1">
          <p className="text-[11px] text-muted-foreground">Generated Formula:</p>
          <p className="text-xs font-mono text-primary">{buildFormulaExpression(steps)}</p>
        </div>
      )}
    </div>
  );
};

// ── Detection Rule Dialog ──

const DetectionRuleDialog = ({
  open, onOpenChange, rule, violationTypes, onSave, saving, existingCodes, conditionVars,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: DetectionRule | null;
  violationTypes: ViolationType[];
  onSave: (data: any) => void;
  saving: boolean;
  existingCodes: string[];
  conditionVars: ConditionVar[];
}) => {
  const isEdit = !!rule;
  const [form, setForm] = useState({
    rule_code: rule?.rule_code || '',
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_event: rule?.trigger_event || '',
    condition_expression: rule?.condition_expression || '',
    frequency: rule?.frequency || 'daily',
    priority: rule?.priority || 'Medium',
    auto_create_violation: rule?.auto_create_violation ?? true,
    is_enabled: rule?.is_enabled ?? true,
    violation_type_id: rule?.violation_type_id || '',
  });

  React.useEffect(() => {
    if (open) {
      const autoCode = isEdit ? (rule?.rule_code || '') : generateNextCode(existingCodes, 'DR-');
      setForm({
        rule_code: autoCode,
        name: rule?.name || '',
        description: rule?.description || '',
        trigger_event: rule?.trigger_event || '',
        condition_expression: rule?.condition_expression || '',
        frequency: rule?.frequency || 'daily',
        priority: rule?.priority || 'Medium',
        auto_create_violation: rule?.auto_create_violation ?? true,
        is_enabled: rule?.is_enabled ?? true,
        violation_type_id: rule?.violation_type_id || '',
      });
    }
  }, [open, rule]);

  const handleTriggerChange = (val: string) => {
    const ev = TRIGGER_EVENTS.find(e => e.value === val);
    setForm(p => ({
      ...p,
      trigger_event: val === '__pick__' ? '' : val,
      description: ev ? ev.description : p.description,
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.trigger_event) {
      toast.error('Please check the form for valid information!', {
        description: 'Name and Trigger Event are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    onSave({
      ...form,
      violation_type_id: form.violation_type_id || null,
      condition_expression: form.condition_expression || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Detection Rule' : 'Add Detection Rule'}</DialogTitle>
          <DialogDescription>Define when a compliance violation should be automatically detected.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rule Code</Label>
              <Input value={form.rule_code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
              <p className="text-[11px] text-muted-foreground">Auto-generated</p>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Late C3 Submission" />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger Event <span className="text-destructive">*</span></Label>
            <Select value={form.trigger_event || '__pick__'} onValueChange={handleTriggerChange}>
              <SelectTrigger><SelectValue placeholder="Select trigger event..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__">Select trigger event...</SelectItem>
                {TRIGGER_EVENTS.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.trigger_event && (
              <p className="text-[11px] text-muted-foreground">{TRIGGER_EVENTS.find(e => e.value === form.trigger_event)?.description}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe when this rule triggers..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={form.frequency || 'daily'} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { value: 'on_event', label: 'On Event (Real-time)' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ].map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Conditions <span className="text-muted-foreground text-xs font-normal">(when should this trigger?)</span></Label>
            <ConditionBuilder
              value={form.condition_expression}
              onChange={v => setForm(p => ({ ...p, condition_expression: v }))}
              variables={conditionVars}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Violation Type</Label>
            <Select value={form.violation_type_id || '__none__'} onValueChange={v => setForm(p => ({ ...p, violation_type_id: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select violation type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {violationTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} – {vt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.auto_create_violation} onCheckedChange={c => setForm(p => ({ ...p, auto_create_violation: !!c }))} />
              <Label className="font-normal text-sm">Auto-create Violation</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_enabled} onCheckedChange={c => setForm(p => ({ ...p, is_enabled: !!c }))} />
              <Label className="font-normal text-sm">Enabled</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isEdit ? 'Update Rule' : 'Create Rule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Calculation Rule Dialog ──

const CalculationRuleDialog = ({
  open, onOpenChange, rule, onSave, saving, existingCodes, formulaOps,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: CalculationRule | null;
  onSave: (data: any) => void;
  saving: boolean;
  existingCodes: string[];
  formulaOps: FormulaOperand[];
}) => {
  const isEdit = !!rule;
  const [form, setForm] = useState({
    rule_code: rule?.rule_code || '',
    name: rule?.name || '',
    description: rule?.description || '',
    applies_to: rule?.applies_to || 'penalty',
    formula_expression: rule?.formula_expression || '',
    fund_type: rule?.fund_type || '',
    source_config: rule?.source_config || 'c3_config',
    is_enabled: rule?.is_enabled ?? true,
  });

  React.useEffect(() => {
    if (open) {
      const autoCode = isEdit ? (rule?.rule_code || '') : generateNextCode(existingCodes, 'CR-');
      setForm({
        rule_code: autoCode,
        name: rule?.name || '',
        description: rule?.description || '',
        applies_to: rule?.applies_to || 'penalty',
        formula_expression: rule?.formula_expression || '',
        fund_type: rule?.fund_type || '',
        source_config: rule?.source_config || 'c3_config',
        is_enabled: rule?.is_enabled ?? true,
      });
    }
  }, [open, rule]);

  const handleSave = () => {
    if (!form.name || !form.formula_expression || !form.applies_to) {
      toast.error('Please check the form for valid information!', {
        description: 'Name, Applies To, and Formula are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    onSave({
      ...form,
      fund_type: form.fund_type || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Calculation Rule' : 'Add Calculation Rule'}</DialogTitle>
          <DialogDescription>Define how penalties, interest, and fines are computed. Rates are dynamically referenced from C3 Configuration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rule Code</Label>
              <Input value={form.rule_code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
              <p className="text-[11px] text-muted-foreground">Auto-generated</p>
            </div>
            <div className="space-y-1.5">
              <Label>Applies To <span className="text-destructive">*</span></Label>
              <Select value={form.applies_to} onValueChange={v => setForm(p => ({ ...p, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['penalty', 'interest', 'fine', 'surcharge', 'waiver'].map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Late Filing Penalty" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe calculation logic..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Formula <span className="text-destructive">*</span></Label>
            <FormulaBuilder
              value={form.formula_expression}
              onChange={v => setForm(p => ({ ...p, formula_expression: v }))}
              operands={formulaOps}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fund Type</Label>
              <Select value={form.fund_type || '__all__'} onValueChange={v => setForm(p => ({ ...p, fund_type: v === '__all__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Funds" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Funds</SelectItem>
                  {['SS', 'LV', 'EI', 'SV'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source Config</Label>
              <Select value={form.source_config || 'c3_config'} onValueChange={v => setForm(p => ({ ...p, source_config: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="c3_config">C3 Configuration</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="api">External API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox checked={form.is_enabled} onCheckedChange={c => setForm(p => ({ ...p, is_enabled: !!c }))} />
            <Label className="font-normal text-sm">Enabled</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isEdit ? 'Update Rule' : 'Create Rule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Escalation Rule Dialog ──

const CASE_STATUSES = ['Open', 'Under Review', 'Warning Issued', 'Summons Issued', 'Legal Action', 'Arrangement', 'Closed'];

const EscalationRuleDialog = ({
  open, onOpenChange, rule, onSave, saving, existingCodes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: EscalationRule | null;
  onSave: (data: any) => void;
  saving: boolean;
  existingCodes: string[];
}) => {
  const isEdit = !!rule;
  const [form, setForm] = useState({
    rule_code: rule?.rule_code || '',
    name: rule?.name || '',
    description: rule?.description || '',
    from_status: rule?.from_status || 'Open',
    to_status: rule?.to_status || 'Under Review',
    condition_expression: rule?.condition_expression || '',
    days_threshold: rule?.days_threshold ?? '',
    amount_threshold: rule?.amount_threshold ?? '',
    auto_escalate: rule?.auto_escalate ?? false,
    requires_approval: rule?.requires_approval ?? true,
    is_enabled: rule?.is_enabled ?? true,
  });

  React.useEffect(() => {
    if (open) {
      const autoCode = isEdit ? (rule?.rule_code || '') : generateNextCode(existingCodes, 'ER-');
      setForm({
        rule_code: autoCode,
        name: rule?.name || '',
        description: rule?.description || '',
        from_status: rule?.from_status || 'Open',
        to_status: rule?.to_status || 'Under Review',
        condition_expression: rule?.condition_expression || '',
        days_threshold: rule?.days_threshold ?? '',
        amount_threshold: rule?.amount_threshold ?? '',
        auto_escalate: rule?.auto_escalate ?? false,
        requires_approval: rule?.requires_approval ?? true,
        is_enabled: rule?.is_enabled ?? true,
      });
    }
  }, [open, rule]);

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
      ...form,
      days_threshold: form.days_threshold !== '' ? Number(form.days_threshold) : null,
      amount_threshold: form.amount_threshold !== '' ? Number(form.amount_threshold) : null,
      condition_expression: form.condition_expression || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Escalation Rule' : 'Add Escalation Rule'}</DialogTitle>
          <DialogDescription>Define when cases/violations should be escalated based on time, amount, or status conditions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rule Code</Label>
              <Input value={form.rule_code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
              <p className="text-[11px] text-muted-foreground">Auto-generated</p>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Auto-Escalate to Legal" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the escalation condition..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From Status <span className="text-destructive">*</span></Label>
              <Select value={form.from_status} onValueChange={v => setForm(p => ({ ...p, from_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To Status <span className="text-destructive">*</span></Label>
              <Select value={form.to_status} onValueChange={v => setForm(p => ({ ...p, to_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Days Threshold</Label>
              <Input type="number" value={form.days_threshold} onChange={e => setForm(p => ({ ...p, days_threshold: e.target.value }))} placeholder="30" />
              <p className="text-[11px] text-muted-foreground">Days before auto-escalation triggers</p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount Threshold ($)</Label>
              <Input type="number" value={form.amount_threshold} onChange={e => setForm(p => ({ ...p, amount_threshold: e.target.value }))} placeholder="10000" />
              <p className="text-[11px] text-muted-foreground">Amount that triggers escalation</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Additional Conditions <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <ConditionBuilder
              value={form.condition_expression}
              onChange={v => setForm(p => ({ ...p, condition_expression: v }))}
            />
          </div>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.auto_escalate} onCheckedChange={c => setForm(p => ({ ...p, auto_escalate: !!c }))} />
              <Label className="font-normal text-sm">Auto-Execute</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.requires_approval} onCheckedChange={c => setForm(p => ({ ...p, requires_approval: !!c }))} />
              <Label className="font-normal text-sm">Requires Approval</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_enabled} onCheckedChange={c => setForm(p => ({ ...p, is_enabled: !!c }))} />
              <Label className="font-normal text-sm">Enabled</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isEdit ? 'Update Rule' : 'Create Rule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Component ──

const RuleEngine = () => {
  const [activeTab, setActiveTab] = useState('detection');
  const queryClient = useQueryClient();

  // Dialog state
  const [detectionDialogOpen, setDetectionDialogOpen] = useState(false);
  const [editingDetection, setEditingDetection] = useState<DetectionRule | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [editingCalc, setEditingCalc] = useState<CalculationRule | null>(null);
  const [escDialogOpen, setEscDialogOpen] = useState(false);
  const [editingEsc, setEditingEsc] = useState<EscalationRule | null>(null);

  // ── Queries ──

  const { data: detectionRules = [], isLoading: loadingDetection } = useQuery({
    queryKey: ['ce_detection_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_detection_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as DetectionRule[];
    },
  });

  const { data: calculationRules = [], isLoading: loadingCalc } = useQuery({
    queryKey: ['ce_calculation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_calculation_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as CalculationRule[];
    },
  });

  const { data: escalationRules = [], isLoading: loadingEsc } = useQuery({
    queryKey: ['ce_escalation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_escalation_rules').select('*').order('rule_code');
      if (error) throw error;
      return (data || []) as unknown as EscalationRule[];
    },
  });

  const { data: violationTypes = [] } = useQuery({
    queryKey: ['ce_violation_types_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_violation_types').select('id, code, name').order('code');
      if (error) throw error;
      return (data || []) as unknown as ViolationType[];
    },
  });

  // ── Toggle mutations ──

  const toggleDetection = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_detection_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_detection_rules'] }); toast.success('Rule updated'); },
    onError: () => toast.error('Failed to update rule'),
  });

  const toggleCalc = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_calculation_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_calculation_rules'] }); toast.success('Rule updated'); },
    onError: () => toast.error('Failed to update rule'),
  });

  const toggleEsc = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('ce_escalation_rules').update({ is_enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ce_escalation_rules'] }); toast.success('Rule updated'); },
    onError: () => toast.error('Failed to update rule'),
  });

  // ── CRUD mutations: Detection ──

  const saveDetection = useMutation({
    mutationFn: async (formData: any) => {
      if (editingDetection) {
        const { error } = await supabase.from('ce_detection_rules').update(formData as any).eq('id', editingDetection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_detection_rules').insert(formData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_detection_rules'] });
      toast.success(editingDetection ? 'Detection rule updated' : 'Detection rule created');
      setDetectionDialogOpen(false);
      setEditingDetection(null);
    },
    onError: (err: any) => toast.error('Failed to save rule', { description: err.message }),
  });

  // ── CRUD mutations: Calculation ──

  const saveCalc = useMutation({
    mutationFn: async (formData: any) => {
      if (editingCalc) {
        const { error } = await supabase.from('ce_calculation_rules').update(formData as any).eq('id', editingCalc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_calculation_rules').insert(formData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_calculation_rules'] });
      toast.success(editingCalc ? 'Calculation rule updated' : 'Calculation rule created');
      setCalcDialogOpen(false);
      setEditingCalc(null);
    },
    onError: (err: any) => toast.error('Failed to save rule', { description: err.message }),
  });

  // ── CRUD mutations: Escalation ──

  const saveEsc = useMutation({
    mutationFn: async (formData: any) => {
      if (editingEsc) {
        const { error } = await supabase.from('ce_escalation_rules').update(formData as any).eq('id', editingEsc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ce_escalation_rules').insert(formData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_escalation_rules'] });
      toast.success(editingEsc ? 'Escalation rule updated' : 'Escalation rule created');
      setEscDialogOpen(false);
      setEditingEsc(null);
    },
    onError: (err: any) => toast.error('Failed to save rule', { description: err.message }),
  });

  // ── Add button handler ──

  const handleAddRule = () => {
    if (activeTab === 'detection') { setEditingDetection(null); setDetectionDialogOpen(true); }
    else if (activeTab === 'calculation') { setEditingCalc(null); setCalcDialogOpen(true); }
    else { setEditingEsc(null); setEscDialogOpen(true); }
  };

  const isLoading = loadingDetection || loadingCalc || loadingEsc;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Rule Engine</h1>
          </div>
          <p className="text-muted-foreground">Configure detection, calculation, and escalation rules for automated compliance enforcement</p>
        </div>
        <Button className="gap-2" onClick={handleAddRule}><Plus className="h-4 w-4" />Add Rule</Button>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="detection" className="gap-2"><Zap className="h-4 w-4" />Detection ({detectionRules.length})</TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2"><Calculator className="h-4 w-4" />Calculation ({calculationRules.length})</TabsTrigger>
            <TabsTrigger value="escalation" className="gap-2"><TrendingUp className="h-4 w-4" />Escalation ({escalationRules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="detection">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Detection rules automatically create violations when compliance conditions are met.</p>
              {detectionRules.length === 0 && <p className="text-center text-muted-foreground py-8">No detection rules configured. Click "Add Rule" to create one.</p>}
              {detectionRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.frequency}</Badge>
                      <Badge variant={rule.priority === 'Critical' ? 'destructive' : rule.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">{rule.priority}</Badge>
                      {rule.auto_create_violation && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Create</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    {rule.trigger_event && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Trigger:</span> {TRIGGER_EVENTS.find(e => e.value === rule.trigger_event)?.label || rule.trigger_event}
                      </p>
                    )}
                    {rule.condition_expression && <p className="text-xs font-mono text-primary/80">{rule.condition_expression}</p>}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleDetection.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingDetection(rule); setDetectionDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calculation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Calculation rules define how penalties, interest, and fines are computed. Financial rates are referenced from C3 Configuration.</p>
              {calculationRules.length === 0 && <p className="text-center text-muted-foreground py-8">No calculation rules configured. Click "Add Rule" to create one.</p>}
              {calculationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">Applies: {rule.applies_to}</Badge>
                      {rule.fund_type && <Badge variant="secondary" className="text-[10px]">{rule.fund_type}</Badge>}
                      <Badge variant="outline" className="text-[10px]">Source: {rule.source_config}</Badge>
                    </div>
                    <p className="text-xs font-mono text-primary">{rule.formula_expression}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleCalc.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCalc(rule); setCalcDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="escalation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Escalation rules define when violations or cases are automatically escalated based on time, amount, or status conditions.</p>
              {escalationRules.length === 0 && <p className="text-center text-muted-foreground py-8">No escalation rules configured. Click "Add Rule" to create one.</p>}
              {escalationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{rule.rule_code}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      {rule.auto_escalate && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Execute</Badge>}
                      {rule.requires_approval && <Badge variant="outline" className="text-[10px]">Approval Required</Badge>}
                      {rule.days_threshold && <Badge variant="secondary" className="text-[10px]">{rule.days_threshold} days</Badge>}
                      {rule.amount_threshold && <Badge variant="secondary" className="text-[10px]">${rule.amount_threshold.toLocaleString()}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Transition:</span> {rule.from_status} → <span className="text-foreground font-medium">{rule.to_status}</span></p>
                    {rule.condition_expression && <p className="text-xs font-mono text-primary/80">{rule.condition_expression}</p>}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.is_enabled ?? false} onCheckedChange={(checked) => toggleEsc.mutate({ id: rule.id, is_enabled: checked })} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingEsc(rule); setEscDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Dialogs */}
      <DetectionRuleDialog
        open={detectionDialogOpen}
        onOpenChange={v => { setDetectionDialogOpen(v); if (!v) setEditingDetection(null); }}
        rule={editingDetection}
        violationTypes={violationTypes}
        onSave={data => saveDetection.mutate(data)}
        saving={saveDetection.isPending}
        existingCodes={detectionRules.map(r => r.rule_code)}
      />
      <CalculationRuleDialog
        open={calcDialogOpen}
        onOpenChange={v => { setCalcDialogOpen(v); if (!v) setEditingCalc(null); }}
        rule={editingCalc}
        onSave={data => saveCalc.mutate(data)}
        saving={saveCalc.isPending}
        existingCodes={calculationRules.map(r => r.rule_code)}
      />
      <EscalationRuleDialog
        open={escDialogOpen}
        onOpenChange={v => { setEscDialogOpen(v); if (!v) setEditingEsc(null); }}
        rule={editingEsc}
        onSave={data => saveEsc.mutate(data)}
        saving={saveEsc.isPending}
        existingCodes={escalationRules.map(r => r.rule_code)}
      />
    </div>
  );
};

export default RuleEngine;
