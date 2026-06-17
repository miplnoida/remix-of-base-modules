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
import { BenefitRuleSet } from '@/types/_legacy/benefitRulesConfig';

interface BenefitDefinitionTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function BenefitDefinitionTab({ benefitRule, onUpdate }: BenefitDefinitionTabProps) {
  const handleFieldChange = (field: keyof BenefitRuleSet, value: any) => {
    onUpdate({ ...benefitRule, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Benefit Definition</CardTitle>
          <CardDescription>
            Define the core properties and identification details of this benefit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="benefitCode">Benefit Code *</Label>
              <Input
                id="benefitCode"
                value={benefitRule.benefitCode}
                onChange={e => handleFieldChange('benefitCode', e.target.value)}
                placeholder="e.g., SICK-001"
                required
              />
              <p className="text-xs text-muted-foreground">Unique identifier for this benefit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefitName">Benefit Name *</Label>
              <Input
                id="benefitName"
                value={benefitRule.benefitName}
                onChange={e => handleFieldChange('benefitName', e.target.value)}
                placeholder="e.g., Sickness Benefit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Benefit Category *</Label>
              <Select
                value={benefitRule.category}
                onValueChange={value => handleFieldChange('category', value)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHORT_TERM">Short-Term Benefits</SelectItem>
                  <SelectItem value="LONG_TERM">Long-Term Benefits</SelectItem>
                  <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                  <SelectItem value="NON_CONTRIBUTORY">Non-Contributory</SelectItem>
                  <SelectItem value="LUMP_SUM">Lump Sum</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Benefit Branch *</Label>
              <Select
                value={benefitRule.branch}
                onValueChange={value => handleFieldChange('branch', value)}
              >
                <SelectTrigger id="branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                  <SelectItem value="ASSISTANCE">Assistance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type *</Label>
              <Select
                value={benefitRule.paymentType}
                onValueChange={value => handleFieldChange('paymentType', value)}
              >
                <SelectTrigger id="paymentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENSION">Pension (Monthly)</SelectItem>
                  <SelectItem value="PERIODIC">Periodic (Weekly/Bi-weekly)</SelectItem>
                  <SelectItem value="LUMP_SUM">Lump Sum (One-time)</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="MEDICAL_EXPENSE">Medical Expense Reimbursement</SelectItem>
                  <SelectItem value="GRANT">Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={benefitRule.status}
                onValueChange={value => handleFieldChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activeFrom">Active From *</Label>
              <Input
                id="activeFrom"
                type="date"
                value={benefitRule.activeFrom}
                onChange={e => handleFieldChange('activeFrom', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activeTo">Active To (Optional)</Label>
              <Input
                id="activeTo"
                type="date"
                value={benefitRule.activeTo || ''}
                onChange={e => handleFieldChange('activeTo', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty if benefit has no end date</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={benefitRule.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                placeholder="Detailed description of this benefit..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legislativeReference">Legislative Reference</Label>
              <Input
                id="legislativeReference"
                value={benefitRule.legislativeReference || ''}
                onChange={e => handleFieldChange('legislativeReference', e.target.value)}
                placeholder="e.g., Social Security Act Cap. 20.25 Section 15"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={benefitRule.notes || ''}
                onChange={e => handleFieldChange('notes', e.target.value)}
                placeholder="Internal notes about this benefit configuration..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
