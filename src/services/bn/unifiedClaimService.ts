/**
 * Unified Claim Service
 * ---------------------
 * Single facade for BN screens to fetch claim data from either the modern
 * BN tables (`bn_*`) or the legacy BEMA tables (`cl_*`), routed by
 * `claimSourceResolver`.
 *
 * Rules:
 *  - Same function supports both legacy and BN claims.
 *  - Legacy records are read-only (no mutation paths exposed here).
 *  - BN records remain actionable via the existing claimService.
 *  - UI screens consume the normalized response — no duplicate screens.
 */

import { resolveClaimSource } from '@/services/bn/source/claimSourceResolver';
import { historicalInquiryAdapter } from '@/services/bn/integration/historicalInquiryAdapter';
import * as claimService from '@/services/bn/claimService';
import type { ClaimSourceLookup, ClaimSourceResolution, BnSourceSystem } from '@/types/bnClaimSource';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UnifiedSourceBadge = 'Legacy (BEMA)' | 'BN';

export interface UnifiedClaimant {
  ssn: string | null;
  name: string | null;
  id?: string | null;
}

export interface UnifiedPayment {
  id?: string | null;
  reference?: string | null;
  amount: number | null;
  date: string | null;
  status?: string | null;
  voided?: boolean;
  bank_account?: string | null;
  raw?: unknown;
}

export interface UnifiedTimelineEvent {
  event_date: string | null;
  event_type: string;
  description: string;
  actor?: string | null;
  source_table?: string;
}

export interface UnifiedDocument {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  url?: string | null;
  uploaded_at?: string | null;
  raw?: unknown;
}

export interface UnifiedAudit {
  enteredBy?: string | null;
  enteredAt?: string | null;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
}

export interface UnifiedClaim {
  sourceSystem: BnSourceSystem;
  sourceBadge: UnifiedSourceBadge;
  /** BN UUID if available; legacy claims use composite `${claimNumber}-${claimSeq}`. */
  claimId: string | null;
  claimNumber: string | null;
  claimSeq: number | null;
  ssn: string | null;
  benefitCode: string | null;
  benefitName: string | null;
  status: string | null;
  claimDate: string | null;
  claimant: UnifiedClaimant;
  benefitDetails: Record<string, unknown> | null;
  eligibility: unknown[] | null;
  calculation: unknown[] | null;
  payments: UnifiedPayment[];
  timeline: UnifiedTimelineEvent[];
  documents: UnifiedDocument[];
  audit: UnifiedAudit;
  /** When sourceSystem === 'LEGACY_BEMA', the raw legacy header row & source meta. */
  rawLegacyRef: {
    claimNumber: string;
    claimSeq: number;
    benefitType: string | null;
    header: Record<string, unknown> | null;
    detailTable?: string | null;
    detailRow?: Record<string, unknown> | null;
  } | null;
  resolution: ClaimSourceResolution;
}

export interface UnifiedClaimInput extends ClaimSourceLookup {
  /** Optional: include heavy related data (payments/timeline/docs) when fetching the claim. */
  includeRelated?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const badge = (s: BnSourceSystem): UnifiedSourceBadge =>
  s === 'LEGACY_BEMA' ? 'Legacy (BEMA)' : 'BN';

function requireLegacyKey(input: ClaimSourceLookup): { num: string; seq: number } {
  if (!input.sourceClaimNumber || input.sourceClaimSeq == null) {
    throw new Error('Legacy claim lookup requires sourceClaimNumber and sourceClaimSeq.');
  }
  return { num: input.sourceClaimNumber, seq: input.sourceClaimSeq };
}

// ---------------------------------------------------------------------------
// Legacy → unified
// ---------------------------------------------------------------------------

async function buildLegacyUnified(
  input: UnifiedClaimInput,
  resolution: ClaimSourceResolution,
): Promise<UnifiedClaim> {
  const { num, seq } = requireLegacyKey(input);

  const claimResp = await historicalInquiryAdapter.getLegacyClaim(num, seq);
  const header = claimResp.data.header;
  const rawHeader = (header?.raw ?? null) as Record<string, unknown> | null;
  const detail = claimResp.data.detail;

  let payments: UnifiedPayment[] = [];
  let timeline: UnifiedTimelineEvent[] = [];
  const documents: UnifiedDocument[] = []; // legacy DMS not in scope here

  if (input.includeRelated !== false && header) {
    const [payResp, tlResp] = await Promise.all([
      historicalInquiryAdapter.getLegacyClaimPayments(num, seq),
      historicalInquiryAdapter.getLegacyClaimTimeline(num, seq),
    ]);
    payments = payResp.data.cheques.map((c) => ({
      reference: c.cheque_number ?? null,
      amount: c.amount ?? null,
      date: c.issue_date ?? null,
      status: c.status ?? null,
      voided: c.voided,
      bank_account: c.bank_account ?? null,
      raw: c.raw,
    }));
    timeline = tlResp.data;
  }

  const r = (rawHeader ?? {}) as any;

  return {
    sourceSystem: 'LEGACY_BEMA',
    sourceBadge: badge('LEGACY_BEMA'),
    claimId: header ? `${header.claim_number}-${header.claim_seq}` : null,
    claimNumber: header?.claim_number ?? num,
    claimSeq: header?.claim_seq ?? seq,
    ssn: header?.ssn ?? null,
    benefitCode: header?.benefit_code ?? header?.benefit_type ?? null,
    benefitName: header?.benefit_type ?? null,
    status: header?.status ?? null,
    claimDate: header?.date_received ?? null,
    claimant: {
      ssn: header?.ssn ?? null,
      name: header?.payee_name ?? null,
      id: header?.claimant_id ?? null,
    },
    benefitDetails: (detail?.row ?? null) as Record<string, unknown> | null,
    eligibility: null,
    calculation: null,
    payments,
    timeline,
    documents,
    audit: {
      enteredBy: r.entered_by ?? null,
      enteredAt: r.date_entered ?? null,
      modifiedBy: r.modified_by ?? null,
      modifiedAt: r.date_modified ?? null,
      verifiedBy: r.verified_by ?? null,
      verifiedAt: r.date_verified ?? null,
      processedBy: r.processed_by ?? null,
      processedAt: r.date_processed ?? null,
    },
    rawLegacyRef: {
      claimNumber: header?.claim_number ?? num,
      claimSeq: header?.claim_seq ?? seq,
      benefitType: header?.benefit_type ?? null,
      header: rawHeader,
      detailTable: detail?.table ?? null,
      detailRow: detail?.row ?? null,
    },
    resolution,
  };
}

// ---------------------------------------------------------------------------
// BN → unified
// ---------------------------------------------------------------------------

async function findBnClaimId(input: ClaimSourceLookup): Promise<string | null> {
  if (input.bnClaimId) return input.bnClaimId;
  // Fall back to mapping (if resolver returned one with a bn_claim_id)
  return null;
}

async function buildBnUnified(
  input: UnifiedClaimInput,
  resolution: ClaimSourceResolution,
): Promise<UnifiedClaim> {
  const bnId = (await findBnClaimId(input)) ?? resolution.mapping?.bn_claim_id ?? null;
  if (!bnId) {
    throw new Error('BN claim lookup requires bnClaimId (or a mapping with bn_claim_id).');
  }

  const claim = (await claimService.fetchClaimById(bnId)) as any;
  if (!claim) {
    return {
      sourceSystem: 'BN',
      sourceBadge: badge('BN'),
      claimId: bnId,
      claimNumber: null,
      claimSeq: null,
      ssn: null,
      benefitCode: null,
      benefitName: null,
      status: null,
      claimDate: null,
      claimant: { ssn: null, name: null },
      benefitDetails: null,
      eligibility: null,
      calculation: null,
      payments: [],
      timeline: [],
      documents: [],
      audit: {},
      rawLegacyRef: null,
      resolution,
    };
  }

  let detail: any = null;
  let eligibility: any[] = [];
  let calculation: any[] = [];
  let events: any[] = [];
  let docs: any[] = [];

  if (input.includeRelated !== false) {
    [detail, eligibility, calculation, events, docs] = await Promise.all([
      claimService.fetchClaimDetail(bnId).catch(() => null),
      claimService.fetchClaimEligibility(bnId).catch(() => []),
      claimService.fetchClaimCalculations(bnId).catch(() => []),
      claimService.fetchClaimEvents(bnId).catch(() => []),
      claimService.fetchClaimDocuments(bnId).catch(() => []),
    ]);
  }

  const product = claim.bn_product ?? {};
  const timeline: UnifiedTimelineEvent[] = (events ?? []).map((e: any) => ({
    event_date: e.performed_at ?? null,
    event_type: e.event_type ?? 'EVENT',
    description: e.description ?? e.event_type ?? '',
    actor: e.performed_by ?? null,
    source_table: 'bn_claim_event',
  }));

  const documents: UnifiedDocument[] = (docs ?? []).map((d: any) => ({
    id: d.id,
    name: d.document_name ?? d.name ?? null,
    type: d.document_type ?? d.type ?? null,
    url: d.url ?? null,
    uploaded_at: d.entered_at ?? null,
    raw: d,
  }));

  return {
    sourceSystem: 'BN',
    sourceBadge: badge('BN'),
    claimId: claim.id,
    claimNumber: claim.claim_number ?? null,
    claimSeq: claim.claim_seq ?? null,
    ssn: claim.ssn ?? null,
    benefitCode: product.benefit_code ?? claim.benefit_code ?? null,
    benefitName: product.benefit_name ?? null,
    status: claim.status ?? null,
    claimDate: claim.claim_date ?? claim.entered_at ?? null,
    claimant: {
      ssn: claim.ssn ?? null,
      name: claim.claimant_name ?? null,
      id: claim.claimant_id ?? null,
    },
    benefitDetails: (detail ?? null) as Record<string, unknown> | null,
    eligibility: eligibility ?? [],
    calculation: calculation ?? [],
    payments: [], // BN payments fed via payablesQueueService/postIssueService — unified view stays empty here
    timeline,
    documents,
    audit: {
      enteredBy: claim.entered_by ?? null,
      enteredAt: claim.entered_at ?? null,
      modifiedBy: claim.modified_by ?? null,
      modifiedAt: claim.modified_at ?? null,
    },
    rawLegacyRef: null,
    resolution,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getUnifiedClaimSource(
  input: ClaimSourceLookup,
): Promise<ClaimSourceResolution> {
  return resolveClaimSource(input);
}

export async function getUnifiedClaim(input: UnifiedClaimInput): Promise<UnifiedClaim> {
  const resolution = await resolveClaimSource(input);
  return resolution.source === 'LEGACY_BEMA'
    ? buildLegacyUnified(input, resolution)
    : buildBnUnified(input, resolution);
}

export async function getUnifiedClaimsBySsn(ssn: string): Promise<UnifiedClaim[]> {
  const [legacyResp, bnRows] = await Promise.all([
    historicalInquiryAdapter.getLegacyClaimsBySsn(ssn).catch(() => ({ data: [] as any[] })),
    claimService.fetchClaims({ ssn }).catch(() => [] as any[]),
  ]);

  const cutoffResolution: ClaimSourceResolution = {
    source: 'LEGACY_BEMA',
    routingBasis: 'CUTOFF_DATE',
    mapping: null,
    cutoffDate: null,
    reason: 'Listed from legacy BEMA by SSN.',
  };

  const legacyUnified: UnifiedClaim[] = (legacyResp.data ?? []).map((h: any) => ({
    sourceSystem: 'LEGACY_BEMA',
    sourceBadge: badge('LEGACY_BEMA'),
    claimId: `${h.claim_number}-${h.claim_seq}`,
    claimNumber: h.claim_number,
    claimSeq: h.claim_seq,
    ssn: h.ssn,
    benefitCode: h.benefit_code ?? h.benefit_type ?? null,
    benefitName: h.benefit_type ?? null,
    status: h.status ?? null,
    claimDate: h.date_received ?? null,
    claimant: { ssn: h.ssn, name: h.payee_name ?? null, id: h.claimant_id ?? null },
    benefitDetails: null,
    eligibility: null,
    calculation: null,
    payments: [],
    timeline: [],
    documents: [],
    audit: {
      enteredBy: h.raw?.entered_by ?? null,
      enteredAt: h.raw?.date_entered ?? null,
    },
    rawLegacyRef: {
      claimNumber: h.claim_number,
      claimSeq: h.claim_seq,
      benefitType: h.benefit_type ?? null,
      header: h.raw ?? null,
    },
    resolution: cutoffResolution,
  }));

  const bnUnified: UnifiedClaim[] = (bnRows ?? []).map((c: any) => {
    const product = c.bn_product ?? {};
    return {
      sourceSystem: 'BN',
      sourceBadge: badge('BN'),
      claimId: c.id,
      claimNumber: c.claim_number ?? null,
      claimSeq: c.claim_seq ?? null,
      ssn: c.ssn ?? null,
      benefitCode: product.benefit_code ?? c.benefit_code ?? null,
      benefitName: product.benefit_name ?? null,
      status: c.status ?? null,
      claimDate: c.claim_date ?? c.entered_at ?? null,
      claimant: { ssn: c.ssn ?? null, name: c.claimant_name ?? null, id: c.claimant_id ?? null },
      benefitDetails: null,
      eligibility: null,
      calculation: null,
      payments: [],
      timeline: [],
      documents: [],
      audit: { enteredBy: c.entered_by ?? null, enteredAt: c.entered_at ?? null },
      rawLegacyRef: null,
      resolution: {
        source: 'BN',
        routingBasis: 'CUTOFF_DATE',
        mapping: null,
        cutoffDate: null,
        reason: 'Listed from BN by SSN.',
      },
    };
  });

  // Newest first
  return [...bnUnified, ...legacyUnified].sort((a, b) => {
    const ad = a.claimDate ? Date.parse(a.claimDate) : 0;
    const bd = b.claimDate ? Date.parse(b.claimDate) : 0;
    return bd - ad;
  });
}

export async function getUnifiedClaimPayments(
  input: UnifiedClaimInput,
): Promise<UnifiedPayment[]> {
  const resolution = await resolveClaimSource(input);

  if (resolution.source === 'LEGACY_BEMA') {
    const { num, seq } = requireLegacyKey(input);
    const resp = await historicalInquiryAdapter.getLegacyClaimPayments(num, seq);
    return resp.data.cheques.map((c) => ({
      reference: c.cheque_number ?? null,
      amount: c.amount ?? null,
      date: c.issue_date ?? null,
      status: c.status ?? null,
      voided: c.voided,
      bank_account: c.bank_account ?? null,
      raw: c.raw,
    }));
  }

  // BN payments live in payment/post-issue services; unified facade returns
  // an empty list here so screens can fall back to those modules.
  return [];
}

export async function getUnifiedClaimTimeline(
  input: UnifiedClaimInput,
): Promise<UnifiedTimelineEvent[]> {
  const resolution = await resolveClaimSource(input);

  if (resolution.source === 'LEGACY_BEMA') {
    const { num, seq } = requireLegacyKey(input);
    const resp = await historicalInquiryAdapter.getLegacyClaimTimeline(num, seq);
    return resp.data;
  }

  const bnId = input.bnClaimId ?? resolution.mapping?.bn_claim_id ?? null;
  if (!bnId) return [];
  const events = await claimService.fetchClaimEvents(bnId).catch(() => [] as any[]);
  return (events ?? []).map((e: any) => ({
    event_date: e.performed_at ?? null,
    event_type: e.event_type ?? 'EVENT',
    description: e.description ?? e.event_type ?? '',
    actor: e.performed_by ?? null,
    source_table: 'bn_claim_event',
  }));
}

export async function getUnifiedClaimDocuments(
  input: UnifiedClaimInput,
): Promise<UnifiedDocument[]> {
  const resolution = await resolveClaimSource(input);

  if (resolution.source === 'LEGACY_BEMA') {
    // Legacy DMS not exposed by the historical adapter — return empty.
    return [];
  }

  const bnId = input.bnClaimId ?? resolution.mapping?.bn_claim_id ?? null;
  if (!bnId) return [];
  const docs = await claimService.fetchClaimDocuments(bnId).catch(() => [] as any[]);
  return (docs ?? []).map((d: any) => ({
    id: d.id,
    name: d.document_name ?? d.name ?? null,
    type: d.document_type ?? d.type ?? null,
    url: d.url ?? null,
    uploaded_at: d.entered_at ?? null,
    raw: d,
  }));
}

export const unifiedClaimService = {
  getUnifiedClaim,
  getUnifiedClaimsBySsn,
  getUnifiedClaimPayments,
  getUnifiedClaimTimeline,
  getUnifiedClaimDocuments,
  getUnifiedClaimSource,
};

export default unifiedClaimService;
