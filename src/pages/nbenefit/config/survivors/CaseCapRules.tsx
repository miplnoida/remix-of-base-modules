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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCaseCapConfigs,
  saveCaseCapConfig,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import { SurvivorCaseCapConfig, MaxBaseType, ScalingMethod } from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function CaseCapRules() {
  const [configs, setConfigs] = useState<SurvivorCaseCapConfig[]>(getCaseCapConfigs());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SurvivorCaseCapConfig | null>(null);
  const [formData, setFormData] = useState<{
    maxBaseType: MaxBaseType;
    maxFormulaExpression: string;
    scalingMethodWhenExceeded: ScalingMethod;
    priorityRules: string;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    maxBaseType: 'REFERENCE_PENSION',
    maxFormulaExpression: 'min(ReferencePension, 5000)',
    scalingMethodWhenExceeded: 'PRO_RATA',
    priorityRules: '{"WIDOW": 1, "CHILD": 2, "PARENT": 3}',
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (config: SurvivorCaseCapConfig) => {
    setEditingConfig(config);
    setFormData({
      maxBaseType: config.maxBaseType,
      maxFormulaExpression: config.maxFormulaExpression,
      scalingMethodWhenExceeded: config.scalingMethodWhenExceeded,
      priorityRules: JSON.stringify(config.priorityRules, null, 2),
      effectiveFrom: config.effectiveFrom,
      status: config.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this case cap configuration?')) {
      deleteConfig('caseCap', id);
      setConfigs(getCaseCapConfigs());
      toast.success('Case cap configuration deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const priorityRules = JSON.parse(formData.priorityRules);
      const saved = saveCaseCapConfig({
        ...(editingConfig || {}),
        ...formData,
        priorityRules,
      } as any);
      setConfigs(getCaseCapConfigs());
      toast.success(editingConfig ? 'Case cap updated' : 'Case cap created');
      handleClose();
    } catch (error) {
      toast.error('Invalid JSON in priority rules');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setFormData({
      maxBaseType: 'REFERENCE_PENSION',
      maxFormulaExpression: 'min(ReferencePension, 5000)',
      scalingMethodWhenExceeded: 'PRO_RATA',
      priorityRules: '{"WIDOW": 1, "CHILD": 2, "PARENT": 3}',
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Case Cap / Maximum Amount Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure maximum total benefits per survivor case and scaling methods
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Case Cap Rule
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Config ID</TableHead>
              <TableHead>Max Base Type</TableHead>
              <TableHead>Formula Expression</TableHead>
              <TableHead>Scaling Method</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.id}</TableCell>
                <TableCell>{config.maxBaseType}</TableCell>
                <TableCell className="font-mono text-sm">
                  {config.maxFormulaExpression}
                </TableCell>
                <TableCell>{config.scalingMethodWhenExceeded}</TableCell>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit' : 'Add'} Case Cap Rule
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Maximum Base Type</Label>
                <Select
                  value={formData.maxBaseType}
                  onValueChange={(value: MaxBaseType) =>
                    setFormData({ ...formData, maxBaseType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REFERENCE_PENSION">Reference Pension</SelectItem>
                    <SelectItem value="AVERAGE_ANNUAL_WAGES">
                      Average Annual Wages
                    </SelectItem>
                    <SelectItem value="CUSTOM_FORMULA">Custom Formula</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Scaling Method When Exceeded</Label>
                <Select
                  value={formData.scalingMethodWhenExceeded}
                  onValueChange={(value: ScalingMethod) =>
                    setFormData({ ...formData, scalingMethodWhenExceeded: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRO_RATA">Pro-Rata (proportional)</SelectItem>
                    <SelectItem value="PRIORITY_ORDER">Priority Order</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Maximum Formula Expression</Label>
              <Input
                value={formData.maxFormulaExpression}
                onChange={(e) =>
                  setFormData({ ...formData, maxFormulaExpression: e.target.value })
                }
                placeholder="e.g., min(ReferencePension, 5000)"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Example: min(ReferencePension, 5000), or ReferencePension * 0.8
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Priority Rules (JSON)</Label>
              <Textarea
                value={formData.priorityRules}
                onChange={(e) =>
                  setFormData({ ...formData, priorityRules: e.target.value })
                }
                rows={6}
                placeholder='{"WIDOW": 1, "WIDOWER": 1, "CHILD": 2, "PARENT": 3}'
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers get paid first when scaling by priority. Used when Scaling Method is
                "Priority Order".
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Case Cap Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
