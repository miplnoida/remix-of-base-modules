import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Database, Settings, Pencil } from 'lucide-react';
import type { SimulationFactContext } from '@/services/complianceSimulatorEngine';

interface Props {
  facts: SimulationFactContext;
  isManualMode: boolean;
}

interface FactGroup {
  label: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; format?: 'currency' | 'percent' | 'boolean' | 'date' | 'text' | 'number' }[];
}

const FACT_GROUPS: FactGroup[] = [
  {
    label: 'Employer',
    icon: <Database className="h-3.5 w-3.5" />,
    fields: [
      { key: 'employerRegNo', label: 'Reg No', format: 'text' },
      { key: 'employerStatus', label: 'Status', format: 'text' },
      { key: 'employerName', label: 'Name', format: 'text' },
      { key: 'businessType', label: 'Business Type', format: 'text' },
    ],
  },
  {
    label: 'C3 Filing',
    icon: <Settings className="h-3.5 w-3.5" />,
    fields: [
      { key: 'filingSubmitted', label: 'C3 Submitted', format: 'boolean' },
      { key: 'filingDate', label: 'Filing Date', format: 'date' },
      { key: 'filingPeriod', label: 'Period', format: 'text' },
      { key: 'filingDueDay', label: 'Due Day', format: 'number' },
      { key: 'gracePeriodDays', label: 'Grace Days', format: 'number' },
      { key: 'daysPastDeadline', label: 'Days Past Deadline', format: 'number' },
    ],
  },
  {
    label: 'Payment',
    icon: <Settings className="h-3.5 w-3.5" />,
    fields: [
      { key: 'paymentMade', label: 'Payment Made', format: 'boolean' },
      { key: 'paymentAmount', label: 'Payment Amount', format: 'currency' },
      { key: 'amountDue', label: 'Amount Due', format: 'currency' },
      { key: 'shortfallAmount', label: 'Shortfall', format: 'currency' },
      { key: 'shortfallPercent', label: 'Shortfall %', format: 'percent' },
    ],
  },
  {
    label: 'Contributions',
    icon: <Settings className="h-3.5 w-3.5" />,
    fields: [
      { key: 'totalWagesDeclared', label: 'Wages Declared', format: 'currency' },
      { key: 'priorAverageWages', label: 'Prior Avg Wages', format: 'currency' },
      { key: 'levyAmountReported', label: 'Levy Reported', format: 'currency' },
      { key: 'severanceAmountReported', label: 'Severance Reported', format: 'currency' },
      { key: 'levyEligible', label: 'Levy Eligible', format: 'boolean' },
      { key: 'severanceEligible', label: 'Severance Eligible', format: 'boolean' },
      { key: 'employeeCountDeclared', label: 'Employees Declared', format: 'number' },
      { key: 'employeeCountObserved', label: 'Employees Observed', format: 'number' },
      { key: 'consecutiveGapCount', label: 'Consecutive Gaps', format: 'number' },
    ],
  },
  {
    label: 'Arrangement',
    icon: <Settings className="h-3.5 w-3.5" />,
    fields: [
      { key: 'arrangementActive', label: 'Arrangement Active', format: 'boolean' },
      { key: 'installmentOverdueDays', label: 'Installment Overdue Days', format: 'number' },
      { key: 'installmentGraceDays', label: 'Grace Days', format: 'number' },
    ],
  },
  {
    label: 'History & Risk',
    icon: <Settings className="h-3.5 w-3.5" />,
    fields: [
      { key: 'priorViolationsCount', label: 'Prior Violations', format: 'number' },
      { key: 'priorSameTypeViolationsRolling12', label: 'Same-Type (12mo)', format: 'number' },
      { key: 'repeatOffender', label: 'Repeat Offender', format: 'boolean' },
      { key: 'hasClearanceCert', label: 'Clearance Cert', format: 'boolean' },
      { key: 'riskScore', label: 'Risk Score', format: 'number' },
      { key: 'daysOpen', label: 'Days Open', format: 'number' },
      { key: 'totalOwed', label: 'Total Owed', format: 'currency' },
      { key: 'noticeStage', label: 'Notice Stage', format: 'text' },
      { key: 'legalResponseReceived', label: 'Legal Response', format: 'boolean' },
    ],
  },
];

function formatValue(val: any, format?: string): string {
  if (val === null || val === undefined) return '—';
  switch (format) {
    case 'currency': return `EC$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    case 'percent': return `${Number(val).toFixed(1)}%`;
    case 'boolean': return val ? 'Yes' : 'No';
    case 'date': return val || '—';
    case 'number': return Number(val).toLocaleString();
    default: return String(val) || '—';
  }
}

export default function ExplanationPanel({ facts, isManualMode }: Props) {
  const overridden = new Set(facts.overriddenFields || []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Input Data & Sources
          <Badge variant="outline" className="text-[10px]">
            {isManualMode ? 'Manual Override' : 'Live Data'}
          </Badge>
          {overridden.size > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Pencil className="h-2.5 w-2.5" /> {overridden.size} overridden
            </Badge>
          )}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          These are the input values the simulation engine used. Values marked with ✏️ were manually overridden.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FACT_GROUPS.map(group => (
            <div key={group.label} className="rounded-md border p-3 space-y-1.5">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground pb-1 border-b">
                {group.icon} {group.label}
              </p>
              {group.fields.map(f => {
                const val = (facts as any)[f.key];
                const isOver = overridden.has(f.key);
                return (
                  <div key={f.key} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-muted-foreground truncate mr-2">{f.label}</span>
                    <span className={`font-medium shrink-0 ${isOver ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {formatValue(val, f.format)}
                      {isOver && <span className="ml-1 text-[10px]">✏️</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {isManualMode && overridden.size > 0 && (
          <p className="text-[10px] text-amber-600 mt-3 border-t pt-2">
            ✏️ = Manually overridden value (not from live employer data). The simulation engine uses these values exactly as provided.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
