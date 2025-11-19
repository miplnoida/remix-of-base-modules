import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { FEE_CONFIGURATIONS } from '@/services/mockData/feeConfiguration';
import { FeeConfiguration } from '@/types/serviceRequest';
import { getServiceTypeById } from '@/services/serviceRequestService';

export default function FeeConfigurationPage() {
  const [fees, setFees] = useState<FeeConfiguration[]>(FEE_CONFIGURATIONS);
  const [editingFee, setEditingFee] = useState<FeeConfiguration | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    setIsAdding(true);
    setEditingFee({
      id: `FEE${String(fees.length + 1).padStart(3, '0')}`,
      serviceTypeId: '',
      amount: 0,
      accountingHeadCode: '',
      accountingHeadName: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      active: true
    });
  };

  const handleSave = () => {
    if (editingFee) {
      // Auto-set effectiveTo to today if deactivating
      const updatedFee = { ...editingFee };
      if (!editingFee.active && !editingFee.effectiveTo) {
        updatedFee.effectiveTo = new Date().toISOString().split('T')[0];
      }
      
      if (isAdding) {
        setFees([...fees, updatedFee]);
      } else {
        setFees(fees.map(f => f.id === updatedFee.id ? updatedFee : f));
      }
      setEditingFee(null);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    setFees(fees.filter(f => f.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Configuration</h1>
          <p className="text-muted-foreground">Manage service fees and accounting mappings</p>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Fee
        </Button>
      </div>

      {(editingFee || isAdding) && (
        <Card>
          <CardHeader>
            <CardTitle>{isAdding ? 'Add New Fee' : 'Edit Fee'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Type ID</Label>
                <Input
                  value={editingFee.serviceTypeId}
                  onChange={(e) => setEditingFee({ ...editingFee, serviceTypeId: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount (EC$)</Label>
                <Input
                  type="number"
                  value={editingFee.amount}
                  onChange={(e) => setEditingFee({ ...editingFee, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Accounting Head Code</Label>
                <Input
                  value={editingFee.accountingHeadCode}
                  onChange={(e) => setEditingFee({ ...editingFee, accountingHeadCode: e.target.value })}
                />
              </div>
              <div>
                <Label>Accounting Head Name</Label>
                <Input
                  value={editingFee.accountingHeadName}
                  onChange={(e) => setEditingFee({ ...editingFee, accountingHeadName: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={editingFee.effectiveFrom}
                  onChange={(e) => setEditingFee({ ...editingFee, effectiveFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective To</Label>
                <Input
                  type="date"
                  value={editingFee.effectiveTo || ''}
                  onChange={(e) => setEditingFee({ ...editingFee, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editingFee.active}
                onCheckedChange={(checked) => setEditingFee({ ...editingFee, active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setEditingFee(null); setIsAdding(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Fee Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fees.map((fee) => {
              const serviceType = getServiceTypeById(fee.serviceTypeId);
              return (
                <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{serviceType?.name || fee.serviceTypeId}</p>
                    <p className="text-sm text-muted-foreground">
                      EC$ {fee.amount.toFixed(2)} - {fee.accountingHeadName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Effective: {fee.effectiveFrom} {fee.effectiveTo ? `to ${fee.effectiveTo}` : '(ongoing)'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${fee.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {fee.active ? 'Active' : 'Inactive'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingFee(fee); setIsAdding(false); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)}>
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
