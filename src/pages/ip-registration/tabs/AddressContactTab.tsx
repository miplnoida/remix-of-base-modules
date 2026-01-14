import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IPFormData } from '../IPRegistrationForm';
import { Plus, Edit, Trash2, MapPin, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PhoneInput, { parsePhoneNumber, combinePhoneNumber } from '@/components/shared/PhoneInput';

interface AddressContactTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError: (field: string) => void;
}

type AddressType = 'resident' | 'mailing' | 'email';

interface AddressData {
  type: AddressType;
  label: string;
  icon: React.ReactNode;
  fields: {
    line1?: string;
    line2?: string;
    postal?: string;
    value?: string;
  };
}

export default function AddressContactTab({ 
  formData, 
  onChange, 
  onSave, 
  errors, 
  isEditable,
  clearError 
}: AddressContactTabProps) {
  const [editingAddress, setEditingAddress] = useState<AddressType | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tempAddress, setTempAddress] = useState<any>({});
  
  // Parse phone numbers from storage
  const telephoneParsed = parsePhoneNumber(formData.telephone || '');
  const mobileParsed = parsePhoneNumber(formData.mobile || '');
  
  const [telephoneCountry, setTelephoneCountry] = useState(telephoneParsed.countryCode);
  const [telephoneNumber, setTelephoneNumber] = useState(telephoneParsed.phoneNumber);
  const [mobileCountry, setMobileCountry] = useState(mobileParsed.countryCode);
  const [mobileNumber, setMobileNumber] = useState(mobileParsed.phoneNumber);

  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
    clearError(field);
  }, [onChange, clearError]);

  const addresses: AddressData[] = [
    {
      type: 'resident',
      label: 'Resident Address',
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
      fields: {
        line1: formData.resident_address_1,
        line2: formData.resident_address_2,
        postal: formData.postal_district,
      },
    },
    {
      type: 'mailing',
      label: 'Mailing Address',
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
      fields: {
        value: formData.mailing_address,
      },
    },
    {
      type: 'email',
      label: 'Email Address',
      icon: <Mail className="h-4 w-4 text-muted-foreground" />,
      fields: {
        value: formData.email,
      },
    },
  ];

  const handleSaveAddress = () => {
    if (editingAddress === 'resident') {
      const updates = {
        resident_address_1: tempAddress.line1,
        resident_address_2: tempAddress.line2,
        postal_district: tempAddress.postal,
      };
      Object.entries(updates).forEach(([key, value]) => handleFieldChange(key, value));
      onSave(updates);
    } else if (editingAddress === 'mailing') {
      handleFieldChange('mailing_address', tempAddress.value);
      onSave({ mailing_address: tempAddress.value });
    } else if (editingAddress === 'email') {
      handleFieldChange('email', tempAddress.value);
      onSave({ email: tempAddress.value });
    }
    setEditingAddress(null);
    setTempAddress({});
  };

  const handleEdit = (address: AddressData) => {
    setEditingAddress(address.type);
    setTempAddress(address.fields);
  };

  const handleTelephoneBlur = () => {
    if (isEditable) {
      const combined = combinePhoneNumber(telephoneCountry, telephoneNumber);
      onSave({ telephone: combined });
    }
  };

  const handleMobileBlur = () => {
    if (isEditable) {
      const combined = combinePhoneNumber(mobileCountry, mobileNumber);
      onSave({ mobile: combined });
    }
  };

  const handleTelephoneCountryChange = (code: string) => {
    setTelephoneCountry(code);
    const combined = combinePhoneNumber(code, telephoneNumber);
    handleFieldChange('telephone', combined);
    onSave({ telephone: combined });
  };

  const handleTelephoneNumberChange = (number: string) => {
    setTelephoneNumber(number);
    const combined = combinePhoneNumber(telephoneCountry, number);
    handleFieldChange('telephone', combined);
  };

  const handleMobileCountryChange = (code: string) => {
    setMobileCountry(code);
    const combined = combinePhoneNumber(code, mobileNumber);
    handleFieldChange('mobile', combined);
    onSave({ mobile: combined });
  };

  const handleMobileNumberChange = (number: string) => {
    setMobileNumber(number);
    const combined = combinePhoneNumber(mobileCountry, number);
    handleFieldChange('mobile', combined);
  };

  return (
    <div className="space-y-6">
      {/* Address Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Address Information</h2>
          {/* Add New Address button removed as per requirement */}
        </div>

        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.type}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {address.icon}
                    <div>
                      <h3 className="font-medium">{address.label}</h3>
                      {address.type === 'resident' ? (
                        <div className="text-sm text-muted-foreground">
                          <p>Resident Address 1: {address.fields.line1 || 'Not set'}</p>
                          <p>Resident Address 2: {address.fields.line2 || 'Not set'}</p>
                          <p>Postal District: {address.fields.postal || 'Not set'}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {address.type === 'mailing' ? 'Mailing Address: ' : ''}
                          {address.fields.value || 'Not set'}
                        </p>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(address)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (address.type === 'resident') {
                            handleFieldChange('resident_address_1', '');
                            handleFieldChange('resident_address_2', '');
                            handleFieldChange('postal_district', '');
                            onSave({ resident_address_1: '', resident_address_2: '', postal_district: '' });
                          } else if (address.type === 'mailing') {
                            handleFieldChange('mailing_address', '');
                            onSave({ mailing_address: '' });
                          } else {
                            handleFieldChange('email', '');
                            onSave({ email: '' });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Contact Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PhoneInput
            id="telephone"
            label="Telephone Number"
            countryCode={telephoneCountry}
            phoneNumber={telephoneNumber}
            onCountryCodeChange={handleTelephoneCountryChange}
            onPhoneNumberChange={handleTelephoneNumberChange}
            onBlur={handleTelephoneBlur}
            disabled={!isEditable}
            error={errors.telephone}
          />
          
          <PhoneInput
            id="mobile"
            label="Mobile Number"
            countryCode={mobileCountry}
            phoneNumber={mobileNumber}
            onCountryCodeChange={handleMobileCountryChange}
            onPhoneNumberChange={handleMobileNumberChange}
            onBlur={handleMobileBlur}
            disabled={!isEditable}
            error={errors.mobile}
          />
        </div>
      </div>

      {/* Edit Address Dialog */}
      <Dialog open={!!editingAddress} onOpenChange={() => setEditingAddress(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editingAddress === 'resident' ? 'Resident' : editingAddress === 'mailing' ? 'Mailing' : 'Email'} Address
            </DialogTitle>
          </DialogHeader>
          
          {editingAddress === 'resident' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Address Line 1</Label>
                <Input
                  value={tempAddress.line1 || ''}
                  onChange={(e) => setTempAddress({ ...tempAddress, line1: e.target.value })}
                  placeholder="Enter address line 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={tempAddress.line2 || ''}
                  onChange={(e) => setTempAddress({ ...tempAddress, line2: e.target.value })}
                  placeholder="Enter address line 2"
                />
              </div>
              <div className="space-y-2">
                <Label>Postal District</Label>
                <Input
                  value={tempAddress.postal || ''}
                  onChange={(e) => setTempAddress({ ...tempAddress, postal: e.target.value })}
                  placeholder="Enter postal district"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{editingAddress === 'email' ? 'Email Address' : 'Mailing Address'}</Label>
              <Input
                value={tempAddress.value || ''}
                onChange={(e) => setTempAddress({ ...tempAddress, value: e.target.value })}
                placeholder={editingAddress === 'email' ? 'Enter email address' : 'Enter mailing address'}
                type={editingAddress === 'email' ? 'email' : 'text'}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAddress(null)}>Cancel</Button>
            <Button onClick={handleSaveAddress}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
