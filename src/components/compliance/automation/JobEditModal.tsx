import React, { useState, useEffect } from 'react';
import { StandardModal } from '@/components/common/StandardModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { AutomationJob } from '@/types/automationJob';

type JobData = AutomationJob;

interface JobEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobData | null;
  onSave: (id: string, updates: Partial<JobData> & { parameters: Record<string, any> }) => void;
  isSaving: boolean;
  allJobCodes: string[];
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
  open, onOpenChange, job, onSave, isSaving, allJobCodes,
}) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    schedule_cron: '',
    frequency: '',
    execution_mode: 'manual',
    pipeline_phase: 3,
    depends_on: '',
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
        depends_on: (params.depends_on || []).join(', '),
        canonical_purpose: params.canonical_purpose || '',
        notes: params.notes || '',
        dry_run_default: params.dry_run_default !== false,
        edge_function: params.edge_function || '',
      });
    }
  }, [job]);

  const handleSave = () => {
    if (!job) return;
    if (!form.name.trim()) {
      toast.error('Job name is required');
      return;
    }
    if (form.execution_mode === 'scheduled' && form.schedule_cron && !isValidCron(form.schedule_cron)) {
      toast.error('Invalid cron expression');
      return;
    }

    const dependsArray = form.depends_on
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Validate dependencies exist
    const invalidDeps = dependsArray.filter(d => !allJobCodes.includes(d));
    if (invalidDeps.length > 0) {
      toast.error(`Unknown dependency job codes: ${invalidDeps.join(', ')}`);
      return;
    }

    const updatedParams = {
      ...params,
      execution_mode: form.execution_mode,
      pipeline_phase: form.pipeline_phase,
      pipeline_label: PIPELINE_PHASES.find(p => p.value === form.pipeline_phase)?.label || '',
      depends_on: dependsArray,
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

        {/* Protected fields notice for canonical jobs */}
        {isCanonical && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border text-sm text-muted-foreground">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Job Code, Runtime Handler, and Job Type are protected for canonical system jobs.
              Only name, description, schedule, and operational metadata can be modified.
            </span>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Schedule (Cron)</Label>
            <Input
              value={form.schedule_cron}
              onChange={e => setForm(f => ({ ...f, schedule_cron: e.target.value }))}
              placeholder="0 2 * * *"
            />
            {form.schedule_cron && !isValidCron(form.schedule_cron) && (
              <p className="text-xs text-destructive">Invalid cron expression</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Frequency Label</Label>
            <Input
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              placeholder="e.g. Daily at 2am"
            />
          </div>
        </div>

        {/* Runtime handler - only editable for custom jobs */}
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

        <div className="space-y-1.5">
          <Label>Dependencies (comma-separated job codes)</Label>
          <Input
            value={form.depends_on}
            onChange={e => setForm(f => ({ ...f, depends_on: e.target.value }))}
            placeholder="e.g. JOB-VIOLATION-SCAN, EMP-COMPLIANCE-REFRESH"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Canonical Purpose</Label>
          <Textarea
            value={form.canonical_purpose}
            onChange={e => setForm(f => ({ ...f, canonical_purpose: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Operational Notes</Label>
          <Textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Admin notes about this job..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dry-run-default"
            checked={form.dry_run_default}
            onChange={e => setForm(f => ({ ...f, dry_run_default: e.target.checked }))}
            className="rounded border-input"
          />
          <Label htmlFor="dry-run-default">Supports Dry-Run</Label>
        </div>
      </div>
    </StandardModal>
  );
};

function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}
