import React, { useState } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { isValidCron } from '@/lib/cronUtils';
import { ScheduleBuilder } from '@/components/compliance/automation/ScheduleBuilder';
import { DependencyPicker } from '@/components/compliance/automation/DependencyPicker';
import type { AutomationJob } from '@/types/automationJob';

interface AddCustomJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: CustomJobPayload) => void;
  isSaving: boolean;
  existingCodes: string[];
  allJobs: AutomationJob[];
}

export interface CustomJobPayload {
  job_code: string;
  name: string;
  description: string;
  job_type: string;
  schedule_cron: string | null;
  frequency: string | null;
  is_enabled: boolean;
  parameters: Record<string, any>;
}

const EXECUTION_MODES = ['scheduled', 'manual', 'event-driven'];
const JOB_FAMILIES = ['employer_compliance', 'payment_compliance', 'operational', 'reporting', 'data_quality'];
const PIPELINE_PHASES = [
  { value: 1, label: 'Sync' },
  { value: 2, label: 'Refresh' },
  { value: 3, label: 'Detection' },
  { value: 4, label: 'Financial' },
  { value: 5, label: 'Risk & Escalation' },
  { value: 6, label: 'Operational' },
];

const initialForm = {
  job_code: '',
  name: '',
  description: '',
  job_family: 'employer_compliance',
  execution_mode: 'manual',
  pipeline_phase: 3,
  schedule_cron: '',
  frequency: '',
  edge_function: '',
  dry_run_support: true,
  depends_on: [] as string[],
  notes: '',
  start_enabled: false,
};

export const AddCustomJobDialog: React.FC<AddCustomJobDialogProps> = ({
  open, onOpenChange, onSave, isSaving, existingCodes, allJobs,
}) => {
  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.job_code.trim()) errs.job_code = 'Required';
    else if (!/^[A-Z0-9-]+$/.test(form.job_code)) errs.job_code = 'Use UPPER-CASE-DASHES only';
    else if (existingCodes.includes(form.job_code)) errs.job_code = 'Job code already exists';
    if (!form.name.trim()) errs.name = 'Required';
    if (form.execution_mode === 'scheduled' && form.schedule_cron && !isValidCron(form.schedule_cron)) {
      errs.schedule_cron = 'Invalid cron (need 5-6 parts)';
    }
    if (form.start_enabled && !form.edge_function.trim()) {
      errs.edge_function = 'Runtime handler required to start enabled';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { toast.error('Please fix validation errors'); return; }

    const phase = PIPELINE_PHASES.find(p => p.value === form.pipeline_phase);

    onSave({
      job_code: form.job_code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      job_type: form.job_family,
      schedule_cron: form.schedule_cron || null,
      frequency: form.frequency || null,
      is_enabled: form.start_enabled,
      parameters: {
        job_classification: 'custom',
        execution_mode: form.execution_mode,
        pipeline_phase: form.pipeline_phase,
        pipeline_label: phase?.label || '',
        edge_function: form.edge_function || null,
        has_runtime: !!form.edge_function,
        dry_run_default: form.dry_run_support,
        depends_on: form.depends_on,
        notes: form.notes,
        canonical_purpose: form.description,
        activation_wave: 5,
      },
    });

    setForm({ ...initialForm });
  };

  // Build a fake job for the dependency picker
  const fakeJobCode = form.job_code || '__NEW__';

  const Field = ({ label, field, required, children }: { label: string; field: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
      {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

  return (
    <StandardModal
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm({ ...initialForm }); setErrors({}); } }}
      title="Add Custom Automation Job"
      mode="create"
      size="3xl"
      onSave={handleSave}
      isSaving={isSaving}
      saveLabel="Create Job"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border text-sm text-muted-foreground">
          <Badge variant="secondary">Custom Job</Badge>
          <span>Custom jobs are fully editable. Ensure a runtime handler exists before enabling.</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Job Code" field="job_code" required>
            <Input
              value={form.job_code}
              onChange={e => { setForm(f => ({ ...f, job_code: e.target.value.toUpperCase() })); setErrors(e2 => { const { job_code, ...rest } = e2; return rest; }); }}
              placeholder="CUSTOM-MY-JOB"
            />
          </Field>
          <Field label="Job Name" field="name" required>
            <Input
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(e2 => { const { name, ...rest } = e2; return rest; }); }}
              placeholder="My Custom Job"
            />
          </Field>
        </div>

        <Field label="Description" field="description">
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What does this job do?" />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Job Family</Label>
            <Select value={form.job_family} onValueChange={v => setForm(f => ({ ...f, job_family: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_FAMILIES.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Execution Mode</Label>
            <Select value={form.execution_mode} onValueChange={v => setForm(f => ({ ...f, execution_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXECUTION_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pipeline Phase</Label>
            <Select value={String(form.pipeline_phase)} onValueChange={v => setForm(f => ({ ...f, pipeline_phase: parseInt(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_PHASES.map(p => <SelectItem key={p.value} value={String(p.value)}>P{p.value}: {p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule Builder */}
        <ScheduleBuilder
          executionMode={form.execution_mode}
          cronExpression={form.schedule_cron}
          onCronChange={cron => setForm(f => ({ ...f, schedule_cron: cron }))}
          onFrequencyLabelChange={label => setForm(f => ({ ...f, frequency: label }))}
        />

        <Field label="Runtime Handler (Edge Function)" field="edge_function">
          <Input
            value={form.edge_function}
            onChange={e => { setForm(f => ({ ...f, edge_function: e.target.value })); setErrors(e2 => { const { edge_function, ...rest } = e2; return rest; }); }}
            placeholder="my-edge-function-name"
          />
        </Field>

        {/* Dependency Picker */}
        <DependencyPicker
          jobCode={fakeJobCode}
          selectedDeps={form.depends_on}
          onDepsChange={deps => setForm(f => ({ ...f, depends_on: deps }))}
          cronExpression={form.schedule_cron}
          allJobs={allJobs}
        />

        <div className="space-y-1.5">
          <Label>Operational Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="dry-run-support" checked={form.dry_run_support} onChange={e => setForm(f => ({ ...f, dry_run_support: e.target.checked }))} className="rounded border-input" />
            <Label htmlFor="dry-run-support">Supports Dry-Run</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="start-enabled" checked={form.start_enabled} onChange={e => setForm(f => ({ ...f, start_enabled: e.target.checked }))} className="rounded border-input" />
            <Label htmlFor="start-enabled">Start Enabled</Label>
          </div>
        </div>
      </div>
    </StandardModal>
  );
};
