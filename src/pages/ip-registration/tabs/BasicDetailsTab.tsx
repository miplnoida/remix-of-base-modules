import React, { useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IPFormData } from '../IPRegistrationForm';
import { differenceInYears, isValid } from 'date-fns';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { useCountries, useEyeColors } from '@/hooks/useIPMasterLookups';
import { parseDateSafe, formatDateForStorage } from '@/lib/dateFormat';

interface BasicDetailsTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError: (field: string) => void;
}

const titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Hon', 'Rev'];
const suffixes = ['Jr', 'Sr', 'I', 'II', 'III', 'IV'];
const genders = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Not-Specified' },
];
const maritalStatuses = ['Single', 'Married', 'Common Law', 'Divorced', 'Widowed', 'Separated'];

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

export default function BasicDetailsTab({ 
  formData, 
  onChange, 
  onSave, 
  errors, 
  isEditable,
  clearError 
}: BasicDetailsTabProps) {
  // Fetch countries and eye colors from master tables
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: eyeColors, isLoading: eyeColorsLoading } = useEyeColors();

  const age = useMemo(() => {
    if (!formData.date_of_birth) return null;
    const dob = new Date(formData.date_of_birth);
    if (!isValid(dob)) return null;
    return differenceInYears(new Date(), dob);
  }, [formData.date_of_birth]);

  const handleBlur = useCallback((field: string) => {
    if (isEditable) {
      onSave({ [field]: formData[field as keyof IPFormData] });
    }
  }, [isEditable, formData, onSave]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
    clearError(field);
  }, [onChange, clearError]);

  const handleSelectChange = useCallback((field: string, value: string) => {
    handleFieldChange(field, value);
    onSave({ [field]: value });
  }, [handleFieldChange, onSave]);

  const handleDateChange = useCallback((field: string, date: Date | undefined) => {
    const isoDate = formatToISO(date);
    handleFieldChange(field, isoDate);
    onSave({ [field]: isoDate });
  }, [handleFieldChange, onSave]);

  const requiresDateMarried = formData.marital_status === 'Married' || formData.marital_status === 'Common Law';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Basic Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.title || ''} 
            onValueChange={(v) => handleSelectChange('title', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.title ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {titles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="first_name">
            First Name <span className="text-destructive">*</span>
            <span className="text-xs text-muted-foreground ml-2">{formData.first_name?.length || 0}/25</span>
          </Label>
          <Input
            id="first_name"
            value={formData.first_name || ''}
            onChange={(e) => handleFieldChange('first_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('first_name')}
            placeholder="Enter First Name"
            maxLength={25}
            disabled={!isEditable}
            className={errors.first_name ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
        </div>

        {/* First Middle Name */}
        <div className="space-y-2">
          <Label htmlFor="middle_name">
            First Middle Name
            <span className="text-xs text-muted-foreground ml-2">{formData.middle_name?.length || 0}/25</span>
          </Label>
          <Input
            id="middle_name"
            value={formData.middle_name || ''}
            onChange={(e) => handleFieldChange('middle_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('middle_name')}
            placeholder="Enter First Middle Name"
            maxLength={25}
            disabled={!isEditable}
          />
        </div>

        {/* Second Middle Name */}
        <div className="space-y-2">
          <Label htmlFor="second_middle_name">
            Second Middle Name
            <span className="text-xs text-muted-foreground ml-2">{formData.second_middle_name?.length || 0}/25</span>
          </Label>
          <Input
            id="second_middle_name"
            value={formData.second_middle_name || ''}
            onChange={(e) => handleFieldChange('second_middle_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('second_middle_name')}
            placeholder="Enter Second Middle Name"
            maxLength={25}
            disabled={!isEditable}
          />
        </div>

        {/* Surname */}
        <div className="space-y-2">
          <Label htmlFor="last_name">
            Surname <span className="text-destructive">*</span>
            <span className="text-xs text-muted-foreground ml-2">{formData.last_name?.length || 0}/25</span>
          </Label>
          <Input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => handleFieldChange('last_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('last_name')}
            placeholder="Enter Surname"
            maxLength={25}
            disabled={!isEditable}
            className={errors.last_name ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
        </div>

        {/* Suffix */}
        <div className="space-y-2">
          <Label htmlFor="suffix">Suffix</Label>
          <Select 
            value={formData.suffix || ''} 
            onValueChange={(v) => handleSelectChange('suffix', v)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Suffix" />
            </SelectTrigger>
            <SelectContent>
              {suffixes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Maiden Name */}
        <div className="space-y-2">
          <Label htmlFor="maiden_name">
            Maiden Name
            <span className="text-xs text-muted-foreground ml-2">{formData.maiden_name?.length || 0}/25</span>
          </Label>
          <Input
            id="maiden_name"
            value={formData.maiden_name || ''}
            onChange={(e) => handleFieldChange('maiden_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('maiden_name')}
            placeholder="Enter Maiden Name"
            maxLength={25}
            disabled={!isEditable}
          />
        </div>

        {/* Alias */}
        <div className="space-y-2">
          <Label htmlFor="alias">
            Alias
            <span className="text-xs text-muted-foreground ml-2">{formData.alias?.length || 0}/25</span>
          </Label>
          <Input
            id="alias"
            value={formData.alias || ''}
            onChange={(e) => handleFieldChange('alias', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('alias')}
            placeholder="Enter Alias"
            maxLength={25}
            disabled={!isEditable}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.gender || ''} 
            onValueChange={(v) => handleSelectChange('gender', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.gender ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              {genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <DatePickerWithDropdowns
                date={parseISODate(formData.date_of_birth)}
                onSelect={(date) => handleDateChange('date_of_birth', date)}
                placeholder="Select Date of Birth"
                disabled={!isEditable}
                maxDate={new Date()}
                error={errors.date_of_birth}
              />
            </div>
            {age !== null && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">Age: {age}</span>
            )}
          </div>
        </div>

        {/* Marital Status */}
        <div className="space-y-2">
          <Label htmlFor="marital_status">Marital Status <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.marital_status || ''} 
            onValueChange={(v) => handleSelectChange('marital_status', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.marital_status ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select Marital Status" />
            </SelectTrigger>
            <SelectContent>
              {maritalStatuses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.marital_status && <p className="text-xs text-destructive mt-1">{errors.marital_status}</p>}
        </div>
      </div>

      {/* Date Married - only show if married or common law */}
      {requiresDateMarried && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_married">Date Married <span className="text-destructive">*</span></Label>
            <DatePickerWithDropdowns
              date={parseISODate(formData.date_married)}
              onSelect={(date) => handleDateChange('date_married', date)}
              placeholder="Select Date Married"
              disabled={!isEditable}
              minDate={parseISODate(formData.date_of_birth)}
              maxDate={new Date()}
              error={errors.date_married}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Height */}
        <div className="space-y-2">
          <Label>Height</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Feet"
              type="number"
              min={0}
              max={8}
              value={formData.height_feet || ''}
              onChange={(e) => handleFieldChange('height_feet', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('height_feet')}
              disabled={!isEditable}
            />
            <Input
              placeholder="Inch"
              type="number"
              min={0}
              max={11}
              value={formData.height_inches || ''}
              onChange={(e) => handleFieldChange('height_inches', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('height_inches')}
              disabled={!isEditable}
            />
          </div>
        </div>

        {/* Birth Place - from tb_country */}
        <div className="space-y-2">
          <Label htmlFor="birth_place">Birth Place <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.birth_place || ''} 
            onValueChange={(v) => handleSelectChange('birth_place', v)}
            disabled={!isEditable || countriesLoading}
          >
            <SelectTrigger className={errors.birth_place ? 'border-destructive focus-visible:ring-destructive' : ''}>
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
          {errors.birth_place && <p className="text-xs text-destructive mt-1">{errors.birth_place}</p>}
        </div>

        {/* Nationality - from tb_country */}
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.nationality || ''} 
            onValueChange={(v) => handleSelectChange('nationality', v)}
            disabled={!isEditable || countriesLoading}
          >
            <SelectTrigger className={errors.nationality ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder={countriesLoading ? 'Loading...' : 'Select Nationality'} />
            </SelectTrigger>
            <SelectContent>
              {countries?.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.nationality || c.description || c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.nationality && <p className="text-xs text-destructive mt-1">{errors.nationality}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Eye Color - from tb_eye_color */}
        <div className="space-y-2">
          <Label htmlFor="eye_color">Eye Color</Label>
          <Select 
            value={formData.eye_color || ''} 
            onValueChange={(v) => handleSelectChange('eye_color', v)}
            disabled={!isEditable || eyeColorsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={eyeColorsLoading ? 'Loading...' : 'Select Eye Color'} />
            </SelectTrigger>
            <SelectContent>
              {eyeColors?.map(e => (
                <SelectItem key={e.code} value={e.code}>
                  {e.description || e.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
