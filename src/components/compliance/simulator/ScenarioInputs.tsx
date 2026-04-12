import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sliders } from 'lucide-react';
import type { SimulationFactContext } from '@/services/complianceSimulatorEngine';

interface Props {
  facts: SimulationFactContext;
  onChange: (field: keyof SimulationFactContext, value: any) => void;
  isManualMode: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function ScenarioInputs({ facts, onChange, isManualMode }: Props) {
  if (!isManualMode) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Scenario Inputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Switch to Manual Scenario mode to override input values.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Manual Scenario Inputs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Filing Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground border-b pb-1">Filing</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">C3 Filing Submitted?</Label>
            <Switch checked={facts.filingSubmitted} onCheckedChange={v => onChange('filingSubmitted', v)} />
          </div>
          {facts.filingSubmitted && (
            <>
              <Field label="Filing Date"><Input type="date" value={facts.filingDate || ''} onChange={e => onChange('filingDate', e.target.value)} className="h-8 text-xs" /></Field>
              <Field label="Filing Period (YYYY-MM)"><Input value={facts.filingPeriod || ''} onChange={e => onChange('filingPeriod', e.target.value)} placeholder="2026-03" className="h-8 text-xs" /></Field>
            </>
          )}
          <Field label="Days Past Deadline"><Input type="number" value={facts.daysPastDeadline} onChange={e => onChange('daysPastDeadline', Number(e.target.value))} className="h-8 text-xs" /></Field>
        </div>

        {/* Payment Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground border-b pb-1">Payment</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Payment Made?</Label>
            <Switch checked={facts.paymentMade} onCheckedChange={v => onChange('paymentMade', v)} />
          </div>
          <Field label="Amount Due (EC$)"><Input type="number" value={facts.amountDue} onChange={e => onChange('amountDue', Number(e.target.value))} className="h-8 text-xs" /></Field>
          {facts.paymentMade && (
            <Field label="Payment Amount (EC$)"><Input type="number" value={facts.paymentAmount} onChange={e => {
              const amt = Number(e.target.value);
              onChange('paymentAmount', amt);
              const shortfall = Math.max(0, facts.amountDue - amt);
              onChange('shortfallAmount', shortfall);
              onChange('shortfallPercent', facts.amountDue > 0 ? (shortfall / facts.amountDue) * 100 : 0);
            }} className="h-8 text-xs" /></Field>
          )}
          <Field label="Shortfall (EC$)"><Input type="number" value={facts.shortfallAmount} onChange={e => onChange('shortfallAmount', Number(e.target.value))} className="h-8 text-xs" /></Field>
        </div>

        {/* Arrangement Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground border-b pb-1">Arrangement</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Active Arrangement?</Label>
            <Switch checked={facts.arrangementActive} onCheckedChange={v => onChange('arrangementActive', v)} />
          </div>
          {facts.arrangementActive && (
            <>
              <Field label="Installment Due Date"><Input type="date" value={facts.installmentDueDate || ''} onChange={e => onChange('installmentDueDate', e.target.value)} className="h-8 text-xs" /></Field>
              <Field label="Installment Overdue Days"><Input type="number" value={facts.installmentOverdueDays} onChange={e => onChange('installmentOverdueDays', Number(e.target.value))} className="h-8 text-xs" /></Field>
            </>
          )}
        </div>

        {/* Contributions Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground border-b pb-1">Contributions</p>
          <Field label="Total Wages Declared (EC$)"><Input type="number" value={facts.totalWagesDeclared} onChange={e => onChange('totalWagesDeclared', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Prior Average Wages (EC$)"><Input type="number" value={facts.priorAverageWages} onChange={e => onChange('priorAverageWages', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Levy Amount Reported (EC$)"><Input type="number" value={facts.levyAmountReported} onChange={e => onChange('levyAmountReported', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Severance Reported (EC$)"><Input type="number" value={facts.severanceAmountReported} onChange={e => onChange('severanceAmountReported', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Levy Eligible?</Label>
            <Switch checked={facts.levyEligible} onCheckedChange={v => onChange('levyEligible', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Severance Eligible?</Label>
            <Switch checked={facts.severanceEligible} onCheckedChange={v => onChange('severanceEligible', v)} />
          </div>
          <Field label="Employees Declared"><Input type="number" value={facts.employeeCountDeclared} onChange={e => onChange('employeeCountDeclared', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Employees Observed"><Input type="number" value={facts.employeeCountObserved} onChange={e => onChange('employeeCountObserved', Number(e.target.value))} className="h-8 text-xs" /></Field>
        </div>

        {/* History Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground border-b pb-1">History & Status</p>
          <Field label="Prior Violations (total)"><Input type="number" value={facts.priorViolationsCount} onChange={e => onChange('priorViolationsCount', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Same-Type Violations (12mo)"><Input type="number" value={facts.priorSameTypeViolationsRolling12} onChange={e => onChange('priorSameTypeViolationsRolling12', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Repeat Offender?</Label>
            <Switch checked={facts.repeatOffender} onCheckedChange={v => onChange('repeatOffender', v)} />
          </div>
          <Field label="Employer Status">
            <Select value={facts.employerStatus || ''} onValueChange={v => onChange('employerStatus', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Active</SelectItem>
                <SelectItem value="I">Inactive</SelectItem>
                <SelectItem value="D">Deregistered</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Has Clearance Cert?</Label>
            <Switch checked={facts.hasClearanceCert} onCheckedChange={v => onChange('hasClearanceCert', v)} />
          </div>
          <Field label="Risk Score"><Input type="number" value={facts.riskScore} onChange={e => onChange('riskScore', Number(e.target.value))} min={0} max={100} className="h-8 text-xs" /></Field>
          <Field label="Days Open"><Input type="number" value={facts.daysOpen} onChange={e => onChange('daysOpen', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Total Owed (EC$)"><Input type="number" value={facts.totalOwed} onChange={e => onChange('totalOwed', Number(e.target.value))} className="h-8 text-xs" /></Field>
          <Field label="Notice Stage">
            <Select value={facts.noticeStage || 'none'} onValueChange={v => onChange('noticeStage', v === 'none' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="WARNING_NOTICE">WARNING_NOTICE</SelectItem>
                <SelectItem value="DEMAND_NOTICE">DEMAND_NOTICE</SelectItem>
                <SelectItem value="FINAL_DEMAND">FINAL_DEMAND</SelectItem>
                <SelectItem value="WARNING_ISSUED">WARNING_ISSUED</SelectItem>
                <SelectItem value="UNDER_REVIEW">UNDER_REVIEW</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Legal Response?</Label>
            <Switch checked={facts.legalResponseReceived} onCheckedChange={v => onChange('legalResponseReceived', v)} />
          </div>
          <Field label="Consecutive Gaps"><Input type="number" value={facts.consecutiveGapCount} onChange={e => onChange('consecutiveGapCount', Number(e.target.value))} className="h-8 text-xs" /></Field>
        </div>
      </CardContent>
    </Card>
  );
}
