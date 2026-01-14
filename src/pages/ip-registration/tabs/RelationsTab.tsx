import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IPFormData } from '../IPRegistrationForm';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { format, isValid } from 'date-fns';

interface RelationsTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  isEditable: boolean;
}

type RelationType = 'contact' | 'parent' | 'spouse' | 'witness' | 'beneficiary';

const relationTypes: { value: RelationType; label: string }[] = [
  { value: 'contact', label: 'Contact' },
  { value: 'parent', label: 'Parent' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'witness', label: 'Witness' },
  { value: 'beneficiary', label: 'Beneficiary' },
];

// Convert ISO date string to Date object
const parseISODate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isValid(date) ? date : undefined;
};

// Convert Date object to ISO date string (yyyy-MM-dd)
const formatToISO = (date: Date | undefined): string | null => {
  if (!date || !isValid(date)) return null;
  return format(date, 'yyyy-MM-dd');
};

export default function RelationsTab({ formData, onChange, isEditable }: RelationsTabProps) {
  // Determine which relation type has data
  const getActiveRelationType = (): RelationType => {
    if (formData.contact) return 'contact';
    if (formData.father_name || formData.mother_name) return 'parent';
    if (formData.spouse_name) return 'spouse';
    if (formData.witness_name) return 'witness';
    if (formData.beneficiary) return 'beneficiary';
    return 'contact'; // Default
  };

  const [relationType, setRelationType] = useState<RelationType>(getActiveRelationType());

  const handleRelationTypeChange = useCallback((value: string) => {
    setRelationType(value as RelationType);
  }, []);

  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
  }, [onChange]);

  const handleDateChange = useCallback((field: string, date: Date | undefined) => {
    const isoDate = formatToISO(date);
    onChange(field, isoDate);
  }, [onChange]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Relations</h2>
      
      {/* Relation Type Selector */}
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="relation_type">Relation Type</Label>
        <Select 
          value={relationType} 
          onValueChange={handleRelationTypeChange}
          disabled={!isEditable}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select relation type" />
          </SelectTrigger>
          <SelectContent>
            {relationTypes.map(rt => (
              <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact Fields */}
      {relationType === 'contact' && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Name</Label>
              <Input
                id="contact"
                value={formData.contact || ''}
                onChange={(e) => handleFieldChange('contact', e.target.value)}
                placeholder="Enter contact name"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_relation">Relation</Label>
              <Input
                id="contact_relation"
                value={formData.contact_relation || ''}
                onChange={(e) => handleFieldChange('contact_relation', e.target.value)}
                placeholder="e.g., Brother, Friend"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_addr1">Address Line 1</Label>
              <Input
                id="contact_addr1"
                value={formData.contact_addr1 || ''}
                onChange={(e) => handleFieldChange('contact_addr1', e.target.value)}
                placeholder="Enter address line 1"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_addr2">Address Line 2</Label>
              <Input
                id="contact_addr2"
                value={formData.contact_addr2 || ''}
                onChange={(e) => handleFieldChange('contact_addr2', e.target.value)}
                placeholder="Enter address line 2"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone || ''}
                onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                placeholder="Enter phone number"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_mobile">Mobile</Label>
              <Input
                id="contact_mobile"
                value={formData.contact_mobile || ''}
                onChange={(e) => handleFieldChange('contact_mobile', e.target.value)}
                placeholder="Enter mobile number"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                placeholder="Enter email address"
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}

      {/* Parent Fields */}
      {relationType === 'parent' && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Parent Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="father_name">Father's Name</Label>
              <Input
                id="father_name"
                value={formData.father_name || ''}
                onChange={(e) => handleFieldChange('father_name', e.target.value)}
                placeholder="Enter father's name"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mother_name">Mother's Name</Label>
              <Input
                id="mother_name"
                value={formData.mother_name || ''}
                onChange={(e) => handleFieldChange('mother_name', e.target.value)}
                placeholder="Enter mother's name"
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}

      {/* Spouse Fields */}
      {relationType === 'spouse' && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Spouse Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spouse_name">Spouse Name</Label>
              <Input
                id="spouse_name"
                value={formData.spouse_name || ''}
                onChange={(e) => handleFieldChange('spouse_name', e.target.value)}
                placeholder="Enter spouse name"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_ssn">Spouse SSN</Label>
              <Input
                id="spouse_ssn"
                value={formData.spouse_ssn || ''}
                onChange={(e) => handleFieldChange('spouse_ssn', e.target.value)}
                placeholder="Enter spouse SSN"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_addr1">Address Line 1</Label>
              <Input
                id="spouse_addr1"
                value={formData.spouse_addr1 || ''}
                onChange={(e) => handleFieldChange('spouse_addr1', e.target.value)}
                placeholder="Enter address line 1"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_addr2">Address Line 2</Label>
              <Input
                id="spouse_addr2"
                value={formData.spouse_addr2 || ''}
                onChange={(e) => handleFieldChange('spouse_addr2', e.target.value)}
                placeholder="Enter address line 2"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse_dob">Spouse Date of Birth</Label>
              <DatePickerWithDropdowns
                date={parseISODate(formData.spouse_dob)}
                onSelect={(date) => handleDateChange('spouse_dob', date)}
                placeholder="Select date of birth"
                disabled={!isEditable}
                maxDate={new Date()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Witness Fields */}
      {relationType === 'witness' && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Witness Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="witness_name">Witness Name</Label>
              <Input
                id="witness_name"
                value={formData.witness_name || ''}
                onChange={(e) => handleFieldChange('witness_name', e.target.value)}
                placeholder="Enter witness name"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_witnessed">Date Witnessed</Label>
              <DatePickerWithDropdowns
                date={parseISODate(formData.date_witnessed)}
                onSelect={(date) => handleDateChange('date_witnessed', date)}
                placeholder="Select date witnessed"
                disabled={!isEditable}
                maxDate={new Date()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary Fields */}
      {relationType === 'beneficiary' && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-medium">Beneficiary Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="beneficiary">Beneficiary Name</Label>
              <Input
                id="beneficiary"
                value={formData.beneficiary || ''}
                onChange={(e) => handleFieldChange('beneficiary', e.target.value)}
                placeholder="Enter beneficiary name"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ben_addr1">Address Line 1</Label>
              <Input
                id="ben_addr1"
                value={formData.ben_addr1 || ''}
                onChange={(e) => handleFieldChange('ben_addr1', e.target.value)}
                placeholder="Enter address line 1"
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ben_addr2">Address Line 2</Label>
              <Input
                id="ben_addr2"
                value={formData.ben_addr2 || ''}
                onChange={(e) => handleFieldChange('ben_addr2', e.target.value)}
                placeholder="Enter address line 2"
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
