import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { getDueDateRulesByScheme, createDueDateRule, updateDueDateRule, deleteDueDateRule } from '@/services/ssSettingsService';
import type { SSDueDateRule } from '@/types/ssSettings';

interface DueDateRulesTabProps {
  schemeId: string;
}

export default function DueDateRulesTab({ schemeId }: DueDateRulesTabProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState(getDueDateRulesByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SSDueDateRule | null>(null);

  const handleSave = (rule: Partial<SSDueDateRule>) => {
    if (editingRule) {
      updateDueDateRule(editingRule.dueDateRuleId, rule, 'current-user');
      toast({ title: 'Success', description: 'Due date rule updated' });
    } else {
      createDueDateRule({ ...rule, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Due date rule created' });
    }
    setRules(getDueDateRulesByScheme(schemeId));
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleDelete = (dueDateRuleId: string) => {
    deleteDueDateRule(dueDateRuleId, 'current-user');
    setRules(getDueDateRulesByScheme(schemeId));
    toast({ title: 'Success', description: 'Due date rule deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Due Dates & Grace Periods</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Due Date Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit' : 'Add'} Due Date Rule</DialogTitle>
            </DialogHeader>
            <DueDateRuleForm rule={editingRule} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contributor Type</TableHead>
              <TableHead>Period Type</TableHead>
              <TableHead>Due Date Expression</TableHead>
              <TableHead>Grace Period (days)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No due date rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.dueDateRuleId}>
                  <TableCell>{rule.contributorType}</TableCell>
                  <TableCell>{rule.periodType}</TableCell>
                  <TableCell>{rule.dueDateExpression}</TableCell>
                  <TableCell>{rule.gracePeriodDays} days</TableCell>
                  <TableCell>
                    <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'}>
                      {rule.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.dueDateRuleId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DueDateRuleForm({ rule, onSave }: { rule: SSDueDateRule | null; onSave: (rule: Partial<SSDueDateRule>) => void }) {
  const [contributorType, setContributorType] = useState(rule?.contributorType || 'Employed');
  const [periodType, setPeriodType] = useState(rule?.periodType || 'Monthly');
  const [dueDateExpression, setDueDateExpression] = useState(rule?.dueDateExpression || 'EndOfMonth');
  const [gracePeriodDays, setGracePeriodDays] = useState(rule?.gracePeriodDays.toString() || '30');
  const [effectiveFrom, setEffectiveFrom] = useState(rule?.effectiveFrom || new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSave({
      contributorType: contributorType as any,
      periodType: periodType as any,
      dueDateExpression,
      gracePeriodDays: parseInt(gracePeriodDays),
      effectiveFrom,
      effectiveTo: null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Contributor Type</Label>
        <Select value={contributorType} onValueChange={(v) => setContributorType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Employed">Employed</SelectItem>
            <SelectItem value="Self-Employed">Self-Employed</SelectItem>
            <SelectItem value="Voluntary">Voluntary</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Period Type</Label>
        <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Fortnightly">Fortnightly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Due Date Expression</Label>
        <Select value={dueDateExpression} onValueChange={setDueDateExpression}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EndOfMonth">End of Month</SelectItem>
            <SelectItem value="15thFollowingMonth">15th of Following Month</SelectItem>
            <SelectItem value="30DaysAfterMonth">30 Days After Month End</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Grace Period (days)</Label>
        <Input type="number" value={gracePeriodDays} onChange={(e) => setGracePeriodDays(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Effective From</Label>
        <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}
