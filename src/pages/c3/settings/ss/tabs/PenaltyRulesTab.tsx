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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getPenaltyRulesByScheme, createPenaltyRule, updatePenaltyRule, deletePenaltyRule } from '@/services/ssSettingsService';
import type { SSPenaltyRule } from '@/types/ssSettings';

interface PenaltyRulesTabProps {
  schemeId: string;
}

export default function PenaltyRulesTab({ schemeId }: PenaltyRulesTabProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState(getPenaltyRulesByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SSPenaltyRule | null>(null);

  const handleSave = (rule: Partial<SSPenaltyRule>) => {
    if (editingRule) {
      updatePenaltyRule(editingRule.penaltyRuleId, rule, 'current-user');
      toast({ title: 'Success', description: 'Penalty rule updated' });
    } else {
      createPenaltyRule({ ...rule, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Penalty rule created' });
    }
    setRules(getPenaltyRulesByScheme(schemeId));
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleDelete = (penaltyRuleId: string) => {
    deletePenaltyRule(penaltyRuleId, 'current-user');
    setRules(getPenaltyRulesByScheme(schemeId));
    toast({ title: 'Success', description: 'Penalty rule deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Penalty & Interest Rules</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Penalty Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit' : 'Add'} Penalty Rule</DialogTitle>
            </DialogHeader>
            <PenaltyRuleForm rule={editingRule} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contributor Type</TableHead>
              <TableHead>Penalty Type</TableHead>
              <TableHead>Penalty Rate</TableHead>
              <TableHead>Interest?</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No penalty rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.penaltyRuleId}>
                  <TableCell>{rule.contributorType}</TableCell>
                  <TableCell>{rule.penaltyType}</TableCell>
                  <TableCell>{rule.penaltyRateValue}%</TableCell>
                  <TableCell>
                    <Badge variant={rule.interestApplicable ? 'default' : 'secondary'}>
                      {rule.interestApplicable ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
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
                        onClick={() => handleDelete(rule.penaltyRuleId)}
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

function PenaltyRuleForm({ rule, onSave }: { rule: SSPenaltyRule | null; onSave: (rule: Partial<SSPenaltyRule>) => void }) {
  const [contributorType, setContributorType] = useState(rule?.contributorType || 'Employed');
  const [penaltyType, setPenaltyType] = useState(rule?.penaltyType || 'PercentPerMonth');
  const [penaltyRate, setPenaltyRate] = useState(rule?.penaltyRateValue.toString() || '5');
  const [interestApplicable, setInterestApplicable] = useState(rule?.interestApplicable ?? false);
  const [interestRate, setInterestRate] = useState(rule?.interestRatePercent?.toString() || '0');
  const [startAfterDays, setStartAfterDays] = useState(rule?.startAfterDaysLate.toString() || '0');
  const [effectiveFrom, setEffectiveFrom] = useState(rule?.effectiveFrom || new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSave({
      contributorType: contributorType as any,
      penaltyType: penaltyType as any,
      penaltyRateValue: parseFloat(penaltyRate),
      interestApplicable,
      interestRatePercent: interestApplicable ? parseFloat(interestRate) : null,
      interestBase: 'PrincipalOnly',
      startAfterDaysLate: parseInt(startAfterDays),
      minimumPenalty: null,
      maximumPenaltyPercent: null,
      maximumPenaltyAmount: null,
      effectiveFrom,
      effectiveTo: null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label>Penalty Type</Label>
          <Select value={penaltyType} onValueChange={(v) => setPenaltyType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PercentPerMonth">% Per Month</SelectItem>
              <SelectItem value="PercentPerDay">% Per Day</SelectItem>
              <SelectItem value="FlatAmount">Flat Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Penalty Rate Value</Label>
          <Input type="number" step="0.01" value={penaltyRate} onChange={(e) => setPenaltyRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Start After Days Late</Label>
          <Input type="number" value={startAfterDays} onChange={(e) => setStartAfterDays(e.target.value)} />
        </div>
        <div className="space-y-2 col-span-2">
          <div className="flex items-center justify-between">
            <Label>Interest Applicable</Label>
            <Switch checked={interestApplicable} onCheckedChange={setInterestApplicable} />
          </div>
        </div>
        {interestApplicable && (
          <div className="space-y-2 col-span-2">
            <Label>Interest Rate (%)</Label>
            <Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
          </div>
        )}
        <div className="space-y-2 col-span-2">
          <Label>Effective From</Label>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}
