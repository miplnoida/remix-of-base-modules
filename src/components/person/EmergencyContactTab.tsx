
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';

interface EmergencyContactTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const EmergencyContactTab = ({ formData, handleInputChange }: EmergencyContactTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Section 3 - Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              value={formData.relationship}
              onChange={(e) => handleInputChange('relationship', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactAddress">Address</Label>
            <Input
              id="contactAddress"
              value={formData.contactAddress}
              onChange={(e) => handleInputChange('contactAddress', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contactPhoneNumber">Phone Number</Label>
            <Input
              id="contactPhoneNumber"
              value={formData.contactPhoneNumber}
              onChange={(e) => handleInputChange('contactPhoneNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactTown">Town/Village/Island</Label>
            <Input
              id="contactTown"
              value={formData.contactTown}
              onChange={(e) => handleInputChange('contactTown', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contactMobileNumber">Mobile Number</Label>
            <Input
              id="contactMobileNumber"
              value={formData.contactMobileNumber}
              onChange={(e) => handleInputChange('contactMobileNumber', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
