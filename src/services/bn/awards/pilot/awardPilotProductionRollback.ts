/**
 * AW360-WAVE-1-C1 Stage D9 — Preservation-first production rollback runbook.
 *
 * Once the pilot table has held live commands, `DROP TABLE ... CASCADE` is
 * NOT an acceptable rollback: it destroys idempotency evidence and enables
 * silent duplicate re-execution of business commands on re-deploy. The
 * canonical rollback path preserves data and rolls back the application
 * layer instead.
 */
import { PILOT_IDEMPOTENCY_MIGRATION } from './awardPilotSupabaseIdempotency';

export type RollbackStepId =
  | 'APPLICATION_ROLLBACK'
  | 'SCHEMA_COMPATIBILITY_CHECK'
  | 'RETAIN_IDEMPOTENCY_RECORDS'
  | 'BACKUP_OR_EXPORT'
  | 'REPLAY_SAFETY_VERIFICATION'
  | 'POST_ROLLBACK_RECONCILIATION'
  | 'TABLE_DELETION_PROHIBITED';

export interface RollbackStep {
  readonly id: RollbackStepId;
  readonly title: string;
  readonly description: string;
  readonly requiredEvidence: readonly string[];
  readonly owner: 'TECHNICAL' | 'OPERATIONAL' | 'BUSINESS' | 'SECURITY';
}

export const PRE_PRODUCTION_ROLLBACK_STATEMENT = PILOT_IDEMPOTENCY_MIGRATION.rollback;

export const PRODUCTION_ROLLBACK_RUNBOOK: readonly RollbackStep[] = [
  {
    id: 'APPLICATION_ROLLBACK',
    title: 'Roll back the application to the previous certified deployment',
    description: 'Redeploy the previous commit that also targets bn_award_pilot_idempotency. Do not roll the app back to a build that predates the idempotency contract.',
    requiredEvidence: ['previous deployment ID', 'commit SHA', 'rollback approval reference'],
    owner: 'TECHNICAL',
  },
  {
    id: 'SCHEMA_COMPATIBILITY_CHECK',
    title: 'Confirm rolled-back app is schema-compatible with the retained table',
    description: 'Both forward and rolled-back builds must read/write the same (tenant_id, idempotency_key) contract, unique constraint, and RLS policies.',
    requiredEvidence: ['compatibility matrix from technical owner'],
    owner: 'TECHNICAL',
  },
  {
    id: 'RETAIN_IDEMPOTENCY_RECORDS',
    title: 'Retain existing idempotency records',
    description: 'Do NOT truncate or delete rows. Live records are the only defence against silent duplicate business effects after rollback.',
    requiredEvidence: ['pre-rollback row count', 'post-rollback row count (equal or higher)'],
    owner: 'OPERATIONAL',
  },
  {
    id: 'BACKUP_OR_EXPORT',
    title: 'Snapshot or export the table before any structural change',
    description: 'If a schema change is later required, take a validated backup or export of bn_award_pilot_idempotency including retention_expires_at.',
    requiredEvidence: ['backup ID', 'export checksum'],
    owner: 'TECHNICAL',
  },
  {
    id: 'REPLAY_SAFETY_VERIFICATION',
    title: 'Prove no business command re-executes after rollback',
    description: 'Replay a sample of prior COMPLETED idempotency keys through the rolled-back application. Every attempt must return ALREADY_COMPLETED without triggering business mutation or provider dispatch.',
    requiredEvidence: ['sample size', 'observed replays', 'zero re-execution attestation'],
    owner: 'TECHNICAL',
  },
  {
    id: 'POST_ROLLBACK_RECONCILIATION',
    title: 'Run reconciliation immediately after rollback',
    description: 'Execute the full reconciliation schedule before re-opening any cohort. Zero unexplained discrepancies is required.',
    requiredEvidence: ['reconciliation run ID', 'discrepancy count = 0'],
    owner: 'OPERATIONAL',
  },
  {
    id: 'TABLE_DELETION_PROHIBITED',
    title: 'Table deletion is prohibited after live activity',
    description: 'DROP TABLE public.bn_award_pilot_idempotency CASCADE is a PRE-PRODUCTION rollback only. It MUST NOT be used in an environment that has processed live pilot commands.',
    requiredEvidence: ['live-activity flag', 'security-owner sign-off if ever considered'],
    owner: 'SECURITY',
  },
];

export interface ProductionRollbackEvaluation {
  readonly hasLiveActivity: boolean;
  readonly proposedAction: 'DROP_TABLE' | 'APP_ROLLBACK_ONLY' | 'SCHEMA_MIGRATION_WITH_BACKUP';
  readonly permitted: boolean;
  readonly requiredSteps: readonly RollbackStepId[];
  readonly rationale: string;
}

/** Evaluates a proposed rollback strategy against the runbook. */
export function evaluateProductionRollback(
  hasLiveActivity: boolean,
  proposedAction: ProductionRollbackEvaluation['proposedAction'],
): ProductionRollbackEvaluation {
  if (hasLiveActivity && proposedAction === 'DROP_TABLE') {
    return {
      hasLiveActivity,
      proposedAction,
      permitted: false,
      requiredSteps: ['TABLE_DELETION_PROHIBITED'],
      rationale: 'DROP TABLE is prohibited once the table has processed live pilot commands.',
    };
  }
  if (proposedAction === 'APP_ROLLBACK_ONLY') {
    return {
      hasLiveActivity,
      proposedAction,
      permitted: true,
      requiredSteps: [
        'APPLICATION_ROLLBACK',
        'SCHEMA_COMPATIBILITY_CHECK',
        'RETAIN_IDEMPOTENCY_RECORDS',
        'REPLAY_SAFETY_VERIFICATION',
        'POST_ROLLBACK_RECONCILIATION',
      ],
      rationale: 'Preservation-first application rollback is the canonical production path.',
    };
  }
  if (proposedAction === 'SCHEMA_MIGRATION_WITH_BACKUP') {
    return {
      hasLiveActivity,
      proposedAction,
      permitted: true,
      requiredSteps: [
        'BACKUP_OR_EXPORT',
        'SCHEMA_COMPATIBILITY_CHECK',
        'RETAIN_IDEMPOTENCY_RECORDS',
        'REPLAY_SAFETY_VERIFICATION',
        'POST_ROLLBACK_RECONCILIATION',
      ],
      rationale: 'Structural change is permitted only with a validated backup and replay-safety proof.',
    };
  }
  // DROP_TABLE in a pre-production environment
  return {
    hasLiveActivity,
    proposedAction,
    permitted: !hasLiveActivity,
    requiredSteps: ['TABLE_DELETION_PROHIBITED'],
    rationale: hasLiveActivity
      ? 'DROP TABLE not permitted with live activity.'
      : 'DROP TABLE permitted in pre-production only.',
  };
}
