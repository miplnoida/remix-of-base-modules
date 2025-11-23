import { useState } from 'react';
import { Plus, Edit, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  mockWorkflowRules,
  mockStages,
  mockStatuses,
  LegalWorkflowRule
} from '@/data/mockLegalWorkflow';
import { WorkflowRuleFormDialog } from './WorkflowRuleFormDialog';
import { WorkflowRulePreviewDialog } from './WorkflowRulePreviewDialog';

export function WorkflowRulesTab() {
  const [rules, setRules] = useState<LegalWorkflowRule[]>(mockWorkflowRules);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<LegalWorkflowRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewRule, setPreviewRule] = useState<LegalWorkflowRule | null>(null);

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || rule.stageId === filterStage;
    const matchesStatus = filterStatus === 'all' || rule.statusId === filterStatus;
    return matchesSearch && matchesStage && matchesStatus;
  });

  const availableStatuses = filterStage === 'all' 
    ? mockStatuses 
    : mockStatuses.filter(s => s.stageId === filterStage);

  const handleAddRule = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: LegalWorkflowRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleSaveRule = (rule: LegalWorkflowRule) => {
    if (editingRule) {
      setRules(rules.map(r => r.id === rule.id ? rule : r));
    } else {
      setRules([...rules, { ...rule, id: `rule-${Date.now()}` }]);
    }
    setIsFormOpen(false);
    setEditingRule(null);
  };

  const handleToggleActive = (ruleId: string) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, active: !r.active } : r));
  };

  const getStageName = (stageId: string) => {
    return mockStages.find(s => s.id === stageId)?.name || 'Unknown';
  };

  const getStatusName = (statusId: string) => {
    return mockStatuses.find(s => s.id === statusId)?.name || 'Unknown';
  };

  const getActionsSummary = (rule: LegalWorkflowRule) => {
    const actions: string[] = [];
    if (rule.sendInternalAlert) actions.push('Internal Alert');
    if (rule.sendExternalLetter) actions.push('External Letter');
    if (rule.createTask) actions.push('Task');
    if (rule.suggestNextStatusId) actions.push('Status Change');
    return actions.length > 0 ? actions.join(' + ') : 'No actions';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Workflow Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define automated actions based on time spent in a status
          </p>
        </div>
        <Button onClick={handleAddRule}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {mockStages.map(stage => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {availableStatuses.map(status => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium whitespace-nowrap min-w-[200px]">Rule Name</th>
                <th className="text-left p-4 font-medium whitespace-nowrap">Stage</th>
                <th className="text-left p-4 font-medium whitespace-nowrap">Status</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Days in Status</th>
                <th className="text-left p-4 font-medium whitespace-nowrap min-w-[150px]">Actions</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Active</th>
                <th className="text-right p-4 font-medium sticky right-0 bg-muted/50 z-10">Actions</th>
              </tr>
            </thead>
          <tbody>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-muted-foreground">
                  No workflow rules found
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr key={rule.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-4 min-w-[200px]">
                    <div className="font-medium">{rule.name}</div>
                    {rule.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {rule.description}
                      </div>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <Badge variant="outline" className="font-normal">
                      {getStageName(rule.stageId)}
                    </Badge>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="text-sm">{getStatusName(rule.statusId)}</div>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <Badge variant="secondary">{rule.daysInStatus} days</Badge>
                  </td>
                  <td className="p-4 min-w-[150px]">
                    <div className="text-sm">{getActionsSummary(rule)}</div>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => handleToggleActive(rule.id)}
                    />
                  </td>
                  <td className="p-4 text-right sticky right-0 bg-card z-10">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewRule(rule)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <WorkflowRuleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        rule={editingRule}
        onSave={handleSaveRule}
      />

      {previewRule && (
        <WorkflowRulePreviewDialog
          open={!!previewRule}
          onOpenChange={(open) => !open && setPreviewRule(null)}
          rule={previewRule}
        />
      )}
    </div>
  );
}
