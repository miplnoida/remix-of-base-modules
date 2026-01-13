import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { useOccupations, useCountries } from '@/hooks/useIPMasterLookups';

interface EmploymentDetailsTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

// Static Yes/No options
const YES_NO_OPTIONS = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

export const EmploymentDetailsTab: React.FC<EmploymentDetailsTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: occupations = [], isLoading: loadingOccupations } = useOccupations();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Employment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Occupation and Work Permit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="primary_occup">Occupation</Label>
            <Select
              value={formData.primary_occup}
              onValueChange={(value) => updateField('primary_occup', value)}
              disabled={!isEditable || loadingOccupations}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select occupation" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[200px]">
                {occupations.map((occ) => (
                  <SelectItem key={occ.code} value={occ.code}>
                    {occ.long_description || occ.short_description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="work_permit">Work Permit</Label>
            <Select
              value={formData.work_permit}
              onValueChange={(value) => updateField('work_permit', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {YES_NO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="work_permit_expiration">Work Permit Expiration</Label>
            <Input
              id="work_permit_expiration"
              type="date"
              value={formData.work_permit_expiration}
              onChange={(e) => updateField('work_permit_expiration', e.target.value)}
              disabled={!isEditable || formData.work_permit !== 'Y'}
            />
          </div>
        </div>

        {/* NPF, Citizenship, Signature */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="npf">NPF</Label>
            <Select
              value={formData.npf}
              onValueChange={(value) => updateField('npf', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {YES_NO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="citizenship_flag">Citizenship</Label>
            <Select
              value={formData.citizenship_flag}
              onValueChange={(value) => updateField('citizenship_flag', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {YES_NO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ip_signature">Signature on File</Label>
            <Select
              value={formData.ip_signature}
              onValueChange={(value) => updateField('ip_signature', value)}
              disabled={!isEditable}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {YES_NO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates and Residence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="application_date">Application Date</Label>
            <Input
              id="application_date"
              type="date"
              value={formData.application_date}
              onChange={(e) => updateField('application_date', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="date_of_residency">Date Resident</Label>
            <Input
              id="date_of_residency"
              type="date"
              value={formData.date_of_residency}
              onChange={(e) => updateField('date_of_residency', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="place_of_residence_code">Place of Residence</Label>
            <Select
              value={formData.place_of_residence_code}
              onValueChange={(value) => updateField('place_of_residence_code', value)}
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
        </div>
      </CardContent>
    </Card>
  );
};
