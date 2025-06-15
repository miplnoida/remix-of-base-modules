
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface AddressInfoTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const AddressInfoTab = ({ formData, handleInputChange }: AddressInfoTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Section 2 - Address Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Home Address</h4>
            <div>
              <Label htmlFor="homeStreet">Street</Label>
              <Input
                id="homeStreet"
                value={formData.homeStreet}
                onChange={(e) => handleInputChange('homeStreet', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="homeTown">Town/Village/Island</Label>
              <Input
                id="homeTown"
                value={formData.homeTown}
                onChange={(e) => handleInputChange('homeTown', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium">Mailing Address (if different from home address)</h4>
            <div>
              <Label htmlFor="mailingStreet">Street</Label>
              <Input
                id="mailingStreet"
                value={formData.mailingStreet}
                onChange={(e) => handleInputChange('mailingStreet', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailingTown">Town/Village/Island</Label>
              <Input
                id="mailingTown"
                value={formData.mailingTown}
                onChange={(e) => handleInputChange('mailingTown', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mobileNumber">Mobile Number</Label>
            <Input
              id="mobileNumber"
              value={formData.mobileNumber}
              onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emailAddress">E-mail Address</Label>
            <Input
              id="emailAddress"
              type="email"
              value={formData.emailAddress}
              onChange={(e) => handleInputChange('emailAddress', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
