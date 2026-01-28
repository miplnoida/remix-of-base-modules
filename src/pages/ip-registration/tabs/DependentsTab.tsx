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
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';

interface DependentsTabProps {
  uniqueUuid: string;
  ssn?: string | null;
  recordStatus: string;
  isEditable: boolean;
}

interface Dependent {
  ssn: string;
  depend_id: string;
  depend_ssn?: string | null;
  surname?: string | null;
  firstname?: string | null;
  middle_name?: string | null;
  dob?: string | null;
  sex?: string | null;
  relation?: string | null;
  depend_addr1?: string | null;
  depend_addr2?: string | null;
  school_child?: string | null;
  invalid?: string | null;
  status?: string | null;
  date_modified?: string | null;
  date_of_death?: string | null;
}

interface RelationType {
  code: string;
  description: string;
  surv_type?: string | null;
}

const genders = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Not-Specified' },
];

export default function DependentsTab({ uniqueUuid, ssn, recordStatus, isEditable }: DependentsTabProps) {
  const { user } = useAuth();
  const [relations, setRelations] = useState<RelationType[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [formData, setFormData] = useState<Partial<Dependent>>({});

  // Fetch relations from tb_relation
  const fetchRelations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tb_relation')
        .select('*')
        .order('description');

      if (error) throw error;
      setRelations(data || []);
    } catch (error) {
      console.error('Error fetching relations:', error);
    }
  }, []);

  // Fetch dependents from ip_depend using SSN
  const fetchDependents = useCallback(async () => {
    if (!ssn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_depend')
        .select('*')
        .eq('ssn', ssn)
        .neq('status', 'D')
        .order('depend_id', { ascending: true });

      if (error) throw error;
      setDependents((data || []) as Dependent[]);
    } catch (error) {
      console.error('Error fetching dependents:', error);
      toast.error('Failed to load dependents');
    } finally {
      setLoading(false);
    }
  }, [ssn]);

  useEffect(() => {
    fetchRelations();
    fetchDependents();
  }, [fetchRelations, fetchDependents]);

  // SSN lookup state
  const [isLookingUpSSN, setIsLookingUpSSN] = useState(false);
  const [ssnFound, setSsnFound] = useState(false);

  const handleAdd = () => {
    setSelectedDependent(null);
    setSsnFound(false);
    setFormData({
      depend_ssn: '',
      surname: '',
      firstname: '',
      middle_name: '',
      dob: '',
      sex: '',
      relation: '',
      depend_addr1: '',
      depend_addr2: '',
      school_child: 'N',
      invalid: 'N',
      date_of_death: '',
    });
    setShowDialog(true);
  };
  
  // SSN auto-fill lookup
  const handleSSNBlur = async () => {
    const dependentSSN = formData.depend_ssn;
    if (!dependentSSN || dependentSSN.length !== 6) {
      setSsnFound(false);
      return;
    }
    
    setIsLookingUpSSN(true);
    try {
      // Query ip_master to check if this SSN exists
      const { data, error } = await supabase
        .from('ip_master')
        .select('first_name, firstname, middle_name, last_name, surname, date_of_birth, dob, gender, sex, resident_address_1, resident_address_2, resident_addr1, resident_addr2')
        .eq('ssn', dependentSSN)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSsnFound(true);
        // Map data using available columns (prefer newer columns, fallback to legacy)
        const firstName = data.first_name || data.firstname || '';
        const middleName = data.middle_name || '';
        const lastName = data.last_name || data.surname || '';
        const dateOfBirth = data.date_of_birth || data.dob || '';
        const genderValue = data.gender || data.sex || '';
        const addr1 = data.resident_address_1 || data.resident_addr1 || '';
        const addr2 = data.resident_address_2 || data.resident_addr2 || '';
        
        // Convert gender to M/F/N format
        let sexCode = 'N';
        if (genderValue === 'Male' || genderValue === 'M') sexCode = 'M';
        else if (genderValue === 'Female' || genderValue === 'F') sexCode = 'F';
        
        setFormData(prev => ({
          ...prev,
          firstname: firstName,
          middle_name: middleName,
          surname: lastName,
          dob: dateOfBirth,
          sex: sexCode,
          depend_addr1: addr1,
          depend_addr2: addr2,
        }));
        
        toast.success('SSN found - details auto-filled', {
          description: `Found: ${firstName} ${lastName}`,
        });
      } else {
        setSsnFound(false);
      }
    } catch (error) {
      console.error('Error looking up SSN:', error);
    } finally {
      setIsLookingUpSSN(false);
    }
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
    if (!selectedDependent || !ssn) return;

    try {
      const { error } = await supabase
        .from('ip_depend')
        .update({ status: 'D', date_modified: new Date().toISOString() } as any)
        .eq('ssn', ssn)
        .eq('depend_id', selectedDependent.depend_id);

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

  // Validate SSN input (exactly 6 numeric digits)
  const validateDependentSSN = (value: string): boolean => {
    return /^\d{0,6}$/.test(value);
  };

  const handleSSNChange = (value: string) => {
    if (validateDependentSSN(value)) {
      setFormData({ ...formData, depend_ssn: value });
    }
  };

  const handleSave = async () => {
    if (!ssn) {
      toast.error('Please save the basic details first to get an SSN');
      return;
    }

    if (!formData.surname || !formData.firstname) {
      toast.error('Please check the form for valid information!', {
        description: 'Surname and first name are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
      });
      return;
    }

    // Validate depend_ssn if provided
    if (formData.depend_ssn && formData.depend_ssn.length !== 6) {
      toast.error('Dependent SSN must be exactly 6 digits');
      return;
    }

    try {
      if (selectedDependent) {
        // Update existing
        const { error } = await supabase
          .from('ip_depend')
          .update({
            depend_ssn: formData.depend_ssn || null,
            surname: formData.surname,
            firstname: formData.firstname,
            middle_name: formData.middle_name,
            dob: formData.dob || null,
            sex: formData.sex,
            relation: formData.relation,
            depend_addr1: formData.depend_addr1,
            depend_addr2: formData.depend_addr2,
            school_child: formData.school_child,
            invalid: formData.invalid,
            date_of_death: formData.date_of_death || null,
            date_modified: new Date().toISOString(),
            userid: user?.id?.substring(0, 5),
          } as any)
          .eq('ssn', ssn)
          .eq('depend_id', selectedDependent.depend_id);

        if (error) throw error;
        toast.success('Dependent updated');
      } else {
        // Generate depend_id
        const { data: nextIdData } = await supabase.rpc('generate_depend_id', { p_ssn: ssn });
        const dependId = nextIdData || '000001';

        // Insert new
        const insertData = {
          ssn: ssn,
          depend_id: dependId,
          depend_ssn: formData.depend_ssn || null,
          surname: formData.surname,
          firstname: formData.firstname,
          middle_name: formData.middle_name,
          dob: formData.dob || null,
          sex: formData.sex,
          relation: formData.relation,
          depend_addr1: formData.depend_addr1,
          depend_addr2: formData.depend_addr2,
          school_child: formData.school_child || 'N',
          invalid: formData.invalid || 'N',
          date_of_death: formData.date_of_death || null,
          status: 'A',
          tran_code: 'ADD',
          date_modified: new Date().toISOString(),
          userid: user?.id?.substring(0, 5),
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
    const relation = relations?.find(r => r.code === code);
    return relation?.description || code;
  };

  const getDisplayName = (dep: Dependent) => {
    return `${dep.firstname || ''} ${dep.middle_name || ''} ${dep.surname || ''}`.trim();
  };

  const getAddress = (dep: Dependent) => {
    return [dep.depend_addr1, dep.depend_addr2].filter(Boolean).join(', ');
  };

  if (!ssn) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Dependents</h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Please save the Basic Details first to enable adding dependents.
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Card key={`${dependent.ssn}-${dependent.depend_id}`}>
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
                          <p>Gender: {genders.find(g => g.value === dependent.sex)?.label || dependent.sex}</p>
                        )}
                        {dependent.relation && (
                          <p>Relation: {getRelationLabel(dependent.relation)}</p>
                        )}
                        {getAddress(dependent) && <p>Address: {getAddress(dependent)}</p>}
                        {dependent.date_of_death && (
                          <p className="text-destructive">Date of Death: {format(new Date(dependent.date_of_death), 'dd/MM/yyyy')}</p>
                        )}
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
              <Label>Dependent SSN (6 digits)</Label>
              <div className="relative">
                <Input
                  value={formData.depend_ssn || ''}
                  onChange={(e) => handleSSNChange(e.target.value)}
                  onBlur={handleSSNBlur}
                  placeholder="Enter 6-digit SSN to auto-fill"
                  maxLength={6}
                  inputMode="numeric"
                  className={ssnFound ? 'border-green-500' : ''}
                />
                {isLookingUpSSN && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {ssnFound && (
                <p className="text-xs text-green-600">SSN found - details auto-filled (editable)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Relation</Label>
              <Select 
                value={formData.relation || ''} 
                onValueChange={(v) => setFormData({ ...formData, relation: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  {relations?.map(r => (
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
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
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
                maxLength={50}
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

            <div className="space-y-2">
              <Label>Date of Death</Label>
              <DatePickerWithDropdowns
                date={formData.date_of_death ? new Date(formData.date_of_death) : undefined}
                onSelect={(date) => setFormData({ ...formData, date_of_death: date ? format(date, 'yyyy-MM-dd') : '' })}
                placeholder="Select date of death"
                maxDate={new Date()}
              />
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
