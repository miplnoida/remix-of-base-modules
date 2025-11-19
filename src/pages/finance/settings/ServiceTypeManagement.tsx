import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { SERVICE_TYPES } from '@/services/mockData/masterData';
import { ServiceType } from '@/types/serviceRequest';
import { getServiceCategories, getProcessingUnits } from '@/services/serviceRequestService';

export default function ServiceTypeManagementPage() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(SERVICE_TYPES);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const categories = getServiceCategories();
  const processingUnits = getProcessingUnits();

  const handleAdd = () => {
    setIsAdding(true);
    setEditingType({
      id: `SVC${String(serviceTypes.length + 1).padStart(3, '0')}`,
      categoryId: '',
      name: '',
      description: '',
      requiresVerification: false
    });
  };

  const handleSave = () => {
    if (editingType) {
      if (isAdding) {
        setServiceTypes([...serviceTypes, editingType]);
      } else {
        setServiceTypes(serviceTypes.map(st => st.id === editingType.id ? editingType : st));
      }
      setEditingType(null);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    setServiceTypes(serviceTypes.filter(st => st.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Type Management</h1>
          <p className="text-muted-foreground">Manage service types and their verification requirements</p>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Service Type
        </Button>
      </div>

      {(editingType || isAdding) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? 'Add New Service Type' : 'Edit Service Type'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Category</Label>
                <Select
                  value={editingType.categoryId}
                  onValueChange={(value) => setEditingType({ ...editingType, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Name</Label>
                <Input
                  value={editingType.name}
                  onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingType.description}
                onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Processing Unit</Label>
                <Select
                  value={editingType.defaultProcessingUnitId || ''}
                  onValueChange={(value) => setEditingType({ ...editingType, defaultProcessingUnitId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {processingUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingType.requiresExpressOption || false}
                  onCheckedChange={(checked) => setEditingType({ ...editingType, requiresExpressOption: checked })}
                />
                <Label>Requires Express Option</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingType.requiresVerification || false}
                  onCheckedChange={(checked) => setEditingType({ ...editingType, requiresVerification: checked })}
                />
                <Label>Requires Verification/Approval</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setEditingType(null); setIsAdding(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {serviceTypes.map((serviceType) => {
              const category = categories.find(c => c.id === serviceType.categoryId);
              return (
                <div key={serviceType.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{serviceType.name}</p>
                    <p className="text-sm text-muted-foreground">{category?.name}</p>
                    <p className="text-xs text-muted-foreground">{serviceType.description}</p>
                    {serviceType.requiresVerification && (
                      <span className="inline-block mt-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        Requires Verification
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingType(serviceType); setIsAdding(false); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(serviceType.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
