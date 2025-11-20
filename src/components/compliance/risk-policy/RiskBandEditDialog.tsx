import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RiskBand, AuditFrequency } from '@/types/riskPolicy';
import { toast } from 'sonner';

interface RiskBandEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  band: RiskBand;
  onSave: (band: RiskBand) => Promise<void>;
}

export default function RiskBandEditDialog({ open, onOpenChange, band, onSave }: RiskBandEditDialogProps) {
  const [formData, setFormData] = useState<RiskBand>({ ...band });

  const handleSubmit = async () => {
    if (formData.scoreRangeMin >= formData.scoreRangeMax) {
      toast.error('Minimum score must be less than maximum score');
      return;
    }

    try {
      await onSave(formData);
      toast.success('Risk band updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update risk band');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {formData.bandName} Risk Band</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Range */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Score Range</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scoreMin">Minimum Score *</Label>
                <Input
                  id="scoreMin"
                  type="number"
                  value={formData.scoreRangeMin}
                  onChange={(e) => setFormData({ ...formData, scoreRangeMin: parseInt(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scoreMax">Maximum Score *</Label>
                <Input
                  id="scoreMax"
                  type="number"
                  value={formData.scoreRangeMax}
                  onChange={(e) => setFormData({ ...formData, scoreRangeMax: parseInt(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
          </Card>

          {/* Audit Frequency */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Audit Requirements</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auditFrequency">Audit Frequency *</Label>
                <Select
                  value={formData.auditFrequency}
                  onValueChange={(value) => setFormData({ ...formData, auditFrequency: value as AuditFrequency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AuditFrequency.RANDOM_3_YEAR}>Random 3-Year Cycle</SelectItem>
                    <SelectItem value={AuditFrequency.EVERY_2_YEARS}>Every 2 Years</SelectItem>
                    <SelectItem value={AuditFrequency.YEARLY}>Yearly</SelectItem>
                    <SelectItem value={AuditFrequency.SEMI_ANNUALLY}>Semi-Annually</SelectItem>
                    <SelectItem value={AuditFrequency.QUARTERLY}>Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mandatoryAudit">Mandatory Audit</Label>
                <Switch
                  id="mandatoryAudit"
                  checked={formData.mandatoryAudit}
                  onCheckedChange={(checked) => setFormData({ ...formData, mandatoryAudit: checked })}
                />
              </div>
            </div>
          </Card>

          {/* Auto-Selection Rules */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Auto-Selection for Audit</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSelectEnabled">Enable Auto-Selection</Label>
                <Switch
                  id="autoSelectEnabled"
                  checked={formData.autoSelectRule.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      autoSelectRule: { ...formData.autoSelectRule, enabled: checked }
                    })
                  }
                />
              </div>

              {formData.autoSelectRule.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="selectionType">Selection Type</Label>
                    <Select
                      value={formData.autoSelectRule.selectionType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          autoSelectRule: {
                            ...formData.autoSelectRule,
                            selectionType: value as 'ALL' | 'TOP_X_PER_ZONE' | 'RANDOM_PERCENTAGE'
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Select All</SelectItem>
                        <SelectItem value="TOP_X_PER_ZONE">Top X Per Zone</SelectItem>
                        <SelectItem value="RANDOM_PERCENTAGE">Random Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.autoSelectRule.selectionType === 'TOP_X_PER_ZONE' && (
                    <div className="space-y-2">
                      <Label htmlFor="topCount">Number of Employers Per Zone</Label>
                      <Input
                        id="topCount"
                        type="number"
                        value={formData.autoSelectRule.topCount || 10}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            autoSelectRule: {
                              ...formData.autoSelectRule,
                              topCount: parseInt(e.target.value)
                            }
                          })
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                  )}

                  {formData.autoSelectRule.selectionType === 'RANDOM_PERCENTAGE' && (
                    <div className="space-y-2">
                      <Label htmlFor="randomPercentage">Random Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="randomPercentage"
                          type="number"
                          value={formData.autoSelectRule.randomPercentage || 5}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              autoSelectRule: {
                                ...formData.autoSelectRule,
                                randomPercentage: parseInt(e.target.value)
                              }
                            })
                          }
                          min={1}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Follow-Up Intensity */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Compliance Follow-Up</h3>
            <div className="space-y-2">
              <Label htmlFor="followUpIntensity">Follow-Up Intensity</Label>
              <Select
                value={formData.followUpIntensity}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    followUpIntensity: value as 'NORMAL' | 'MONITOR' | 'ENFORCEMENT' | 'IMMEDIATE_REVIEW'
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal Processing</SelectItem>
                  <SelectItem value="MONITOR">Monitor</SelectItem>
                  <SelectItem value="ENFORCEMENT">Notices + Enforcement</SelectItem>
                  <SelectItem value="IMMEDIATE_REVIEW">Immediate Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Legal Escalation */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Legal Escalation Readiness</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="escalationEnabled">Enable Escalation Rule</Label>
                <Switch
                  id="escalationEnabled"
                  checked={formData.escalationRule.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      escalationRule: { ...formData.escalationRule, enabled: checked }
                    })
                  }
                />
              </div>

              {formData.escalationRule.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="monthsInBand">Months in Band Before Escalation</Label>
                    <Input
                      id="monthsInBand"
                      type="number"
                      value={formData.escalationRule.monthsInBand}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          escalationRule: {
                            ...formData.escalationRule,
                            monthsInBand: parseInt(e.target.value)
                          }
                        })
                      }
                      min={1}
                      max={24}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="escalationAction">Escalation Action</Label>
                    <Select
                      value={formData.escalationRule.action}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          escalationRule: {
                            ...formData.escalationRule,
                            action: value as 'MARK_READY_FOR_LEGAL' | 'NOTIFY_SUPERVISOR' | 'MANDATORY_AUDIT'
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARK_READY_FOR_LEGAL">Mark Ready for Legal</SelectItem>
                        <SelectItem value="NOTIFY_SUPERVISOR">Notify Supervisor</SelectItem>
                        <SelectItem value="MANDATORY_AUDIT">Trigger Mandatory Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
