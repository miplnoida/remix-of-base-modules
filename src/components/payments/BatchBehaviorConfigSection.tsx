import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { Settings } from 'lucide-react';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { format, parse } from 'date-fns';

interface BatchConfigValue {
  enabled: boolean;
  schedule_mode?: 'always' | 'date_range' | 'working_days_after_month';
  date_from?: string;
  date_to?: string;
  working_days_count?: number;
  until_month_year?: string | null;
}

const defaultConfig: BatchConfigValue = { enabled: false, schedule_mode: 'always' };

const BatchBehaviorConfigSection: React.FC = () => {
  const { data: configs } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();

  const getConfig = (key: string): BatchConfigValue => {
    const cfg = configs?.find(c => c.config_key === key);
    if (!cfg?.config_value) return defaultConfig;
    const val = cfg.config_value;
    return {
      enabled: val.enabled === true,
      schedule_mode: val.schedule_mode || 'always',
      date_from: val.date_from || undefined,
      date_to: val.date_to || undefined,
      working_days_count: val.working_days_count || 5,
      until_month_year: val.until_month_year || null,
    };
  };

  const handleToggle = (key: string) => {
    const current = getConfig(key);
    const newVal: BatchConfigValue = { ...current, enabled: !current.enabled };
    if (!current.enabled) {
      newVal.schedule_mode = 'always';
    }
    updateConfig.mutate({ key, value: newVal });
  };

  const handleScheduleChange = (key: string, updates: Partial<BatchConfigValue>) => {
    const current = getConfig(key);
    updateConfig.mutate({ key, value: { ...current, ...updates } });
  };

  const renderScheduleOptions = (configKey: string) => {
    const cfg = getConfig(configKey);
    if (!cfg.enabled) return null;

    return (
      <div className="mt-4 space-y-4 pl-4 border-l-2 border-primary/20">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Schedule Mode</Label>
          <RadioGroup
            value={cfg.schedule_mode || 'always'}
            onValueChange={(val) => handleScheduleChange(configKey, { schedule_mode: val as any })}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="always" id={`${configKey}-always`} />
              <Label htmlFor={`${configKey}-always`} className="cursor-pointer">
                <span className="text-sm font-medium">Always</span>
                <p className="text-xs text-muted-foreground">Enabled permanently with no time limit.</p>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="date_range" id={`${configKey}-date-range`} />
              <Label htmlFor={`${configKey}-date-range`} className="cursor-pointer">
                <span className="text-sm font-medium">Date Range</span>
                <p className="text-xs text-muted-foreground">Active only within a specific date range.</p>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="working_days_after_month" id={`${configKey}-working-days`} />
              <Label htmlFor={`${configKey}-working-days`} className="cursor-pointer">
                <span className="text-sm font-medium">Working Days After Month End</span>
                <p className="text-xs text-muted-foreground">
                  Active for a specified number of working days after the last day of each month (excludes non-working days and public holidays).
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {cfg.schedule_mode === 'date_range' && (
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <DatePicker
                date={cfg.date_from ? parse(cfg.date_from, 'yyyy-MM-dd', new Date()) : undefined}
                onDateChange={(d) => handleScheduleChange(configKey, { date_from: d ? format(d, 'yyyy-MM-dd') : undefined })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <DatePicker
                date={cfg.date_to ? parse(cfg.date_to, 'yyyy-MM-dd', new Date()) : undefined}
                onDateChange={(d) => handleScheduleChange(configKey, { date_to: d ? format(d, 'yyyy-MM-dd') : undefined })}
              />
            </div>
          </div>
        )}

        {cfg.schedule_mode === 'working_days_after_month' && (
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 w-40">
              <Label className="text-xs">Working Days Count</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={cfg.working_days_count || 5}
                onChange={e => handleScheduleChange(configKey, { working_days_count: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-1.5 w-40">
              <Label className="text-xs">Until Month-Year (optional)</Label>
              <Input
                type="month"
                value={cfg.until_month_year || ''}
                onChange={e => handleScheduleChange(configKey, { until_month_year: e.target.value || null })}
                placeholder="Open-ended"
              />
              <p className="text-xs text-muted-foreground">Leave blank for open-ended.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Batch Behavior Configuration
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Control batch creation and payment entry restrictions based on date rules.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config 1: allow_new_batch_with_previous_open */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Allow new batch when previous-date batch is still open</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, cashiers cannot create a new batch if they have an unclosed batch from a previous date.
              </p>
            </div>
            <Switch
              checked={getConfig('allow_new_batch_with_previous_open').enabled}
              onCheckedChange={() => handleToggle('allow_new_batch_with_previous_open')}
              disabled={updateConfig.isPending}
            />
          </div>
          {renderScheduleOptions('allow_new_batch_with_previous_open')}
        </div>

        {/* Config 2: allow_current_date_payment_in_old_batch */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Allow current-date payments in previous-date batches</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, batch selection on payment screens will only show batches matching today's date (except Cash Details and Batch Closing).
              </p>
            </div>
            <Switch
              checked={getConfig('allow_current_date_payment_in_old_batch').enabled}
              onCheckedChange={() => handleToggle('allow_current_date_payment_in_old_batch')}
              disabled={updateConfig.isPending}
            />
          </div>
          {renderScheduleOptions('allow_current_date_payment_in_old_batch')}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchBehaviorConfigSection;
