import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IPFormData } from '../IPRegistrationForm';
import { Plus, Users } from 'lucide-react';
import AddRelationDialog from '../components/AddRelationDialog';
import { format, isValid } from 'date-fns';

// Helper to check if relation has data
const hasContactData = (formData: IPFormData) => 
  formData.contact || formData.contact_relation || formData.contact_addr1 || formData.contact_phone;

const hasParentData = (formData: IPFormData) => 
  formData.father_name || formData.mother_name;

const hasSpouseData = (formData: IPFormData) => 
  formData.spouse_name || formData.spouse_ssn || formData.spouse_addr1;

const hasWitnessData = (formData: IPFormData) => 
  formData.witness_name || formData.date_witnessed;

const hasBeneficiaryData = (formData: IPFormData) => 
  formData.beneficiary || formData.ben_addr1;

interface RelationsTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  isEditable: boolean;
  uniqueUuid: string;
  onRefresh?: () => void;
}

export default function RelationsTab({ formData, onChange, isEditable, uniqueUuid, onRefresh }: RelationsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleSaveRelation = useCallback((relationType: string, data: Record<string, any>) => {
    // Update form data with the relation fields
    Object.entries(data).forEach(([field, value]) => {
      if (value !== undefined) {
        onChange(field, value);
      }
    });
    // Trigger a refresh if callback provided
    if (onRefresh) {
      onRefresh();
    }
  }, [onChange, onRefresh]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : '-';
  };

  const renderRelationCard = (
    title: string,
    hasData: boolean,
    content: React.ReactNode
  ) => {
    if (!hasData) return null;
    
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">{content}</CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relations</h2>
        {isEditable && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Relation
          </Button>
        )}
      </div>

      {/* Display existing relations */}
      <div className="space-y-4">
        {/* Contact */}
        {hasContactData(formData) && renderRelationCard(
          'Contact',
          true,
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {formData.contact && (
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{formData.contact}</span>
              </div>
            )}
            {formData.contact_relation && (
              <div>
                <span className="text-muted-foreground">Relationship:</span>{' '}
                <span className="font-medium">{formData.contact_relation}</span>
              </div>
            )}
            {formData.contact_phone && (
              <div>
                <span className="text-muted-foreground">Phone:</span>{' '}
                <span className="font-medium">{formData.contact_phone}</span>
              </div>
            )}
            {formData.contact_mobile && (
              <div>
                <span className="text-muted-foreground">Mobile:</span>{' '}
                <span className="font-medium">{formData.contact_mobile}</span>
              </div>
            )}
            {formData.contact_email && (
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{formData.contact_email}</span>
              </div>
            )}
            {(formData.contact_addr1 || formData.contact_addr2) && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Address:</span>{' '}
                <span className="font-medium">
                  {[formData.contact_addr1, formData.contact_addr2].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Parents */}
        {hasParentData(formData) && renderRelationCard(
          'Parents',
          true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.father_name && (
              <div>
                <span className="text-muted-foreground">Father:</span>{' '}
                <span className="font-medium">{formData.father_name}</span>
              </div>
            )}
            {formData.mother_name && (
              <div>
                <span className="text-muted-foreground">Mother:</span>{' '}
                <span className="font-medium">{formData.mother_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Spouse */}
        {hasSpouseData(formData) && renderRelationCard(
          'Spouse',
          true,
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {formData.spouse_name && (
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{formData.spouse_name}</span>
              </div>
            )}
            {formData.spouse_ssn && (
              <div>
                <span className="text-muted-foreground">SSN:</span>{' '}
                <span className="font-medium">{formData.spouse_ssn}</span>
              </div>
            )}
            {formData.spouse_dob && (
              <div>
                <span className="text-muted-foreground">DOB:</span>{' '}
                <span className="font-medium">{formatDate(formData.spouse_dob)}</span>
              </div>
            )}
            {(formData.spouse_addr1 || formData.spouse_addr2) && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Address:</span>{' '}
                <span className="font-medium">
                  {[formData.spouse_addr1, formData.spouse_addr2].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Witness */}
        {hasWitnessData(formData) && renderRelationCard(
          'Witness',
          true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.witness_name && (
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{formData.witness_name}</span>
              </div>
            )}
            {formData.date_witnessed && (
              <div>
                <span className="text-muted-foreground">Date Witnessed:</span>{' '}
                <span className="font-medium">{formatDate(formData.date_witnessed)}</span>
              </div>
            )}
          </div>
        )}

        {/* Beneficiary */}
        {hasBeneficiaryData(formData) && renderRelationCard(
          'Beneficiary',
          true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.beneficiary && (
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{formData.beneficiary}</span>
              </div>
            )}
            {(formData.ben_addr1 || formData.ben_addr2) && (
              <div>
                <span className="text-muted-foreground">Address:</span>{' '}
                <span className="font-medium">
                  {[formData.ben_addr1, formData.ben_addr2].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* No relations message */}
        {!hasContactData(formData) && 
         !hasParentData(formData) && 
         !hasSpouseData(formData) && 
         !hasWitnessData(formData) && 
         !hasBeneficiaryData(formData) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No relations added yet. Click "Add Relation" to add one.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Relation Dialog */}
      <AddRelationDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={handleSaveRelation}
        uniqueUuid={uniqueUuid}
        existingData={formData}
      />
    </div>
  );
}
