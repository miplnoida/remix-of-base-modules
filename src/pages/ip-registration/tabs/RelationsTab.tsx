import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IPFormData } from '../IPRegistrationForm';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import AddRelationDialog from '../components/AddRelationDialog';
import { formatDisplayDate } from '@/lib/dateFormat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Field groups per relation type for clearing
const RELATION_CLEAR_FIELDS: Record<string, string[]> = {
  CTT: ['contact', 'contact_relation', 'contact_addr1', 'contact_addr2', 'contact_phone', 'contact_mobile', 'contact_email'],
  PAR: ['father_name', 'mother_name'],
  SPO: ['spouse_name', 'spouse_addr1', 'spouse_addr2', 'spouse_ssn', 'spouse_dob'],
  WIT: ['witness_name', 'date_witnessed'],
  BEN: ['beneficiary', 'ben_addr1', 'ben_addr2'],
};

const RELATION_LABELS: Record<string, string> = {
  CTT: 'Contact',
  PAR: 'Parents',
  SPO: 'Spouse',
  WIT: 'Witness',
  BEN: 'Beneficiary',
};

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
  const [editRelationType, setEditRelationType] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSaveRelation = useCallback((relationType: string, data: Record<string, any>) => {
    Object.entries(data).forEach(([field, value]) => {
      if (value !== undefined) {
        onChange(field, value);
      }
    });
    if (onRefresh) onRefresh();
  }, [onChange, onRefresh]);

  const handleEdit = (relationCode: string) => {
    setEditRelationType(relationCode);
    setShowAddDialog(true);
  };

  const handleDelete = async (relationCode: string) => {
    setDeleting(true);
    try {
      const fields = RELATION_CLEAR_FIELDS[relationCode];
      if (!fields) return;

      const updateData: Record<string, any> = {};
      fields.forEach(f => { updateData[f] = null; });

      const { error } = await supabase
        .from('ip_master')
        .update(updateData)
        .eq('unique_uuid', uniqueUuid);

      if (error) throw error;

      // Update local state
      fields.forEach(f => onChange(f, null));
      toast.success(`${RELATION_LABELS[relationCode]} deleted successfully`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting relation:', error);
      toast.error('Failed to delete relation');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditRelationType(null);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    return formatDisplayDate(dateStr) || '-';
  };

  const renderActionButtons = (relationCode: string) => {
    if (!isEditable) return null;
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(relationCode)} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(relationCode)} title="Delete" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderRelationCard = (
    title: string,
    relationCode: string,
    hasData: boolean,
    content: React.ReactNode
  ) => {
    if (!hasData) return null;
    return (
      <Card key={relationCode}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {title}
            </CardTitle>
            {renderActionButtons(relationCode)}
          </div>
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
          <Button onClick={() => { setEditRelationType(null); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Relation
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {hasContactData(formData) && renderRelationCard('Contact', 'CTT', true,
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {formData.contact && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.contact}</span></div>}
            {formData.contact_relation && <div><span className="text-muted-foreground">Relationship:</span> <span className="font-medium">{formData.contact_relation}</span></div>}
            {formData.contact_phone && <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{formData.contact_phone}</span></div>}
            {formData.contact_mobile && <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{formData.contact_mobile}</span></div>}
            {formData.contact_email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{formData.contact_email}</span></div>}
            {(formData.contact_addr1 || formData.contact_addr2) && (
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{[formData.contact_addr1, formData.contact_addr2].filter(Boolean).join(', ')}</span></div>
            )}
          </div>
        )}

        {hasParentData(formData) && renderRelationCard('Parents', 'PAR', true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.father_name && <div><span className="text-muted-foreground">Father:</span> <span className="font-medium">{formData.father_name}</span></div>}
            {formData.mother_name && <div><span className="text-muted-foreground">Mother:</span> <span className="font-medium">{formData.mother_name}</span></div>}
          </div>
        )}

        {hasSpouseData(formData) && renderRelationCard('Spouse', 'SPO', true,
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {formData.spouse_name && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.spouse_name}</span></div>}
            {formData.spouse_ssn && <div><span className="text-muted-foreground">SSN:</span> <span className="font-medium">{formData.spouse_ssn}</span></div>}
            {formData.spouse_dob && <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{formatDate(formData.spouse_dob)}</span></div>}
            {(formData.spouse_addr1 || formData.spouse_addr2) && (
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{[formData.spouse_addr1, formData.spouse_addr2].filter(Boolean).join(', ')}</span></div>
            )}
          </div>
        )}

        {hasWitnessData(formData) && renderRelationCard('Witness', 'WIT', true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.witness_name && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.witness_name}</span></div>}
            {formData.date_witnessed && <div><span className="text-muted-foreground">Date Witnessed:</span> <span className="font-medium">{formatDate(formData.date_witnessed)}</span></div>}
          </div>
        )}

        {hasBeneficiaryData(formData) && renderRelationCard('Beneficiary', 'BEN', true,
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.beneficiary && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.beneficiary}</span></div>}
            {(formData.ben_addr1 || formData.ben_addr2) && (
              <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{[formData.ben_addr1, formData.ben_addr2].filter(Boolean).join(', ')}</span></div>
            )}
          </div>
        )}

        {!hasContactData(formData) && !hasParentData(formData) && !hasSpouseData(formData) && !hasWitnessData(formData) && !hasBeneficiaryData(formData) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No relations added yet. Click "Add Relation" to add one.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Relation Dialog */}
      <AddRelationDialog
        open={showAddDialog}
        onClose={handleDialogClose}
        onSave={handleSaveRelation}
        uniqueUuid={uniqueUuid}
        existingData={formData}
        editRelationType={editRelationType}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm ? RELATION_LABELS[deleteConfirm] : ''} Relation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently clear all {deleteConfirm ? RELATION_LABELS[deleteConfirm]?.toLowerCase() : ''} relation data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
