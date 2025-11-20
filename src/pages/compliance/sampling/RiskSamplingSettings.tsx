import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Play, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RiskSamplingSettings() {
  const { toast } = useToast();
  const [enableRandomSampling, setEnableRandomSampling] = useState(true);
  const [enablePureRandom, setEnablePureRandom] = useState(true);
  const [autoExecute, setAutoExecute] = useState(false);

  // General Sampling Settings
  const [annualTarget, setAnnualTarget] = useState(8);
  const [monthlyTarget, setMonthlyTarget] = useState(1.5);
  const [minPerZone, setMinPerZone] = useState(3);

  // Risk Score Weights
  const [filingWeight, setFilingWeight] = useState(30);
  const [paymentWeight, setPaymentWeight] = useState(30);
  const [profileWeight, setProfileWeight] = useState(20);
  const [historicalWeight, setHistoricalWeight] = useState(20);

  // Risk Band Probabilities
  const [highRiskProb, setHighRiskProb] = useState(30);
  const [medRiskProb, setMedRiskProb] = useState(15);
  const [lowRiskProb, setLowRiskProb] = useState(5);

  // Mandatory Rules
  const [mandatoryRules, setMandatoryRules] = useState([
    { id: 1, name: 'No audit in X months', enabled: true, threshold: 18 },
    { id: 2, name: 'Arrears exceeds amount', enabled: true, threshold: 50000 },
    { id: 3, name: 'Consecutive missing C3s', enabled: true, threshold: 3 },
    { id: 4, name: 'Arrangement default', enabled: true, threshold: 0 },
    { id: 5, name: 'High-risk sector', enabled: false, threshold: 0 },
  ]);

  const totalWeight = filingWeight + paymentWeight + profileWeight + historicalWeight;

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Risk & sampling policy settings have been updated successfully.",
    });
  };

  const handleRunSimulation = () => {
    toast({
      title: "Simulation Running",
      description: "Preview: Estimated 45 employers selected for next month based on current settings.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Risk & Sampling Policy Settings"
        subtitle="Configure random and risk-based audit selection policies"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audit Planning', href: '/compliance/audit-planning' },
          { label: 'Settings' }
        ]}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="risk">Risk Scoring</TabsTrigger>
          <TabsTrigger value="mandatory">Mandatory Rules</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Annual & Monthly Targets</CardTitle>
              <CardDescription>Define audit coverage goals for the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Random Sampling Engine</Label>
                  <p className="text-sm text-muted-foreground">Activate automated employer selection</p>
                </div>
                <Switch checked={enableRandomSampling} onCheckedChange={setEnableRandomSampling} />
              </div>

              <div className="space-y-2">
                <Label>Annual Audit Coverage Target (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[annualTarget]}
                    onValueChange={(val) => setAnnualTarget(val[0])}
                    max={20}
                    step={0.5}
                    className="flex-1"
                  />
                  <Input type="number" value={annualTarget} className="w-20" readOnly />
                </div>
                <p className="text-sm text-muted-foreground">Target: {annualTarget}% of all active employers per year</p>
              </div>

              <div className="space-y-2">
                <Label>Monthly Audit Target (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[monthlyTarget]}
                    onValueChange={(val) => setMonthlyTarget(val[0])}
                    max={5}
                    step={0.1}
                    className="flex-1"
                  />
                  <Input type="number" value={monthlyTarget} className="w-20" readOnly />
                </div>
                <p className="text-sm text-muted-foreground">Target: {monthlyTarget}% of all active employers per month</p>
              </div>

              <div className="space-y-2">
                <Label>Minimum Audits per Zone (per month)</Label>
                <Input
                  type="number"
                  value={minPerZone}
                  onChange={(e) => setMinPerZone(Number(e.target.value))}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">Each zone must have at least {minPerZone} employers selected</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Scoring */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Score Weights</CardTitle>
              <CardDescription>Configure risk model weights (total must equal 100)</CardDescription>
              {totalWeight !== 100 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Total weight must equal 100% (currently {totalWeight}%)</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Filing Behavior Weight</Label>
                  <Badge>{filingWeight}%</Badge>
                </div>
                <Slider
                  value={[filingWeight]}
                  onValueChange={(val) => setFilingWeight(val[0])}
                  max={50}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">Late/missing C3 submissions, payment delays</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Payment Behavior Weight</Label>
                  <Badge>{paymentWeight}%</Badge>
                </div>
                <Slider
                  value={[paymentWeight]}
                  onValueChange={(val) => setPaymentWeight(val[0])}
                  max={50}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">Arrears history, arrangement defaults</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Employer Profile Weight</Label>
                  <Badge>{profileWeight}%</Badge>
                </div>
                <Slider
                  value={[profileWeight]}
                  onValueChange={(val) => setProfileWeight(val[0])}
                  max={30}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">Size, sector risk, employee turnover</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Historical Compliance Weight</Label>
                  <Badge>{historicalWeight}%</Badge>
                </div>
                <Slider
                  value={[historicalWeight]}
                  onValueChange={(val) => setHistoricalWeight(val[0])}
                  max={30}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">Past audit findings, legal actions</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk-Banded Sampling Probabilities</CardTitle>
              <CardDescription>Define selection probability for each risk band</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>High Risk (Score 80-100)</Label>
                  <Badge variant="destructive">{highRiskProb}%</Badge>
                </div>
                <Slider
                  value={[highRiskProb]}
                  onValueChange={(val) => setHighRiskProb(val[0])}
                  max={50}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Medium Risk (Score 50-79)</Label>
                  <Badge variant="secondary">{medRiskProb}%</Badge>
                </div>
                <Slider
                  value={[medRiskProb]}
                  onValueChange={(val) => setMedRiskProb(val[0])}
                  max={30}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Low Risk (Score 0-49)</Label>
                  <Badge>{lowRiskProb}%</Badge>
                </div>
                <Slider
                  value={[lowRiskProb]}
                  onValueChange={(val) => setLowRiskProb(val[0])}
                  max={15}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pure Random Sampling (Fairness Layer)</CardTitle>
              <CardDescription>Ensure fairness by auditing low-risk employers occasionally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Pure Random Sampling</Label>
                  <p className="text-sm text-muted-foreground">Include random selection regardless of risk</p>
                </div>
                <Switch checked={enablePureRandom} onCheckedChange={setEnablePureRandom} />
              </div>

              {enablePureRandom && (
                <div className="space-y-2">
                  <Label>Minimum % of Annual Audits from Pure Random</Label>
                  <Input type="number" defaultValue={10} className="max-w-xs" />
                  <p className="text-sm text-muted-foreground">At least 10% of audits will be purely random</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mandatory Rules */}
        <TabsContent value="mandatory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mandatory Audit Selection Rules</CardTitle>
              <CardDescription>Employers matching these criteria are always selected first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mandatoryRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => {
                          setMandatoryRules(mandatoryRules.map(r =>
                            r.id === rule.id ? { ...r, enabled: checked } : r
                          ));
                        }}
                      />
                      <div className="flex-1">
                        <Label className="text-base">{rule.name}</Label>
                        {rule.enabled && rule.threshold > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Threshold: {rule.name.includes('Arrears') ? `EC$ ${rule.threshold.toLocaleString()}` : rule.threshold}
                          </p>
                        )}
                      </div>
                    </div>
                    {rule.enabled && rule.threshold > 0 && (
                      <Input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => {
                          setMandatoryRules(mandatoryRules.map(r =>
                            r.id === rule.id ? { ...r, threshold: Number(e.target.value) } : r
                          ));
                        }}
                        className="w-32"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution */}
        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sampling Execution Settings</CardTitle>
              <CardDescription>Configure when and how sampling runs are executed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Automatic Execution</Label>
                    <p className="text-sm text-muted-foreground">Run sampling automatically on 1st of each month at 02:00</p>
                  </div>
                  <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
                </div>

                {!autoExecute && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Manual mode: Sampling will only run when you click "Run Sampling Now"
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-4">
                <div>
                  <Label className="text-base">Sampling Frequency</Label>
                  <p className="text-sm text-muted-foreground mt-1">Currently set to: Monthly (recommended)</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleRunSimulation} variant="outline">
                    <Play className="h-4 w-4 mr-2" />
                    Run Sampling Now
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Last Run Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
