import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateBonusLevyExemption,
  useUpdateBonusLevyExemption,
  BonusLevyExemption,
  getMonthName
} from '@/hooks/useBonusLevyExemptions';

interface BonusLevyExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exemption: BonusLevyExemption | null;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getMonthName(i + 1)
}));

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

export const BonusLevyExemptionDialog: React.FC<BonusLevyExemptionDialogProps> = ({
  open,
  onOpenChange,
  exemption
}) => {
  const createMutation = useCreateBonusLevyExemption();
  const updateMutation = useUpdateBonusLevyExemption();

  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(1);
  const [isExempt, setIsExempt] = useState(true);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (exemption) {
      setPeriodYear(exemption.period_year);
      setPeriodMonth(exemption.period_month);
      setIsExempt(exemption.is_exempt);
      setDescription(exemption.description || '');
      setIsActive(exemption.is_active ?? true);
    } else {
      setPeriodYear(currentYear);
      setPeriodMonth(1);
      setIsExempt(true);
      setDescription('');
      setIsActive(true);
    }
  }, [exemption, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (exemption) {
      await updateMutation.mutateAsync({
        id: exemption.id,
        isExempt,
        description,
        isActive
      });
    } else {
      await createMutation.mutateAsync({
        periodYear,
        periodMonth,
        isExempt,
        description
      });
    }

    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {exemption ? 'Edit Exemption Period' : 'Add Exemption Period'}
          </DialogTitle>
          <DialogDescription>
            {exemption
              ? 'Update the bonus levy exemption settings for this period'
              : 'Select a month-year period to configure bonus levy exemption'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!exemption && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodMonth">Month</Label>
                <Select
                  value={String(periodMonth)}
                  onValueChange={(v) => setPeriodMonth(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodYear">Year</Label>
                <Select
                  value={String(periodYear)}
                  onValueChange={(v) => setPeriodYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isExempt" className="text-base">Bonus Exempt from Levy</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, bonus payments will not be subject to levy for this period
              </p>
            </div>
            <Switch
              id="isExempt"
              checked={isExempt}
              onCheckedChange={setIsExempt}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this exemption..."
              rows={3}
            />
          </div>

          {exemption && (
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : exemption ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
