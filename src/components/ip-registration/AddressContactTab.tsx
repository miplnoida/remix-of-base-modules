import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { usePostalDistricts } from '@/hooks/useIPMasterLookups';

interface AddressContactTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

export const AddressContactTab: React.FC<AddressContactTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: postalDistricts = [], isLoading: loadingDistricts } = usePostalDistricts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address & Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resident Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Resident Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resident_addr1">Address Line 1</Label>
              <Input
                id="resident_addr1"
                value={formData.resident_addr1}
                onChange={(e) => updateField('resident_addr1', e.target.value)}
                disabled={!isEditable}
                maxLength={30}
              />
            </div>
            <div>
              <Label htmlFor="resident_addr2">Address Line 2</Label>
              <Input
                id="resident_addr2"
                value={formData.resident_addr2}
                onChange={(e) => updateField('resident_addr2', e.target.value)}
                disabled={!isEditable}
                maxLength={30}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="district">Postal District</Label>
              <Select
                value={formData.district}
                onValueChange={(value) => updateField('district', value)}
                disabled={!isEditable || loadingDistricts}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px]">
                  {postalDistricts.map((district) => (
                    <SelectItem key={district.code} value={district.code}>
                      {district.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mailing Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Mailing Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mail_addr1">Mailing Address Line 1</Label>
              <Input
                id="mail_addr1"
                value={formData.mail_addr1}
                onChange={(e) => updateField('mail_addr1', e.target.value)}
                disabled={!isEditable}
                maxLength={30}
              />
            </div>
            <div>
              <Label htmlFor="mail_addr2">Mailing Address Line 2</Label>
              <Input
                id="mail_addr2"
                value={formData.mail_addr2}
                onChange={(e) => updateField('mail_addr2', e.target.value)}
                disabled={!isEditable}
                maxLength={30}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="email_addr">Email Address</Label>
              <Input
                id="email_addr"
                type="email"
                value={formData.email_addr}
                onChange={(e) => updateField('email_addr', e.target.value)}
                disabled={!isEditable}
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telephone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={!isEditable}
                maxLength={10}
                placeholder="XXXXXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="phone_mobile">Mobile Number</Label>
              <Input
                id="phone_mobile"
                value={formData.phone_mobile}
                onChange={(e) => updateField('phone_mobile', e.target.value)}
                disabled={!isEditable}
                maxLength={10}
                placeholder="XXXXXXXXXX"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
