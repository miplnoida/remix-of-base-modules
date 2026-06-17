import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BenefitRuleSet } from '@/types/_legacy/benefitRulesConfig';

interface CalculationRulesTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function CalculationRulesTab({ benefitRule, onUpdate }: CalculationRulesTabProps) {
  const handleCalculationChange = (field: string, value: any) => {
    onUpdate({
      ...benefitRule,
      calculationRules: {
        ...benefitRule.calculationRules,
        [field]: value,
      },
    });
  };

  const handleLimitsChange = (field: string, value: any) => {
    onUpdate({
      ...benefitRule,
      calculationRules: {
        ...benefitRule.calculationRules,
        limits: {
          ...benefitRule.calculationRules.limits,
          [field]: value,
        },
      },
    });
  };

  const insertVariable = (variable: string) => {
    const currentFormula = benefitRule.calculationRules.formula || '';
    const newFormula = currentFormula + ' ' + variable;
    handleCalculationChange('formula', newFormula);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calculation Rules</CardTitle>
          <CardDescription>
            Define how benefit amounts are calculated using formulas, variables, and rate tables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calculationBasis">Calculation Basis *</Label>
              <Select
                value={benefitRule.calculationRules.calculationBasis}
                onValueChange={value => handleCalculationChange('calculationBasis', value)}
              >
                <SelectTrigger id="calculationBasis">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVERAGE_WEEKLY_EARNINGS">Average Weekly Earnings (AWE)</SelectItem>
                  <SelectItem value="AVERAGE_INSURABLE_WAGE">Average Insurable Wage (AIW)</SelectItem>
                  <SelectItem value="TOTAL_CONTRIBUTIONS">Total Contributions</SelectItem>
                  <SelectItem value="WAGE_CLASS">Wage Class</SelectItem>
                  <SelectItem value="FLAT_AMOUNT">Flat Amount</SelectItem>
                  <SelectItem value="MEDICAL_INVOICE_AMOUNT">Medical Invoice Amount</SelectItem>
                  <SelectItem value="PENSION_BASE">Pension Base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculationType">Calculation Type *</Label>
              <Select
                value={benefitRule.calculationRules.calculationType}
                onValueChange={value => handleCalculationChange('calculationType', value)}
              >
                <SelectTrigger id="calculationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE_OF_WAGE">Percentage of Wage</SelectItem>
                  <SelectItem value="PERCENTAGE_OF_PENSION">Percentage of Pension</SelectItem>
                  <SelectItem value="LUMP_SUM_FORMULA">Lump Sum Formula</SelectItem>
                  <SelectItem value="FLAT_AMOUNT">Flat Amount</SelectItem>
                  <SelectItem value="TABLE_LOOKUP">Table Lookup</SelectItem>
                  <SelectItem value="TIERED_RATE">Tiered Rate</SelectItem>
                  <SelectItem value="REIMBURSEMENT_UP_TO_CAP">Reimbursement Up To Cap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roundingRule">Rounding Rule</Label>
              <Select
                value={benefitRule.calculationRules.roundingRule}
                onValueChange={value => handleCalculationChange('roundingRule', value)}
              >
                <SelectTrigger id="roundingRule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUND_NEAREST">Round to Nearest</SelectItem>
                  <SelectItem value="ROUND_UP">Round Up</SelectItem>
                  <SelectItem value="ROUND_DOWN">Round Down</SelectItem>
                  <SelectItem value="TWO_DECIMALS">Two Decimals</SelectItem>
                  <SelectItem value="NO_ROUNDING">No Rounding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formula Editor</CardTitle>
          <CardDescription>
            Write calculation formulas using variables like {'{AWE}'}, {'{AIW}'}, {'{TotalContributions}'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formula">Calculation Formula</Label>
            <Textarea
              id="formula"
              value={benefitRule.calculationRules.formula || ''}
              onChange={e => handleCalculationChange('formula', e.target.value)}
              placeholder="e.g., 0.65 * {AWE} or 6 * {AWE} * floor({TotalContributions} / 50)"
              rows={3}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Use curly braces for variables: {'{AWE}'}, {'{AIW}'}, {'{TotalContributions}'}, {'{PensionRate}'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('{AWE}')}>
              Insert {'{AWE}'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('{AIW}')}>
              Insert {'{AIW}'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => insertVariable('{TotalContributions}')}
            >
              Insert {'{TotalContributions}'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => insertVariable('{PensionRate}')}
            >
              Insert {'{PensionRate}'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rate Tables & Tiers</CardTitle>
              <CardDescription>
                For tiered calculations or table lookups (e.g., contribution count → pension rate)
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {benefitRule.calculationRules.tiers && benefitRule.calculationRules.tiers.length > 0 ? (
            <div className="space-y-2">
              {benefitRule.calculationRules.tiers.map(tier => (
                <div key={tier.tierId} className="rounded-lg border p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-xs">Min Value</Label>
                      <p className="font-medium">{tier.minValue}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Max Value</Label>
                      <p className="font-medium">{tier.maxValue || 'No limit'}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Rate / Amount</Label>
                      <p className="font-medium">{tier.rate || tier.amount}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No tiers defined yet. Add tiers for tiered rate calculations.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculation Limits</CardTitle>
          <CardDescription>Set minimum and maximum values for calculated benefits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minAmountXCD">Minimum Amount (XCD)</Label>
              <Input
                id="minAmountXCD"
                type="number"
                value={benefitRule.calculationRules.limits.minAmountXCD || ''}
                onChange={e => handleLimitsChange('minAmountXCD', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmountXCD">Maximum Amount (XCD)</Label>
              <Input
                id="maxAmountXCD"
                type="number"
                value={benefitRule.calculationRules.limits.maxAmountXCD || ''}
                onChange={e => handleLimitsChange('maxAmountXCD', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRatePercent">Minimum Rate (%)</Label>
              <Input
                id="minRatePercent"
                type="number"
                value={benefitRule.calculationRules.limits.minRatePercent || ''}
                onChange={e => handleLimitsChange('minRatePercent', parseFloat(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRatePercent">Maximum Rate (%)</Label>
              <Input
                id="maxRatePercent"
                type="number"
                value={benefitRule.calculationRules.limits.maxRatePercent || ''}
                onChange={e => handleLimitsChange('maxRatePercent', parseFloat(e.target.value))}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDurationWeeks">Maximum Duration (Weeks)</Label>
              <Input
                id="maxDurationWeeks"
                type="number"
                value={benefitRule.calculationRules.limits.maxDurationWeeks || ''}
                onChange={e => handleLimitsChange('maxDurationWeeks', parseInt(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDurationMonths">Maximum Duration (Months)</Label>
              <Input
                id="maxDurationMonths"
                type="number"
                value={benefitRule.calculationRules.limits.maxDurationMonths || ''}
                onChange={e => handleLimitsChange('maxDurationMonths', parseInt(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
