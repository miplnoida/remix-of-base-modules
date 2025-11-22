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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getInsuredEligibilityConfigs,
  saveInsuredEligibilityConfig,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import { SurvivorInsuredEligibilityConfig } from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function DeceasedEligibilityRules() {
  const [configs, setConfigs] = useState<SurvivorInsuredEligibilityConfig[]>(
    getInsuredEligibilityConfigs()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SurvivorInsuredEligibilityConfig | null>(null);
  const [formData, setFormData] = useState<{
    minContributions: number;
    requiresPensionStatus: boolean;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    minContributions: 150,
    requiresPensionStatus: true,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (config: SurvivorInsuredEligibilityConfig) => {
    setEditingConfig(config);
    setFormData({
      minContributions: config.minContributions,
      requiresPensionStatus: config.requiresPensionStatus,
      effectiveFrom: config.effectiveFrom,
      status: config.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      deleteConfig('insuredEligibility', id);
      setConfigs(getInsuredEligibilityConfigs());
      toast.success('Configuration deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const saved = saveInsuredEligibilityConfig(
        editingConfig ? { ...editingConfig, ...formData } : formData
      );
      setConfigs(getInsuredEligibilityConfigs());
      toast.success(editingConfig ? 'Configuration updated' : 'Configuration created');
      handleClose();
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setFormData({
      minContributions: 150,
      requiresPensionStatus: true,
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deceased Eligibility Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure eligibility requirements for the deceased insured person
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule ID</TableHead>
              <TableHead>Min Contributions</TableHead>
              <TableHead>Requires Pension Status</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.id}</TableCell>
                <TableCell>{config.minContributions}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      config.requiresPensionStatus
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {config.requiresPensionStatus ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>{config.effectiveFrom}</TableCell>
                <TableCell>{config.effectiveTo || '-'}</TableCell>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
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
              {editingConfig ? 'Edit' : 'Add'} Deceased Eligibility Rule
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Minimum Contributions Required</Label>
              <Input
                type="number"
                value={formData.minContributions}
                onChange={(e) =>
                  setFormData({ ...formData, minContributions: Number(e.target.value) })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Requires Pension Status</Label>
                <p className="text-sm text-muted-foreground">
                  Deceased must have been receiving or qualified for Age/Invalidity pension
                </p>
              </div>
              <Switch
                checked={formData.requiresPensionStatus}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresPensionStatus: checked })
                }
              />
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
            <Button onClick={handleSave}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
