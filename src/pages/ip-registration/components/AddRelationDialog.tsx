import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRelations } from '@/hooks/useIPMasterLookups';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { format, isValid } from 'date-fns';

interface AddRelationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (relationType: string, data: Record<string, any>) => void;
  existingData?: Record<string, any>;
}

// Relation type to field mapping
const relationTypeFields: Record<string, { fields: string[]; labels: Record<string, string> }> = {
  CTT: {
    fields: ['contact', 'contact_relation', 'contact_addr1', 'contact_addr2', 'contact_phone', 'contact_mobile', 'contact_email'],
    labels: {
      contact: 'Contact Name',
      contact_relation: 'Relationship',
      contact_addr1: 'Address Line 1',
      contact_addr2: 'Address Line 2',
      contact_phone: 'Phone',
      contact_mobile: 'Mobile',
      contact_email: 'Email',
    },
  },
  FAT: {
    fields: ['father_name'],
    labels: { father_name: "Father's Name" },
  },
  MOT: {
    fields: ['mother_name'],
    labels: { mother_name: "Mother's Name" },
  },
  SPO: {
    fields: ['spouse_name', 'spouse_ssn', 'spouse_addr1', 'spouse_addr2', 'spouse_dob'],
    labels: {
      spouse_name: 'Spouse Name',
      spouse_ssn: 'Spouse SSN',
      spouse_addr1: 'Address Line 1',
      spouse_addr2: 'Address Line 2',
      spouse_dob: 'Date of Birth',
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
      ben_addr1: 'Address Line 1',
      ben_addr2: 'Address Line 2',
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

export default function AddRelationDialog({ open, onClose, onSave, existingData = {} }: AddRelationDialogProps) {
  const { data: relations = [], isLoading } = useRelations();
  const [relationType, setRelationType] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRelationType('');
      setFormData({ ...existingData });
    }
  }, [open, existingData]);

  const handleRelationTypeChange = (value: string) => {
    setRelationType(value);
    // Clear previous relation data when changing type
    const newData = { ...existingData };
    setFormData(newData);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!relationType) return;
    onSave(relationType, formData);
    onClose();
  };

  const renderFields = () => {
    if (!relationType || !relationTypeFields[relationType]) return null;

    const { fields, labels } = relationTypeFields[relationType];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {fields.map(field => {
          const isDateField = field.includes('dob') || field.includes('date');
          const isSSNField = field.includes('ssn');

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

          return (
            <div key={field} className="space-y-2">
              <Label>{labels[field]}</Label>
              <Input
                value={formData[field] || ''}
                onChange={(e) => {
                  let value = e.target.value;
                  // SSN fields only allow 6 numeric digits
                  if (isSSNField) {
                    value = value.replace(/\D/g, '').slice(0, 6);
                  }
                  handleFieldChange(field, value);
                }}
                placeholder={`Enter ${labels[field]}`}
                maxLength={isSSNField ? 6 : field.includes('addr') ? 30 : 35}
                inputMode={isSSNField ? 'numeric' : 'text'}
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
            <Select value={relationType} onValueChange={handleRelationTypeChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading...' : 'Select relation type'} />
              </SelectTrigger>
              <SelectContent>
                {relations.map(rel => (
                  <SelectItem key={rel.code} value={rel.code}>
                    {rel.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {renderFields()}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!relationType}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
