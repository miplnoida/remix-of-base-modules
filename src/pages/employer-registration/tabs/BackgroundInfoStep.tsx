import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ERMasterFormData } from '@/types/employerRegistration';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';

interface BackgroundInfoStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

// Input with character counter component
const InputWithCounter = ({ 
  value, 
  onChange, 
  maxLength, 
  disabled, 
  placeholder 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  maxLength: number; 
  disabled?: boolean; 
  placeholder?: string;
}) => (
  <div className="relative">
    <Input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
    />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      {value?.length || 0}/{maxLength}
    </span>
  </div>
);

export default function BackgroundInfoStep({ formData, onChange, isViewMode, errors = {} }: BackgroundInfoStepProps) {
  const isAcquired = formData.acquired_code === 'Y';

  const parseDate = (dateStr: string | undefined | null): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return (
    <div className="space-y-6">
      {/* Previous Owner Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Previous Owner Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Previous Owner Information</Label>
            <InputWithCounter
              value={formData.previous_owner || ''}
              onChange={(e) => onChange('previous_owner', e.target.value)}
              disabled={isViewMode}
              maxLength={40}
              placeholder="Enter Previous Owner Information"
            />
          </div>
          <div>
            <Label>Previous Owner Address</Label>
            <InputWithCounter
              value={formData.prev_owner_addr1 || ''}
              onChange={(e) => onChange('prev_owner_addr1', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter Previous Owner Address"
            />
          </div>
          <div>
            <Label>Previous Owner Address 2</Label>
            <InputWithCounter
              value={formData.prev_owner_addr2 || ''}
              onChange={(e) => onChange('prev_owner_addr2', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter Previous Owner Address 2"
            />
          </div>
        </div>
      </div>

      {/* Acquisition / Incorporation */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Acquisition / Incorporation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Label className="flex-1">Acquired Company</Label>
            <Switch
              checked={isAcquired}
              onCheckedChange={(checked) => onChange('acquired_code', checked ? 'Y' : 'N')}
              disabled={isViewMode}
            />
          </div>
          <div>
            <Label>Acquisition Date</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_of_acquisition)}
              onSelect={(date) => onChange('date_of_acquisition', date?.toISOString().split('T')[0] || '')}
              disabled={isViewMode || !isAcquired}
              placeholder="Select Acquisition Date"
            />
          </div>
          <div>
            <Label>Incorporated Date</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_incorporated)}
              onSelect={(date) => onChange('date_incorporated', date?.toISOString().split('T')[0] || '')}
              disabled={isViewMode}
              placeholder="Select Incorporated Date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
