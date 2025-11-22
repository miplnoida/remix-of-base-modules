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
  getShareRules,
  saveShareRule,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import { SurvivorShareRuleConfig, DependantTypeCode, ShareBaseType } from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function ShareAllocationRules() {
  const [rules, setRules] = useState<SurvivorShareRuleConfig[]>(getShareRules());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SurvivorShareRuleConfig | null>(null);
  const [formData, setFormData] = useState<{
    dependantTypeCode: DependantTypeCode;
    shareBaseType: ShareBaseType;
    sharePercentage: number;
    minimumAmount?: number;
    isOptionalFormula: boolean;
    priority: number;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    dependantTypeCode: 'WIDOW',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 50,
    isOptionalFormula: false,
    priority: 1,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (rule: SurvivorShareRuleConfig) => {
    setEditingRule(rule);
    setFormData({
      dependantTypeCode: rule.dependantTypeCode,
      shareBaseType: rule.shareBaseType,
      sharePercentage: rule.sharePercentage,
      minimumAmount: rule.minimumAmount,
      isOptionalFormula: rule.isOptionalFormula,
      priority: rule.priority,
      effectiveFrom: rule.effectiveFrom,
      status: rule.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this share rule?')) {
      deleteConfig('shareRule', id);
      setRules(getShareRules());
      toast.success('Share rule deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const saved = saveShareRule({
        ...(editingRule || {}),
        ...formData,
      } as any);
      setRules(getShareRules());
      toast.success(editingRule ? 'Share rule updated' : 'Share rule created');
      handleClose();
    } catch (error) {
      toast.error('Failed to save share rule');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setFormData({
      dependantTypeCode: 'WIDOW',
      shareBaseType: 'REFERENCE_PENSION',
      sharePercentage: 50,
      isOptionalFormula: false,
      priority: 1,
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Share / Allocation Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure percentage shares and minimums for each dependant type
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Share Rule
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule ID</TableHead>
              <TableHead>Dependant Type</TableHead>
              <TableHead>Base Type</TableHead>
              <TableHead>Share %</TableHead>
              <TableHead>Minimum Amount</TableHead>
              <TableHead>Optional Formula</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.id}</TableCell>
                <TableCell>{rule.dependantTypeCode}</TableCell>
                <TableCell className="text-sm">{rule.shareBaseType}</TableCell>
                <TableCell>{rule.sharePercentage}%</TableCell>
                <TableCell>
                  {rule.minimumAmount ? `XCD ${rule.minimumAmount.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      rule.isOptionalFormula
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rule.isOptionalFormula ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      rule.status === 'ACTIVE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rule.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
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
              {editingRule ? 'Edit' : 'Add'} Share / Allocation Rule
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Dependant Type</Label>
                <Select
                  value={formData.dependantTypeCode}
                  onValueChange={(value: DependantTypeCode) =>
                    setFormData({ ...formData, dependantTypeCode: value })
                  }
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
                <Label>Share Base Type</Label>
                <Select
                  value={formData.shareBaseType}
                  onValueChange={(value: ShareBaseType) =>
                    setFormData({ ...formData, shareBaseType: value })
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
                    <SelectItem value="MAXIMUM_AMOUNT">Maximum Amount</SelectItem>
                    <SelectItem value="FLAT_AMOUNT">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Share Percentage</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.sharePercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, sharePercentage: Number(e.target.value) })
                  }
                  placeholder="e.g., 50 for 50%, 16.667 for 1/6"
                />
              </div>

              <div className="grid gap-2">
                <Label>Minimum Amount (XCD, optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.minimumAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 206.40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Optional Formula</Label>
                  <p className="text-sm text-muted-foreground">
                    Multiple options, engine selects best
                  </p>
                </div>
                <Switch
                  checked={formData.isOptionalFormula}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isOptionalFormula: checked })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Priority (higher wins)</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: Number(e.target.value) })
                  }
                />
              </div>
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
            <Button onClick={handleSave}>Save Share Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
