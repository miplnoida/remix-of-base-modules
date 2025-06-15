
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users } from 'lucide-react';

interface PersonalInfoTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const PersonalInfoTab = ({ formData, handleInputChange }: PersonalInfoTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Section 1 - Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name(s)</Label>
            <Input
              id="middleName"
              value={formData.middleName}
              onChange={(e) => handleInputChange('middleName', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="formerName">Former/Maiden/Alias Name</Label>
            <Input
              id="formerName"
              value={formData.formerName}
              onChange={(e) => handleInputChange('formerName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="height">Height (e.g. 5'4")</Label>
            <Input
              id="height"
              value={formData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Gender *</Label>
          <RadioGroup 
            value={formData.gender} 
            onValueChange={(value) => handleInputChange('gender', value)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="M" id="male" />
              <Label htmlFor="male">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="F" id="female" />
              <Label htmlFor="female">Female</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth (dd/mm/yyyy) *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="countryOfBirth">Country of Birth</Label>
            <Input
              id="countryOfBirth"
              value={formData.countryOfBirth}
              onChange={(e) => handleInputChange('countryOfBirth', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dateOfResidency">Date of Residency</Label>
            <Input
              id="dateOfResidency"
              type="date"
              value={formData.dateOfResidency}
              onChange={(e) => handleInputChange('dateOfResidency', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="citizenOfStKittsNevis"
            checked={formData.citizenOfStKittsNevis}
            onCheckedChange={(checked) => handleInputChange('citizenOfStKittsNevis', checked)}
          />
          <Label htmlFor="citizenOfStKittsNevis">Citizen of St. Kitts & Nevis?</Label>
        </div>

        <div>
          <Label>Marital Status</Label>
          <RadioGroup 
            value={formData.maritalStatus} 
            onValueChange={(value) => handleInputChange('maritalStatus', value)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Single" id="single" />
              <Label htmlFor="single">Single</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Married" id="married" />
              <Label htmlFor="married">Married</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Divorced" id="divorced" />
              <Label htmlFor="divorced">Divorced</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Widowed" id="widowed" />
              <Label htmlFor="widowed">Widowed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Separated" id="separated" />
              <Label htmlFor="separated">Separated</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Common-law" id="commonlaw" />
              <Label htmlFor="commonlaw">Common-law</Label>
            </div>
          </RadioGroup>
        </div>

        {(formData.maritalStatus === 'Married' || formData.maritalStatus === 'Common-law') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spouseName">Spouse's Name</Label>
              <Input
                id="spouseName"
                value={formData.spouseName}
                onChange={(e) => handleInputChange('spouseName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="spouseSocialSecurityNo">Spouse's Social Security No.</Label>
              <Input
                id="spouseSocialSecurityNo"
                value={formData.spouseSocialSecurityNo}
                onChange={(e) => handleInputChange('spouseSocialSecurityNo', e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
