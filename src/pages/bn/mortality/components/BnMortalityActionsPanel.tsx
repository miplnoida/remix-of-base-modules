/**
 * BN Mortality — Actions Panel.
 *
 * Reads the canonical command catalogue and renders every command as an
 * always-visible row. Each command is disabled with a specific, honest
 * reason based on: rollout (actions_enabled), implementation flag,
 * capability, lifecycle state, and maker-checker requirement.
 *
 * No mutation ever fires from here while `actions_enabled = false`.
 */
import React from 'react';
import { BN_MORTALITY_COMMANDS, type BnMortalityCommandSpec } from '@/types/bn/mortality/mortalityCommands';
import type { BnModuleAccessContext } from '@/components/bn/access/BnModuleRouteGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';

/** Which lifecycle statuses each command is valid from (informational). */
const VALID_FROM: Partial<Record<BnMortalityCommandSpec['command'], readonly string[]>> = {
  BN_MORTALITY_DRAFT_SAVE: ['DRAFT'],
  BN_MORTALITY_REGISTER_REPORT: ['DRAFT', 'REPORTED'],
  BN_MORTALITY_CANCEL: ['DRAFT', 'REPORTED'],
  BN_MORTALITY_MATCH_PERSON: ['DRAFT', 'REPORTED', 'VERIFICATION_PENDING', 'CONFLICT'],
  BN_MORTALITY_SUBMIT_FOR_VERIFICATION: ['DRAFT', 'REPORTED'],
  BN_MORTALITY_PLACE_PROVISIONAL_HOLD: ['REPORTED', 'VERIFICATION_PENDING', 'CONFLICT', 'IMPACT_REVIEW', 'APPROVAL_PENDING'],
  BN_MORTALITY_RELEASE_HOLD: ['PROVISIONALLY_HELD'],
  BN_MORTALITY_RECORD_CONFLICT: ['VERIFICATION_PENDING', 'PROVISIONALLY_HELD'],
  BN_MORTALITY_RESOLVE_CONFLICT: ['CONFLICT'],
  BN_MORTALITY_CONFIRM_VERIFICATION: ['VERIFICATION_PENDING', 'PROVISIONALLY_HELD'],
  BN_MORTALITY_REJECT_REPORT: ['VERIFICATION_PENDING', 'CONFLICT', 'PROVISIONALLY_HELD'],
  BN_MORTALITY_PREPARE_IMPACT: ['VERIFIED', 'IMPACT_REVIEW'],
  BN_MORTALITY_SUBMIT_IMPACT: ['IMPACT_REVIEW'],
  BN_MORTALITY_RETURN_IMPACT: ['APPROVAL_PENDING'],
  BN_MORTALITY_APPROVE_IMPACT: ['APPROVAL_PENDING'],
  BN_MORTALITY_TERMINATE_AWARD: ['CONFIRMED', 'FOLLOW_ON_PROCESSING'],
  BN_MORTALITY_COMPLETE_FOLLOWON: ['FOLLOW_ON_PROCESSING'],
  BN_MORTALITY_REVERSE_CONFIRMATION: ['VERIFIED', 'CONFIRMED', 'FOLLOW_ON_PROCESSING', 'COMPLETED'],
  BN_MORTALITY_CLOSE_EVENT: ['COMPLETED', 'REJECTED', 'REVERSED'],
};

const CAPABILITY_TO_CTX: Record<string, keyof BnModuleAccessContext> = {
  'bn_mortality:view': 'hasView',
  'bn_mortality:read': 'hasRead',
  'bn_mortality:write': 'hasWrite',
  'bn_mortality:decide': 'hasDecide',
  'bn_mortality:admin': 'hasAdmin',
  'bn_mortality:verify': 'hasWrite',
  'bn_mortality:approve_impact': 'hasDecide',
  'bn_mortality:reverse': 'hasDecide',
};

function humanCommand(name: string): string {
  return name
    .replace(/^BN_MORTALITY_/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

interface Props {
  ctx: BnModuleAccessContext;
  currentStatus: string | null;
  currentUserId: string | null;
  createdBy?: string | null;
  submittedForVerificationBy?: string | null;
  assignedTo?: string | null;
  matchedIpId?: string | null;
  verifiedAt?: string | null;
}

/** Command → required data readiness predicate. */
const DATA_READY: Partial<
  Record<
    BnMortalityCommandSpec['command'],
    (p: Omit<Props, 'ctx'>) => string | null
  >
> = {
  BN_MORTALITY_PREPARE_IMPACT: (p) =>
    p.matchedIpId && p.verifiedAt ? null : 'Requires a verified identity and matched person.',
  BN_MORTALITY_SUBMIT_IMPACT: (p) =>
    p.matchedIpId ? null : 'Requires a matched person.',
  BN_MORTALITY_APPROVE_IMPACT: () => null,
};

export const BnMortalityActionsPanel: React.FC<Props> = ({
  ctx,
  currentStatus,
  currentUserId,
  createdBy,
  submittedForVerificationBy,
  assignedTo,
  matchedIpId,
  verifiedAt,
}) => {
  const rows = BN_MORTALITY_COMMANDS.map((spec) => {
    const reasons: string[] = [];

    if (!ctx.actionsEnabled) {
      reasons.push('Internal-pilot: mortality actions are disabled.');
    }
    if (!spec.implemented) {
      reasons.push(
        spec.blocker ?? 'Command integration incomplete.',
      );
    }
    const ctxKey = CAPABILITY_TO_CTX[spec.capability];
    if (ctxKey && !ctx[ctxKey]) {
      reasons.push(`Missing permission (${spec.capability}).`);
    }
    const validFrom = VALID_FROM[spec.command];
    if (validFrom && currentStatus && !validFrom.includes(currentStatus)) {
      reasons.push(
        `Not valid from status "${currentStatus}"; needs ${validFrom.join(', ')}.`,
      );
    }
    // Maker-checker: caller must differ from the maker of the prior step.
    if (spec.requiresMakerChecker && currentUserId) {
      const maker =
        spec.command === 'BN_MORTALITY_APPROVE_IMPACT'
          ? submittedForVerificationBy ?? createdBy
          : createdBy;
      if (maker && maker === currentUserId) {
        reasons.push('Maker-checker: requires a different approver.');
      }
    }
    // Data-readiness gates.
    const readiness = DATA_READY[spec.command];
    if (readiness) {
      const msg = readiness({
        currentStatus,
        currentUserId,
        createdBy,
        submittedForVerificationBy,
        assignedTo,
        matchedIpId,
        verifiedAt,
      });
      if (msg) reasons.push(msg);
    }

    return { spec, reasons, disabled: reasons.length > 0 };
  });


  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Available actions</CardTitle>
          {!ctx.actionsEnabled && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Read-only pilot
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Every command is shown so the business team can see the planned workflow. Actions are enforced server-side; the UI never fabricates a success response.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(({ spec, reasons, disabled }) => (
          <div
            key={spec.command}
            className="flex items-start justify-between gap-3 rounded-md border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{humanCommand(spec.command)}</span>
                <Badge variant="outline" className="text-[10px]">{spec.capability}</Badge>
                {spec.requiresMakerChecker && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <ShieldAlert className="h-3 w-3" /> Maker-checker
                  </Badge>
                )}
                {!spec.implemented && (
                  <Badge variant="destructive" className="text-[10px]">Not certified</Badge>
                )}
              </div>
              {reasons.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button size="sm" variant="outline" disabled={disabled} className="shrink-0">
              Execute
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default BnMortalityActionsPanel;
