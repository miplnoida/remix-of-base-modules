import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useDependentRelations } from '@/hooks/useIPMasterLookups';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';

interface DependentsTabProps {
  uniqueUuid: string;
  ssn?: string | null;
  recordStatus: string;
  isEditable: boolean;
}

interface Dependent {
  id: string;
  depend_ssn?: string;
  surname?: string;
  firstname?: string;
  middle_name_dep?: string;
  dob?: string;
  sex?: string;
  relation?: string;
  depend_addr1?: string;
  depend_addr2?: string;
  school_child?: string;
  invalid?: string;
  status?: string;
  date_modified?: string;
}

const genders = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

export default function DependentsTab({ uniqueUuid, ssn, recordStatus, isEditable }: DependentsTabProps) {
  const { user } = useAuth();
  const { data: dependentRelations, isLoading: relationsLoading } = useDependentRelations();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [formData, setFormData] = useState<Partial<Dependent>>({});

  // Always use ip_depend table now (drafts are in ip_master, not tmp tables)
  const fetchDependents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_depend')
        .select('*')
        .eq('unique_uuid', uniqueUuid)
        .neq('status', 'D')
        .order('date_modified', { ascending: false });

      if (error) throw error;
      setDependents(data || []);
    } catch (error) {
      console.error('Error fetching dependents:', error);
      toast.error('Failed to load dependents');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid]);

  useEffect(() => {
    fetchDependents();
  }, [fetchDependents]);

  const handleAdd = () => {
    setSelectedDependent(null);
    setFormData({
      depend_ssn: '',
      surname: '',
      firstname: '',
      middle_name_dep: '',
      dob: '',
      sex: '',
      relation: '',
      depend_addr1: '',
      depend_addr2: '',
      school_child: 'N',
      invalid: 'N',
    });
    setShowDialog(true);
  };

  const handleEdit = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setFormData(dependent);
    setShowDialog(true);
  };

  const handleDelete = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedDependent) return;

    try {
      const { error } = await supabase
        .from('ip_depend')
        .update({ status: 'D', date_modified: new Date().toISOString() })
        .eq('id', selectedDependent.id);

      if (error) throw error;

      toast.success('Dependent deleted');
      fetchDependents();
    } catch (error) {
      console.error('Error deleting dependent:', error);
      toast.error('Failed to delete dependent');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedDependent(null);
    }
  };

  const handleSave = async () => {
    if (!formData.surname || !formData.firstname) {
      toast.error('Please check the form for valid information!', {
        description: 'Surname and first name are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
      });
      return;
    }

    try {
      if (selectedDependent) {
        // Update existing in ip_depend
        const { error } = await supabase
          .from('ip_depend')
          .update({
            depend_ssn: formData.depend_ssn,
            surname: formData.surname,
            firstname: formData.firstname,
            middle_name_dep: formData.middle_name_dep,
            dob: formData.dob,
            sex: formData.sex,
            relation: formData.relation,
            depend_addr1: formData.depend_addr1,
            depend_addr2: formData.depend_addr2,
            school_child: formData.school_child,
            invalid: formData.invalid,
            date_modified: new Date().toISOString(),
            userid: user?.id,
          })
          .eq('id', selectedDependent.id);

        if (error) throw error;
        toast.success('Dependent updated');
      } else {
        // Insert new into ip_depend
        // Note: Using type assertion because unique_uuid exists in DB but not in generated types
        const insertData = {
          unique_uuid: uniqueUuid,
          depend_ssn: formData.depend_ssn,
          surname: formData.surname,
          firstname: formData.firstname,
          middle_name_dep: formData.middle_name_dep,
          dob: formData.dob || null,
          sex: formData.sex,
          relation: formData.relation,
          depend_addr1: formData.depend_addr1,
          depend_addr2: formData.depend_addr2,
          school_child: formData.school_child || 'N',
          invalid: formData.invalid || 'N',
          status: 'A',
          tran_code: 'ADD',
          date_modified: new Date().toISOString(),
          userid: user?.id,
        };

        const { error } = await supabase
          .from('ip_depend')
          .insert(insertData as any);

        if (error) throw error;
        toast.success('Dependent added');
      }

      setShowDialog(false);
      fetchDependents();
    } catch (error) {
      console.error('Error saving dependent:', error);
      toast.error('Failed to save dependent');
    }
  };

  const getRelationLabel = (code: string) => {
    const relation = dependentRelations?.find(r => r.code === code);
    return relation?.description || code;
  };

  const getDisplayName = (dep: Dependent) => {
    return `${dep.firstname || ''} ${dep.middle_name_dep || ''} ${dep.surname || ''}`.trim();
  };

  const getAddress = (dep: Dependent) => {
    return [dep.depend_addr1, dep.depend_addr2].filter(Boolean).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dependents</h2>
        {isEditable && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Dependent
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : dependents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No dependents added yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dependents.map((dependent) => (
            <Card key={dependent.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{getDisplayName(dependent)}</p>
                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                        {dependent.depend_ssn && <p>SSN: {dependent.depend_ssn}</p>}
                        {dependent.dob && (
                          <p>Date of Birth: {format(new Date(dependent.dob), 'dd/MM/yyyy')}</p>
                        )}
                        {dependent.sex && (
                          <p>Gender: {dependent.sex === 'M' ? 'Male' : dependent.sex === 'F' ? 'Female' : dependent.sex}</p>
                        )}
                        {dependent.relation && (
                          <p>Relation: {getRelationLabel(dependent.relation)}</p>
                        )}
                        {getAddress(dependent) && <p>Address: {getAddress(dependent)}</p>}
                        <div className="flex gap-4">
                          {dependent.school_child === 'Y' && <span className="text-primary">School Child</span>}
                          {dependent.invalid === 'Y' && <span className="text-destructive">Invalid</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isEditable && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(dependent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(dependent)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDependent ? 'Edit' : 'Add'} Dependent</DialogTitle>
          </DialogHeader>
          
          <form noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dependent SSN</Label>
              <Input
                value={formData.depend_ssn || ''}
                onChange={(e) => setFormData({ ...formData, depend_ssn: e.target.value })}
                placeholder="Enter SSN"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Relation</Label>
              <Select 
                value={formData.relation || ''} 
                onValueChange={(v) => setFormData({ ...formData, relation: v })}
                disabled={relationsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  {dependentRelations?.map(r => (
                    <SelectItem key={r.code} value={r.code}>{r.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                value={formData.firstname || ''}
                onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                placeholder="Enter first name"
                maxLength={25}
              />
            </div>

            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input
                value={formData.middle_name_dep || ''}
                onChange={(e) => setFormData({ ...formData, middle_name_dep: e.target.value })}
                placeholder="Enter middle name"
                maxLength={25}
              />
            </div>

            <div className="space-y-2">
              <Label>Surname <span className="text-destructive">*</span></Label>
              <Input
                value={formData.surname || ''}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Enter surname"
                maxLength={25}
              />
            </div>

            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <DatePickerWithDropdowns
                date={formData.dob ? new Date(formData.dob) : undefined}
                onSelect={(date) => setFormData({ ...formData, dob: date ? format(date, 'yyyy-MM-dd') : '' })}
                placeholder="Select date of birth"
                maxDate={new Date()}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select 
                value={formData.sex || ''} 
                onValueChange={(v) => setFormData({ ...formData, sex: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Address Line 1</Label>
              <Input
                value={formData.depend_addr1 || ''}
                onChange={(e) => setFormData({ ...formData, depend_addr1: e.target.value })}
                placeholder="Enter address"
                maxLength={30}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.depend_addr2 || ''}
                onChange={(e) => setFormData({ ...formData, depend_addr2: e.target.value })}
                placeholder="Enter address"
                maxLength={30}
              />
            </div>

            <div className="flex items-center gap-6 md:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="school_child"
                  checked={formData.school_child === 'Y'}
                  onCheckedChange={(checked) => setFormData({ ...formData, school_child: checked ? 'Y' : 'N' })}
                />
                <Label htmlFor="school_child">School Child</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="invalid"
                  checked={formData.invalid === 'Y'}
                  onCheckedChange={(checked) => setFormData({ ...formData, invalid: checked ? 'Y' : 'N' })}
                />
                <Label htmlFor="invalid">Invalid</Label>
              </div>
            </div>
          </form>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dependent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the dependent record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
