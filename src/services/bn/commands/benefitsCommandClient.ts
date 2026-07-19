/**
 * BN Gap Modules — Portable API Client boundary.
 *
 * ==== ARCHITECTURAL CONTRACT ====
 *
 * Pages and React Query hooks MUST depend on this interface only. They MUST
 * NOT call `supabase.from(...).insert / update / delete` for any gap-module
 * table, and MUST NOT invoke edge functions directly. This is enforced by
 * the architecture test at:
 *   src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts
 *
 * Two adapters implement this interface:
 *
 *   - SupabaseBenefitsCommandAdapter (today)      — POSTs the envelope to the
 *                                                `bn-gap-command` edge fn
 *                                                and reads via the Supabase
 *                                                REST client.
 *   - DotNetBenefitsGapAdapter (future)       — POSTs the envelope to the
 *                                                ASP.NET Core Web API.
 *
 * Swapping adapters MUST NOT require any change to modules, pages or hooks.
 */
import type {
  BnGapCommandEnvelope,
  BnGapModuleCode,
} from '@/types/bn/commands/commandEnvelope';
import type { BnGapCommandResult } from '@/types/bn/commands/commandResult';

/** Rollout posture reported by `getModuleRolloutState`. */
export interface BnGapModuleRolloutState {
  readonly moduleCode: BnGapModuleCode;
  readonly exists: boolean;
  readonly isEnabled: boolean;
  readonly routesEnabled: boolean;
  readonly actionsEnabled: boolean;
  readonly showInMenu: boolean;
  readonly rolloutState: string; // 'hidden' | 'internal' | 'pilot' | 'public' | ...
  readonly releaseVersion: string | null;
}

/**
 * Query filter passed to `list`. Structural, not SQL — the adapter is
 * responsible for translating.
 */
export interface BnGapListQuery {
  readonly moduleCode: BnGapModuleCode;
  readonly entityType: string;
  readonly filters?: Readonly<Record<string, string | number | boolean | null>>;
  readonly pageSize?: number;
  readonly pageToken?: string;
  readonly orderBy?: string;
  readonly orderDir?: 'asc' | 'desc';
}

export interface BnGapListResult<T> {
  readonly items: readonly T[];
  readonly nextPageToken: string | null;
  readonly totalCount: number | null;
}

/** The portable API client interface — the only surface hooks may import. */
export interface BenefitsCommandClient {
  /** Execute a state-changing command. Idempotent per `idempotencyKey`. */
  executeCommand<TPayload, TData>(
    envelope: BnGapCommandEnvelope<TPayload>,
  ): Promise<BnGapCommandResult<TData>>;

  /** Read an entity by id. Never mutates. */
  getEntity<T>(
    moduleCode: BnGapModuleCode,
    entityType: string,
    entityId: string,
  ): Promise<T | null>;

  /** List entities with structural filters + paging. Never mutates. */
  list<T>(query: BnGapListQuery): Promise<BnGapListResult<T>>;

  /** Rollout posture for a single module — server-side sourced. */
  getModuleRolloutState(
    moduleCode: BnGapModuleCode,
  ): Promise<BnGapModuleRolloutState>;

  /** Bulk rollout posture for all six gap modules. */
  getAllModuleRolloutStates(): Promise<readonly BnGapModuleRolloutState[]>;
}
