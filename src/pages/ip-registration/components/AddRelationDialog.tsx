import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

interface AddRelationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (relationType: string, data: Record<string, any>) => void;
  uniqueUuid: string;
  existingData?: Record<string, any>;
}

// Fixed relation types - NOT from master table
const RELATION_TYPES = [
  { code: 'CTT', label: 'Contact' },
  { code: 'PAR', label: 'Parent' },
  { code: 'SPO', label: 'Spouse' },
  { code: 'WIT', label: 'Witness' },
  { code: 'BEN', label: 'Beneficiary' },
];

// Relation type to field mapping
const relationTypeFields: Record<string, { fields: string[]; labels: Record<string, string> }> = {
  CTT: {
    fields: ['contact', 'contact_relation', 'contact_addr1', 'contact_addr2', 'contact_phone', 'contact_mobile', 'contact_email'],
    labels: {
      contact: 'Name',
      contact_relation: 'Relation',
      contact_addr1: 'Address Line 1',
      contact_addr2: 'Address Line 2',
      contact_phone: 'Phone Number',
      contact_mobile: 'Mobile Number',
      contact_email: 'Email',
    },
  },
  PAR: {
    fields: ['father_name', 'mother_name'],
    labels: { 
      father_name: "Father's Name",
      mother_name: "Mother's Name",
    },
  },
  SPO: {
    fields: ['spouse_name', 'spouse_addr1', 'spouse_addr2', 'spouse_ssn', 'spouse_dob'],
    labels: {
      spouse_name: 'Spouse Name',
      spouse_addr1: 'Spouse Address Line 1',
      spouse_addr2: 'Spouse Address Line 2',
      spouse_ssn: 'Spouse SSN',
      spouse_dob: 'Spouse Date of Birth',
    },
  },
  WIT: {
    fields: ['witness_name', 'date_witnessed'],
    labels: {
      witness_name: 'Witness Name',
      date_witnessed: 'Date Witnessed',
    },
  },
  BEN: {
    fields: ['beneficiary', 'ben_addr1', 'ben_addr2'],
    labels: {
      beneficiary: 'Beneficiary Name',
      ben_addr1: 'Beneficiary Address Line 1',
      ben_addr2: 'Beneficiary Address Line 2',
    },
  },
};

const parseISODate = (dateStr: string | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isValid(date) ? date : undefined;
};

const formatToISO = (date: Date | undefined): string => {
  if (!date || !isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
};

export default function AddRelationDialog({ open, onClose, onSave, uniqueUuid, existingData = {} }: AddRelationDialogProps) {
  const [relationType, setRelationType] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRelationType('');
      setFormData({ ...existingData });
    }
  }, [open, existingData]);

  const handleRelationTypeChange = (value: string) => {
    setRelationType(value);
    // Pre-fill with existing data for the selected type
    const fieldConfig = relationTypeFields[value];
    if (fieldConfig) {
      const newData: Record<string, any> = {};
      fieldConfig.fields.forEach(field => {
        newData[field] = existingData[field] || '';
      });
      setFormData(newData);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate SSN input (exactly 6 numeric digits)
  const validateSSN = (value: string): boolean => {
    return /^\d{0,6}$/.test(value);
  };

  const handleSSNChange = (field: string, value: string) => {
    if (validateSSN(value)) {
      handleFieldChange(field, value);
    }
  };

  const handleSave = async () => {
    if (!relationType) {
      toast.error('Please select a relation type');
      return;
    }

    // Validate spouse_ssn if provided
    if (relationType === 'SPO' && formData.spouse_ssn && formData.spouse_ssn.length !== 6) {
      toast.error('Spouse SSN must be exactly 6 digits');
      return;
    }

    // Check if at least one field has data
    const fieldConfig = relationTypeFields[relationType];
    const hasData = fieldConfig.fields.some(field => formData[field]?.toString().trim());
    if (!hasData) {
      toast.error('Please fill at least one field');
      return;
    }

    setSaving(true);
    try {
      // Build update object with only the fields for this relation type
      const updateData: Record<string, any> = {};
      fieldConfig.fields.forEach(field => {
        updateData[field] = formData[field] || null;
      });

      // Save directly to ip_master
      const { error } = await supabase
        .from('ip_master')
        .update(updateData)
        .eq('unique_uuid', uniqueUuid);

      if (error) throw error;

      toast.success('Relation saved successfully');
      
      // Notify parent to refresh
      onSave(relationType, updateData);
      onClose();
    } catch (error) {
      console.error('Error saving relation:', error);
      toast.error('Failed to save relation');
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    if (!relationType || !relationTypeFields[relationType]) return null;

    const { fields, labels } = relationTypeFields[relationType];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {fields.map(field => {
          const isDateField = field.includes('dob') || field.includes('date');
          const isSSNField = field.includes('ssn');
          const isEmailField = field.includes('email');

          if (isDateField) {
            return (
              <div key={field} className="space-y-2">
                <Label>{labels[field]}</Label>
                <DatePickerWithDropdowns
                  date={parseISODate(formData[field])}
                  onSelect={(date) => handleFieldChange(field, formatToISO(date))}
                  placeholder={`Select ${labels[field]}`}
                  maxDate={new Date()}
                />
              </div>
            );
          }

          if (isSSNField) {
            return (
              <div key={field} className="space-y-2">
                <Label>{labels[field]} (6 digits)</Label>
                <Input
                  value={formData[field] || ''}
                  onChange={(e) => handleSSNChange(field, e.target.value)}
                  placeholder="Enter 6-digit SSN"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            );
          }

          return (
            <div key={field} className="space-y-2">
              <Label>{labels[field]}</Label>
              <Input
                value={formData[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                placeholder={`Enter ${labels[field]}`}
                maxLength={field.includes('addr') ? 30 : isEmailField ? 75 : 35}
                type={isEmailField ? 'email' : 'text'}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Relation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Relation Type *</Label>
            <Select value={relationType} onValueChange={handleRelationTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select relation type" />
              </SelectTrigger>
              <SelectContent>
                {RELATION_TYPES.map(rel => (
                  <SelectItem key={rel.code} value={rel.code}>
                    {rel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {renderFields()}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!relationType || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
