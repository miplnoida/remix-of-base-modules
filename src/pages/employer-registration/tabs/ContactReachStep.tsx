import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ERMasterFormData } from '@/types/employerRegistration';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';

interface ContactReachStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

// Lookup data
const VILLAGE_CODES = [
  { code: '000', label: 'Unknown' },
  { code: '001', label: 'Basseterre' },
  { code: '002', label: 'Suncrest' },
  { code: '003', label: 'Charlestown' },
  { code: '004', label: 'Sandy Point' },
];

const ACTIVITY_TYPES = [
  { code: '577', label: '577 - Church parish office (sec)' },
  { code: '101', label: '101 - Agriculture' },
  { code: '201', label: '201 - Manufacturing' },
  { code: '301', label: '301 - Construction' },
  { code: '401', label: '401 - Retail Trade' },
];

const INSPECTOR_CODES = [
  { code: 'UNK', label: 'UNK - Unknown' },
  { code: 'OSC', label: 'OSC - Overseas Company' },
  { code: 'INS1', label: 'INS1 - Inspector 1' },
  { code: 'INS2', label: 'INS2 - Inspector 2' },
];

export default function ContactReachStep({ formData, onChange, isViewMode, errors = {} }: ContactReachStepProps) {
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
            <Select
              value={formData.village_code || ''}
              onValueChange={(value) => onChange('village_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger className={errors.village_code ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select village" />
              </SelectTrigger>
              <SelectContent>
                {VILLAGE_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.village_code && <p className="text-xs text-destructive mt-1">{errors.village_code}</p>}
          </div>
          <div>
            <Label className={errors.activity_type ? 'text-destructive' : ''}>
              Activity Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.activity_type || ''}
              onValueChange={(value) => onChange('activity_type', value)}
              disabled={isViewMode}
            >
              <SelectTrigger className={errors.activity_type ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.activity_type && <p className="text-xs text-destructive mt-1">{errors.activity_type}</p>}
          </div>
          <div>
            <Label className={errors.inspector_code ? 'text-destructive' : ''}>
              Select Inspector Code <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.inspector_code || ''}
              onValueChange={(value) => onChange('inspector_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger className={errors.inspector_code ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select inspector code" />
              </SelectTrigger>
              <SelectContent>
                {INSPECTOR_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
