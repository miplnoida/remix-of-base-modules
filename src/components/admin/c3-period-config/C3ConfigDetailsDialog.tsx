import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useUpdateC3ConfigDetails, useLevySlabs, C3ConfigWithDetails, C3ConfigDetails } from '@/hooks/useC3ConfigManagement';
import { useUserCode } from '@/hooks/useUserCode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

interface C3ConfigDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: C3ConfigWithDetails | null;
}

export function C3ConfigDetailsDialog({ isOpen, onClose, config }: C3ConfigDetailsDialogProps) {
  const { userCode } = useUserCode();
  const updateConfig = useUpdateC3ConfigDetails();
  const { data: levySlabs } = useLevySlabs();

  const [formData, setFormData] = useState<Partial<C3ConfigDetails>>({});
   const [originalFormData, setOriginalFormData] = useState<Partial<C3ConfigDetails>>({});
  const [activeTab, setActiveTab] = useState('age');

  // Initialize form data when config changes
  useEffect(() => {
    if (config?.details) {
      setFormData({ ...config.details });
       setOriginalFormData({ ...config.details });
    }
  }, [config]);

  const handleChange = (field: keyof C3ConfigDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRateChange = (field: keyof C3ConfigDetails, displayValue: string) => {
    // Convert percentage display to decimal
    const numValue = parseFloat(displayValue) / 100;
    if (!isNaN(numValue)) {
      handleChange(field, numValue);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    await updateConfig.mutateAsync({
      configPeriodId: config.id,
      details: formData,
       userCode: userCode || undefined,
       oldDetails: originalFormData,
       periodInfo: { start_date: config.start_date, end_date: config.end_date }
    });

    onClose();
  };

  const formatRateForDisplay = (rate: number | undefined) => {
    if (rate === undefined) return '';
    return (rate * 100).toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration Details</DialogTitle>
          <DialogDescription>
            {config && (
              <span>
                Period: {format(new Date(config.start_date), 'dd MMM yyyy')} - {config.end_date ? format(new Date(config.end_date), 'dd MMM yyyy') : 'Open-ended'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="age">Age Limits</TabsTrigger>
            <TabsTrigger value="ss">Social Security</TabsTrigger>
            <TabsTrigger value="levy">Levy</TabsTrigger>
            <TabsTrigger value="severance">Severance</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
          </TabsList>

          {/* Age Limits */}
          <TabsContent value="age" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Age (SS)</Label>
                <Input
                  type="number"
                  value={formData.min_age_ss || ''}
                  onChange={(e) => handleChange('min_age_ss', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Minimum age for SS contribution eligibility</p>
              </div>
              <div className="space-y-2">
                <Label>Maximum Age (SS)</Label>
                <Input
                  type="number"
                  value={formData.max_age_ss || ''}
                  onChange={(e) => handleChange('max_age_ss', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Maximum age for SS contribution eligibility</p>
              </div>
              <div className="space-y-2">
                <Label>Minimum Age (Levy)</Label>
                <Input
                  type="number"
                  value={formData.min_age_levy || ''}
                  onChange={(e) => handleChange('min_age_levy', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Minimum age for levy calculation</p>
              </div>
              <div className="space-y-2">
                <Label>Maximum Age (Levy)</Label>
                <Input
                  type="number"
                  value={formData.max_age_levy || ''}
                  onChange={(e) => handleChange('max_age_levy', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Maximum age for levy calculation</p>
              </div>
            </div>
          </TabsContent>

          {/* Social Security */}
          <TabsContent value="ss" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee SS Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.employee_ss_rate)}
                  onChange={(e) => handleRateChange('employee_ss_rate', e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee SS Max Wage ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.employee_ss_max_wage || ''}
                  onChange={(e) => handleChange('employee_ss_max_wage', parseFloat(e.target.value))}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">Maximum wage for employee SS calculation</p>
              </div>
              <div className="space-y-2">
                <Label>Employer SS Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.employer_ss_rate)}
                  onChange={(e) => handleRateChange('employer_ss_rate', e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Employer EIB Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.employer_eib_rate)}
                  onChange={(e) => handleRateChange('employer_eib_rate', e.target.value)}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Employment Injury Benefit rate</p>
              </div>
              <div className="space-y-2">
                <Label>Employer SS Max Wage ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.employer_ss_max_wage || ''}
                  onChange={(e) => handleChange('employer_ss_max_wage', parseFloat(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </TabsContent>

          {/* Levy */}
          <TabsContent value="levy" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employer Levy Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.employer_levy_rate)}
                  onChange={(e) => handleRateChange('employer_levy_rate', e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Levy Slab</Label>
                <Select
                  value={formData.levy_slab_id || ''}
                  onValueChange={(value) => handleChange('levy_slab_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select levy slab" />
                  </SelectTrigger>
                  <SelectContent>
                    {levySlabs?.map(slab => (
                      <SelectItem key={slab.id} value={slab.id}>
                        {format(new Date(slab.start_date), 'dd MMM yyyy')} - {slab.end_date ? format(new Date(slab.end_date), 'dd MMM yyyy') : 'Current'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Employee levy calculation slab table</p>
              </div>
            </div>

             {/* Monthly Levy Threshold Configuration */}
             <div className="border-t pt-4">
               <h4 className="font-medium mb-3">Monthly Levy Threshold</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Monthly Wage Ceiling ($)</Label>
                   <Input
                     type="number"
                     step="0.01"
                     value={formData.levy_monthly_threshold || 6500}
                     onChange={(e) => handleChange('levy_monthly_threshold', parseFloat(e.target.value))}
                     min={0}
                   />
                   <p className="text-xs text-muted-foreground">
                     If total wages (Week 1-6, excluding bonus) exceed this amount, monthly levy slabs may apply
                   </p>
                 </div>
                 <div className="space-y-2">
                   <Label>Use Monthly Levy When Exceeded</Label>
                   <div className="flex items-center space-x-2 pt-2">
                     <Switch
                       checked={formData.levy_use_monthly_when_exceeded || false}
                       onCheckedChange={(checked) => handleChange('levy_use_monthly_when_exceeded', checked)}
                     />
                     <span className="text-sm text-muted-foreground">
                       {formData.levy_use_monthly_when_exceeded ? 'Enabled' : 'Disabled'}
                     </span>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     When enabled, if wages exceed the ceiling, employee levy uses monthly slab calculation
                   </p>
                 </div>
               </div>
             </div>

             {/* Bonus Levy Configuration */}
             <div className="border-t pt-4">
               <h4 className="font-medium mb-3">Bonus Levy Configuration</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Bonus Levy Rate (%)</Label>
                   <Input
                     type="number"
                     step="0.01"
                     value={formatRateForDisplay(formData.bonus_levy_rate)}
                     onChange={(e) => handleRateChange('bonus_levy_rate', e.target.value)}
                     min={0}
                     max={100}
                   />
                   <p className="text-xs text-muted-foreground">Rate applied to bonus amounts for levy calculation</p>
                 </div>
                 <div className="space-y-2 flex items-end">
                   <p className="text-xs text-muted-foreground pb-2">
                     Note: Per-period bonus exemptions are configured in the "Bonus Exemptions" tab.
                   </p>
                 </div>
               </div>
             </div>
          </TabsContent>

          {/* Severance */}
          <TabsContent value="severance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employer Severance Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.employer_severance_rate)}
                  onChange={(e) => handleRateChange('employer_severance_rate', e.target.value)}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">Percentage of taxable wages</p>
              </div>
              <div className="space-y-2">
                <Label>Submission Due Day</Label>
                <Input
                  type="number"
                  value={formData.submission_due_day || 0}
                  onChange={(e) => handleChange('submission_due_day', parseInt(e.target.value))}
                  min={0}
                  max={31}
                />
                <p className="text-xs text-muted-foreground">0 = last day of following month</p>
              </div>
            </div>
          </TabsContent>

          {/* Penalties */}
          <TabsContent value="penalties" className="space-y-4">
            <h4 className="font-medium">Levy Penalty</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.levy_penalty_initial_rate)}
                  onChange={(e) => handleRateChange('levy_penalty_initial_rate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsequent Rate (% per 30 days)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.levy_penalty_subsequent_rate)}
                  onChange={(e) => handleRateChange('levy_penalty_subsequent_rate', e.target.value)}
                />
              </div>
            </div>

            <h4 className="font-medium mt-4">Severance Penalty</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.severance_penalty_initial_rate)}
                  onChange={(e) => handleRateChange('severance_penalty_initial_rate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsequent Rate (% per 30 days)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.severance_penalty_subsequent_rate)}
                  onChange={(e) => handleRateChange('severance_penalty_subsequent_rate', e.target.value)}
                />
              </div>
            </div>

            <h4 className="font-medium mt-4">Social Security Fine</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Rate (% per month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.ss_fine_initial_rate)}
                  onChange={(e) => handleRateChange('ss_fine_initial_rate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsequent Rate (% per month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.ss_fine_subsequent_rate)}
                  onChange={(e) => handleRateChange('ss_fine_subsequent_rate', e.target.value)}
                />
              </div>
            </div>

            <h4 className="font-medium mt-4">Interest Rates</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>SS Principal (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.interest_rate_ss_principal)}
                  onChange={(e) => handleRateChange('interest_rate_ss_principal', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Levy Principal (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.interest_rate_levy_principal)}
                  onChange={(e) => handleRateChange('interest_rate_levy_principal', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Severance Principal (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.interest_rate_severance_principal)}
                  onChange={(e) => handleRateChange('interest_rate_severance_principal', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Penalties Interest (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.interest_rate_penalties)}
                  onChange={(e) => handleRateChange('interest_rate_penalties', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fines Interest (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formatRateForDisplay(formData.interest_rate_fines)}
                  onChange={(e) => handleRateChange('interest_rate_fines', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
