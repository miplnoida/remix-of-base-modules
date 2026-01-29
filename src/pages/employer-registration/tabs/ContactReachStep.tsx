import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ERMasterFormData } from '@/types/employerRegistration';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { useERLookups, LookupItem } from '@/hooks/useERLookups';
import { Loader2 } from 'lucide-react';

interface ContactReachStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

// Reusable lookup select component
const LookupSelect = ({
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  isLoading,
  error,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: LookupItem[];
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: boolean;
}) => (
  <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || isLoading}>
    <SelectTrigger className={`bg-background ${error ? 'border-destructive' : ''}`}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <SelectValue placeholder={placeholder} />
      )}
    </SelectTrigger>
    <SelectContent className="bg-background z-50">
      {items.map((item) => (
        <SelectItem key={item.code} value={item.code}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function ContactReachStep({ formData, onChange, isViewMode, errors = {} }: ContactReachStepProps) {
  const { villageCodes, activityTypes, inspectorCodes, isLoading } = useERLookups();
  const totalEmployees = (formData.males_employed || 0) + (formData.females_employed || 0);

  const parseDate = (dateStr: string | undefined | null): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className={errors.phone ? 'text-destructive' : ''}>
              Contact Telephone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
              disabled={isViewMode}
              placeholder="Enter phone number"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>
          <div>
            <Label>Contact Fax Number</Label>
            <Input
              value={formData.fax || ''}
              onChange={(e) => onChange('fax', e.target.value)}
              disabled={isViewMode}
              placeholder="Enter fax number"
            />
          </div>
          <div>
            <Label>Mobile Number</Label>
            <Input
              value={formData.mobile || ''}
              onChange={(e) => onChange('mobile', e.target.value)}
              disabled={isViewMode}
              placeholder="Enter mobile number"
            />
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Location Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className={errors.village_code ? 'text-destructive' : ''}>
              Select Village <span className="text-destructive">*</span>
            </Label>
            <LookupSelect
              value={formData.village_code || ''}
              onValueChange={(value) => onChange('village_code', value)}
              items={villageCodes}
              placeholder="Select village"
              disabled={isViewMode}
              isLoading={isLoading}
              error={!!errors.village_code}
            />
            {errors.village_code && <p className="text-xs text-destructive mt-1">{errors.village_code}</p>}
          </div>
          <div>
            <Label className={errors.activity_type ? 'text-destructive' : ''}>
              Activity Type <span className="text-destructive">*</span>
            </Label>
            <LookupSelect
              value={formData.activity_type || ''}
              onValueChange={(value) => onChange('activity_type', value)}
              items={activityTypes}
              placeholder="Select activity type"
              disabled={isViewMode}
              isLoading={isLoading}
              error={!!errors.activity_type}
            />
            {errors.activity_type && <p className="text-xs text-destructive mt-1">{errors.activity_type}</p>}
          </div>
          <div>
            <Label className={errors.inspector_code ? 'text-destructive' : ''}>
              Select Inspector Code <span className="text-destructive">*</span>
            </Label>
            <LookupSelect
              value={formData.inspector_code || ''}
              onValueChange={(value) => onChange('inspector_code', value)}
              items={inspectorCodes}
              placeholder="Select inspector code"
              disabled={isViewMode}
              isLoading={isLoading}
              error={!!errors.inspector_code}
            />
            {errors.inspector_code && <p className="text-xs text-destructive mt-1">{errors.inspector_code}</p>}
          </div>
        </div>
      </div>

      {/* Dates & Employees */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Dates & Employees</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className={errors.application_date ? 'text-destructive' : ''}>
              Date of Application <span className="text-destructive">*</span>
            </Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.application_date)}
              onSelect={(date) => onChange('application_date', date?.toISOString().split('T')[0] || '')}
              disabled={isViewMode}
              placeholder="Select application date"
              error={errors.application_date}
            />
          </div>
          <div>
            <Label>Total Employees</Label>
            <Input
              type="number"
              value={totalEmployees}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label>Male</Label>
            <Input
              type="number"
              min={0}
              value={formData.males_employed ?? ''}
              onChange={(e) => onChange('males_employed', e.target.value ? Number(e.target.value) : null)}
              disabled={isViewMode}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Female</Label>
            <Input
              type="number"
              min={0}
              value={formData.females_employed ?? ''}
              onChange={(e) => onChange('females_employed', e.target.value ? Number(e.target.value) : null)}
              disabled={isViewMode}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Date Wages First Paid</Label>
            <DatePickerWithDropdowns
              date={parseDate(formData.date_wages_first_paid)}
              onSelect={(date) => onChange('date_wages_first_paid', date?.toISOString().split('T')[0] || '')}
              disabled={isViewMode}
              placeholder="Select Date Wages First Paid"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
