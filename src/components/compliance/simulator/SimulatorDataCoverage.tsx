import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, MinusCircle, Database } from 'lucide-react';
import type { DataCoverage } from '@/hooks/compliance/useSimulatorData';

interface Props { coverage: DataCoverage | null; isLoading: boolean; }

function Row({ label, available, detail, rules }: { label: string; available: boolean; detail: string; rules: string }) {
  const Icon = available ? CheckCircle2 : MinusCircle;
  return (
    <div className="flex items-start justify-between text-xs gap-2 py-1">
      <div className="flex items-start gap-1.5 min-w-0">
        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${available ? 'text-emerald-600' : 'text-muted-foreground/50'}`} />
        <div className="min-w-0">
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-[10px] text-muted-foreground truncate">Rules: {rules}</div>
        </div>
      </div>
      <span className={`text-[11px] shrink-0 ${available ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{detail}</span>
    </div>
  );
}

export default function SimulatorDataCoverage({ coverage, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data Coverage</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground animate-pulse">Loading…</p></CardContent>
      </Card>
    );
  }
  if (!coverage) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data Coverage</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Select an employer to see which rules can be evaluated.</p></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" /> Data Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <Row label="C3 filings" available={coverage.filings.count > 0} detail={`${coverage.filings.count} rows / ${coverage.filings.periodsCovered} periods`} rules="DR-001, DR-002, DR-007, DR-013" />
        <Row label="Payments" available={coverage.payments.headerCount > 0} detail={`${coverage.payments.headerCount} headers`} rules="DR-003, DR-004, CR-001" />
        <Row label="Arrangements" available={coverage.arrangements.count > 0} detail={`${coverage.arrangements.count} (${coverage.arrangements.activeCount} active)`} rules="DR-006" />
        <Row label="Installments" available={coverage.installments.count > 0} detail={`${coverage.installments.count} (${coverage.installments.overdueCount} overdue)`} rules="DR-006" />
        <Row label="Inspections" available={coverage.inspections.count > 0} detail={`${coverage.inspections.count}`} rules="DR-009" />
        <Row label="Notices" available={coverage.notices.count > 0} detail={coverage.notices.latestType ?? '—'} rules="ER-001 → ER-003" />
        <Row label="Clearance certificates" available={coverage.clearanceCerts.available} detail={coverage.clearanceCerts.available ? 'on file' : 'source unavailable'} rules="DR-011" />
        <Row label="Violation history" available={coverage.violationHistory.count > 0} detail={`${coverage.violationHistory.count}`} rules="DR-005" />
        <p className="text-[10px] text-muted-foreground pt-2 border-t mt-2">
          Rules that depend on unavailable data are returned as <strong>Skipped</strong> rather than No-match so you can tell missing data from a true negative.
        </p>
      </CardContent>
    </Card>
  );
}
