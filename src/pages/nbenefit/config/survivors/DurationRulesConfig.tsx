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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDurationRules,
  saveDurationRule,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import { SurvivorDependantDurationRule, DependantTypeCode, PaymentDurationType } from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function DurationRulesConfig() {
  const [rules, setRules] = useState<SurvivorDependantDurationRule[]>(getDurationRules());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SurvivorDependantDurationRule | null>(null);
  const [formData, setFormData] = useState<{
    dependantTypeCode: DependantTypeCode;
    ageMin?: number;
    ageMax?: number;
    relationshipYearsMin?: number;
    isInvalid?: boolean;
    isInSchool?: boolean;
    paymentDurationType: PaymentDurationType;
    paymentDurationValue?: string | number;
    priority: number;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    dependantTypeCode: 'WIDOW',
    paymentDurationType: 'FIXED_YEARS',
    priority: 1,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (rule: SurvivorDependantDurationRule) => {
    setEditingRule(rule);
    setFormData({
      dependantTypeCode: rule.dependantTypeCode,
      ageMin: rule.conditionExpression.ageMin,
      ageMax: rule.conditionExpression.ageMax,
      relationshipYearsMin: rule.conditionExpression.relationshipYearsMin,
      isInvalid: rule.conditionExpression.isInvalid,
      isInSchool: rule.conditionExpression.isInSchool,
      paymentDurationType: rule.paymentDurationType,
      paymentDurationValue: rule.paymentDurationValue,
      priority: rule.priority,
      effectiveFrom: rule.effectiveFrom,
      status: rule.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this duration rule?')) {
      deleteConfig('durationRule', id);
      setRules(getDurationRules());
      toast.success('Duration rule deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const conditionExpression: any = {};
      if (formData.ageMin !== undefined) conditionExpression.ageMin = formData.ageMin;
      if (formData.ageMax !== undefined) conditionExpression.ageMax = formData.ageMax;
      if (formData.relationshipYearsMin !== undefined)
        conditionExpression.relationshipYearsMin = formData.relationshipYearsMin;
      if (formData.isInvalid !== undefined)
        conditionExpression.isInvalid = formData.isInvalid;
      if (formData.isInSchool !== undefined)
        conditionExpression.isInSchool = formData.isInSchool;

      const saved = saveDurationRule({
        ...(editingRule || {}),
        dependantTypeCode: formData.dependantTypeCode,
        conditionExpression,
        paymentDurationType: formData.paymentDurationType,
        paymentDurationValue: formData.paymentDurationValue,
        priority: formData.priority,
        effectiveFrom: formData.effectiveFrom,
        status: formData.status,
      } as any);

      setRules(getDurationRules());
      toast.success(editingRule ? 'Duration rule updated' : 'Duration rule created');
      handleClose();
    } catch (error) {
      toast.error('Failed to save duration rule');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setFormData({
      dependantTypeCode: 'WIDOW',
      paymentDurationType: 'FIXED_YEARS',
      priority: 1,
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Duration Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure how long dependants can receive survivor benefits
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Duration Rule
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule ID</TableHead>
              <TableHead>Dependant Type</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Duration Type</TableHead>
              <TableHead>Duration Value</TableHead>
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
                <TableCell className="text-sm">
                  {Object.entries(rule.conditionExpression)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')}
                </TableCell>
                <TableCell>{rule.paymentDurationType}</TableCell>
                <TableCell>{rule.paymentDurationValue || '-'}</TableCell>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      rule.status === 'ACTIVE'
                        ? 'bg-info/10 text-info'
                        : 'bg-muted text-muted-foreground'
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit' : 'Add'} Duration Rule
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Conditions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Age Min (optional)</Label>
                  <Input
                    type="number"
                    value={formData.ageMin || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ageMin: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 45"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Age Max (optional)</Label>
                  <Input
                    type="number"
                    value={formData.ageMax || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ageMax: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 16"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Min Relationship Years (optional)</Label>
                  <Input
                    type="number"
                    value={formData.relationshipYearsMin || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relationshipYearsMin: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g., 3"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Is Invalid (optional)</Label>
                  <Select
                    value={
                      formData.isInvalid === undefined
                        ? 'NONE'
                        : formData.isInvalid
                        ? 'TRUE'
                        : 'FALSE'
                    }
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        isInvalid:
                          value === 'NONE' ? undefined : value === 'TRUE',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not specified</SelectItem>
                      <SelectItem value="TRUE">Yes</SelectItem>
                      <SelectItem value="FALSE">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Is In School (optional)</Label>
                  <Select
                    value={
                      formData.isInSchool === undefined
                        ? 'NONE'
                        : formData.isInSchool
                        ? 'TRUE'
                        : 'FALSE'
                    }
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        isInSchool:
                          value === 'NONE' ? undefined : value === 'TRUE',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not specified</SelectItem>
                      <SelectItem value="TRUE">Yes</SelectItem>
                      <SelectItem value="FALSE">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Payment Duration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Duration Type</Label>
                  <Select
                    value={formData.paymentDurationType}
                    onValueChange={(value: PaymentDurationType) =>
                      setFormData({ ...formData, paymentDurationType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED_YEARS">Fixed Years</SelectItem>
                      <SelectItem value="UNTIL_AGE">Until Age</SelectItem>
                      <SelectItem value="UNTIL_EVENT">Until Event</SelectItem>
                      <SelectItem value="LIFE_WHILE_CONDITION">
                        Life While Condition
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Duration Value</Label>
                  <Input
                    value={formData.paymentDurationValue || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDurationValue: e.target.value })
                    }
                    placeholder="e.g., 1 (for years), 16 (for age), 'Until remarriage'"
                  />
                </div>
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
            <Button onClick={handleSave}>Save Duration Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
