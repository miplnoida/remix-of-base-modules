
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Dependent {
  id: string;
  surname: string;
  firstName: string;
  middleName: string;
  address: string;
  sex: string;
  dob: Date;
  relation: string;
  schoolChild: boolean;
  invalid: boolean;
  status: string;
  dateModified: Date;
  userId: string;
  dateOfDeath?: Date;
}

export const DependentTab = () => {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchSSN, setSearchSSN] = useState('');
  const [newDependent, setNewDependent] = useState<Partial<Dependent>>({
    schoolChild: false,
    invalid: false,
    status: 'Active'
  });

  const DatePicker = ({ date, onSelect, placeholder }: { date?: Date, onSelect: (date: Date | undefined) => void, placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  const handleSearchSSN = () => {
    console.log('Searching for SSN:', searchSSN);
    // Implement SSN search logic
  };

  const handleAddDependent = () => {
    if (newDependent.surname && newDependent.firstName && newDependent.dob) {
      const dependent: Dependent = {
        id: Date.now().toString(),
        surname: newDependent.surname!,
        firstName: newDependent.firstName!,
        middleName: newDependent.middleName || '',
        address: newDependent.address || '',
        sex: newDependent.sex || 'Male',
        dob: newDependent.dob!,
        relation: newDependent.relation || '',
        schoolChild: newDependent.schoolChild || false,
        invalid: newDependent.invalid || false,
        status: newDependent.status || 'Active',
        dateModified: new Date(),
        userId: 'current-user',
        dateOfDeath: newDependent.dateOfDeath
      };
      setDependents([...dependents, dependent]);
      setNewDependent({ schoolChild: false, invalid: false, status: 'Active' });
      setShowAddForm(false);
    }
  };

  const removeDependent = (id: string) => {
    setDependents(dependents.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dependent Management</CardTitle>
          <Button onClick={() => { setShowAddForm(true); setNewDependent({ schoolChild: false, invalid: false, status: 'Active' }); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Dependent
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add/Edit Dependent Form */}
          {showAddForm && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">{newDependent.id ? 'Edit Dependent' : 'Add New Dependent'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Surname *</Label>
                    <Input 
                      value={newDependent.surname || ''}
                      onChange={(e) => setNewDependent({...newDependent, surname: e.target.value})}
                      placeholder="Enter surname" 
                    />
                  </div>
                  <div>
                    <Label>First Name *</Label>
                    <Input 
                      value={newDependent.firstName || ''}
                      onChange={(e) => setNewDependent({...newDependent, firstName: e.target.value})}
                      placeholder="Enter first name" 
                    />
                  </div>
                  <div>
                    <Label>Middle Name</Label>
                    <Input 
                      value={newDependent.middleName || ''}
                      onChange={(e) => setNewDependent({...newDependent, middleName: e.target.value})}
                      placeholder="Enter middle name" 
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Input 
                    value={newDependent.address || ''}
                    onChange={(e) => setNewDependent({...newDependent, address: e.target.value})}
                    placeholder="Enter address" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Sex *</Label>
                    <Select value={newDependent.sex} onValueChange={(value) => setNewDependent({...newDependent, sex: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Not Specified">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of Birth *</Label>
                    <DatePicker
                      date={newDependent.dob}
                      onSelect={(date) => setNewDependent({...newDependent, dob: date})}
                      placeholder="Select date of birth"
                    />
                  </div>
                  <div>
                    <Label>Relation</Label>
                    <Select value={newDependent.relation} onValueChange={(value) => setNewDependent({...newDependent, relation: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="schoolChild" 
                      checked={newDependent.schoolChild}
                      onCheckedChange={(checked) => setNewDependent({...newDependent, schoolChild: checked as boolean})}
                    />
                    <Label htmlFor="schoolChild">School Child</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="invalid" 
                      checked={newDependent.invalid}
                      onCheckedChange={(checked) => setNewDependent({...newDependent, invalid: checked as boolean})}
                    />
                    <Label htmlFor="invalid">Invalid</Label>
                  </div>
                </div>

                <div>
                  <Label>Date of Death (if applicable)</Label>
                  <DatePicker
                    date={newDependent.dateOfDeath}
                    onSelect={(date) => setNewDependent({...newDependent, dateOfDeath: date})}
                    placeholder="Select date of death"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => {
                    if (newDependent.surname && newDependent.firstName && newDependent.dob) {
                      if (newDependent.id) {
                        // Edit mode: update existing
                        setDependents(dependents.map(d => d.id === newDependent.id ? {
                          ...d,
                          ...newDependent,
                          dob: newDependent.dob!,
                          dateModified: new Date(),
                        } as Dependent : d));
                      } else {
                        // Add mode: add new
                        const dependent: Dependent = {
                          id: Date.now().toString(),
                          surname: newDependent.surname!,
                          firstName: newDependent.firstName!,
                          middleName: newDependent.middleName || '',
                          address: newDependent.address || '',
                          sex: newDependent.sex || 'Male',
                          dob: newDependent.dob!,
                          relation: newDependent.relation || '',
                          schoolChild: newDependent.schoolChild || false,
                          invalid: newDependent.invalid || false,
                          status: newDependent.status || 'Active',
                          dateModified: new Date(),
                          userId: 'current-user',
                          dateOfDeath: newDependent.dateOfDeath
                        };
                        setDependents([...dependents, dependent]);
                      }
                      setNewDependent({ schoolChild: false, invalid: false, status: 'Active' });
                      setShowAddForm(false);
                    }
                  }}>{newDependent.id ? 'Update Dependent' : 'Add Dependent'}</Button>
                  <Button variant="outline" onClick={() => { setShowAddForm(false); setNewDependent({ schoolChild: false, invalid: false, status: 'Active' }); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dependents List */}
          <div className="space-y-4">
            {dependents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No dependents added yet</p>
            ) : (
              <div className="space-y-4">
                {dependents.map((dependent) => (
                  <Card key={dependent.id}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        {/* Full Name - full width, single line */}
                        <div className="w-full mb-2 md:mb-0">
                          <p className="font-semibold text-lg">{dependent.firstName} {dependent.middleName} {dependent.surname}</p>
                        </div>
                        {/* Action Buttons - right aligned on desktop */}
                        <div className="flex gap-2 md:ml-4 mt-2 md:mt-0 self-end md:self-center">
                          <Button variant="outline" size="sm" onClick={() => {
                            setShowAddForm(true);
                            setNewDependent({ ...dependent });
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeDependent(dependent.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Details Row - Sex/Relation and Status/Modified in a single row at the bottom */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                      <div>
                          <p className="text-sm text-gray-600"><strong>DOB:</strong> {format(dependent.dob, 'PPP')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-end mt-2">
                        <div className="flex-1 mb-2 md:mb-0">
                          <p className="text-sm"><strong>Sex:</strong> {dependent.sex}</p>
                          <p className="text-sm"><strong>Relation:</strong> {dependent.relation}</p>
                        </div>
                        <div className="flex-1 mb-2 md:mb-0">
                          <p className="text-sm"><strong>Status:</strong> {dependent.status}</p>
                          <p className="text-sm"><strong>Modified:</strong> {format(dependent.dateModified, 'PPP')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center md:ml-4">
                          {dependent.schoolChild && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">School Child</span>}
                          {dependent.invalid && <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Invalid</span>}
                          {dependent.dateOfDeath && <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Deceased</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
