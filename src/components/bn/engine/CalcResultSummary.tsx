import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, DollarSign, Calendar, Users, AlertTriangle } from 'lucide-react';
import type { BnCalcEngineOutput } from '@/types/bnCalcEngine';

interface Props {
  result: BnCalcEngineOutput;
}

export default function CalcResultSummary({ result }: Props) {
  const { eligibility, contributionWindow, wageAggregation, formulaResult, beneficiarySplits, paymentSchedule, validation } = result;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {result.status === 'COMPLETED' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            Engine Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={result.status === 'COMPLETED' ? 'default' : 'destructive'}>{result.status}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Run ID</span>
            <span className="font-mono text-xs">{result.runId.substring(0, 8)}…</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trace Steps</span>
            <span>{result.trace.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {eligibility.passed ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {eligibility.rules.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="truncate max-w-[160px]">{r.ruleName}</span>
              {r.passed ? <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" /> : <XCircle className="h-3 w-3 text-destructive shrink-0" />}
            </div>
          ))}
          {eligibility.rules.length === 0 && <p className="text-xs text-muted-foreground">No rules configured</p>}
        </CardContent>
      </Card>

      {/* Contribution Window */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Contribution Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Window</span><span>{contributionWindow.windowType}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Qualifying Weeks</span><span className="font-semibold">{contributionWindow.qualifyingWeeks}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Required</span><span>{contributionWindow.requiredWeeks}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="text-xs">{contributionWindow.fromDate} — {contributionWindow.toDate}</span></div>
        </CardContent>
      </Card>

      {/* Wages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Wage Aggregation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Avg Weekly Wage</span><span className="font-semibold">${wageAggregation.averageWeeklyWage.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Avg Annual Wage</span><span>${wageAggregation.averageAnnualWage.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Wages</span><span>${wageAggregation.totalWages.toLocaleString()}</span></div>
          {wageAggregation.wagesCapped && <Badge className="bg-amber-100 text-amber-800 text-xs">Capped at ${wageAggregation.cappedAmount}</Badge>}
        </CardContent>
      </Card>

      {/* Formula Result */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Calculated Amounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Calc Type</span><Badge variant="outline">{formulaResult.calcType}</Badge></div>
          {formulaResult.finalWeeklyRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Weekly Rate</span><span className="font-bold text-emerald-700">${formulaResult.finalWeeklyRate.toLocaleString()}</span></div>}
          {formulaResult.finalMonthlyRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Monthly Rate</span><span className="font-bold text-emerald-700">${formulaResult.finalMonthlyRate.toLocaleString()}</span></div>}
          {formulaResult.finalLumpSum > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Lump Sum</span><span className="font-bold text-emerald-700">${formulaResult.finalLumpSum.toLocaleString()}</span></div>}
          <Separator />
          <div className="flex justify-between text-xs">
            <span>Rounding: {formulaResult.roundingRule}</span>
            {formulaResult.minApplied && <Badge className="text-xs bg-amber-100 text-amber-800">Min applied</Badge>}
            {formulaResult.maxApplied && <Badge className="text-xs bg-amber-100 text-amber-800">Max applied</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Validation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {validation.isValid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Errors</span>
            <Badge variant={validation.errors.length > 0 ? 'destructive' : 'outline'}>{validation.errors.length}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Warnings</span>
            <Badge variant={validation.warnings.length > 0 ? 'secondary' : 'outline'}>{validation.warnings.length}</Badge>
          </div>
          {validation.errors.slice(0, 3).map((e, i) => (
            <p key={i} className="text-xs text-destructive">• {e.message}</p>
          ))}
          {validation.warnings.slice(0, 3).map((w, i) => (
            <p key={i} className="text-xs text-amber-600">• {w.message}</p>
          ))}
        </CardContent>
      </Card>

      {/* Beneficiaries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Beneficiary Splits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {beneficiarySplits.map((b, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{b.beneficiaryName} ({b.relationship})</span>
              <span className="font-semibold">{b.percentage}% — ${b.amount.toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment Schedule Preview */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Payment Schedule ({paymentSchedule.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentSchedule.length > 0 ? (
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2">#</th>
                    <th className="text-left py-1 px-2">Date</th>
                    <th className="text-left py-1 px-2">Period</th>
                    <th className="text-right py-1 px-2">Gross</th>
                    <th className="text-right py-1 px-2">Net</th>
                    <th className="text-left py-1 px-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1 px-2">{p.sequenceNumber}</td>
                      <td className="py-1 px-2">{p.paymentDate}</td>
                      <td className="py-1 px-2">{p.periodFrom} — {p.periodTo}</td>
                      <td className="py-1 px-2 text-right">${p.grossAmount.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right font-semibold">${p.netAmount.toLocaleString()}</td>
                      <td className="py-1 px-2"><Badge variant="outline" className="text-xs">{p.paymentType}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No payment schedule generated</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison (if present) */}
      {result.comparison && (
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {result.comparison.overallMatch ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              Legacy Comparison — {result.comparison.matchPercentage}% Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Field</span>
              <span className="font-medium text-muted-foreground">Engine</span>
              <span className="font-medium text-muted-foreground">Legacy</span>
              <span className="font-medium text-muted-foreground">Match</span>
              {result.comparison.diffs.map((d, i) => (
                <React.Fragment key={i}>
                  <span>{d.label}</span>
                  <span className="font-mono">{String(d.engineValue)}</span>
                  <span className="font-mono">{String(d.legacyValue)}</span>
                  <span>{d.match ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}</span>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
