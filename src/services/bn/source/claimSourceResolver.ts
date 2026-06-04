/**
 * Claim Source Resolver
 *
 * Single entry point for the BN module to decide whether a given claim is
 * served from legacy BEMA tables or the new bn_* tables.
 *
 * Routing rule (in order):
 *   1. If a row exists in bn_claim_source_map matching the lookup, use its
 *      `source_system` (with its `routing_basis`).
 *   2. Else if claim_date < BENEFITS_CUTOFF_DATE, use LEGACY_BEMA (CUTOFF_DATE).
 *   3. Else use BN (CUTOFF_DATE).
 *
 * Notes:
 *   - This service is read-only with respect to legacy tables.
 *   - The cutoff date is read from public.system_settings
 *     (setting_key = 'BENEFITS_CUTOFF_DATE') and cached in-memory for 60s.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  BnClaimSourceMap,
  ClaimSourceLookup,
  ClaimSourceResolution,
  BnSourceSystem,
} from '@/types/bnClaimSource';

const CUTOFF_SETTING_KEY = 'BENEFITS_CUTOFF_DATE';
const CUTOFF_FALLBACK = '2026-01-01';
const CACHE_TTL_MS = 60_000;

let cutoffCache: { value: string; fetchedAt: number } | null = null;

function toISODate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  // Accept yyyy-MM-dd or full ISO strings
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** Get the current BENEFITS_CUTOFF_DATE (yyyy-MM-dd). Cached for 60s. */
export async function getBenefitsCutoffDate(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cutoffCache && now - cutoffCache.fetchedAt < CACHE_TTL_MS) {
    return cutoffCache.value;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', CUTOFF_SETTING_KEY)
      .maybeSingle();

    if (error) throw error;

    const value = toISODate(data?.setting_value ?? null) ?? CUTOFF_FALLBACK;
    cutoffCache = { value, fetchedAt: now };
    return value;
  } catch (e) {
    // Shielded: log technical detail, return fallback
    // eslint-disable-next-line no-console
    console.warn('[claimSourceResolver] Failed to load BENEFITS_CUTOFF_DATE, using fallback', e);
    cutoffCache = { value: CUTOFF_FALLBACK, fetchedAt: now };
    return CUTOFF_FALLBACK;
  }
}

/** Clear the cutoff cache (useful after admin updates the setting). */
export function clearBenefitsCutoffCache(): void {
  cutoffCache = null;
}

/**
 * Look up a row in bn_claim_source_map matching the lookup. Priority:
 *   1. bn_claim_id match
 *   2. (source_claim_number + source_claim_seq [+ source_benefit_type])
 */
async function findSourceMapRow(
  lookup: ClaimSourceLookup
): Promise<BnClaimSourceMap | null> {
  try {
    if (lookup.bnClaimId) {
      const { data } = await supabase
        .from('bn_claim_source_map')
        .select('*')
        .eq('bn_claim_id', lookup.bnClaimId)
        .limit(1)
        .maybeSingle();
      if (data) return data as unknown as BnClaimSourceMap;
    }

    if (lookup.sourceClaimNumber) {
      let q = supabase
        .from('bn_claim_source_map')
        .select('*')
        .eq('source_claim_number', lookup.sourceClaimNumber);

      if (lookup.sourceClaimSeq != null) {
        q = q.eq('source_claim_seq', lookup.sourceClaimSeq);
      }
      if (lookup.sourceBenefitType) {
        q = q.eq('source_benefit_type', lookup.sourceBenefitType);
      }

      const { data } = await q.limit(1).maybeSingle();
      if (data) return data as unknown as BnClaimSourceMap;
    }

    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[claimSourceResolver] findSourceMapRow failed', e);
    return null;
  }
}

/**
 * Resolve which source system serves the given claim lookup.
 * Falls back to BN (with reason) when nothing can be determined.
 */
export async function resolveClaimSource(
  lookup: ClaimSourceLookup
): Promise<ClaimSourceResolution> {
  // 1. Explicit mapping wins
  const mapping = await findSourceMapRow(lookup);
  if (mapping) {
    return {
      source: mapping.source_system,
      routingBasis: mapping.routing_basis,
      mapping,
      cutoffDate: null,
      reason: `Mapped in bn_claim_source_map (${mapping.routing_basis}).`,
    };
  }

  // 2. Cutoff-date based fallback
  const cutoff = await getBenefitsCutoffDate();
  const claimDate = toISODate(lookup.claimDate ?? null);

  if (!claimDate) {
    // No mapping + no date — default to BN, the modern source.
    return {
      source: 'BN',
      routingBasis: 'CUTOFF_DATE',
      mapping: null,
      cutoffDate: cutoff,
      reason: 'No mapping and no claim_date — defaulted to BN.',
    };
  }

  const source: BnSourceSystem = claimDate < cutoff ? 'LEGACY_BEMA' : 'BN';
  return {
    source,
    routingBasis: 'CUTOFF_DATE',
    mapping: null,
    cutoffDate: cutoff,
    reason: `claim_date ${claimDate} ${claimDate < cutoff ? '<' : '>='} cutoff ${cutoff}.`,
  };
}

/**
 * Convenience helper: returns just the source system.
 */
export async function resolveClaimSourceSystem(
  lookup: ClaimSourceLookup
): Promise<BnSourceSystem> {
  const r = await resolveClaimSource(lookup);
  return r.source;
}

/**
 * Batch variant — resolves many lookups efficiently by loading any matching
 * map rows in a single query, then applying the cutoff rule to the rest.
 */
export async function resolveClaimSources(
  lookups: ClaimSourceLookup[]
): Promise<ClaimSourceResolution[]> {
  if (lookups.length === 0) return [];

  const cutoff = await getBenefitsCutoffDate();

  // Collect identifiers we can batch-fetch
  const bnIds = lookups.map(l => l.bnClaimId).filter((v): v is string => !!v);
  const claimNumbers = lookups
    .map(l => l.sourceClaimNumber)
    .filter((v): v is string => !!v);

  const mapRowsById = new Map<string, BnClaimSourceMap>();
  const mapRowsByNumber = new Map<string, BnClaimSourceMap[]>();

  try {
    if (bnIds.length > 0) {
      const { data } = await supabase
        .from('bn_claim_source_map')
        .select('*')
        .in('bn_claim_id', bnIds);
      (data || []).forEach(r => {
        if ((r as any).bn_claim_id) {
          mapRowsById.set((r as any).bn_claim_id as string, r as unknown as BnClaimSourceMap);
        }
      });
    }
    if (claimNumbers.length > 0) {
      const { data } = await supabase
        .from('bn_claim_source_map')
        .select('*')
        .in('source_claim_number', claimNumbers);
      (data || []).forEach(r => {
        const key = (r as any).source_claim_number as string;
        if (!key) return;
        const list = mapRowsByNumber.get(key) ?? [];
        list.push(r as unknown as BnClaimSourceMap);
        mapRowsByNumber.set(key, list);
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[claimSourceResolver] batch fetch failed, falling back per-row', e);
  }

  return lookups.map(lookup => {
    let mapping: BnClaimSourceMap | null = null;

    if (lookup.bnClaimId) {
      mapping = mapRowsById.get(lookup.bnClaimId) ?? null;
    }
    if (!mapping && lookup.sourceClaimNumber) {
      const candidates = mapRowsByNumber.get(lookup.sourceClaimNumber) ?? [];
      mapping = candidates.find(c =>
        (lookup.sourceClaimSeq == null || c.source_claim_seq === lookup.sourceClaimSeq) &&
        (!lookup.sourceBenefitType || c.source_benefit_type === lookup.sourceBenefitType)
      ) ?? null;
    }

    if (mapping) {
      return {
        source: mapping.source_system,
        routingBasis: mapping.routing_basis,
        mapping,
        cutoffDate: null,
        reason: `Mapped in bn_claim_source_map (${mapping.routing_basis}).`,
      };
    }

    const claimDate = toISODate(lookup.claimDate ?? null);
    if (!claimDate) {
      return {
        source: 'BN' as BnSourceSystem,
        routingBasis: 'CUTOFF_DATE',
        mapping: null,
        cutoffDate: cutoff,
        reason: 'No mapping and no claim_date — defaulted to BN.',
      };
    }

    const source: BnSourceSystem = claimDate < cutoff ? 'LEGACY_BEMA' : 'BN';
    return {
      source,
      routingBasis: 'CUTOFF_DATE',
      mapping: null,
      cutoffDate: cutoff,
      reason: `claim_date ${claimDate} ${claimDate < cutoff ? '<' : '>='} cutoff ${cutoff}.`,
    };
  });
}
