import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { SimulationFactContext } from '@/services/complianceSimulatorEngine';

interface Props {
  facts: SimulationFactContext;
  isManualMode: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  filingSubmitted: 'Filing Submitted',
  filingDate: 'Filing Date',
  filingPeriod: 'Filing Period',
  daysPastDeadline: 'Days Past Deadline',
  paymentMade: 'Payment Made',
  paymentAmount: 'Payment Amount',
  amountDue: 'Amount Due',
  shortfallAmount: 'Shortfall Amount',
  shortfallPercent: 'Shortfall %',
  totalWagesDeclared: 'Total Wages',
  priorAverageWages: 'Prior Avg Wages',
  levyAmountReported: 'Levy Reported',
  severanceAmountReported: 'Severance Reported',
  levyEligible: 'Levy Eligible',
  severanceEligible: 'Severance Eligible',
  employeeCountDeclared: 'Employees Declared',
  employeeCountObserved: 'Employees Observed',
  arrangementActive: 'Arrangement Active',
  installmentOverdueDays: 'Installment Overdue Days',
  employerStatus: 'Employer Status',
  hasClearanceCert: 'Has Clearance Cert',
  priorViolationsCount: 'Prior Violations',
  priorSameTypeViolationsRolling12: 'Same-Type Violations (12mo)',
  repeatOffender: 'Repeat Offender',
  riskScore: 'Risk Score',
  daysOpen: 'Days Open',
  totalOwed: 'Total Owed',
  noticeStage: 'Notice Stage',
  legalResponseReceived: 'Legal Response',
  consecutiveGapCount: 'Consecutive Gaps',
};

export default function ExplanationPanel({ facts, isManualMode }: Props) {
  const overridden = facts.overriddenFields || [];
  const keyFacts = Object.entries(FIELD_LABELS).map(([key, label]) => {
    const val = (facts as any)[key];
    const isOverridden = overridden.includes(key);
    return { key, label, value: val, isOverridden };
  });

  const displayValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Data Sources & Explanation
          <Badge variant="outline" className="text-[10px]">
            {isManualMode ? 'Manual Override Mode' : 'Live Data Mode'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
          {keyFacts.map(({ key, label, value, isOverridden }) => (
            <div key={key} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-muted-foreground truncate mr-2">{label}</span>
              <span className={`font-medium shrink-0 ${isOverridden ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                {displayValue(value)}
                {isOverridden && <span className="ml-1 text-[10px]">✏️</span>}
              </span>
            </div>
          ))}
        </div>
        {isManualMode && overridden.length > 0 && (
          <p className="text-[10px] text-amber-600 mt-2 border-t pt-1">
            ✏️ = Manually overridden value (not from live employer data)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
