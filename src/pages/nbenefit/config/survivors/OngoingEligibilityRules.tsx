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
  getOngoingRules,
  saveOngoingRule,
  deleteConfig,
} from '@/services/survivorRulesConfigService';
import {
  SurvivorOngoingEligibilityRule,
  DependantTypeCode,
  OngoingCheckEvent,
  OngoingActionIfFailed,
} from '@/types/survivorBenefitRules';
import { toast } from 'sonner';

export default function OngoingEligibilityRules() {
  const [rules, setRules] = useState<SurvivorOngoingEligibilityRule[]>(getOngoingRules());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SurvivorOngoingEligibilityRule | null>(null);
  const [formData, setFormData] = useState<{
    dependantTypeCode: DependantTypeCode;
    maxAge?: number;
    requiresSchool?: boolean;
    stopOnRemarriage?: boolean;
    stopOnEndDate?: boolean;
    requiresLifeCertificate?: boolean;
    appliesAtEvent: OngoingCheckEvent;
    actionIfFailed: OngoingActionIfFailed;
    effectiveFrom: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    dependantTypeCode: 'WIDOW',
    appliesAtEvent: 'MONTHLY_PAY_RUN',
    actionIfFailed: 'SUSPEND_BENEFIT',
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const handleEdit = (rule: SurvivorOngoingEligibilityRule) => {
    setEditingRule(rule);
    setFormData({
      dependantTypeCode: rule.dependantTypeCode,
      maxAge: rule.conditionExpression.maxAge,
      requiresSchool: rule.conditionExpression.requiresSchool,
      stopOnRemarriage: rule.conditionExpression.stopOnRemarriage,
      stopOnEndDate: rule.conditionExpression.stopOnEndDate,
      requiresLifeCertificate: rule.conditionExpression.requiresLifeCertificate,
      appliesAtEvent: rule.appliesAtEvent,
      actionIfFailed: rule.actionIfFailed,
      effectiveFrom: rule.effectiveFrom,
      status: rule.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this ongoing eligibility rule?')) {
      deleteConfig('ongoingRule', id);
      setRules(getOngoingRules());
      toast.success('Ongoing eligibility rule deleted successfully');
    }
  };

  const handleSave = () => {
    try {
      const conditionExpression: any = {};
      if (formData.maxAge !== undefined) conditionExpression.maxAge = formData.maxAge;
      if (formData.requiresSchool !== undefined)
        conditionExpression.requiresSchool = formData.requiresSchool;
      if (formData.stopOnRemarriage !== undefined)
        conditionExpression.stopOnRemarriage = formData.stopOnRemarriage;
      if (formData.stopOnEndDate !== undefined)
        conditionExpression.stopOnEndDate = formData.stopOnEndDate;
      if (formData.requiresLifeCertificate !== undefined)
        conditionExpression.requiresLifeCertificate = formData.requiresLifeCertificate;

      const saved = saveOngoingRule({
        ...(editingRule || {}),
        dependantTypeCode: formData.dependantTypeCode,
        conditionExpression,
        appliesAtEvent: formData.appliesAtEvent,
        actionIfFailed: formData.actionIfFailed,
        effectiveFrom: formData.effectiveFrom,
        status: formData.status,
      } as any);

      setRules(getOngoingRules());
      toast.success(editingRule ? 'Ongoing rule updated' : 'Ongoing rule created');
      handleClose();
    } catch (error) {
      toast.error('Failed to save ongoing eligibility rule');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setFormData({
      dependantTypeCode: 'WIDOW',
      appliesAtEvent: 'MONTHLY_PAY_RUN',
      actionIfFailed: 'SUSPEND_BENEFIT',
      effectiveFrom: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ongoing Eligibility Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure checks that run at each payment period to verify continued eligibility
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Ongoing Rule
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule ID</TableHead>
              <TableHead>Dependant Type</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Applies At</TableHead>
              <TableHead>Action If Failed</TableHead>
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
                <TableCell className="text-sm">{rule.appliesAtEvent}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      rule.actionIfFailed === 'TERMINATE_BENEFIT'
                        ? 'bg-red-100 text-red-800'
                        : rule.actionIfFailed === 'SUSPEND_BENEFIT'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rule.actionIfFailed}
                  </span>
                </TableCell>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit' : 'Add'} Ongoing Eligibility Rule
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Condition Expression</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Maximum Age (optional)</Label>
                  <Input
                    type="number"
                    value={formData.maxAge || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxAge: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 16 or 18"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires School Enrollment</Label>
                    <p className="text-sm text-muted-foreground">
                      Must be in school if beyond age limit
                    </p>
                  </div>
                  <Switch
                    checked={formData.requiresSchool || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requiresSchool: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stop On Remarriage</Label>
                    <p className="text-sm text-muted-foreground">
                      Terminate if beneficiary remarries
                    </p>
                  </div>
                  <Switch
                    checked={formData.stopOnRemarriage || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, stopOnRemarriage: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stop On End Date</Label>
                    <p className="text-sm text-muted-foreground">
                      Terminate if expected end date reached
                    </p>
                  </div>
                  <Switch
                    checked={formData.stopOnEndDate || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, stopOnEndDate: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Life Certificate</Label>
                    <p className="text-sm text-muted-foreground">
                      Suspend if life certificate not received
                    </p>
                  </div>
                  <Switch
                    checked={formData.requiresLifeCertificate || false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requiresLifeCertificate: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Rule Application</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Applies At Event</Label>
                  <Select
                    value={formData.appliesAtEvent}
                    onValueChange={(value: OngoingCheckEvent) =>
                      setFormData({ ...formData, appliesAtEvent: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY_PAY_RUN">Monthly Pay Run</SelectItem>
                      <SelectItem value="LIFE_CERTIFICATE_CHECK">
                        Life Certificate Check
                      </SelectItem>
                      <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Action If Failed</Label>
                  <Select
                    value={formData.actionIfFailed}
                    onValueChange={(value: OngoingActionIfFailed) =>
                      setFormData({ ...formData, actionIfFailed: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUSPEND_BENEFIT">Suspend Benefit</SelectItem>
                      <SelectItem value="TERMINATE_BENEFIT">Terminate Benefit</SelectItem>
                      <SelectItem value="FLAG_FOR_REVIEW">Flag For Review</SelectItem>
                    </SelectContent>
                  </Select>
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
            <Button onClick={handleSave}>Save Ongoing Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
