import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDependantTypeConfigs,
  saveDependantTypeConfig,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import { SurvivorDependantTypeConfig, DependantTypeCode } from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function DependantTypesConfig() {
  const [configs, setConfigs] = useState<SurvivorDependantTypeConfig[]>(
    getDependantTypeConfigs()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SurvivorDependantTypeConfig | null>(null);
  const [formData, setFormData] = useState<{
    dependantTypeCode: DependantTypeCode;
    description: string;
    isSupportedType: boolean;
    baseEligibilityConditions: string;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    dependantTypeCode: 'WIDOW',
    description: '',
    isSupportedType: false,
    baseEligibilityConditions: '{}',
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (config: SurvivorDependantTypeConfig) => {
    setEditingConfig(config);
    setFormData({
      dependantTypeCode: config.dependantTypeCode,
      description: config.description,
      isSupportedType: config.isSupportedType,
      baseEligibilityConditions: JSON.stringify(config.baseEligibilityConditions, null, 2),
      effectiveFrom: config.effectiveFrom,
      status: config.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this dependant type?')) {
      deleteConfig('dependantType', id);
      setConfigs(getDependantTypeConfigs());
      toast.success('Dependant type deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const conditions = JSON.parse(formData.baseEligibilityConditions);
      const saved = saveDependantTypeConfig({
        ...(editingConfig || {}),
        ...formData,
        baseEligibilityConditions: conditions,
      } as any);
      setConfigs(getDependantTypeConfigs());
      toast.success(editingConfig ? 'Dependant type updated' : 'Dependant type created');
      handleClose();
    } catch (error) {
      toast.error('Invalid JSON in eligibility conditions');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setFormData({
      dependantTypeCode: 'WIDOW',
      description: '',
      isSupportedType: false,
      baseEligibilityConditions: '{}',
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dependant Types & Eligibility</h1>
          <p className="text-muted-foreground mt-1">
            Configure dependant types and their base eligibility conditions
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Dependant Type
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Requires Support</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.dependantTypeCode}</TableCell>
                <TableCell>{config.description}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      config.isSupportedType
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {config.isSupportedType ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>{config.effectiveFrom}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      config.status === 'ACTIVE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {config.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit' : 'Add'} Dependant Type
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Dependant Type Code</Label>
              <Select
                value={formData.dependantTypeCode}
                onValueChange={(value: DependantTypeCode) =>
                  setFormData({ ...formData, dependantTypeCode: value })
                }
                disabled={!!editingConfig}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIDOW">Widow</SelectItem>
                  <SelectItem value="WIDOWER">Widower</SelectItem>
                  <SelectItem value="CHILD">Child</SelectItem>
                  <SelectItem value="ORPHAN_CHILD">Orphan Child</SelectItem>
                  <SelectItem value="INVALID_CHILD">Invalid Child</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Widow of deceased insured person"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Requires Support/Maintenance by Deceased</Label>
                <p className="text-sm text-muted-foreground">
                  For children, parents, and other dependants
                </p>
              </div>
              <Switch
                checked={formData.isSupportedType}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isSupportedType: checked })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Base Eligibility Conditions (JSON)</Label>
              <Textarea
                value={formData.baseEligibilityConditions}
                onChange={(e) =>
                  setFormData({ ...formData, baseEligibilityConditions: e.target.value })
                }
                rows={6}
                placeholder='{"mustBeUnmarried": true, "mustBeMaintainedOrLivingWithDeceased": true}'
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Example: {`{"mustBeUnmarried": true, "mustBeSupportedByDeceased": true}`}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveFrom: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'ACTIVE' | 'INACTIVE') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Dependant Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
