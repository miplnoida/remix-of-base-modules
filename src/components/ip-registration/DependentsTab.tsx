import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { IPDependentData, initialIPDependentData } from '@/types/ipRegistration';
import { useDependentRelations } from '@/hooks/useIPMasterLookups';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DependentsTabProps {
  dependents: IPDependentData[];
  onAddDependent: (dependent: IPDependentData) => void;
  onDeleteDependent: (id: string) => void;
  isEditable: boolean;
}

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Not-Specified' },
];

export const DependentsTab: React.FC<DependentsTabProps> = ({
  dependents,
  onAddDependent,
  onDeleteDependent,
  isEditable,
}) => {
  const { toast } = useToast();
  const { data: relations = [], isLoading: loadingRelations } = useDependentRelations();
  const [newDependent, setNewDependent] = useState<IPDependentData>(initialIPDependentData);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [ssnFound, setSsnFound] = useState<boolean | null>(null);

  // Lookup SSN in ip_master and auto-fill fields if found
  const lookupSSN = useCallback(async (ssn: string) => {
    if (!ssn || ssn.length < 6) {
      setSsnFound(null);
      return;
    }
    
    setIsLookingUp(true);
    try {
      // Query all possible column variants for compatibility
      const { data, error } = await supabase
        .from('ip_master')
        .select('first_name, firstname, middle_name, last_name, surname, date_of_birth, dob, gender, sex, resident_address_1, resident_address_2, resident_addr1, resident_addr2')
        .eq('ssn', ssn)
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
        
        setNewDependent(prev => ({
          ...prev,
          firstname: firstName,
          middle_name_dep: middleName,
          surname: lastName,
          dob: dateOfBirth,
          sex: sexCode,
          depend_addr1: addr1,
          depend_addr2: addr2,
        }));
        toast({
          title: 'SSN Found',
          description: 'Dependent information auto-filled from existing record.',
        });
      } else {
        setSsnFound(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error looking up SSN',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  }, [toast]);

  const handleSSNChange = (value: string) => {
    // Only allow numeric input and max 6 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setNewDependent(prev => ({ ...prev, depend_ssn: cleanValue }));
    setSsnFound(null); // Reset found status when SSN changes
  };

  const handleSSNBlur = () => {
    if (newDependent.depend_ssn && newDependent.depend_ssn.length === 6) {
      lookupSSN(newDependent.depend_ssn);
    }
  };

  const handleAddDependent = () => {
    if (newDependent.surname && newDependent.firstname) {
      onAddDependent({
        ...newDependent,
        depend_id: `D${Date.now().toString().slice(-5)}`,
      });
      setNewDependent(initialIPDependentData);
      setSsnFound(null);
    }
  };

  const updateNewDependent = (field: keyof IPDependentData, value: any) => {
    setNewDependent(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Dependent Form */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Add New Dependent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Dependent SSN</Label>
                <div className="relative">
                  <Input
                    value={newDependent.depend_ssn}
                    onChange={(e) => handleSSNChange(e.target.value)}
                    onBlur={handleSSNBlur}
                    maxLength={6}
                    placeholder="Enter 6 digits"
                    className={ssnFound === true ? 'border-green-500' : ssnFound === false ? 'border-amber-500' : ''}
                  />
                  {isLookingUp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {ssnFound === true && (
                  <p className="text-xs text-green-600 mt-1">✓ SSN found - fields auto-filled</p>
                )}
                {ssnFound === false && (
                  <p className="text-xs text-amber-600 mt-1">SSN not found - enter details manually</p>
                )}
              </div>
              <div>
                <Label>Surname *</Label>
                <Input
                  value={newDependent.surname}
                  onChange={(e) => updateNewDependent('surname', e.target.value)}
                  maxLength={50}
                />
              </div>
              <div>
                <Label>First Name *</Label>
                <Input
                  value={newDependent.firstname}
                  onChange={(e) => updateNewDependent('firstname', e.target.value)}
                  maxLength={25}
                />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input
                  value={newDependent.middle_name_dep}
                  onChange={(e) => updateNewDependent('middle_name_dep', e.target.value)}
                  maxLength={25}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={newDependent.dob}
                  onChange={(e) => updateNewDependent('dob', e.target.value)}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={newDependent.sex}
                  onValueChange={(value) => updateNewDependent('sex', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Relation</Label>
                <Select
                  value={newDependent.relation}
                  onValueChange={(value) => updateNewDependent('relation', value)}
                  disabled={loadingRelations}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {relations.map((rel) => (
                      <SelectItem key={rel.code} value={rel.code}>{rel.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Death</Label>
                <Input
                  type="date"
                  value={newDependent.date_of_death}
                  onChange={(e) => updateNewDependent('date_of_death', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={newDependent.depend_addr1}
                  onChange={(e) => updateNewDependent('depend_addr1', e.target.value)}
                  maxLength={30}
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input
                  value={newDependent.depend_addr2}
                  onChange={(e) => updateNewDependent('depend_addr2', e.target.value)}
                  maxLength={30}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="school_child_new"
                  checked={newDependent.school_child === 'Y'}
                  onCheckedChange={(checked) => updateNewDependent('school_child', checked ? 'Y' : 'N')}
                />
                <Label htmlFor="school_child_new" className="text-sm">School Child</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invalid_new"
                  checked={newDependent.invalid === 'Y'}
                  onCheckedChange={(checked) => updateNewDependent('invalid', checked ? 'Y' : 'N')}
                />
                <Label htmlFor="invalid_new" className="text-sm">Invalid</Label>
              </div>
            </div>
            <Button onClick={handleAddDependent} disabled={!newDependent.surname || !newDependent.firstname}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dependent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Dependents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dependents ({dependents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dependents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No dependents added yet.</p>
          ) : (
            <div className="space-y-3">
              {dependents.map((dep, index) => (
                <div key={dep.depend_id || index} className="border rounded-lg p-4 relative">
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => dep.depend_id && onDeleteDependent(dep.ssn ? `${dep.ssn}-${dep.depend_id}` : dep.depend_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">SSN:</span>{' '}
                      <span className="font-medium">{dep.depend_ssn || ''}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{dep.firstname} {dep.surname}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DOB:</span>{' '}
                      <span className="font-medium">{dep.dob || ''}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>{' '}
                      <span className="font-medium">
                        {dep.sex === 'M' ? 'Male' : dep.sex === 'F' ? 'Female' : dep.sex === 'N' ? 'Not-Specified' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relation:</span>{' '}
                      <span className="font-medium">{dep.relation || ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
