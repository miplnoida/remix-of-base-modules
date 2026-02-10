import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ERMasterFormData } from '@/types/employerRegistration';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { parseDateSafe } from '@/lib/dateFormat';

interface TechFinanceStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

export default function TechFinanceStep({ formData, onChange, isViewMode, errors = {} }: TechFinanceStepProps) {
  const hasComputerPayroll = formData.computer_payroll === 'Y';

  const parseDate = (dateStr: string | undefined | null): Date | undefined => {
    if (!dateStr) return undefined;
    const date = parseDateSafe(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return (
    <div className="space-y-6">
      {/* Technical Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Technical Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Label className="flex-1">Computer Payroll</Label>
            <Switch
              checked={hasComputerPayroll}
              onCheckedChange={(checked) => onChange('computer_payroll', checked ? 'Y' : 'N')}
              disabled={isViewMode}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Make Model</Label>
            <Input
              value={formData.make_model || ''}
              onChange={(e) => onChange('make_model', e.target.value)}
              disabled={isViewMode || !hasComputerPayroll}
              placeholder={hasComputerPayroll ? "Enter Make/Model" : "Enable Computer Payroll To Enter Make/Model"}
              className={!hasComputerPayroll ? 'bg-muted' : ''}
            />
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Date of Entry</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_of_entry)}
              onSelect={() => {}}
              disabled={true}
              placeholder="Date of Entry"
            />
          </div>
          <div>
            <Label>Registration Date</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.registration_date)}
              onSelect={() => {}}
              disabled={true}
              placeholder="Registration Date"
            />
          </div>
          <div>
            <Label>Entered By</Label>
            <Input
              value={formData.entered_by || 'System Administrator'}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label>Date Modified</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_modified)}
              onSelect={() => {}}
              disabled={true}
              placeholder="Date Modified"
            />
          </div>
          <div>
            <Label>Modified By</Label>
            <Input
              value={formData.modified_by || ''}
              disabled
              className="bg-muted"
              placeholder="Modified By"
            />
          </div>
          <div>
            <Label>Date Verified</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_verified)}
              onSelect={() => {}}
              disabled={true}
              placeholder="Date Verified"
            />
          </div>
          <div>
            <Label>Verified By</Label>
            <Input
              value={formData.verified_by || ''}
              disabled
              className="bg-muted"
              placeholder="Verified By"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
