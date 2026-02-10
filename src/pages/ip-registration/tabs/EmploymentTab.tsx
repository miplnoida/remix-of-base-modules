import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IPFormData } from '../IPRegistrationForm';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { isValid } from 'date-fns';
import { useOccupations, useCountries } from '@/hooks/useIPMasterLookups';
import { parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';

interface EmploymentTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError: (field: string) => void;
}

// Convert date string to Date object (timezone-safe)
const parseISODate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const date = parseDateSafe(dateStr);
  return isValid(date) ? date : undefined;
};

// Convert Date object to storage format (yyyy-MM-dd)
const formatToISO = (date: Date | undefined): string | null => {
  if (!date || !isValid(date)) return null;
  return formatDateForStorage(date);
};

export default function EmploymentTab({ 
  formData, 
  onChange, 
  onSave, 
  errors, 
  isEditable,
  clearError 
}: EmploymentTabProps) {
  // Fetch from master tables
  const { data: occupations, isLoading: occupationsLoading } = useOccupations();
  const { data: countries, isLoading: countriesLoading } = useCountries();

  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
    clearError(field);
  }, [onChange, clearError]);

  const handleSelectChange = useCallback((field: string, value: string) => {
    handleFieldChange(field, value);
  }, [handleFieldChange]);

  const handleDateChange = useCallback((field: string, date: Date | undefined) => {
    const isoDate = formatToISO(date);
    handleFieldChange(field, isoDate);
  }, [handleFieldChange]);

  const requiresWorkPermit = formData.citizenship === 'N' && formData.place_of_residence === 'RES';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Employment Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Occupation - from tb_occup */}
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Select 
            value={formData.occupation || ''} 
            onValueChange={(v) => handleSelectChange('occupation', v)}
            disabled={!isEditable || occupationsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={occupationsLoading ? 'Loading...' : 'Select Occupation'} />
            </SelectTrigger>
            <SelectContent>
              {occupations?.map(o => (
                <SelectItem key={o.code} value={o.code}>
                  {o.short_description || o.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Work Permit - Yes/No storing Y/N */}
        <div className="space-y-2">
          <Label htmlFor="work_permit_status">
            Work Permit
            {requiresWorkPermit && <span className="text-destructive"> *</span>}
          </Label>
          <Select 
            value={formData.work_permit_status || ''} 
            onValueChange={(v) => handleSelectChange('work_permit_status', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.work_permit_status ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select Work Permit Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Yes</SelectItem>
              <SelectItem value="N">No</SelectItem>
            </SelectContent>
          </Select>
          {errors.work_permit_status && <p className="text-xs text-destructive mt-1">{errors.work_permit_status}</p>}
        </div>

        {/* NPF - Yes/No storing Y/N */}
        <div className="space-y-2">
          <Label htmlFor="npf_status">NPF</Label>
          <Select 
            value={formData.npf_status || ''} 
            onValueChange={(v) => handleSelectChange('npf_status', v)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select NPF Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Yes</SelectItem>
              <SelectItem value="N">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Application Date */}
        <div className="space-y-2">
          <Label htmlFor="application_date">Application Date</Label>
          <DatePickerWithDropdowns
            date={parseISODate(formData.application_date)}
            onSelect={(date) => handleDateChange('application_date', date)}
            placeholder="Select Application Date"
            disabled={!isEditable}
          />
        </div>

        {/* Date Resident */}
        <div className="space-y-2">
          <Label htmlFor="date_resident">Date Resident</Label>
          <DatePickerWithDropdowns
            date={parseISODate(formData.date_resident)}
            onSelect={(date) => handleDateChange('date_resident', date)}
            placeholder="Select Date Resident"
            disabled={!isEditable}
          />
        </div>

        {/* Place of Residence - from tb_country */}
        <div className="space-y-2">
          <Label htmlFor="place_of_residence">Place of Residence</Label>
          <Select 
            value={formData.place_of_residence || ''} 
            onValueChange={(v) => handleSelectChange('place_of_residence', v)}
            disabled={!isEditable || countriesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={countriesLoading ? 'Loading...' : 'Select Place of Residence'} />
            </SelectTrigger>
            <SelectContent>
              {countries?.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.description || c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Work Permit Expiration - No date validation */}
        <div className="space-y-2">
          <Label htmlFor="work_permit_expiry">
            Work Permit Expiration
            {requiresWorkPermit && <span className="text-destructive"> *</span>}
          </Label>
          <DatePickerWithDropdowns
            date={parseISODate(formData.work_permit_expiry)}
            onSelect={(date) => handleDateChange('work_permit_expiry', date)}
            placeholder="Select Expiry Date"
            disabled={!isEditable}
            error={errors.work_permit_expiry}
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-8">Additional Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Citizenship - Yes/No storing Y/N */}
        <div className="space-y-2">
          <Label htmlFor="citizenship">Citizenship</Label>
          <Select 
            value={formData.citizenship || ''} 
            onValueChange={(v) => handleSelectChange('citizenship', v)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Citizenship Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Yes</SelectItem>
              <SelectItem value="N">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Signature on File - Yes/No storing Y/N */}
        <div className="space-y-2">
          <Label htmlFor="signature_on_file">Signature on File</Label>
          <Select 
            value={formData.signature_on_file || ''} 
            onValueChange={(v) => handleSelectChange('signature_on_file', v)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Signature Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Yes</SelectItem>
              <SelectItem value="N">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Work Permit Warning */}
      {requiresWorkPermit && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <strong>Note:</strong> Non-citizens with Resident status must have a valid work permit with a future expiry date.
        </div>
      )}
    </div>
  );
}
