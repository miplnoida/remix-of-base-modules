import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { IPFormData } from '../IPRegistrationForm';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { isValid } from 'date-fns';
import { useOccupations, useCountries } from '@/hooks/useIPMasterLookups';
import { parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';
import { IP_MASTER_FIELDS } from '@/lib/fieldLengths';

interface EmploymentTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError: (field: string) => void;
}

const parseISODate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const date = parseDateSafe(dateStr);
  return isValid(date) ? date : undefined;
};

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

  const handleBlur = useCallback((field: string) => {
    if (isEditable) {
      onSave({ [field]: formData[field as keyof IPFormData] });
    }
  }, [isEditable, formData, onSave]);

  const handleToggleChange = useCallback((field: string, checked: boolean) => {
    const value = checked ? 'Y' : 'N';
    handleFieldChange(field, value);
    // If turning off work permit, clear expiry
    if (field === 'work_permit' && !checked) {
      handleFieldChange('work_permit_expiration', null);
    }
  }, [handleFieldChange]);

  const workPermitOn = formData.work_permit === 'Y';
  const birthPlaceSameAsResidence = formData.birth_place && formData.place_of_residence && formData.birth_place === formData.place_of_residence;
  const showDateResident = !birthPlaceSameAsResidence && (formData.birth_place || formData.place_of_residence);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Employment Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Occupation */}
        <div className="space-y-2">
          <Label htmlFor="primary_occup">Occupation</Label>
          <Select 
            value={formData.primary_occup || ''} 
            onValueChange={(v) => handleSelectChange('primary_occup', v)}
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

        {/* Signature on File */}
        <div className="space-y-2">
          <Label htmlFor="ip_signature">Signature on File</Label>
          <Select 
            value={formData.ip_signature || ''} 
            onValueChange={(v) => handleSelectChange('ip_signature', v)}
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

      {/* Toggle Fields Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Work Permit Toggle + Conditional Expiry */}
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="work_permit_toggle" className="cursor-pointer">
              Work Permit
              {errors.work_permit && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{workPermitOn ? 'Yes' : 'No'}</span>
              <Switch
                id="work_permit_toggle"
                checked={workPermitOn}
                onCheckedChange={(checked) => handleToggleChange('work_permit', checked)}
                disabled={!isEditable}
              />
            </div>
          </div>
          {errors.work_permit && <p className="text-xs text-destructive">{errors.work_permit}</p>}
          
          {/* Work Permit Expiration - only visible when Work Permit is Yes */}
          {workPermitOn && (
            <div className="space-y-2 pl-2 border-l-2 border-l-primary/30">
              <Label htmlFor="work_permit_expiration">
                Work Permit Expiration <span className="text-destructive">*</span>
              </Label>
              <DatePickerWithDropdowns
                date={parseISODate(formData.work_permit_expiration)}
                onSelect={(date) => handleDateChange('work_permit_expiration', date)}
                placeholder="Select Expiry Date"
                disabled={!isEditable}
                error={errors.work_permit_expiration}
              />
            </div>
          )}
        </div>

        {/* NPF Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="npf_toggle" className="cursor-pointer">NPF</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{formData.npf === 'Y' ? 'Yes' : 'No'}</span>
              <Switch
                id="npf_toggle"
                checked={formData.npf === 'Y'}
                onCheckedChange={(checked) => handleToggleChange('npf', checked)}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>

        {/* Citizenship Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="citizenship_toggle" className="cursor-pointer">Citizenship</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{formData.citizenship === 'Y' ? 'Yes' : 'No'}</span>
              <Switch
                id="citizenship_toggle"
                checked={formData.citizenship === 'Y'}
                onCheckedChange={(checked) => handleToggleChange('citizenship', checked)}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Birth Place & Place of Residence - Logical Group */}
      <h2 className="text-xl font-semibold mt-8">Residence Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Birth Place */}
        <div className="space-y-2">
          <Label htmlFor="birth_place_emp">Birth Place</Label>
          <Select 
            value={formData.birth_place || ''} 
            onValueChange={(v) => handleSelectChange('birth_place', v)}
            disabled={!isEditable || countriesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={countriesLoading ? 'Loading...' : 'Select Birth Place'} />
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

        {/* Place of Residence */}
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

        {/* Date Resident - only visible when birth_place ≠ place_of_residence */}
        {showDateResident && (
          <div className="space-y-2">
          <Label htmlFor="date_of_residency">
              Date Resident <span className="text-destructive">*</span>
            </Label>
            <DatePickerWithDropdowns
              date={parseISODate(formData.date_of_residency)}
              onSelect={(date) => handleDateChange('date_of_residency', date)}
              placeholder="Select Date Resident"
              disabled={!isEditable}
              error={errors.date_of_residency}
            />
          </div>
        )}
      </div>

      {birthPlaceSameAsResidence && (
        <p className="text-sm text-muted-foreground italic">
          Birth place and place of residence are the same — Date Resident is not required.
        </p>
      )}

      {/* Current Employer Section */}
      <h2 className="text-xl font-semibold mt-8">Current Employer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employer_name">
            Employer Name
            <span className="text-xs text-muted-foreground ml-2">{(formData.employer_name || '').length}/{IP_MASTER_FIELDS.employer_name.maxLength}</span>
          </Label>
          <Input
            id="employer_name"
            value={formData.employer_name || ''}
            onChange={(e) => handleFieldChange('employer_name', e.target.value.slice(0, IP_MASTER_FIELDS.employer_name.maxLength))}
            onBlur={() => handleBlur('employer_name')}
            placeholder="Enter employer name"
            maxLength={IP_MASTER_FIELDS.employer_name.maxLength}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employer_town">
            Employer Town
            <span className="text-xs text-muted-foreground ml-2">{(formData.employer_town || '').length}/{IP_MASTER_FIELDS.employer_town.maxLength}</span>
          </Label>
          <Input
            id="employer_town"
            value={formData.employer_town || ''}
            onChange={(e) => handleFieldChange('employer_town', e.target.value.slice(0, IP_MASTER_FIELDS.employer_town.maxLength))}
            onBlur={() => handleBlur('employer_town')}
            placeholder="Enter employer town"
            maxLength={IP_MASTER_FIELDS.employer_town.maxLength}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employer_address">
            Employer Address
            <span className="text-xs text-muted-foreground ml-2">{(formData.employer_address || '').length}/{IP_MASTER_FIELDS.employer_address.maxLength}</span>
          </Label>
          <Input
            id="employer_address"
            value={formData.employer_address || ''}
            onChange={(e) => handleFieldChange('employer_address', e.target.value.slice(0, IP_MASTER_FIELDS.employer_address.maxLength))}
            onBlur={() => handleBlur('employer_address')}
            placeholder="Enter employer address"
            maxLength={IP_MASTER_FIELDS.employer_address.maxLength}
            disabled={!isEditable}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employer_phone">
            Employer Phone
            <span className="text-xs text-muted-foreground ml-2">{(formData.employer_phone || '').length}/{IP_MASTER_FIELDS.employer_phone.maxLength}</span>
          </Label>
          <Input
            id="employer_phone"
            value={formData.employer_phone || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, IP_MASTER_FIELDS.employer_phone.maxLength);
              handleFieldChange('employer_phone', digits);
            }}
            onBlur={() => handleBlur('employer_phone')}
            placeholder="Enter employer phone"
            maxLength={IP_MASTER_FIELDS.employer_phone.maxLength}
            disabled={!isEditable}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}
