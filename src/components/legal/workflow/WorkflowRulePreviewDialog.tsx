import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  LegalWorkflowRule,
  mockStages,
  mockStatuses
} from '@/data/mockLegalWorkflow';

interface WorkflowRulePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: LegalWorkflowRule;
}

export function WorkflowRulePreviewDialog({
  open,
  onOpenChange,
  rule
}: WorkflowRulePreviewDialogProps) {
  const [testData, setTestData] = useState({
    stageId: rule.stageId,
    statusId: rule.statusId,
    daysInStatus: rule.daysInStatus,
    outstandingAmount: 10000
  });

  const [evaluated, setEvaluated] = useState(false);

  const evaluateRule = () => {
    setEvaluated(true);
  };

  const wouldTrigger = () => {
    if (!evaluated) return null;

    // Check stage and status match
    if (testData.stageId !== rule.stageId || testData.statusId !== rule.statusId) {
      return false;
    }

    // Check days threshold
    if (testData.daysInStatus < rule.daysInStatus) {
      return false;
    }

    // Check amount conditions
    if (rule.minOutstandingAmount && testData.outstandingAmount < rule.minOutstandingAmount) {
      return false;
    }

    if (rule.maxOutstandingAmount && testData.outstandingAmount > rule.maxOutstandingAmount) {
      return false;
    }

    return true;
  };

  const getStageName = (stageId: string) => {
    return mockStages.find(s => s.id === stageId)?.name || 'Unknown';
  };

  const getStatusName = (statusId: string) => {
    return mockStatuses.find(s => s.id === statusId)?.name || 'Unknown';
  };

  const triggered = wouldTrigger();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Rule: {rule.name}</DialogTitle>
          <DialogDescription>
            Test this rule with sample case data to see if it would trigger
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Test Case Data */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">Test Case Data</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testStage">Stage</Label>
                <Select
                  value={testData.stageId}
                  onValueChange={(value) => {
                    setTestData({ ...testData, stageId: value, statusId: '' });
                    setEvaluated(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testStatus">Status</Label>
                <Select
                  value={testData.statusId}
                  onValueChange={(value) => {
                    setTestData({ ...testData, statusId: value });
                    setEvaluated(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStatuses
                      .filter(s => s.stageId === testData.stageId)
                      .map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testDays">Days in Status</Label>
                <Input
                  id="testDays"
                  type="number"
                  value={testData.daysInStatus}
                  onChange={(e) => {
                    setTestData({ ...testData, daysInStatus: parseInt(e.target.value) || 0 });
                    setEvaluated(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testAmount">Outstanding Amount</Label>
                <Input
                  id="testAmount"
                  type="number"
                  value={testData.outstandingAmount}
                  onChange={(e) => {
                    setTestData({ ...testData, outstandingAmount: parseFloat(e.target.value) || 0 });
                    setEvaluated(false);
                  }}
                />
              </div>
            </div>

            <Button onClick={evaluateRule} className="w-full">
              Evaluate Rule
            </Button>
          </div>

          {/* Evaluation Result */}
          {evaluated && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {triggered ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-600">Rule Would Trigger ✓</h3>
                      <p className="text-sm text-muted-foreground">
                        This rule matches the test case conditions
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-600">Rule Would Not Trigger</h3>
                      <p className="text-sm text-muted-foreground">
                        Conditions do not match the test case
                      </p>
                    </div>
                  </>
                )}
              </div>

              {triggered && (
                <div className="space-y-3 mt-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Actions That Would Be Executed:
                  </h4>
                  
                  <ul className="space-y-2 ml-6">
                    {rule.suggestNextStatusId && (
                      <li className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">Status Change</Badge>
                        <span className="text-sm">
                          Suggest changing to: <strong>{getStatusName(rule.suggestNextStatusId)}</strong>
                          {rule.autoChangeStatus && ' (Auto-change enabled)'}
                        </span>
                      </li>
                    )}
                    
                    {rule.sendInternalAlert && (
                      <li className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">Internal Alert</Badge>
                        <span className="text-sm">
                          Send notification: <strong>{rule.internalNotificationTemplateId}</strong>
                        </span>
                      </li>
                    )}
                    
                    {rule.sendExternalLetter && (
                      <li className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">External Letter</Badge>
                        <span className="text-sm">
                          Generate letter: <strong>{rule.letterTemplateId}</strong>
                        </span>
                      </li>
                    )}
                    
                    {rule.createTask && (
                      <li className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5">Task</Badge>
                        <span className="text-sm">
                          Create task: <strong>{rule.taskTemplateId?.replace(/_/g, ' ')}</strong>
                        </span>
                      </li>
                    )}

                    {!rule.suggestNextStatusId && !rule.sendInternalAlert && !rule.sendExternalLetter && !rule.createTask && (
                      <li className="text-sm text-muted-foreground">No actions configured</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Rule Details */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
            <h3 className="font-semibold">Rule Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Trigger Stage</Label>
                <div className="font-medium">{getStageName(rule.stageId)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Trigger Status</Label>
                <div className="font-medium">{getStatusName(rule.statusId)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Days Threshold</Label>
                <div className="font-medium">{rule.daysInStatus} days</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount Range</Label>
                <div className="font-medium">
                  {rule.minOutstandingAmount ? `$${rule.minOutstandingAmount.toLocaleString()}+` : 'No min'} - 
                  {rule.maxOutstandingAmount ? ` $${rule.maxOutstandingAmount.toLocaleString()}` : ' No max'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
