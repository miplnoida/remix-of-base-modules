/**
 * Benefits Claim Source Routing — type definitions.
 *
 * The BN module reads claims from one of two source systems:
 *   - LEGACY_BEMA: historical PowerBuilder/BEMA tables (cl_head + family)
 *   - BN:          modern bn_* tables
 *
 * Routing is decided by `claimSourceResolver` using the `bn_claim_source_map`
 * table and the BENEFITS_CUTOFF_DATE system setting.
 */

export type BnSourceSystem = 'LEGACY_BEMA' | 'BN';

export type BnRoutingBasis =
  | 'CUTOFF_DATE'   // resolved by date comparison (no map row required)
  | 'MANUAL_LINK'   // operator linked the legacy claim to a new BN claim
  | 'MIGRATED'      // claim was migrated from legacy into BN
  | 'REOPENED';     // legacy claim reopened under BN

export type BnMigrationStatus =
  | 'NONE'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'MIGRATED'
  | 'FAILED'
  | 'ROLLED_BACK';

/** Row shape of public.bn_claim_source_map. */
export interface BnClaimSourceMap {
  id: string;
  source_system: BnSourceSystem;
  source_claim_number: string | null;
  source_claim_seq: number | null;
  source_benefit_type: string | null;
  bn_claim_id: string | null;
  ssn: string | null;
  claim_date: string | null; // ISO date (yyyy-MM-dd)
  benefit_code: string | null;
  routing_basis: BnRoutingBasis;
  migration_status: BnMigrationStatus;
  linked_by: string | null;
  linked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

/** Identifier used to look up a claim's source. */
export interface ClaimSourceLookup {
  /** Legacy BEMA claim number (cl_head.claim_no) or BN reference. */
  sourceClaimNumber?: string | null;
  /** Legacy sequence (cl_head.claim_seq) if applicable. */
  sourceClaimSeq?: number | null;
  /** Optional benefit type discriminator for legacy lookups. */
  sourceBenefitType?: string | null;
  /** New BN claim id if known. */
  bnClaimId?: string | null;
  /** Claim date (yyyy-MM-dd or Date) — required for cutoff-based fallback. */
  claimDate?: string | Date | null;
}

/** Result returned by the resolver. */
export interface ClaimSourceResolution {
  source: BnSourceSystem;
  routingBasis: BnRoutingBasis;
  /** Matching map row (if one exists). */
  mapping: BnClaimSourceMap | null;
  /** Cutoff date used when basis is CUTOFF_DATE. */
  cutoffDate: string | null;
  /** Human-readable explanation, useful for diagnostics/UI. */
  reason: string;
}
