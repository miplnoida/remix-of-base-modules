import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RiskFactor, RiskFactorCategory, RiskCalculationMethod, RiskDataSource, RiskScoringModel, EmployerScope } from '@/types/riskPolicy';
import { ContributionComponent, COMPONENT_LABELS } from '@/types/contributionComponents';
import { toast } from 'sonner';

interface RiskFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factor?: RiskFactor;
  onSave: (factor: Omit<RiskFactor, 'id' | 'code' | 'createdDate' | 'lastModified'>) => Promise<void>;
}

export default function RiskFactorDialog({ open, onOpenChange, factor, onSave }: RiskFactorDialogProps) {
  const [formData, setFormData] = useState<Partial<RiskFactor>>({
    name: factor?.name || '',
    description: factor?.description || '',
    category: factor?.category || RiskFactorCategory.COMPLIANCE,
    componentScope: factor?.componentScope || [],
    employerScope: factor?.employerScope || EmployerScope.ALL_EMPLOYERS,
    dataSource: factor?.dataSource || RiskDataSource.C3_SUBMISSION_HISTORY,
    calculationMethod: factor?.calculationMethod || RiskCalculationMethod.THRESHOLD_BASED,
    scoringModel: factor?.scoringModel || RiskScoringModel.FIXED_SCORE,
    defaultWeight: factor?.defaultWeight || 5,
    active: factor?.active ?? true,
    fixedScore: factor?.fixedScore || 10,
    formulaMultiplier: factor?.formulaMultiplier || 1,
    formulaExpression: factor?.formulaExpression || '',
    trendPeriodMonths: factor?.trendPeriodMonths || 6,
    rangeScores: factor?.rangeScores || []
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.componentScope?.length === 0) {
      toast.error('Please select at least one component');
      return;
    }

    try {
      await onSave(formData as Omit<RiskFactor, 'id' | 'code' | 'createdDate' | 'lastModified'>);
      toast.success(factor ? 'Risk factor updated' : 'Risk factor created');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save risk factor');
    }
  };

  const toggleComponent = (component: ContributionComponent) => {
    const current = formData.componentScope || [];
    const updated = current.includes(component)
      ? current.filter(c => c !== component)
      : [...current, component];
    setFormData({ ...formData, componentScope: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{factor ? 'Edit Risk Factor' : 'Create New Risk Factor'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Details</TabsTrigger>
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Factor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., SSC Arrears Age"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of what this factor measures"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Factor Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as RiskFactorCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RiskFactorCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Component Scope *</Label>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(ContributionComponent).map((component) => (
                    <div key={component} className="flex items-center space-x-2">
                      <Checkbox
                        id={component}
                        checked={formData.componentScope?.includes(component)}
                        onCheckedChange={() => toggleComponent(component)}
                      />
                      <Label htmlFor={component} className="cursor-pointer">
                        {COMPONENT_LABELS[component]}
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerScope">Employer Scope *</Label>
              <Select
                value={formData.employerScope}
                onValueChange={(value) => setFormData({ ...formData, employerScope: value as EmployerScope })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EmployerScope).map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="calculation" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source *</Label>
              <Select
                value={formData.dataSource}
                onValueChange={(value) => setFormData({ ...formData, dataSource: value as RiskDataSource })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RiskDataSource).map((source) => (
                    <SelectItem key={source} value={source}>
                      {source.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculationMethod">Calculation Method *</Label>
              <Select
                value={formData.calculationMethod}
                onValueChange={(value) => setFormData({ ...formData, calculationMethod: value as RiskCalculationMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RiskCalculationMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.calculationMethod === RiskCalculationMethod.PROPORTIONAL_FORMULA && (
              <div className="space-y-2">
                <Label htmlFor="formulaExpression">Formula Expression</Label>
                <Input
                  id="formulaExpression"
                  value={formData.formulaExpression}
                  onChange={(e) => setFormData({ ...formData, formulaExpression: e.target.value })}
                  placeholder="e.g., (SSC_Arrears / SSC_Due_Last_12m) * 100"
                />
              </div>
            )}

            {formData.calculationMethod === RiskCalculationMethod.TREND_ANALYSIS && (
              <div className="space-y-2">
                <Label htmlFor="trendPeriod">Trend Period (Months)</Label>
                <Input
                  id="trendPeriod"
                  type="number"
                  value={formData.trendPeriodMonths}
                  onChange={(e) => setFormData({ ...formData, trendPeriodMonths: parseInt(e.target.value) })}
                  min={1}
                  max={24}
                />
              </div>
            )}

            {formData.calculationMethod === RiskCalculationMethod.CROSS_COMPONENT && (
              <div className="space-y-2">
                <Label htmlFor="crossComponent">Cross-Component Condition</Label>
                <Textarea
                  id="crossComponent"
                  value={formData.crossComponentCondition || ''}
                  onChange={(e) => setFormData({ ...formData, crossComponentCondition: e.target.value })}
                  placeholder="e.g., IF (SSF + LVF + PEF) > 50% of total outstanding"
                  rows={2}
                />
              </div>
            )}

            {formData.calculationMethod === RiskCalculationMethod.BOOLEAN_LOGIC && (
              <div className="space-y-2">
                <Label htmlFor="booleanCondition">Boolean Condition</Label>
                <Textarea
                  id="booleanCondition"
                  value={formData.booleanCondition || ''}
                  onChange={(e) => setFormData({ ...formData, booleanCondition: e.target.value })}
                  placeholder="e.g., Employer ignored 3+ notices"
                  rows={2}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scoringModel">Scoring Model *</Label>
              <Select
                value={formData.scoringModel}
                onValueChange={(value) => setFormData({ ...formData, scoringModel: value as RiskScoringModel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RiskScoringModel).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.scoringModel === RiskScoringModel.FIXED_SCORE && (
              <div className="space-y-2">
                <Label htmlFor="fixedScore">Fixed Score Value</Label>
                <Input
                  id="fixedScore"
                  type="number"
                  value={formData.fixedScore}
                  onChange={(e) => setFormData({ ...formData, fixedScore: parseInt(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            )}

            {formData.scoringModel === RiskScoringModel.FORMULA_SCORE && (
              <div className="space-y-2">
                <Label htmlFor="formulaMultiplier">Formula Multiplier</Label>
                <Input
                  id="formulaMultiplier"
                  type="number"
                  step="0.1"
                  value={formData.formulaMultiplier}
                  onChange={(e) => setFormData({ ...formData, formulaMultiplier: parseFloat(e.target.value) })}
                  min={0}
                  max={10}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultWeight">Default Weight (0-10) *</Label>
              <Input
                id="defaultWeight"
                type="number"
                value={formData.defaultWeight}
                onChange={(e) => setFormData({ ...formData, defaultWeight: parseInt(e.target.value) })}
                min={0}
                max={10}
              />
              <p className="text-sm text-muted-foreground">
                Weight applied when this factor is included in a risk policy
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Active (used in risk calculations)
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {factor ? 'Update Factor' : 'Create Factor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
