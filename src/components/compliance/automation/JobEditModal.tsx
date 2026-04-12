import React, { useState, useEffect, useMemo } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { isValidCron, detectScheduleConflicts, detectCircularDeps } from '@/lib/cronUtils';
import { ScheduleBuilder } from '@/components/compliance/automation/ScheduleBuilder';
import { DependencyPicker } from '@/components/compliance/automation/DependencyPicker';
import type { AutomationJob } from '@/types/automationJob';

interface JobEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: AutomationJob | null;
  onSave: (id: string, updates: Partial<AutomationJob> & { parameters: Record<string, any> }) => void;
  isSaving: boolean;
  allJobs: AutomationJob[];
}

const EXECUTION_MODES = ['scheduled', 'manual', 'event-driven'];
const PIPELINE_PHASES = [
  { value: 1, label: 'Sync' },
  { value: 2, label: 'Refresh' },
  { value: 3, label: 'Detection' },
  { value: 4, label: 'Financial' },
  { value: 5, label: 'Risk & Escalation' },
  { value: 6, label: 'Operational' },
];

export const JobEditModal: React.FC<JobEditModalProps> = ({
  open, onOpenChange, job, onSave, isSaving, allJobs,
}) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    schedule_cron: '',
    frequency: '',
    execution_mode: 'manual',
    pipeline_phase: 3,
    depends_on: [] as string[],
    canonical_purpose: '',
    notes: '',
    dry_run_default: true,
    edge_function: '',
  });

  const params = job?.parameters || {};
  const isCanonical = params.job_classification === 'canonical';
  const isDeprecated = params.status === 'DEPRECATED';

  useEffect(() => {
    if (job) {
      setForm({
        name: job.name || '',
        description: job.description || '',
        schedule_cron: job.schedule_cron || '',
        frequency: job.frequency || '',
        execution_mode: params.execution_mode || 'manual',
        pipeline_phase: params.pipeline_phase || 3,
        depends_on: (params.depends_on || []) as string[],
        canonical_purpose: params.canonical_purpose || '',
        notes: params.notes || '',
        dry_run_default: params.dry_run_default !== false,
        edge_function: params.edge_function || '',
      });
    }
  }, [job]);

  // Validation warnings
  const saveWarnings = useMemo(() => {
    if (!job) return [];
    const w: string[] = [];
    if (form.execution_mode === 'scheduled' && !form.schedule_cron) {
      w.push('Scheduled job has no schedule configured');
    }
    if (form.execution_mode === 'scheduled' && form.schedule_cron && !isValidCron(form.schedule_cron)) {
      w.push('Invalid cron expression');
    }
    const conflicts = detectScheduleConflicts(job.job_code, form.schedule_cron || null, form.depends_on, allJobs);
    conflicts.forEach(c => w.push(c.message));
    const circular = detectCircularDeps(job.job_code, form.depends_on, allJobs);
    if (circular) w.push('Circular dependency detected — please remove conflicting dependencies');
    return w;
  }, [job, form, allJobs]);

  const handleSave = () => {
    if (!job) return;
    if (!form.name.trim()) { toast.error('Job name is required'); return; }
    if (form.execution_mode === 'scheduled' && form.schedule_cron && !isValidCron(form.schedule_cron)) {
      toast.error('Invalid cron expression'); return;
    }
    const circular = detectCircularDeps(job.job_code, form.depends_on, allJobs);
    if (circular) { toast.error('Cannot save: circular dependency detected'); return; }

    const updatedParams = {
      ...params,
      execution_mode: form.execution_mode,
      pipeline_phase: form.pipeline_phase,
      pipeline_label: PIPELINE_PHASES.find(p => p.value === form.pipeline_phase)?.label || '',
      depends_on: form.depends_on,
      canonical_purpose: form.canonical_purpose,
      notes: form.notes,
      dry_run_default: form.dry_run_default,
      ...(isCanonical ? {} : { edge_function: form.edge_function || null }),
    };

    onSave(job.id, {
      name: form.name,
      description: form.description || null,
      schedule_cron: form.schedule_cron || null,
      frequency: form.frequency || null,
      parameters: updatedParams,
    });
  };

  if (!job) return null;

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit Job: ${job.job_code}`}
      mode="edit"
      size="3xl"
      onSave={handleSave}
      isSaving={isSaving}
      saveLabel="Save Changes"
    >
      <div className="space-y-5">
        {/* Classification Banner */}
        <div className="flex items-center gap-2 flex-wrap">
          {isCanonical && (
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
              <Shield className="h-3 w-3" /> Canonical System Job
            </Badge>
          )}
          {isDeprecated && (
            <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Deprecated
            </Badge>
          )}
          {!isCanonical && !isDeprecated && (
            <Badge variant="secondary" className="gap-1">Custom Job</Badge>
          )}
        </div>

        {isCanonical && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border text-sm text-muted-foreground">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Job Code, Runtime Handler, and Job Type are protected for canonical system jobs.</span>
          </div>
        )}

        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Job Code</Label>
            <Input value={job.job_code} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Job Type</Label>
            <Input value={job.job_type} disabled className="bg-muted" />
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-1.5">
          <Label>Display Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        {/* Runtime handler */}
        <div className="space-y-1.5">
          <Label className={isCanonical ? 'text-muted-foreground' : ''}>
            Runtime Handler (Edge Function)
            {isCanonical && <Lock className="h-3 w-3 inline ml-1" />}
          </Label>
          <Input
            value={isCanonical ? (params.edge_function || '—') : form.edge_function}
            onChange={e => setForm(f => ({ ...f, edge_function: e.target.value }))}
            disabled={isCanonical}
            className={isCanonical ? 'bg-muted' : ''}
            placeholder="edge-function-name"
          />
        </div>

        {/* Dependency Picker */}
        <DependencyPicker
          jobCode={job.job_code}
          selectedDeps={form.depends_on}
          onDepsChange={deps => setForm(f => ({ ...f, depends_on: deps }))}
          cronExpression={form.schedule_cron}
          allJobs={allJobs}
        />

        <div className="space-y-1.5">
          <Label>Canonical Purpose</Label>
          <Textarea value={form.canonical_purpose} onChange={e => setForm(f => ({ ...f, canonical_purpose: e.target.value }))} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label>Operational Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Admin notes..." />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="dry-run-default" checked={form.dry_run_default} onChange={e => setForm(f => ({ ...f, dry_run_default: e.target.checked }))} className="rounded border-input" />
          <Label htmlFor="dry-run-default">Supports Dry-Run</Label>
        </div>

        {/* Pre-save warnings */}
        {saveWarnings.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1">
            <p className="text-xs font-medium text-amber-700">Warnings before saving:</p>
            {saveWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </StandardModal>
  );
};
