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
  // ip_depend fields
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
  // tmp_ip_dependents fields (different schema)
  relation_type?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
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

  // Determine which table to use based on record status
  const useTmpTable = recordStatus === 'D' || recordStatus === 'Z';

  const fetchDependents = useCallback(async () => {
    setLoading(true);
    try {
      if (useTmpTable) {
        // Use tmp_ip_dependents
        const { data, error } = await supabase
          .from('tmp_ip_dependents')
          .select('*')
          .eq('unique_uuid', uniqueUuid)
          .neq('status', 'archive')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDependents(data || []);
      } else {
        // Use ip_depend - query by unique_uuid
        const { data, error } = await supabase
          .from('ip_depend')
          .select('*')
          .eq('unique_uuid', uniqueUuid)
          .neq('status', 'D')
          .order('date_modified', { ascending: false });

        if (error) throw error;
        setDependents(data || []);
      }
    } catch (error) {
      console.error('Error fetching dependents:', error);
      toast.error('Failed to load dependents');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid, useTmpTable]);

  useEffect(() => {
    fetchDependents();
  }, [fetchDependents]);

  const handleAdd = () => {
    setSelectedDependent(null);
    if (useTmpTable) {
      setFormData({
        relation_type: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        address: '',
      });
    } else {
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
    }
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
      if (useTmpTable) {
        // Soft delete in tmp table
        const { error } = await supabase
          .from('tmp_ip_dependents')
          .update({ status: 'archive' })
          .eq('id', selectedDependent.id);

        if (error) throw error;
      } else {
        // For ip_depend, set status to D (Deleted)
        const { error } = await supabase
          .from('ip_depend')
          .update({ status: 'D', date_modified: new Date().toISOString() })
          .eq('id', selectedDependent.id);

        if (error) throw error;
      }

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
    // Validate based on table type
    if (useTmpTable) {
      if (!formData.first_name || !formData.last_name) {
        toast.error('Please check the form for valid information!', {
          description: 'First name and last name are required.',
          style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
          classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
        });
        return;
      }
    } else {
      if (!formData.surname || !formData.firstname) {
        toast.error('Please check the form for valid information!', {
          description: 'Surname and first name are required.',
          style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
          classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
        });
        return;
      }
    }

    try {
      if (selectedDependent) {
        // Update existing
        if (useTmpTable) {
          const { error } = await supabase
            .from('tmp_ip_dependents')
            .update({
              relation_type: formData.relation_type || '',
              first_name: formData.first_name,
              middle_name: formData.middle_name,
              last_name: formData.last_name,
              date_of_birth: formData.date_of_birth,
              gender: formData.gender,
              address: formData.address,
              updated_at: new Date().toISOString(),
              updated_by: user?.id,
            })
            .eq('id', selectedDependent.id);

          if (error) throw error;
        } else {
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
        }
        toast.success('Dependent updated');
      } else {
        // Insert new
        if (useTmpTable) {
          const { error } = await supabase
            .from('tmp_ip_dependents')
            .insert({
              unique_uuid: uniqueUuid,
              relation_type: formData.relation_type || 'Child',
              first_name: formData.first_name,
              middle_name: formData.middle_name,
              last_name: formData.last_name,
              date_of_birth: formData.date_of_birth || null,
              gender: formData.gender,
              address: formData.address,
              status: 'A',
              created_by: user?.id,
            });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('ip_depend')
            .insert({
              unique_uuid: uniqueUuid,
              relation_type: formData.relation || 'Child',
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
            });

          if (error) throw error;
        }
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

  // Helper to get display name based on table schema
  const getDisplayName = (dep: Dependent) => {
    if (useTmpTable) {
      return `${dep.first_name || ''} ${dep.middle_name || ''} ${dep.last_name || ''}`.trim();
    }
    return `${dep.firstname || ''} ${dep.middle_name_dep || ''} ${dep.surname || ''}`.trim();
  };

  const getDob = (dep: Dependent) => useTmpTable ? dep.date_of_birth : dep.dob;
  const getGender = (dep: Dependent) => useTmpTable ? dep.gender : dep.sex;
  const getRelation = (dep: Dependent) => useTmpTable ? dep.relation_type : dep.relation;
  const getAddress = (dep: Dependent) => {
    if (useTmpTable) return dep.address;
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
                        {!useTmpTable && dependent.depend_ssn && <p>SSN: {dependent.depend_ssn}</p>}
                        {getDob(dependent) && (
                          <p>Date of Birth: {format(new Date(getDob(dependent)!), 'dd/MM/yyyy')}</p>
                        )}
                        {getGender(dependent) && (
                          <p>Gender: {getGender(dependent) === 'M' ? 'Male' : getGender(dependent) === 'F' ? 'Female' : getGender(dependent)}</p>
                        )}
                        {getRelation(dependent) && (
                          <p>Relation: {useTmpTable ? getRelation(dependent) : getRelationLabel(getRelation(dependent)!)}</p>
                        )}
                        {getAddress(dependent) && <p>Address: {getAddress(dependent)}</p>}
                        {!useTmpTable && (
                          <div className="flex gap-4">
                            {dependent.school_child === 'Y' && <span className="text-primary">School Child</span>}
                            {dependent.invalid === 'Y' && <span className="text-destructive">Invalid</span>}
                          </div>
                        )}
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
            {useTmpTable ? (
              // tmp_ip_dependents form
              <>
                <div className="space-y-2">
                  <Label>Relation Type</Label>
                  <Select 
                    value={formData.relation_type || ''} 
                    onValueChange={(v) => setFormData({ ...formData, relation_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select 
                    value={formData.gender || ''} 
                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Enter first name"
                    maxLength={25}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input
                    value={formData.middle_name || ''}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    placeholder="Enter middle name"
                    maxLength={25}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Enter last name"
                    maxLength={25}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <DatePickerWithDropdowns
                    date={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                    onSelect={(date) => setFormData({ ...formData, date_of_birth: date ? format(date, 'yyyy-MM-dd') : '' })}
                    placeholder="Select date of birth"
                    maxDate={new Date()}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
              </>
            ) : (
              // ip_depend form
              <>
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
              </>
            )}
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
