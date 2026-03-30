import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateLevySlabDetail,
  useUpdateLevySlabDetail,
  LevySlabDetail
} from '@/hooks/useLevySlabsManagement';
import { useUserCode } from '@/hooks/useUserCode';

interface LevySlabDetailFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slabId: string;
  detail: LevySlabDetail | null;
}

// Pay periods fetched from database

export const LevySlabDetailForm: React.FC<LevySlabDetailFormProps> = ({
  open,
  onOpenChange,
  slabId,
  detail
}) => {
  const createMutation = useCreateLevySlabDetail();
  const updateMutation = useUpdateLevySlabDetail();
  const { userCode } = useUserCode();

  const { data: payPeriods = [] } = useQuery({
    queryKey: ['tb_pay_periods'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('tb_pay_periods').select('code, description').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });

  const [payPeriod, setPayPeriod] = useState('W');
  const [overAmt, setOverAmt] = useState('0');
  const [baseAmt, setBaseAmt] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [orderNo, setOrderNo] = useState('1');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (detail) {
      setPayPeriod(detail.pay_period || 'W');
      setOverAmt(String(detail.over_amt || 0));
      setBaseAmt(String(detail.base_amt || 0));
      setTaxRate(String((detail.tax_rate || 0) * 100)); // Convert to percentage
      setOrderNo(String(detail.order_no || 1));
      setIsActive(detail.is_active ?? true);
    } else {
      setPayPeriod('W');
      setOverAmt('0');
      setBaseAmt('0');
      setTaxRate('0');
      setOrderNo('1');
      setIsActive(true);
    }
  }, [detail, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taxRateDecimal = parseFloat(taxRate) / 100; // Convert percentage to decimal

    if (detail) {
      await updateMutation.mutateAsync({
        id: detail.id,
        slabId,
        payPeriod,
        overAmt: parseFloat(overAmt),
        baseAmt: parseFloat(baseAmt),
        taxRate: taxRateDecimal,
        orderNo: parseInt(orderNo),
        isActive,
        userCode: userCode || undefined,
        oldValues: {
          pay_period: detail.pay_period,
          over_amt: detail.over_amt,
          base_amt: detail.base_amt,
          tax_rate: detail.tax_rate,
          order_no: detail.order_no,
          is_active: detail.is_active
        }
      });
    } else {
      await createMutation.mutateAsync({
        slabId,
        payPeriod,
        overAmt: parseFloat(overAmt),
        baseAmt: parseFloat(baseAmt),
        taxRate: taxRateDecimal,
        orderNo: parseInt(orderNo),
        userCode: userCode || undefined
      });
    }

    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{detail ? 'Edit Slab Detail' : 'Add Slab Detail'}</DialogTitle>
          <DialogDescription>
            {detail
              ? 'Update the tax bracket values'
              : 'Add a new tax bracket for this levy slab'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payPeriod">Pay Period</Label>
              <Select value={payPeriod} onValueChange={setPayPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pay period" />
                </SelectTrigger>
                <SelectContent>
                  {payPeriods.map((period) => (
                    <SelectItem key={period.code} value={period.code}>
                      {period.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderNo">Order Number</Label>
              <Input
                id="orderNo"
                type="number"
                min="1"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overAmt">Over Amount ($)</Label>
              <Input
                id="overAmt"
                type="number"
                step="0.01"
                min="0"
                value={overAmt}
                onChange={(e) => setOverAmt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseAmt">Base Amount ($)</Label>
              <Input
                id="baseAmt"
                type="number"
                step="0.01"
                min="0"
                value={baseAmt}
                onChange={(e) => setBaseAmt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                required
              />
            </div>
          </div>

          {detail && (
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
              {isLoading ? 'Saving...' : detail ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
