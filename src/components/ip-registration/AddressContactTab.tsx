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

// Helper component for view mode display
const ViewModeField: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div>
    <Label className="text-muted-foreground">{label}</Label>
    <div className="h-10 flex items-center px-3 py-2 bg-muted/30 rounded-md text-sm">
      {value || ''}
    </div>
  </div>
);

export const AddressContactTab: React.FC<AddressContactTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: postalDistricts = [], isLoading: loadingDistricts } = usePostalDistricts();

  // Get district description for view mode
  const districtDescription = postalDistricts.find(d => d.code === formData.district)?.description || '';

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
            {isEditable ? (
              <>
                <div>
                  <Label htmlFor="resident_addr1">Address Line 1</Label>
                  <Input
                    id="resident_addr1"
                    value={formData.resident_addr1}
                    onChange={(e) => updateField('resident_addr1', e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="resident_addr2">Address Line 2</Label>
                  <Input
                    id="resident_addr2"
                    value={formData.resident_addr2}
                    onChange={(e) => updateField('resident_addr2', e.target.value)}
                    maxLength={30}
                  />
                </div>
              </>
            ) : (
              <>
                <ViewModeField label="Address Line 1" value={formData.resident_addr1} />
                <ViewModeField label="Address Line 2" value={formData.resident_addr2} />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isEditable ? (
              <div>
                <Label htmlFor="district">Postal District</Label>
                <Select
                  value={formData.district}
                  onValueChange={(value) => updateField('district', value)}
                  disabled={loadingDistricts}
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
            ) : (
              <ViewModeField label="Postal District" value={districtDescription} />
            )}
          </div>
        </div>

        {/* Mailing Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Mailing Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEditable ? (
              <>
                <div>
                  <Label htmlFor="mail_addr1">Mailing Address Line 1</Label>
                  <Input
                    id="mail_addr1"
                    value={formData.mail_addr1}
                    onChange={(e) => updateField('mail_addr1', e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="mail_addr2">Mailing Address Line 2</Label>
                  <Input
                    id="mail_addr2"
                    value={formData.mail_addr2}
                    onChange={(e) => updateField('mail_addr2', e.target.value)}
                    maxLength={30}
                  />
                </div>
              </>
            ) : (
              <>
                <ViewModeField label="Mailing Address Line 1" value={formData.mail_addr1} />
                <ViewModeField label="Mailing Address Line 2" value={formData.mail_addr2} />
              </>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isEditable ? (
              <>
                <div>
                  <Label htmlFor="email_addr">Email Address</Label>
                  <Input
                    id="email_addr"
                    type="email"
                    value={formData.email_addr}
                    onChange={(e) => updateField('email_addr', e.target.value)}
                    maxLength={40}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telephone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="phone_mobile">Mobile Number</Label>
                  <Input
                    id="phone_mobile"
                    value={formData.phone_mobile}
                    onChange={(e) => updateField('phone_mobile', e.target.value)}
                    maxLength={10}
                  />
                </div>
              </>
            ) : (
              <>
                <ViewModeField label="Email Address" value={formData.email_addr} />
                <ViewModeField label="Telephone Number" value={formData.phone} />
                <ViewModeField label="Mobile Number" value={formData.phone_mobile} />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
