import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Trash2 } from 'lucide-react';
import { IPDependentData, initialIPDependentData } from '@/types/ipRegistration';
import { useDependentRelations } from '@/hooks/useIPMasterLookups';

interface DependentsTabProps {
  dependents: IPDependentData[];
  onAddDependent: (dependent: IPDependentData) => void;
  onDeleteDependent: (id: string) => void;
  isEditable: boolean;
}

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Not-specified' },
];

export const DependentsTab: React.FC<DependentsTabProps> = ({
  dependents,
  onAddDependent,
  onDeleteDependent,
  isEditable,
}) => {
  const { data: relations = [], isLoading: loadingRelations } = useDependentRelations();
  const [newDependent, setNewDependent] = useState<IPDependentData>(initialIPDependentData);

  const handleAddDependent = () => {
    if (newDependent.surname && newDependent.firstname) {
      onAddDependent({
        ...newDependent,
        depend_id: `D${Date.now().toString().slice(-5)}`,
      });
      setNewDependent(initialIPDependentData);
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
              <div>
                <Label>Dependent SSN</Label>
                <Input
                  value={newDependent.depend_ssn}
                  onChange={(e) => updateNewDependent('depend_ssn', e.target.value)}
                  maxLength={6}
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
              <div className="flex items-end gap-4">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{dep.firstname} {dep.surname}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DOB:</span>{' '}
                      <span className="font-medium">{dep.dob || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>{' '}
                      <span className="font-medium">
                        {dep.sex === 'M' ? 'Male' : dep.sex === 'F' ? 'Female' : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relation:</span>{' '}
                      <span className="font-medium">{dep.relation || 'N/A'}</span>
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
