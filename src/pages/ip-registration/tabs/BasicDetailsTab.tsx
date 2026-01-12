import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IPFormData } from '../IPRegistrationForm';
import { differenceInYears } from 'date-fns';

interface BasicDetailsTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
}

const titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Hon', 'Rev'];
const suffixes = ['Jr', 'Sr', 'I', 'II', 'III', 'IV'];
const genders = ['Male', 'Female'];
const maritalStatuses = ['Single', 'Married', 'Common Law', 'Divorced', 'Widowed', 'Separated'];
const nationalities = ['Jamaican', 'American', 'British', 'Canadian', 'Indian', 'Other'];
const birthPlaces = ['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James', 'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas'];
const eyeColors = ['Brown', 'Black', 'Blue', 'Green', 'Hazel', 'Gray'];

export default function BasicDetailsTab({ formData, onChange, onSave, errors, isEditable }: BasicDetailsTabProps) {
  const age = useMemo(() => {
    if (!formData.date_of_birth) return null;
    return differenceInYears(new Date(), new Date(formData.date_of_birth));
  }, [formData.date_of_birth]);

  const handleBlur = (field: string) => {
    if (isEditable) {
      onSave({ [field]: formData[field as keyof IPFormData] });
    }
  };

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
            onValueChange={(v) => { onChange('title', v); onSave({ title: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.title ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {titles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
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
            onChange={(e) => onChange('first_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('first_name')}
            placeholder="Enter First Name"
            maxLength={25}
            disabled={!isEditable}
            className={errors.first_name ? 'border-destructive' : ''}
          />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
        </div>

        {/* Middle Name */}
        <div className="space-y-2">
          <Label htmlFor="middle_name">
            Middle Name
            <span className="text-xs text-muted-foreground ml-2">{formData.middle_name?.length || 0}/25</span>
          </Label>
          <Input
            id="middle_name"
            value={formData.middle_name || ''}
            onChange={(e) => onChange('middle_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('middle_name')}
            placeholder="Enter Middle Name"
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
            onChange={(e) => onChange('last_name', e.target.value.slice(0, 25))}
            onBlur={() => handleBlur('last_name')}
            placeholder="Enter Surname"
            maxLength={25}
            disabled={!isEditable}
            className={errors.last_name ? 'border-destructive' : ''}
          />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
        </div>

        {/* Suffix */}
        <div className="space-y-2">
          <Label htmlFor="suffix">Suffix</Label>
          <Select 
            value={formData.suffix || ''} 
            onValueChange={(v) => { onChange('suffix', v); onSave({ suffix: v }); }}
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
            onChange={(e) => onChange('maiden_name', e.target.value.slice(0, 25))}
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
            onChange={(e) => onChange('alias', e.target.value.slice(0, 25))}
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
            onValueChange={(v) => { onChange('gender', v); onSave({ gender: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.gender ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth <span className="text-destructive">*</span></Label>
          <div className="flex gap-2 items-center">
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => onChange('date_of_birth', e.target.value)}
              onBlur={() => handleBlur('date_of_birth')}
              disabled={!isEditable}
              className={errors.date_of_birth ? 'border-destructive' : ''}
            />
            {age !== null && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">Age: {age}</span>
            )}
          </div>
          {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
        </div>

        {/* Marital Status */}
        <div className="space-y-2">
          <Label htmlFor="marital_status">Marital Status <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.marital_status || ''} 
            onValueChange={(v) => { onChange('marital_status', v); onSave({ marital_status: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.marital_status ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Marital Status" />
            </SelectTrigger>
            <SelectContent>
              {maritalStatuses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.marital_status && <p className="text-xs text-destructive">{errors.marital_status}</p>}
        </div>
      </div>

      {/* Date Married - only show if married or common law */}
      {requiresDateMarried && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_married">Date Married <span className="text-destructive">*</span></Label>
            <Input
              id="date_married"
              type="date"
              value={formData.date_married || ''}
              onChange={(e) => onChange('date_married', e.target.value)}
              onBlur={() => handleBlur('date_married')}
              disabled={!isEditable}
              className={errors.date_married ? 'border-destructive' : ''}
            />
            {errors.date_married && <p className="text-xs text-destructive">{errors.date_married}</p>}
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
              onChange={(e) => onChange('height_feet', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('height_feet')}
              disabled={!isEditable}
            />
            <Input
              placeholder="Inch"
              type="number"
              min={0}
              max={11}
              value={formData.height_inches || ''}
              onChange={(e) => onChange('height_inches', parseInt(e.target.value) || null)}
              onBlur={() => handleBlur('height_inches')}
              disabled={!isEditable}
            />
          </div>
        </div>

        {/* Birth Place */}
        <div className="space-y-2">
          <Label htmlFor="birth_place">Birth Place <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.birth_place || ''} 
            onValueChange={(v) => { onChange('birth_place', v); onSave({ birth_place: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.birth_place ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Birth Place" />
            </SelectTrigger>
            <SelectContent>
              {birthPlaces.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.birth_place && <p className="text-xs text-destructive">{errors.birth_place}</p>}
        </div>

        {/* Nationality */}
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.nationality || ''} 
            onValueChange={(v) => { onChange('nationality', v); onSave({ nationality: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.nationality ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Nationality" />
            </SelectTrigger>
            <SelectContent>
              {nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.nationality && <p className="text-xs text-destructive">{errors.nationality}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Eye Color */}
        <div className="space-y-2">
          <Label htmlFor="eye_color">Eye Color</Label>
          <Select 
            value={formData.eye_color || ''} 
            onValueChange={(v) => { onChange('eye_color', v); onSave({ eye_color: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Eye Color" />
            </SelectTrigger>
            <SelectContent>
              {eyeColors.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
