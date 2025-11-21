import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { BenefitRuleSet, EligibilityRule, RuleGroup, RuleParameterType, RuleOperator } from '@/types/benefitRulesConfig';

interface EligibilityRulesTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function EligibilityRulesTab({ benefitRule, onUpdate }: EligibilityRulesTabProps) {
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const addRuleGroup = () => {
    const newGroup = {
      groupId: `G${benefitRule.eligibilityRules.ruleGroups.length + 1}`,
      groupName: 'New Rule Group',
      groupType: 'AGE' as RuleGroup,
      rules: [],
      groupLogic: 'AND' as const,
    };

    onUpdate({
      ...benefitRule,
      eligibilityRules: {
        ...benefitRule.eligibilityRules,
        ruleGroups: [...benefitRule.eligibilityRules.ruleGroups, newGroup],
      },
    });
  };

  const addRule = (groupIndex: number) => {
    const newRule: EligibilityRule = {
      ruleId: `R${Date.now()}`,
      parameter: 'AGE_AT_CLAIM',
      operator: 'GREATER_OR_EQUAL',
      valueFrom: 0,
      logicConnector: 'AND',
      failureMessageKey: 'RULE_FAILED',
      failureMessageText: 'Rule condition not met',
      isActive: true,
    };

    const updatedGroups = [...benefitRule.eligibilityRules.ruleGroups];
    updatedGroups[groupIndex].rules.push(newRule);

    onUpdate({
      ...benefitRule,
      eligibilityRules: {
        ...benefitRule.eligibilityRules,
        ruleGroups: updatedGroups,
      },
    });

    setIsAddRuleOpen(false);
  };

  const deleteRule = (groupIndex: number, ruleIndex: number) => {
    const updatedGroups = [...benefitRule.eligibilityRules.ruleGroups];
    updatedGroups[groupIndex].rules.splice(ruleIndex, 1);

    onUpdate({
      ...benefitRule,
      eligibilityRules: {
        ...benefitRule.eligibilityRules,
        ruleGroups: updatedGroups,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Eligibility Rules Builder</CardTitle>
              <CardDescription>
                Define dynamic rules to determine benefit eligibility. Rules can be grouped with AND/OR logic.
              </CardDescription>
            </div>
            <Button onClick={addRuleGroup} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Rule Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Group Logic:</Label>
              <Select
                value={benefitRule.eligibilityRules.groupLogic}
                onValueChange={value =>
                  onUpdate({
                    ...benefitRule,
                    eligibilityRules: {
                      ...benefitRule.eligibilityRules,
                      groupLogic: value as 'ALL_GROUPS' | 'ANY_GROUP',
                    },
                  })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_GROUPS">All Groups Must Pass (AND)</SelectItem>
                  <SelectItem value="ANY_GROUP">Any Group Can Pass (OR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {benefitRule.eligibilityRules.ruleGroups.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-12 text-center">
                <p className="text-muted-foreground">No rule groups defined yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click "Add Rule Group" to create your first eligibility rule group.
                </p>
              </div>
            ) : (
              benefitRule.eligibilityRules.ruleGroups.map((group, groupIndex) => (
                <Card key={group.groupId}>
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.groupName}</CardTitle>
                        <CardDescription>
                          Type: {group.groupType} • Logic: {group.groupLogic}
                        </CardDescription>
                      </div>
                      <Dialog open={isAddRuleOpen && currentGroupIndex === groupIndex}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentGroupIndex(groupIndex);
                              setIsAddRuleOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Rule
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Eligibility Rule</DialogTitle>
                            <DialogDescription>Configure a new rule for this group</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Parameter</Label>
                              <Select defaultValue="AGE_AT_CLAIM">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AGE_AT_CLAIM">Age at Claim</SelectItem>
                                  <SelectItem value="TOTAL_CONTRIBUTIONS">Total Contributions</SelectItem>
                                  <SelectItem value="CONTRIBUTIONS_LAST_13_WEEKS">Contributions Last 13 Weeks</SelectItem>
                                  <SelectItem value="PAID_CONTRIBUTIONS">Paid Contributions</SelectItem>
                                  <SelectItem value="HAS_MEDICAL_CERTIFICATE">Has Medical Certificate</SelectItem>
                                  <SelectItem value="HAS_EMPLOYER_VERIFICATION">Has Employer Verification</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Operator</Label>
                              <Select defaultValue="GREATER_OR_EQUAL">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EQUALS">Equals (=)</SelectItem>
                                  <SelectItem value="GREATER_THAN">Greater Than (&gt;)</SelectItem>
                                  <SelectItem value="GREATER_OR_EQUAL">Greater or Equal (≥)</SelectItem>
                                  <SelectItem value="LESS_THAN">Less Than (&lt;)</SelectItem>
                                  <SelectItem value="LESS_OR_EQUAL">Less or Equal (≤)</SelectItem>
                                  <SelectItem value="BETWEEN">Between</SelectItem>
                                  <SelectItem value="BOOLEAN">Boolean</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Value</Label>
                              <Input type="number" placeholder="Enter value" />
                            </div>
                            <div className="space-y-2">
                              <Label>Failure Message</Label>
                              <Input placeholder="Message to display when rule fails" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={() => addRule(groupIndex)}>Add Rule</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {group.rules.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">No rules in this group yet.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Logic</TableHead>
                            <TableHead>Failure Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.rules.map((rule, ruleIndex) => (
                            <TableRow key={rule.ruleId}>
                              <TableCell className="font-medium">
                                {rule.parameter.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell>{rule.operator.replace(/_/g, ' ')}</TableCell>
                              <TableCell>
                                {rule.valueFrom}
                                {rule.valueTo && ` - ${rule.valueTo}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{rule.logicConnector}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-sm">
                                {rule.failureMessageText}
                              </TableCell>
                              <TableCell>
                                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                  {rule.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteRule(groupIndex, ruleIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
