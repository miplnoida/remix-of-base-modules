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

const parseISODate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const date = parseDateSafe(dateStr);
  return isValid(date) ? date : undefined;
};

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
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: eyeColors, isLoading: eyeColorsLoading } = useEyeColors();

  const age = useMemo(() => {
    if (!formData.dob) return null;
    const dob = new Date(formData.dob);
    if (!isValid(dob)) return null;
    return differenceInYears(new Date(), dob);
  }, [formData.dob]);

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
          <Label htmlFor="name_prefix">Title <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.name_prefix || ''} 
            onValueChange={(v) => handleSelectChange('name_prefix', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.name_prefix ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {titles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.name_prefix && <p className="text-xs text-destructive mt-1">{errors.name_prefix}</p>}
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstname">
            First Name <span className="text-destructive">*</span>
            <span className="text-xs text-muted-foreground ml-2">{formData.firstname?.length || 0}/25</span>
          </Label>
          <Input
            id="firstname"
            value={formData.firstname || ''}
            onChange={(e) => handleFieldChange('firstname', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('firstname')}
            placeholder="Enter First Name"
            maxLength={25}
            disabled={!isEditable}
            className={errors.firstname ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.firstname && <p className="text-xs text-destructive mt-1">{errors.firstname}</p>}
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
          <Label htmlFor="surname">
            Surname <span className="text-destructive">*</span>
            <span className="text-xs text-muted-foreground ml-2">{formData.surname?.length || 0}/25</span>
          </Label>
          <Input
            id="surname"
            value={formData.surname || ''}
            onChange={(e) => handleFieldChange('surname', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('surname')}
            placeholder="Enter Surname"
            maxLength={25}
            disabled={!isEditable}
            className={errors.surname ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.surname && <p className="text-xs text-destructive mt-1">{errors.surname}</p>}
        </div>

        {/* Suffix */}
        <div className="space-y-2">
          <Label htmlFor="name_suffix">Suffix</Label>
          <Select 
            value={formData.name_suffix || ''} 
            onValueChange={(v) => handleSelectChange('name_suffix', v)}
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
          <Label htmlFor="previous_name">
            Maiden Name
            <span className="text-xs text-muted-foreground ml-2">{formData.previous_name?.length || 0}/25</span>
          </Label>
          <Input
            id="previous_name"
            value={formData.previous_name || ''}
            onChange={(e) => handleFieldChange('previous_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('previous_name')}
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
          <Label htmlFor="sex">Gender <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.sex || ''} 
            onValueChange={(v) => handleSelectChange('sex', v)}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.sex ? 'border-destructive focus-visible:ring-destructive' : ''}>
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              {genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.sex && <p className="text-xs text-destructive mt-1">{errors.sex}</p>}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <DatePickerWithDropdowns
                date={parseISODate(formData.dob)}
                onSelect={(date) => handleDateChange('dob', date)}
                placeholder="Select Date of Birth"
                disabled={!isEditable}
                maxDate={new Date()}
                error={errors.dob}
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

      {/* Date Married */}
      {requiresDateMarried && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_married">Date Married <span className="text-destructive">*</span></Label>
            <DatePickerWithDropdowns
              date={parseISODate(formData.date_married)}
              onSelect={(date) => handleDateChange('date_married', date)}
              placeholder="Select Date Married"
              disabled={!isEditable}
              minDate={parseISODate(formData.dob)}
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
              value={formData.heightfeet || ''}
              onChange={(e) => handleFieldChange('heightfeet', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('heightfeet')}
              disabled={!isEditable}
            />
            <Input
              placeholder="Inch"
              type="number"
              min={0}
              max={11}
              value={formData.heightinches || ''}
              onChange={(e) => handleFieldChange('heightinches', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('heightinches')}
              disabled={!isEditable}
            />
          </div>
        </div>

        {/* Birth Place */}
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

        {/* Nationality */}
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
        {/* Eye Color */}
        <div className="space-y-2">
          <Label htmlFor="eyecolor">Eye Color</Label>
          <Select 
            value={formData.eyecolor || ''} 
            onValueChange={(v) => handleSelectChange('eyecolor', v)}
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
