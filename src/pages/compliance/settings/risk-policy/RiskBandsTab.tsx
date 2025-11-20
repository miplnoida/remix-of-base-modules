import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { riskPolicyService } from '@/services/riskPolicyService';
import { RiskBand, RiskBandName } from '@/types/riskPolicy';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function RiskBandsTab() {
  const [bands, setBands] = useState<RiskBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  useEffect(() => {
    loadBands();
  }, []);

  const loadBands = async () => {
    try {
      setLoading(true);
      const policyData = await riskPolicyService.getPolicyHistory();
      if (policyData.activePolicy) {
        setActivePolicy(policyData.activePolicy.id);
        const bandsData = await riskPolicyService.getBandsForPolicy(policyData.activePolicy.id);
        setBands(bandsData);
      }
    } catch (error) {
      toast.error('Failed to load risk bands');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBand = async (band: RiskBand) => {
    try {
      await riskPolicyService.updateBand(band.id, band);
      toast.success('Risk band updated successfully');
    } catch (error) {
      toast.error('Failed to update risk band');
      console.error(error);
    }
  };

  const getBandColor = (bandName: RiskBandName) => {
    switch (bandName) {
      case RiskBandName.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      case RiskBandName.MEDIUM:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case RiskBandName.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case RiskBandName.CRITICAL:
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading risk bands...</div>;
  }

  if (!activePolicy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active risk policy found. Please create and activate a policy first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Risk Bands & Behaviour Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure score ranges and behaviour rules for each risk band
        </p>
      </div>

      {/* Risk Band Cards */}
      <div className="grid gap-6">
        {bands.map((band) => (
          <Card key={band.id} className={`p-6 border-2 ${getBandColor(band.bandName)}`}>
            <div className="space-y-6">
              {/* Band Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    className={`text-lg px-4 py-1 ${getBandColor(band.bandName)}`}
                    variant="outline"
                  >
                    {band.bandName}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Score Range: {band.scoreRangeMin} - {band.scoreRangeMax}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleSaveBand(band)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>

              <Separator />

              {/* Configuration Sections */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Audit Frequency */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Audit Frequency</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Audit Frequency</Label>
                      <Badge variant="secondary">{band.auditFrequency}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`mandatory-${band.id}`} className="text-sm">
                        Mandatory Audit
                      </Label>
                      <Switch
                        id={`mandatory-${band.id}`}
                        checked={band.mandatoryAudit}
                        onCheckedChange={(checked) => {
                          setBands(bands.map(b => 
                            b.id === band.id ? { ...b, mandatoryAudit: checked } : b
                          ));
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Selection Rules */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Auto-Selection for Audit</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`autoselect-${band.id}`} className="text-sm">
                        Enable Auto-Selection
                      </Label>
                      <Switch
                        id={`autoselect-${band.id}`}
                        checked={band.autoSelectRule.enabled}
                        onCheckedChange={(checked) => {
                          setBands(bands.map(b => 
                            b.id === band.id 
                              ? { ...b, autoSelectRule: { ...b.autoSelectRule, enabled: checked } } 
                              : b
                          ));
                        }}
                      />
                    </div>
                    {band.autoSelectRule.enabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Selection Type</Label>
                          <Badge variant="outline">{band.autoSelectRule.selectionType}</Badge>
                        </div>
                        {band.autoSelectRule.topCount && (
                          <div className="space-y-2">
                            <Label className="text-sm">Top X Per Zone</Label>
                            <Input
                              type="number"
                              value={band.autoSelectRule.topCount}
                              className="w-24"
                              disabled
                            />
                          </div>
                        )}
                        {band.autoSelectRule.randomPercentage && (
                          <div className="space-y-2">
                            <Label className="text-sm">Random Percentage</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={band.autoSelectRule.randomPercentage}
                                className="w-24"
                                disabled
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Follow-Up Intensity */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Compliance Follow-Up</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Intensity Level</Label>
                      <Badge variant="secondary">{band.followUpIntensity}</Badge>
                    </div>
                  </div>
                </div>

                {/* Escalation Rules */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Legal Escalation Readiness</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`escalation-${band.id}`} className="text-sm">
                        Enable Escalation Rule
                      </Label>
                      <Switch
                        id={`escalation-${band.id}`}
                        checked={band.escalationRule.enabled}
                        onCheckedChange={(checked) => {
                          setBands(bands.map(b => 
                            b.id === band.id 
                              ? { ...b, escalationRule: { ...b.escalationRule, enabled: checked } } 
                              : b
                          ));
                        }}
                      />
                    </div>
                    {band.escalationRule.enabled && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm">Months in Band</Label>
                          <Input
                            type="number"
                            value={band.escalationRule.monthsInBand}
                            className="w-24"
                            disabled
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Action</Label>
                          <Badge variant="outline">{band.escalationRule.action}</Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
