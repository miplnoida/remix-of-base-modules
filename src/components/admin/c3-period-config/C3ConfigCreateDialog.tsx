import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLevySlabs } from '@/hooks/useC3ConfigManagement';
import { useCreateC3ConfigPeriod } from '@/hooks/useC3ConfigLifecycle';
import { useUserCode } from '@/hooks/useUserCode';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface C3ConfigCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_DETAILS = {
  min_age_ss: 16,
  max_age_ss: 62,
  min_age_levy: 16,
  max_age_levy: 62,
  employee_ss_rate: 0.05,
  employee_ss_max_wage: 0,
  employer_ss_rate: 0.05,
  employer_eib_rate: 0.01,
  employer_eib_max_wage: 0,
  employer_ss_max_wage: 0,
  employer_levy_rate: 0,
  employer_severance_rate: 0,
  submission_due_day: 0,
  levy_penalty_initial_rate: 0,
  levy_penalty_subsequent_rate: 0,
  severance_penalty_initial_rate: 0,
  severance_penalty_subsequent_rate: 0,
  ss_fine_initial_rate: 0,
  ss_fine_subsequent_rate: 0,
  nwd_employee_levy_rate: 0,
  levy_monthly_threshold: 6500,
  levy_use_monthly_when_exceeded: false,
};

export function C3ConfigCreateDialog({ isOpen, onClose }: C3ConfigCreateDialogProps) {
  const { userCode } = useUserCode();
  const createPeriod = useCreateC3ConfigPeriod();
  const { data: levySlabs } = useLevySlabs();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({ ...DEFAULT_DETAILS });
  const [activeTab, setActiveTab] = useState('dates');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleRateChange = (field: string, displayValue: string) => {
    const numValue = parseFloat(displayValue) / 100;
    if (!isNaN(numValue)) handleChange(field, numValue);
  };

  const formatRateForDisplay = (rate: number | undefined) => {
    if (rate === undefined) return '';
    return (rate * 100).toFixed(2);
  };

  const handleSave = async () => {
    if (!startDate) {
      setValidationError('Start date is required.');
      return;
    }
    if (endDate && endDate < startDate) {
      setValidationError('End date cannot be before start date.');
      return;
    }

    setValidationError(null);

    try {
      await createPeriod.mutateAsync({
        startDate,
        endDate: endDate || null,
        description: description || undefined,
        detailsJson: details,
        userCode: userCode || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['c3-config-periods'] });
      toast.success('Configuration period created successfully');
      onClose();

      // Reset form
      setStartDate('');
      setEndDate('');
      setDescription('');
      setDetails({ ...DEFAULT_DETAILS });
      setActiveTab('dates');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create configuration period');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Configuration Period</DialogTitle>
          <DialogDescription>
            Define the date range and calculation parameters for a new configuration period.
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span className="text-sm text-destructive">{validationError}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="age">Age Limits</TabsTrigger>
            <TabsTrigger value="ss">Social Security</TabsTrigger>
            <TabsTrigger value="levy">Levy</TabsTrigger>
            <TabsTrigger value="severance">Severance</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
          </TabsList>

          <TabsContent value="dates" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setValidationError(null); }} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setValidationError(null); }} />
                <p className="text-xs text-muted-foreground">Leave empty for open-ended period</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this configuration period..." rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="age" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: 'min_age_ss', label: 'Minimum Age (SS)' },
                { field: 'max_age_ss', label: 'Maximum Age (SS)' },
                { field: 'min_age_levy', label: 'Minimum Age (Levy)' },
                { field: 'max_age_levy', label: 'Maximum Age (Levy)' },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input type="number" value={details[field] || ''} onChange={(e) => handleChange(field, parseInt(e.target.value))} min={0} max={100} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ss" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: 'employee_ss_rate', label: 'Employee SS Rate (%)', isRate: true },
                { field: 'employee_ss_max_wage', label: 'Employee SS Max Wage ($)', isRate: false },
                { field: 'employer_ss_rate', label: 'Employer SS Rate (%)', isRate: true },
                { field: 'employer_eib_rate', label: 'Employer EIB Rate (%)', isRate: true },
                { field: 'employer_ss_max_wage', label: 'Employer SS Max Wage ($)', isRate: false },
                { field: 'employer_eib_max_wage', label: 'EIB Max Wage ($)', isRate: false },
              ].map(({ field, label, isRate }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    step={isRate ? '0.01' : '0.01'}
                    value={isRate ? formatRateForDisplay(details[field]) : (details[field] || '')}
                    onChange={(e) => isRate ? handleRateChange(field, e.target.value) : handleChange(field, parseFloat(e.target.value))}
                    min={0}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="levy" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employer Levy Rate (%)</Label>
                <Input type="number" step="0.01" value={formatRateForDisplay(details.employer_levy_rate)} onChange={(e) => handleRateChange('employer_levy_rate', e.target.value)} min={0} max={100} />
              </div>
              <div className="space-y-2">
                <Label>NWD Employee Levy Rate (%)</Label>
                <Input type="number" step="0.01" value={formatRateForDisplay(details.nwd_employee_levy_rate)} onChange={(e) => handleRateChange('nwd_employee_levy_rate', e.target.value)} min={0} max={100} />
              </div>
              <div className="space-y-2">
                <Label>Levy Slab</Label>
                <Select value={details.levy_slab_id || ''} onValueChange={(value) => handleChange('levy_slab_id', value)}>
                  <SelectTrigger><SelectValue placeholder="Select levy slab" /></SelectTrigger>
                  <SelectContent>
                    {levySlabs?.map(slab => (
                      <SelectItem key={slab.id} value={slab.id}>
                        {format(new Date(slab.start_date), 'dd MMM yyyy')} - {slab.end_date ? format(new Date(slab.end_date), 'dd MMM yyyy') : 'Current'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Monthly Levy Threshold</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Wage Ceiling ($)</Label>
                  <Input type="number" step="0.01" value={details.levy_monthly_threshold || 6500} onChange={(e) => handleChange('levy_monthly_threshold', parseFloat(e.target.value))} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Use Monthly Levy When Exceeded</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch checked={details.levy_use_monthly_when_exceeded || false} onCheckedChange={(checked) => handleChange('levy_use_monthly_when_exceeded', checked)} />
                    <span className="text-sm text-muted-foreground">{details.levy_use_monthly_when_exceeded ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="severance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employer Severance Rate (%)</Label>
                <Input type="number" step="0.01" value={formatRateForDisplay(details.employer_severance_rate)} onChange={(e) => handleRateChange('employer_severance_rate', e.target.value)} min={0} max={100} />
              </div>
              <div className="space-y-2">
                <Label>Submission Due Day</Label>
                <Input type="number" value={details.submission_due_day || 0} onChange={(e) => handleChange('submission_due_day', parseInt(e.target.value))} min={0} max={31} />
                <p className="text-xs text-muted-foreground">0 = last day of following month</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="penalties" className="space-y-4">
            {[
              { title: 'Levy Penalty', fields: ['levy_penalty_initial_rate', 'levy_penalty_subsequent_rate'] },
              { title: 'Severance Penalty', fields: ['severance_penalty_initial_rate', 'severance_penalty_subsequent_rate'] },
              { title: 'Social Security Fine', fields: ['ss_fine_initial_rate', 'ss_fine_subsequent_rate'] },
            ].map(({ title, fields }) => (
              <div key={title}>
                <h4 className="font-medium mb-2">{title}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Rate (%)</Label>
                    <Input type="number" step="0.01" value={formatRateForDisplay(details[fields[0]])} onChange={(e) => handleRateChange(fields[0], e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subsequent Rate (%)</Label>
                    <Input type="number" step="0.01" value={formatRateForDisplay(details[fields[1]])} onChange={(e) => handleRateChange(fields[1], e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createPeriod.isPending}>
            {createPeriod.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Create Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
