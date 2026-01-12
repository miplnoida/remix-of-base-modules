import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IPFormData } from '../IPRegistrationForm';
import { Plus, Edit, Trash2, MapPin, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AddressContactTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
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

export default function AddressContactTab({ formData, onChange, onSave, errors, isEditable }: AddressContactTabProps) {
  const [editingAddress, setEditingAddress] = useState<AddressType | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tempAddress, setTempAddress] = useState<any>({});

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
      Object.entries(updates).forEach(([key, value]) => onChange(key, value));
      onSave(updates);
    } else if (editingAddress === 'mailing') {
      onChange('mailing_address', tempAddress.value);
      onSave({ mailing_address: tempAddress.value });
    } else if (editingAddress === 'email') {
      onChange('email', tempAddress.value);
      onSave({ email: tempAddress.value });
    }
    setEditingAddress(null);
    setTempAddress({});
  };

  const handleEdit = (address: AddressData) => {
    setEditingAddress(address.type);
    setTempAddress(address.fields);
  };

  const handleBlur = (field: string) => {
    if (isEditable) {
      onSave({ [field]: formData[field as keyof IPFormData] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Address Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Address Information</h2>
          {isEditable && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>
          )}
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
                            onChange('resident_address_1', '');
                            onChange('resident_address_2', '');
                            onChange('postal_district', '');
                            onSave({ resident_address_1: '', resident_address_2: '', postal_district: '' });
                          } else if (address.type === 'mailing') {
                            onChange('mailing_address', '');
                            onSave({ mailing_address: '' });
                          } else {
                            onChange('email', '');
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
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone Number</Label>
            <Input
              id="telephone"
              value={formData.telephone || ''}
              onChange={(e) => onChange('telephone', e.target.value)}
              onBlur={() => handleBlur('telephone')}
              placeholder="Enter Telephone Number"
              disabled={!isEditable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              value={formData.mobile || ''}
              onChange={(e) => onChange('mobile', e.target.value)}
              onBlur={() => handleBlur('mobile')}
              placeholder="Enter Mobile Number"
              disabled={!isEditable}
            />
          </div>
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
