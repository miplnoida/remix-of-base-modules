import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, AlertTriangle } from 'lucide-react';
import { buildCron, parseCronToConfig, cronToHumanText, getNextRuns, isValidCron, type ScheduleConfig } from '@/lib/cronUtils';
import { formatAuditDateTime } from '@/lib/dateFormat';

const FREQUENCIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Advanced (Custom Cron)' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

interface ScheduleBuilderProps {
  executionMode: string;
  cronExpression: string;
  onCronChange: (cron: string) => void;
  onFrequencyLabelChange: (label: string) => void;
  disabled?: boolean;
}

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  executionMode, cronExpression, onCronChange, onFrequencyLabelChange, disabled,
}) => {
  // Parse existing cron into config
  const parsed = useMemo(() => parseCronToConfig(cronExpression), [cronExpression]);
  const isCustom = cronExpression && !parsed;

  const config: ScheduleConfig = parsed || {
    frequency: 'daily', hour: 2, minute: 0, dayOfWeek: 1, dayOfMonth: 1,
  };

  const frequency = isCustom ? 'custom' : (config.frequency || 'daily');

  const updateConfig = (patch: Partial<ScheduleConfig>) => {
    const next = { ...config, ...patch };
    if (next.frequency === 'custom') return;
    const cron = buildCron(next);
    onCronChange(cron);
    onFrequencyLabelChange(cronToHumanText(cron));
  };

  const humanText = cronToHumanText(cronExpression);
  const nextRuns = useMemo(() => getNextRuns(cronExpression, 3), [cronExpression]);

  if (executionMode !== 'scheduled') {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 inline mr-2" />
        {executionMode === 'manual' ? 'Manual execution — no schedule configured' : 'Event-driven — triggered by system events'}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Schedule Configuration</Label>
        {cronExpression && (
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> {humanText}
          </Badge>
        )}
      </div>

      {/* Frequency */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(v) => {
              if (v === 'custom') {
                // keep current cron, switch to custom mode
              } else {
                updateConfig({ frequency: v as ScheduleConfig['frequency'] });
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {frequency !== 'hourly' && frequency !== 'custom' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hour</Label>
              <Select value={String(config.hour)} onValueChange={v => updateConfig({ hour: parseInt(v) })} disabled={disabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Minute</Label>
              <Select value={String(config.minute)} onValueChange={v => updateConfig({ minute: parseInt(v) })} disabled={disabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MINUTES.map(m => (
                    <SelectItem key={m} value={String(m)}>:{String(m).padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {frequency === 'hourly' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Minute</Label>
            <Select value={String(config.minute)} onValueChange={v => updateConfig({ minute: parseInt(v) })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MINUTES.map(m => (
                  <SelectItem key={m} value={String(m)}>:{String(m).padStart(2, '0')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {frequency === 'weekly' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Day of Week</Label>
            <Select value={String(config.dayOfWeek)} onValueChange={v => updateConfig({ dayOfWeek: parseInt(v) })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {frequency === 'monthly' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Day of Month</Label>
            <Select value={String(config.dayOfMonth)} onValueChange={v => updateConfig({ dayOfMonth: parseInt(v) })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS_OF_MONTH.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Custom cron override */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-3 w-3" /> Advanced cron override
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Input
            value={cronExpression}
            onChange={e => {
              onCronChange(e.target.value);
              onFrequencyLabelChange(cronToHumanText(e.target.value));
            }}
            placeholder="0 2 * * *"
            className="font-mono text-xs"
            disabled={disabled}
          />
          {cronExpression && !isValidCron(cronExpression) && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Invalid cron expression (need 5–6 parts)
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Next runs preview */}
      {nextRuns.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Next runs</Label>
          <div className="flex flex-wrap gap-2">
            {nextRuns.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                {formatAuditDateTime(r.toISOString())}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
