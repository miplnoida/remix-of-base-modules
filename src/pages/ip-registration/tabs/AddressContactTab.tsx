import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IPFormData } from '../IPRegistrationForm';
import { Plus, Edit, Trash2, MapPin, Mail } from 'lucide-react';
import { validateEmail, getEmailMaxLength } from '@/lib/contactValidation';
import { IP_MASTER_FIELDS } from '@/lib/fieldLengths';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneInput, { parsePhoneNumber, combinePhoneNumber } from '@/components/shared/PhoneInput';
import { useDistricts } from '@/hooks/useIPMasterLookups';

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
  
  // Fetch districts for dropdown
  const { data: districts = [], isLoading: loadingDistricts } = useDistricts();
  
  // Initialize phone state
  const [telephoneCountry, setTelephoneCountry] = useState('KN');
  const [telephoneNumber, setTelephoneNumber] = useState('');
  const [mobileCountry, setMobileCountry] = useState('KN');
  const [mobileNumber, setMobileNumber] = useState('');

  // Sync phone state when formData changes (e.g., when data is fetched from database)
  useEffect(() => {
    const telephoneParsed = parsePhoneNumber(formData.telephone || '');
    const mobileParsed = parsePhoneNumber(formData.mobile || '');
    
    setTelephoneCountry(telephoneParsed.countryCode);
    setTelephoneNumber(telephoneParsed.phoneNumber);
    setMobileCountry(mobileParsed.countryCode);
    setMobileNumber(mobileParsed.phoneNumber);
  }, [formData.telephone, formData.mobile]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
    clearError(field);
  }, [onChange, clearError]);

  // Helper to get district display value
  const getDistrictDisplay = (code: string | undefined) => {
    if (!code) return '';
    const district = districts.find(d => d.code === code);
    return district ? `${district.code} - ${district.description}` : code;
  };

  const addresses: AddressData[] = [
    {
      type: 'resident',
      label: 'Resident Address',
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
      fields: {
        line1: formData.resident_addr1,
        line2: formData.resident_addr2,
        postal: formData.district,
      },
    },
    {
      type: 'mailing',
      label: 'Mailing Address',
      icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
      fields: {
        line1: formData.mail_addr1,
        line2: formData.mail_addr2,
      },
    },
    {
      type: 'email',
      label: 'Email Address',
      icon: <Mail className="h-4 w-4 text-muted-foreground" />,
      fields: {
        value: formData.email_addr,
      },
    },
  ];

  const [dialogError, setDialogError] = useState('');

  const handleSaveAddress = () => {
    setDialogError('');
    
    // Validate email in dialog before saving using centralized validation
    if (editingAddress === 'email') {
      const val = (tempAddress.value || '').trim();
      if (val) {
        const result = validateEmail(val, 'email', 'Email');
        if (!result.valid) {
          setDialogError(result.error!);
          return;
        }
      }
    }

    if (editingAddress === 'resident') {
      const updates: Partial<IPFormData> = {
        resident_addr1: tempAddress.line1,
        resident_addr2: tempAddress.line2,
        district: tempAddress.postal,
      };
      Object.entries(updates).forEach(([key, value]) => handleFieldChange(key, value));
      onSave(updates);
    } else if (editingAddress === 'mailing') {
      const updates: Partial<IPFormData> = {
        mail_addr1: tempAddress.line1,
        mail_addr2: tempAddress.line2,
      };
      Object.entries(updates).forEach(([key, value]) => handleFieldChange(key, value));
      onSave(updates);
    } else if (editingAddress === 'email') {
      const trimmed = (tempAddress.value || '').trim();
      handleFieldChange('email_addr', trimmed);
      onSave({ email_addr: trimmed });
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
                      {address.type === 'resident' || address.type === 'mailing' ? (
                        <div className="text-sm text-muted-foreground">
                          <p>{address.type === 'resident' ? 'Address Line 1' : 'Mailing Address Line1'}: {address.fields.line1 || (isEditable ? 'Not set' : '')}</p>
                          <p>{address.type === 'resident' ? 'Address Line 2' : 'Mailing Address Line2'}: {address.fields.line2 || (isEditable ? 'Not set' : '')}</p>
                          {address.type === 'resident' && (
                            <p>Postal District: {getDistrictDisplay(address.fields.postal) || (isEditable ? 'Not set' : '')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {address.fields.value || (isEditable ? 'Not set' : '')}
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
                            handleFieldChange('resident_addr1', '');
                            handleFieldChange('resident_addr2', '');
                            handleFieldChange('district', '');
                            onSave({ resident_addr1: '', resident_addr2: '', district: '' } as Partial<IPFormData>);
                          } else if (address.type === 'mailing') {
                            handleFieldChange('mail_addr1', '');
                            handleFieldChange('mail_addr2', '');
                            onSave({ mail_addr1: '', mail_addr2: '' });
                          } else {
                            handleFieldChange('email_addr', '');
                            onSave({ email_addr: '' });
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
          
          {editingAddress === 'resident' || editingAddress === 'mailing' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{editingAddress === 'mailing' ? 'Mailing Address Line1' : 'Address Line 1'} <span className="text-xs text-muted-foreground">{(tempAddress.line1 || '').length}/{editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr1.maxLength : IP_MASTER_FIELDS.resident_addr1.maxLength}</span></Label>
                <Input
                  value={tempAddress.line1 || ''}
                  onChange={(e) => {
                    const maxLen = editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr1.maxLength : IP_MASTER_FIELDS.resident_addr1.maxLength;
                    setTempAddress({ ...tempAddress, line1: e.target.value.slice(0, maxLen) });
                  }}
                  placeholder={editingAddress === 'mailing' ? 'Enter mailing address line 1' : 'Enter address line 1'}
                  maxLength={editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr1.maxLength : IP_MASTER_FIELDS.resident_addr1.maxLength}
                />
              </div>
              <div className="space-y-2">
                <Label>{editingAddress === 'mailing' ? 'Mailing Address Line2' : 'Address Line 2'} <span className="text-xs text-muted-foreground">{(tempAddress.line2 || '').length}/{editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr2.maxLength : IP_MASTER_FIELDS.resident_addr2.maxLength}</span></Label>
                <Input
                  value={tempAddress.line2 || ''}
                  onChange={(e) => {
                    const maxLen = editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr2.maxLength : IP_MASTER_FIELDS.resident_addr2.maxLength;
                    setTempAddress({ ...tempAddress, line2: e.target.value.slice(0, maxLen) });
                  }}
                  placeholder={editingAddress === 'mailing' ? 'Enter mailing address line 2' : 'Enter address line 2'}
                  maxLength={editingAddress === 'mailing' ? IP_MASTER_FIELDS.mail_addr2.maxLength : IP_MASTER_FIELDS.resident_addr2.maxLength}
                />
              </div>
              {editingAddress === 'resident' && (
                <div className="space-y-2">
                  <Label>Postal District</Label>
                  <Select
                    value={tempAddress.postal || ''}
                    onValueChange={(value) => setTempAddress({ ...tempAddress, postal: value })}
                    disabled={loadingDistricts}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select postal district" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[200px]">
                      {districts.map((district) => (
                        <SelectItem key={district.code} value={district.code}>
                          {district.code} - {district.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                value={tempAddress.value || ''}
                onChange={(e) => {
                  setTempAddress({ ...tempAddress, value: e.target.value.slice(0, IP_MASTER_FIELDS.email_addr.maxLength) });
                  setDialogError('');
                }}
                placeholder="Enter email address"
                type="email"
                maxLength={IP_MASTER_FIELDS.email_addr.maxLength}
                className={dialogError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {dialogError && <p className="text-xs text-destructive">{dialogError}</p>}
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
