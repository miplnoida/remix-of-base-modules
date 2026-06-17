import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BenefitRuleSet } from '@/types/_legacy/benefitRulesConfig';

interface WorkflowTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function WorkflowTab({ benefitRule, onUpdate }: WorkflowTabProps) {
  const handleWorkflowChange = (field: string, value: any) => {
    onUpdate({
      ...benefitRule,
      workflow: {
        ...benefitRule.workflow,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Configuration</CardTitle>
          <CardDescription>
            Configure workflow scheme and special verification requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="workflowScheme">Workflow Scheme</Label>
              <Select
                value={benefitRule.workflow.workflowScheme}
                onValueChange={value => handleWorkflowChange('workflowScheme', value)}
              >
                <SelectTrigger id="workflowScheme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BENEFIT_APPROVAL_SHORT_TERM">
                    Short-Term Benefit Approval
                  </SelectItem>
                  <SelectItem value="BENEFIT_APPROVAL_LONG_TERM">
                    Long-Term Benefit Approval
                  </SelectItem>
                  <SelectItem value="ASSISTANCE_APPROVAL">Assistance Approval</SelectItem>
                  <SelectItem value="INJURY_APPROVAL">Injury Approval</SelectItem>
                  <SelectItem value="MEDICAL_BOARD_REVIEW">Medical Board Review</SelectItem>
                  <SelectItem value="SIMPLE_APPROVAL">Simple Approval</SelectItem>
                  <SelectItem value="FAST_TRACK">Fast Track</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentClaims">Max Concurrent Claims Allowed</Label>
              <Input
                id="maxConcurrentClaims"
                type="number"
                value={benefitRule.workflow.maxConcurrentClaimsAllowed}
                onChange={e =>
                  handleWorkflowChange('maxConcurrentClaimsAllowed', parseInt(e.target.value))
                }
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autoApprovalThreshold">Auto-Approval Threshold (XCD)</Label>
              <Input
                id="autoApprovalThreshold"
                type="number"
                value={benefitRule.workflow.autoApprovalThresholdXCD || ''}
                onChange={e =>
                  handleWorkflowChange('autoApprovalThresholdXCD', parseFloat(e.target.value))
                }
                placeholder="Optional"
              />
              <p className="text-xs text-muted-foreground">
                Claims below this amount can be auto-approved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Requirements</CardTitle>
          <CardDescription>Toggle verification and review requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="requiresEmployerVerification">Requires Employer Verification</Label>
              <p className="text-sm text-muted-foreground">
                Employer must verify employment details
              </p>
            </div>
            <Switch
              id="requiresEmployerVerification"
              checked={benefitRule.workflow.requiresEmployerVerification}
              onCheckedChange={value => handleWorkflowChange('requiresEmployerVerification', value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="requiresMedicalBoardReview">Requires Medical Board Review</Label>
              <p className="text-sm text-muted-foreground">
                Medical board must review and certify eligibility
              </p>
            </div>
            <Switch
              id="requiresMedicalBoardReview"
              checked={benefitRule.workflow.requiresMedicalBoardReview}
              onCheckedChange={value => handleWorkflowChange('requiresMedicalBoardReview', value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="requiresMeansTest">Requires Means Test</Label>
              <p className="text-sm text-muted-foreground">
                Financial means testing must be conducted
              </p>
            </div>
            <Switch
              id="requiresMeansTest"
              checked={benefitRule.workflow.requiresMeansTest}
              onCheckedChange={value => handleWorkflowChange('requiresMeansTest', value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-Eligibility Checks</CardTitle>
          <CardDescription>
            Configure automated checks that must pass before processing begins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Enabled Checks</Label>
            <div className="space-y-2">
              {[
                'Check contribution history',
                'Verify medical certificate validity',
                'Confirm employer verification',
                'Validate age and date of birth',
                'Check for duplicate claims',
                'Verify residence status',
              ].map((check, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input type="checkbox" id={`check-${index}`} />
                  <Label htmlFor={`check-${index}`} className="font-normal">
                    {check}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overlap Rules</CardTitle>
          <CardDescription>
            Define which benefits can be received concurrently with this benefit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Overlap rules configuration will allow specifying which benefits can overlap and at what
            percentage. This ensures compliance with benefit concurrency regulations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
