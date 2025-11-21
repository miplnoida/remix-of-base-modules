import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BenefitRuleSet } from '@/types/benefitRulesConfig';

interface TimelinesTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function TimelinesTab({ benefitRule, onUpdate }: TimelinesTabProps) {
  const handleTimelineChange = (field: string, value: any) => {
    onUpdate({
      ...benefitRule,
      timelines: {
        ...benefitRule.timelines,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Claim Filing Deadlines</CardTitle>
          <CardDescription>Define time limits for when claims must be filed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="claimFilingDeadlineDays">Claim Filing Deadline (Days)</Label>
              <Input
                id="claimFilingDeadlineDays"
                type="number"
                value={benefitRule.timelines.claimFilingDeadlineDays || ''}
                onChange={e => handleTimelineChange('claimFilingDeadlineDays', parseInt(e.target.value))}
                placeholder="e.g., 30"
              />
              <p className="text-xs text-muted-foreground">
                Number of days after event within which claim must be filed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retroactiveLimitMonths">Retroactive Limit (Months)</Label>
              <Input
                id="retroactiveLimitMonths"
                type="number"
                value={benefitRule.timelines.retroactiveLimitMonths || ''}
                onChange={e => handleTimelineChange('retroactiveLimitMonths', parseInt(e.target.value))}
                placeholder="e.g., 6"
              />
              <p className="text-xs text-muted-foreground">
                Maximum months backward payments can be made
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxBackdatingDays">Max Backdating Period (Days)</Label>
              <Input
                id="maxBackdatingDays"
                type="number"
                value={benefitRule.timelines.maxBackdatingDays || ''}
                onChange={e => handleTimelineChange('maxBackdatingDays', parseInt(e.target.value))}
                placeholder="e.g., 90"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waiting Periods & Payment Start</CardTitle>
          <CardDescription>Define waiting periods before payments begin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitingDays">Waiting Days</Label>
              <Input
                id="waitingDays"
                type="number"
                value={benefitRule.timelines.waitingDays || ''}
                onChange={e => handleTimelineChange('waitingDays', parseInt(e.target.value))}
                placeholder="e.g., 3"
              />
              <p className="text-xs text-muted-foreground">
                Number of days before benefit payments begin (e.g., 3 days for sickness)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="paymentStartLogic">Payment Start Logic</Label>
              <Textarea
                id="paymentStartLogic"
                value={benefitRule.timelines.paymentStartLogic || ''}
                onChange={e => handleTimelineChange('paymentStartLogic', e.target.value)}
                placeholder="e.g., Payment begins from day 4 of illness"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Describe when payments start (e.g., "immediately", "day 4", "after verification")
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benefit Duration</CardTitle>
          <CardDescription>Set maximum duration for benefit payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="maxDurationWeeks">Maximum Duration (Weeks)</Label>
              <Input
                id="maxDurationWeeks"
                type="number"
                value={benefitRule.timelines.maxDurationWeeks || ''}
                onChange={e => handleTimelineChange('maxDurationWeeks', parseInt(e.target.value))}
                placeholder="e.g., 26"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDurationMonths">Maximum Duration (Months)</Label>
              <Input
                id="maxDurationMonths"
                type="number"
                value={benefitRule.timelines.maxDurationMonths || ''}
                onChange={e => handleTimelineChange('maxDurationMonths', parseInt(e.target.value))}
                placeholder="e.g., 12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewFrequencyMonths">Review Frequency (Months)</Label>
              <Input
                id="reviewFrequencyMonths"
                type="number"
                value={benefitRule.timelines.reviewFrequencyMonths || ''}
                onChange={e => handleTimelineChange('reviewFrequencyMonths', parseInt(e.target.value))}
                placeholder="e.g., 12"
              />
              <p className="text-xs text-muted-foreground">For long-term benefits requiring periodic review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Renewal & Expiration</CardTitle>
          <CardDescription>Configure renewal requirements and expiration rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="renewalRequired">Renewal Required</Label>
              <p className="text-sm text-muted-foreground">
                Does this benefit require periodic renewal?
              </p>
            </div>
            <Switch
              id="renewalRequired"
              checked={benefitRule.timelines.renewalRequired}
              onCheckedChange={value => handleTimelineChange('renewalRequired', value)}
            />
          </div>

          {benefitRule.timelines.renewalRequired && (
            <div className="space-y-2">
              <Label htmlFor="renewalFrequencyMonths">Renewal Frequency (Months)</Label>
              <Input
                id="renewalFrequencyMonths"
                type="number"
                value={benefitRule.timelines.renewalFrequencyMonths || ''}
                onChange={e => handleTimelineChange('renewalFrequencyMonths', parseInt(e.target.value))}
                placeholder="e.g., 12"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expirationRules">Expiration Rules</Label>
            <Textarea
              id="expirationRules"
              value={benefitRule.timelines.expirationRules || ''}
              onChange={e => handleTimelineChange('expirationRules', e.target.value)}
              placeholder="Describe conditions under which benefit expires..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
