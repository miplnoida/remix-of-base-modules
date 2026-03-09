import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const violationTypeSeeds = [
  { code: 'LATE_FILING', name: 'Late Filing', category: 'Filing', severity: 'Medium', description: 'C3 submitted after the deadline day of the following month', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 15, enabled: true },
  { code: 'NON_FILING', name: 'Non Filing', category: 'Filing', severity: 'High', description: 'No C3 submission received for the filing period', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
  { code: 'PARTIAL_PAYMENT', name: 'Partial Payment', category: 'Payment', severity: 'Medium', description: 'Payment received but less than the total amount due on the C3', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 7, enabled: true },
  { code: 'NON_PAYMENT', name: 'Non Payment', category: 'Payment', severity: 'High', description: 'No payment received by the payment due date', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
  { code: 'UNDER_DECLARATION', name: 'Under Declaration', category: 'Declaration', severity: 'High', description: 'Reported wages are lower than actual wages found during audit/inspection', autoDetect: false, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
  { code: 'LEVY_SEVERANCE_OMISSION', name: 'Levy/Severance Omission', category: 'Declaration', severity: 'Medium', description: 'Employer omitted levy or severance contributions from filing', autoDetect: true, funds: ['LV'], gracePeriodDays: 0, enabled: true },
  { code: 'REPEAT_DEFAULT', name: 'Repeat Default', category: 'Legal', severity: 'Critical', description: 'Employer has 3+ violations of the same type within 12 months', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
  { code: 'ARRANGEMENT_DEFAULT', name: 'Arrangement Default', category: 'Legal', severity: 'High', description: 'Employer defaulted on an active payment arrangement', autoDetect: true, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
  { code: 'LEGAL_DEFAULT', name: 'Legal Default', category: 'Legal', severity: 'Critical', description: 'Employer failed to comply with court order or judgment', autoDetect: false, funds: ['SS', 'LV', 'PE'], gracePeriodDays: 0, enabled: true },
];

const ViolationTypes = () => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Violation Types</h1>
          </div>
          <p className="text-muted-foreground">Configure violation type definitions used across the compliance module</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Violation Type</Button>
      </div>

      {/* Category Summary */}
      <div className="flex gap-3">
        {['Filing', 'Payment', 'Declaration', 'Legal'].map(cat => (
          <Badge key={cat} variant="outline" className="py-1 px-3">
            {cat}: {violationTypeSeeds.filter(v => v.category === cat).length}
          </Badge>
        ))}
      </div>

      <div className="grid gap-3">
        {violationTypeSeeds.map((vt) => (
          <Card key={vt.code} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{vt.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{vt.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{vt.category}</Badge>
                      {vt.autoDetect && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto-Detect</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{vt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex gap-1">
                    {vt.funds.map(f => <Badge key={f} variant="outline" className="text-[10px] h-5">{f}</Badge>)}
                  </div>
                  <Badge variant={
                    vt.severity === 'Critical' ? 'destructive' :
                    vt.severity === 'High' ? 'default' : 'secondary'
                  } className="text-[10px]">
                    {vt.severity}
                  </Badge>
                  <Switch checked={vt.enabled} />
                  <Button variant="ghost" size="icon" onClick={() => setExpandedCode(expandedCode === vt.code ? null : vt.code)}>
                    {expandedCode === vt.code ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {expandedCode === vt.code && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{vt.category}</span></div>
                  <div><span className="text-muted-foreground">Grace Period:</span> <span className="font-medium text-foreground">{vt.gracePeriodDays} days</span></div>
                  <div><span className="text-muted-foreground">Auto-Detection:</span> <span className="font-medium text-foreground">{vt.autoDetect ? 'Yes' : 'No (Manual)'}</span></div>
                  <div><span className="text-muted-foreground">Applicable Funds:</span> <span className="font-medium text-foreground">{vt.funds.join(', ')}</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ViolationTypes;
