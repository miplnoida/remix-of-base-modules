import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { useCountries, useEyeColors } from '@/hooks/useIPMasterLookups';

interface BasicDetailsTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

// Static options
const TITLES = ['Dr.', 'Miss.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Rev.'];
const SUFFIXES = ['I', 'II', 'III', 'Jr.', 'Sr.'];
const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Not-specified' },
];
const MARITAL_STATUSES = [
  { value: 'S', label: 'Single' },
  { value: 'M', label: 'Married' },
  { value: 'D', label: 'Divorced' },
  { value: 'W', label: 'Widowed' },
  { value: 'P', label: 'Separated' },
  { value: 'C', label: 'Common Law' },
  { value: 'U', label: 'Unknown' },
];

export const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const { data: eyeColors = [], isLoading: loadingEyeColors } = useEyeColors();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Basic Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="name_prefix">Title</Label>
            <Select
              value={formData.name_prefix}
              onValueChange={(value) => updateField('name_prefix', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {TITLES.map((title) => (
                  <SelectItem key={title} value={title}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="surname">Surname *</Label>
            <Input
              id="surname"
              value={formData.surname}
              onChange={(e) => updateField('surname', e.target.value)}
              disabled={!isEditable}
              maxLength={25}
            />
          </div>
          <div>
            <Label htmlFor="firstname">First Name *</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={(e) => updateField('firstname', e.target.value)}
              disabled={!isEditable}
              maxLength={25}
            />
          </div>
          <div>
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) => updateField('middle_name', e.target.value)}
              disabled={!isEditable}
              maxLength={25}
            />
          </div>
        </div>

        {/* Additional Name Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="name_suffix">Suffix</Label>
            <Select
              value={formData.name_suffix}
              onValueChange={(value) => updateField('name_suffix', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select suffix" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {SUFFIXES.map((suffix) => (
                  <SelectItem key={suffix} value={suffix}>{suffix}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="previous_name">Maiden Name</Label>
            <Input
              id="previous_name"
              value={formData.previous_name}
              onChange={(e) => updateField('previous_name', e.target.value)}
              disabled={!isEditable}
              maxLength={25}
            />
          </div>
          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => updateField('alias', e.target.value)}
              disabled={!isEditable}
              maxLength={25}
            />
          </div>
          <div>
            <Label htmlFor="sex">Gender *</Label>
            <Select
              value={formData.sex}
              onValueChange={(value) => updateField('sex', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* DOB and Personal Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dob">Date of Birth *</Label>
            <Input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={(e) => updateField('dob', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="birth_place_code">Birth Place</Label>
            <Select
              value={formData.birth_place_code}
              onValueChange={(value) => updateField('birth_place_code', value)}
              disabled={!isEditable || loadingCountries}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[200px]">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nationality_code">Nationality</Label>
            <Select
              value={formData.nationality_code}
              onValueChange={(value) => updateField('nationality_code', value)}
              disabled={!isEditable || loadingCountries}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[200px]">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.nationality || country.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="marital_status">Marital Status</Label>
            <Select
              value={formData.marital_status}
              onValueChange={(value) => updateField('marital_status', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {MARITAL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Physical Characteristics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="heightfeet">Height (Feet)</Label>
            <Input
              id="heightfeet"
              type="number"
              min={0}
              max={8}
              value={formData.heightfeet ?? ''}
              onChange={(e) => updateField('heightfeet', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="heightinches">Height (Inches)</Label>
            <Input
              id="heightinches"
              type="number"
              min={0}
              max={11}
              value={formData.heightinches ?? ''}
              onChange={(e) => updateField('heightinches', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="eyecolor">Eye Color</Label>
            <Select
              value={formData.eyecolor}
              onValueChange={(value) => updateField('eyecolor', value)}
              disabled={!isEditable || loadingEyeColors}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select eye color" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {eyeColors.map((color) => (
                  <SelectItem key={color.code} value={color.code}>
                    {color.description || color.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ssn">SSN</Label>
            <Input
              id="ssn"
              value={formData.ssn}
              disabled
              className="bg-muted"
              placeholder="Auto-generated"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
