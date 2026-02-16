import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Briefcase, Building } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { useOccupations, useCountries } from '@/hooks/useIPMasterLookups';
import { IP_MASTER_FIELDS } from '@/lib/fieldLengths';

interface EmploymentDetailsTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

export const EmploymentDetailsTab: React.FC<EmploymentDetailsTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: occupations = [], isLoading: loadingOccupations } = useOccupations();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();

  // Conditional logic: if birth_place and place_of_residence are same, hide date_of_residency
  const birthAndResidenceSame = formData.birth_place && formData.place_of_residence
    && formData.birth_place === formData.place_of_residence;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Occupation */}
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
                  <SelectItem value="Y">Yes</SelectItem>
                  <SelectItem value="N">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* Work Permit Toggle + Conditional Expiration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="work_permit">Work Permit</Label>
              <div className="flex items-center gap-3 h-10">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="work_permit"
                  checked={formData.work_permit === 'Y'}
                  onCheckedChange={(checked) => {
                    updateField('work_permit', checked ? 'Y' : 'N');
                    if (!checked) updateField('work_permit_expiration', '');
                  }}
                  disabled={!isEditable}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>
            {formData.work_permit === 'Y' && (
              <div>
                <Label htmlFor="work_permit_expiration">Work Permit Expiration *</Label>
                <Input
                  id="work_permit_expiration"
                  type="date"
                  value={formData.work_permit_expiration}
                  onChange={(e) => updateField('work_permit_expiration', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>

          {/* NPF and Citizenship Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="npf">NPF</Label>
              <div className="flex items-center gap-3 h-10">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="npf"
                  checked={formData.npf === 'Y'}
                  onCheckedChange={(checked) => updateField('npf', checked ? 'Y' : 'N')}
                  disabled={!isEditable}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="citizenship_flag">Citizenship</Label>
              <div className="flex items-center gap-3 h-10">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="citizenship_flag"
                  checked={formData.citizenship_flag === 'Y'}
                  onCheckedChange={(checked) => updateField('citizenship_flag', checked ? 'Y' : 'N')}
                  disabled={!isEditable}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>
          </div>

          {/* Birth Place, Place of Residence & Date of Residency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="birth_place">Birth Place</Label>
              <Select
                value={formData.birth_place}
                onValueChange={(value) => updateField('birth_place', value)}
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
              <Label htmlFor="place_of_residence">Place of Residence</Label>
              <Select
                value={formData.place_of_residence}
                onValueChange={(value) => updateField('place_of_residence', value)}
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
            {!birthAndResidenceSame && (
              <div>
                <Label htmlFor="date_of_residency">
                  Date of Residency {!birthAndResidenceSame ? '*' : ''}
                </Label>
                <Input
                  id="date_of_residency"
                  type="date"
                  value={formData.date_of_residency}
                  onChange={(e) => updateField('date_of_residency', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Employer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Current Employer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employer_name">Employer Name</Label>
              <Input
                id="employer_name"
                value={formData.employer_name}
                onChange={(e) => updateField('employer_name', e.target.value)}
                disabled={!isEditable}
                maxLength={IP_MASTER_FIELDS.employer_name.maxLength}
              />
            </div>
            <div>
              <Label htmlFor="employer_town">Town</Label>
              <Input
                id="employer_town"
                value={formData.employer_town}
                onChange={(e) => updateField('employer_town', e.target.value)}
                disabled={!isEditable}
                maxLength={IP_MASTER_FIELDS.employer_town.maxLength}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employer_address">Address</Label>
              <Input
                id="employer_address"
                value={formData.employer_address}
                onChange={(e) => updateField('employer_address', e.target.value)}
                disabled={!isEditable}
                maxLength={IP_MASTER_FIELDS.employer_address.maxLength}
              />
            </div>
            <div>
              <Label htmlFor="employer_phone">Phone</Label>
              <Input
                id="employer_phone"
                value={formData.employer_phone}
                onChange={(e) => updateField('employer_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={!isEditable}
                maxLength={IP_MASTER_FIELDS.employer_phone.maxLength}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
