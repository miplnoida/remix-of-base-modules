import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Cog, Plus, Zap, Calculator, TrendingUp, Edit, Eye } from 'lucide-react';

const detectionRules = [
  { id: 'DR-001', name: 'Late C3 Submission', trigger: 'C3 not received by deadline day + grace period', violationType: 'LATE_FILING', frequency: 'Daily', enabled: true, priority: 'Medium' },
  { id: 'DR-002', name: 'Missing C3 Submission', trigger: 'No C3 submitted for period after 30 days past deadline', violationType: 'NON_FILING', frequency: 'Daily', enabled: true, priority: 'High' },
  { id: 'DR-003', name: 'Payment Not Received', trigger: 'C3 submitted but no payment by payment due date', violationType: 'NON_PAYMENT', frequency: 'Daily', enabled: true, priority: 'High' },
  { id: 'DR-004', name: 'Partial Payment Detection', trigger: 'Payment amount < C3 total contributions due', violationType: 'PARTIAL_PAYMENT', frequency: 'Daily', enabled: true, priority: 'Medium' },
  { id: 'DR-005', name: 'Repeat Offender Detection', trigger: '3+ violations of same type within rolling 12 months', violationType: 'REPEAT_DEFAULT', frequency: 'Weekly', enabled: true, priority: 'Critical' },
  { id: 'DR-006', name: 'Arrangement Breach Detection', trigger: 'Installment not paid within 7 days of due date', violationType: 'ARRANGEMENT_DEFAULT', frequency: 'Daily', enabled: true, priority: 'High' },
  { id: 'DR-007', name: 'Levy/Severance Omission', trigger: 'C3 submitted with $0 levy contribution for eligible employer', violationType: 'LEVY_SEVERANCE_OMISSION', frequency: 'Daily', enabled: false, priority: 'Medium' },
];

const calculationRules = [
  { id: 'CR-001', name: 'Late Payment Penalty', formula: 'Outstanding Amount × Penalty Rate × Days Late', source: 'C3 Configuration', enabled: true, description: 'Penalty rate is referenced dynamically from the active C3 configuration period' },
  { id: 'CR-002', name: 'Interest Accrual', formula: 'Outstanding Amount × Annual Interest Rate / 365 × Days', source: 'C3 Configuration', enabled: true, description: 'Simple interest calculated daily on outstanding balances' },
  { id: 'CR-003', name: 'Estimated Assessment', formula: 'Last Known C3 Amount × 1.5 (escalation factor)', source: 'Historical Data', enabled: true, description: 'Used when employer fails to file — estimate based on previous submissions' },
  { id: 'CR-004', name: 'Under-Declaration Surcharge', formula: 'Difference × 2.0 (punitive factor) + standard contributions', source: 'Audit Findings', enabled: false, description: 'Additional charges for confirmed under-reporting during audits' },
];

const escalationRules = [
  { id: 'ER-001', name: 'Warning → Demand Notice', condition: 'No response 14 days after Warning Notice', escalateTo: 'Demand Notice', autoExecute: true, enabled: true },
  { id: 'ER-002', name: 'Demand → Final Demand', condition: 'No payment or arrangement 14 days after Demand Notice', escalateTo: 'Final Demand', autoExecute: true, enabled: true },
  { id: 'ER-003', name: 'Final Demand → Legal Action', condition: 'No response 7 days after Final Demand', escalateTo: 'Legal Action Requisition', autoExecute: false, enabled: true },
  { id: 'ER-004', name: 'Arrears Threshold Escalation', condition: 'Total arrears exceeds $50,000 threshold', escalateTo: 'Manager Review', autoExecute: false, enabled: true },
  { id: 'ER-005', name: 'Risk Band Critical Auto-Escalate', condition: 'Employer risk score reaches Critical band (76+)', escalateTo: 'Priority Case Queue', autoExecute: true, enabled: true },
];

const RuleEngine = () => {
  const [activeTab, setActiveTab] = useState('detection');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Rule Engine</h1>
          </div>
          <p className="text-muted-foreground">Configure detection, calculation, and escalation rules for automated compliance enforcement</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Rule</Button>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="detection" className="gap-2"><Zap className="h-4 w-4" />Detection Rules ({detectionRules.length})</TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2"><Calculator className="h-4 w-4" />Calculation Rules ({calculationRules.length})</TabsTrigger>
            <TabsTrigger value="escalation" className="gap-2"><TrendingUp className="h-4 w-4" />Escalation Rules ({escalationRules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="detection">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Detection rules automatically create violations when compliance conditions are met.</p>
              {detectionRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.frequency}</Badge>
                      <Badge variant={rule.priority === 'Critical' ? 'destructive' : rule.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">{rule.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.trigger}</p>
                    <p className="text-xs text-muted-foreground">Creates: <Badge variant="outline" className="font-mono text-[10px]">{rule.violationType}</Badge></p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.enabled} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calculation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Calculation rules define how penalties, interest, and fines are computed. Financial rates are referenced from C3 Configuration.</p>
              {calculationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">Source: {rule.source}</Badge>
                    </div>
                    <p className="text-xs font-mono text-primary">{rule.formula}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.enabled} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="escalation">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Escalation rules define when violations or cases are automatically escalated based on time, amount, or status conditions.</p>
              {escalationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                      <span className="font-medium text-foreground">{rule.name}</span>
                      {rule.autoExecute && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Execute</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">When:</span> {rule.condition}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Escalate to:</span> <span className="text-foreground">{rule.escalateTo}</span></p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Switch checked={rule.enabled} />
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default RuleEngine;
