
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';
import { sanitizePhoneInput, getPhoneMaxLength, validatePhone } from '@/lib/contactValidation';

interface EmergencyContactTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const EmergencyContactTab = ({ formData, handleInputChange }: EmergencyContactTabProps) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handlePhoneChange = (field: string, value: string) => {
    handleInputChange(field, sanitizePhoneInput(value));
    setFieldErrors(prev => { const n = {...prev}; delete n[field]; return n; });
  };

  const handlePhoneBlur = (field: string, label: string) => {
    const r = validatePhone(formData[field], field, label);
    if (!r.valid) setFieldErrors(prev => ({...prev, [field]: r.error!}));
  };

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
            <Label htmlFor="contactPhoneNumber" className={fieldErrors.contactPhoneNumber ? 'text-destructive' : ''}>Phone Number</Label>
            <Input
              id="contactPhoneNumber"
              value={formData.contactPhoneNumber}
              onChange={(e) => handlePhoneChange('contactPhoneNumber', e.target.value)}
              onBlur={() => handlePhoneBlur('contactPhoneNumber', 'Phone number')}
              maxLength={getPhoneMaxLength('contact_phone')}
              placeholder="Digits only"
              className={fieldErrors.contactPhoneNumber ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {fieldErrors.contactPhoneNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.contactPhoneNumber}</p>}
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
            <Label htmlFor="contactMobileNumber" className={fieldErrors.contactMobileNumber ? 'text-destructive' : ''}>Mobile Number</Label>
            <Input
              id="contactMobileNumber"
              value={formData.contactMobileNumber}
              onChange={(e) => handlePhoneChange('contactMobileNumber', e.target.value)}
              onBlur={() => handlePhoneBlur('contactMobileNumber', 'Mobile number')}
              maxLength={getPhoneMaxLength('contact_mobile')}
              placeholder="Digits only"
              className={fieldErrors.contactMobileNumber ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {fieldErrors.contactMobileNumber && <p className="text-xs text-destructive mt-1">{fieldErrors.contactMobileNumber}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
