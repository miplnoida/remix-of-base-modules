import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RiskPolicy, RiskPolicyFactor } from '@/types/riskPolicy';
import { RiskFactor } from '@/types/riskPolicy';
import { riskFactorService } from '@/services/riskFactorService';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

interface RiskPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: RiskPolicy;
  onSave: (policy: Omit<RiskPolicy, 'id' | 'policyId' | 'createdDate' | 'lastModified' | 'isActive'>) => Promise<void>;
}

export default function RiskPolicyDialog({ open, onOpenChange, policy, onSave }: RiskPolicyDialogProps) {
  const [availableFactors, setAvailableFactors] = useState<RiskFactor[]>([]);
  const [formData, setFormData] = useState<Partial<RiskPolicy>>({
    policyName: policy?.policyName || '',
    description: policy?.description || '',
    effectiveFrom: policy?.effectiveFrom || new Date().toISOString().split('T')[0],
    effectiveTo: policy?.effectiveTo || null,
    status: policy?.status || 'DRAFT',
    updateFrequency: policy?.updateFrequency || 'WEEKLY',
    factors: policy?.factors || [],
    applicableEmployerTypes: policy?.applicableEmployerTypes || ['All Types'],
    applicableZones: policy?.applicableZones || ['All Zones']
  });

  useEffect(() => {
    loadAvailableFactors();
  }, [open]);

  const loadAvailableFactors = async () => {
    try {
      const factors = await riskFactorService.getActiveFactors();
      setAvailableFactors(factors);
    } catch (error) {
      toast.error('Failed to load risk factors');
    }
  };

  const handleSubmit = async () => {
    if (!formData.policyName || !formData.description || !formData.effectiveFrom) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.factors?.length === 0) {
      toast.error('Please select at least one risk factor');
      return;
    }

    try {
      await onSave(formData as Omit<RiskPolicy, 'id' | 'policyId' | 'createdDate' | 'lastModified' | 'isActive'>);
      toast.success(policy ? 'Risk policy updated' : 'Risk policy created');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save risk policy');
    }
  };

  const toggleFactor = (factor: RiskFactor) => {
    const currentFactors = formData.factors || [];
    const exists = currentFactors.find(f => f.factorId === factor.id);

    if (exists) {
      setFormData({
        ...formData,
        factors: currentFactors.filter(f => f.factorId !== factor.id)
      });
    } else {
      const newFactor: RiskPolicyFactor = {
        factorId: factor.id,
        factorCode: factor.code,
        factorName: factor.name,
        defaultWeight: factor.defaultWeight,
        overrideWeight: factor.defaultWeight,
        active: true
      };
      setFormData({
        ...formData,
        factors: [...currentFactors, newFactor]
      });
    }
  };

  const updateFactorWeight = (factorId: string, weight: number) => {
    const currentFactors = formData.factors || [];
    setFormData({
      ...formData,
      factors: currentFactors.map(f =>
        f.factorId === factorId ? { ...f, overrideWeight: weight } : f
      )
    });
  };

  const selectedFactorIds = new Set((formData.factors || []).map(f => f.factorId));
  const totalWeight = (formData.factors || []).reduce((sum, f) => sum + (f.overrideWeight || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? 'Edit Risk Policy' : 'Create New Risk Policy'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Policy Details</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policyName">Policy Name *</Label>
                <Input
                  id="policyName"
                  value={formData.policyName}
                  onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  placeholder="e.g., 2024 Standard Risk Assessment Policy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateFrequency">Update Frequency *</Label>
                <Select
                  value={formData.updateFrequency}
                  onValueChange={(value) => setFormData({ ...formData, updateFrequency: value as 'DAILY' | 'WEEKLY' | 'MONTHLY' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of this risk policy"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective From *</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                <Input
                  id="effectiveTo"
                  type="date"
                  value={formData.effectiveTo || ''}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Factor Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Risk Factors</h3>
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFactorIds.size} factors | Total Weight: {totalWeight}
              </div>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {availableFactors.map((factor) => {
                const isSelected = selectedFactorIds.has(factor.id);
                const selectedFactor = (formData.factors || []).find(f => f.factorId === factor.id);

                return (
                  <Card
                    key={factor.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFactor(factor)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{factor.code}</Badge>
                            <span className="font-medium">{factor.name}</span>
                          </div>
                          <Badge variant="secondary">{factor.category}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{factor.description}</p>

                        {isSelected && (
                          <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Default Weight:</Label>
                              <Badge variant="outline">{factor.defaultWeight}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`weight-${factor.id}`} className="text-sm">
                                Override Weight:
                              </Label>
                              <Input
                                id={`weight-${factor.id}`}
                                type="number"
                                min={0}
                                max={10}
                                value={selectedFactor?.overrideWeight || factor.defaultWeight}
                                onChange={(e) => updateFactorWeight(factor.id, parseInt(e.target.value))}
                                className="w-20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {policy ? 'Update Policy' : 'Create Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
