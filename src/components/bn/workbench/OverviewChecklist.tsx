/**
 * OverviewChecklist — Processing checklist + warnings + next-best-action.
 *
 * Reads existing claim state and renders a compact "where we are" panel at
 * the top of the Overview tab so officers know exactly what to do next.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useBnIsEvidenceComplete } from '@/hooks/bn/useBnEvidence';
import { useBnClaimEligibility, useBnClaimCalculations } from '@/hooks/bn/useBnClaim';

interface Props {
  claimId: string;
  status: string;
  ssn?: string | null;
  productId?: string | null;
  onJumpTab?: (tab: string) => void;
}

interface Step {
  key: string;
  label: string;
  done: boolean;
  tab?: string;
}

export function OverviewChecklist({ claimId, status, ssn, productId, onJumpTab }: Props) {
  const { data: evidenceComplete } = useBnIsEvidenceComplete(claimId);
  const { data: eligibility = [] } = useBnClaimEligibility(claimId);
  const { data: calculations = [] } = useBnClaimCalculations(claimId);

  const hasEligibility = eligibility.length > 0;
  const eligibilityPass = hasEligibility && (eligibility[0] as any).overall_result === true;
  const hasCalculation = calculations.length > 0;

  const steps: Step[] = [
    { key: 'identity', label: 'Claimant identified', done: !!ssn, tab: 'claimant' },
    { key: 'product', label: 'Benefit product selected', done: !!productId, tab: 'overview' },
    { key: 'intake', label: 'Intake review started', done: !['DRAFT', 'SUBMITTED'].includes(status), tab: 'details' },
    { key: 'evidence', label: 'Required documents satisfied', done: !!evidenceComplete, tab: 'documents' },
    { key: 'eligibility', label: 'Eligibility evaluated', done: hasEligibility, tab: 'eligibility' },
    { key: 'calculation', label: 'Benefit amount calculated', done: hasCalculation, tab: 'calculation' },
    { key: 'decision', label: 'Decision recorded', done: ['APPROVED', 'DENIED', 'CLOSED'].includes(status), tab: 'decisions' },
  ];

  const warnings: string[] = [];
  if (hasEligibility && !eligibilityPass) warnings.push('Eligibility failed — review rule trace before continuing.');
  if (status === 'DECISION' && !evidenceComplete) warnings.push('Mandatory documents are still unverified — approval will be blocked.');
  if (hasCalculation && !hasEligibility) warnings.push('Calculation exists without an eligibility record.');

  // Next-best-action: first incomplete step or status-specific suggestion.
  const next = steps.find(s => !s.done);
  const nextLabel = (() => {
    if (status === 'APPROVED' || status === 'CLOSED') return 'Claim processing complete.';
    if (status === 'DENIED') return 'Claim denied — no further action required.';
    if (!next) return 'All checklist items complete — ready for decision.';
    return `Next: ${next.label}`;
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Processing checklist</CardTitle>
          <Badge variant={next ? 'secondary' : 'default'}>
            {steps.filter(s => s.done).length}/{steps.length} complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {steps.map(s => (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <button
                type="button"
                onClick={() => s.tab && onJumpTab?.(s.tab)}
                className={`text-left ${s.done ? 'text-foreground' : 'text-muted-foreground'} ${s.tab ? 'hover:underline' : ''}`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        {warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attention needed</AlertTitle>
            <AlertDescription>
              <ul className="ml-4 list-disc">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="font-medium">{nextLabel}</span>
          {next?.tab && (
            <button
              type="button"
              onClick={() => onJumpTab?.(next.tab!)}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Go to {next.tab}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
