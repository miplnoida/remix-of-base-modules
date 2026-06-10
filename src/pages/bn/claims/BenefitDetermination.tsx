import { useUserCode } from '@/hooks/useUserCode';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
/**
 * Benefit Determination Screen
 * 
 * Business Purpose: Support benefit application review, rule versioning,
 * eligibility validation, calculation, explanation, and decision preparation.
 * 
 * Approval here does NOT directly issue payment — it marks APPROVE_READY.
 * 
 * Existing tables: bn_claim, bn_product, bn_product_version, bn_eligibility_rule,
 *   bn_calculation_rule, bn_timeline_rule, bn_claim_eligibility, bn_claim_calculation,
 *   bn_claim_calculation_line, bn_claim_decision, bn_claim_event, bn_claim_evidence
 * 
 * Integration: Uses existing workflow (decision engine) and notification adapters.
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BnEmptyState } from '@/components/bn/shared';
import { useBnDeterminationContext, useBnRuleVersion, useExecuteDeterminationAction, useRunDeterminationCalc } from '@/hooks/bn/useBnDetermination';
import { ClaimContextBanner } from '@/components/bn/determination/ClaimContextBanner';
import { RuleVersionBanner } from '@/components/bn/determination/RuleVersionBanner';
import { EligibilityPanel } from '@/components/bn/determination/EligibilityPanel';
import { ContributionWagePanel } from '@/components/bn/determination/ContributionWagePanel';
import { CalculationLinesPanel } from '@/components/bn/determination/CalculationLinesPanel';
import { WarningsExceptionsPanel } from '@/components/bn/determination/WarningsExceptionsPanel';
import { DecisionPanel } from '@/components/bn/determination/DecisionPanel';
import { LinkedClaimsContext } from '@/components/bn/determination/LinkedClaimsContext';
import { WorkflowNotificationSummary } from '@/components/bn/determination/WorkflowNotificationSummary';
import { DeterminationActionBar } from '@/components/bn/determination/DeterminationActionBar';

export default function BenefitDetermination() {
  const { id: claimId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ctx, isLoading, error } = useBnDeterminationContext(claimId);
  const { data: ruleData } = useBnRuleVersion(ctx?.productVersion?.id);

  const executeAction = useExecuteDeterminationAction();
  const runCalc = useRunDeterminationCalc();

  const { roles: authRoles } = useSupabaseAuth();
  const userRoles = (authRoles ?? []).map((r) => String(r));
  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';

  const handleAction = (action: string, narrative?: string, reasonCodeId?: string) => {
    if (!claimId) return;
    executeAction.mutate(
      { claimId, action, narrative, reasonCodeId, performedBy: userCode },
      {
        onSuccess: (result) => {
          toast.success(`Action ${action} completed.${result.newStatus ? ` Status → ${result.newStatus}` : ''}`);
        },
        onError: (err: any) => {
          toast.error(`Action failed: ${err.message}`);
        },
      }
    );
  };

  const handleCalculate = () => {
    if (!ctx?.claim || !ctx.product) return;
    runCalc.mutate(
      {
        input: {
          claimId: ctx.claim.id,
          ssn: ctx.claim.ssn,
          productId: ctx.claim.product_id || '',
          productVersionId: ctx.claim.product_version_id || '',
          claimDate: ctx.claim.claim_date,
          countryCode: (ctx.claim as any).country_code || 'KN',
          mode: 'LIVE',
        },
        performedBy: userCode,
      },
      {
        onSuccess: () => toast.success('Calculation completed and snapshot saved.'),
        onError: (err: any) => toast.error(`Calculation failed: ${err.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load determination context." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="t-page-title">Benefit Determination</h1>
          <p className="t-page-subtitle mt-1">
            Review eligibility, run calculations, and prepare decisions.
          </p>
        </div>
      </div>

      {/* 1. Claim Context Banner */}
      <ClaimContextBanner claim={ctx.claim} product={ctx.product} />

      {/* 2. Rule Version Banner */}
      <RuleVersionBanner
        version={ctx.productVersion}
        ruleCount={ruleData ? {
          eligibility: ruleData.eligibilityRules.length,
          calculation: ruleData.calculationRules.length,
          timeline: ruleData.timelineRules.length,
        } : undefined}
      />

      {/* 6. Warnings/Exceptions — shown early for visibility */}
      <WarningsExceptionsPanel warnings={ctx.warnings} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3. Eligibility Input Panel */}
        <EligibilityPanel snapshots={ctx.eligibilityResults} />

        {/* 4. Contribution and Wage Panel */}
        <ContributionWagePanel summary={ctx.contributionSummary} />
      </div>

      {/* 5. Calculation Lines Panel */}
      <CalculationLinesPanel snapshots={ctx.calculationSnapshots} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 7. Decision Panel */}
        <DecisionPanel decisions={ctx.decisions} />

        {/* 8. Related Linked Claims */}
        <LinkedClaimsContext linkedClaims={ctx.linkedClaims} />
      </div>

      {/* 9. Workflow & Notification Summary */}
      <WorkflowNotificationSummary
        evidenceSummary={ctx.evidenceSummary}
        claimStatus={ctx.claim.status}
      />

      {/* 11. Action Bar (sticky bottom) */}
      <DeterminationActionBar
        claimStatus={ctx.claim.status}
        eligibility={ctx.eligibilityResults}
        calculations={ctx.calculationSnapshots}
        evidenceSummary={ctx.evidenceSummary}
        userRoles={userRoles}
        onAction={handleAction}
        onCalculate={handleCalculate}
        isExecuting={executeAction.isPending || runCalc.isPending}
      />
    </div>
  );
}
