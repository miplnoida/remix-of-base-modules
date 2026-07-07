/**
 * OM-9 — Canonical Office/Location Consumption Service.
 *
 * Single public contract for offices, office locations, and branches.
 * Business modules must go through this module rather than reading raw
 * office/location tables. Legacy `office_locations` (communication-era) is
 * consumed via a compatibility adapter and mapped to the canonical
 * `core_office_locations` shape at the edge.
 *
 * Canonical model
 * ---------------
 *   tb_office              — legacy master (read via core_offices_v).
 *   core_offices_v         — compatibility view over tb_office.
 *   core_office_locations  — CANONICAL office locations / branches table.
 *   office_locations       — legacy compatibility (communication-era);
 *                            adapted here, never rewritten in place.
 *
 * No table is renamed, dropped, or rewritten by this module.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  getOffice,
  getOffices,
  getOfficeLocation,
  getOfficeLocations,
} from './organizationService';
import type { Office, OfficeLocation, OrganizationFilters } from './organizationTypes';

const db = supabase as any;

export type LocationSourceKind =
  | 'core_office_locations'
  | 'office_locations'
  | 'tb_office'
  | 'core_offices_v'
  | 'none';

export type LegacyMappingStatus =
  | 'CANONICAL'
  | 'LEGACY_MAPPED'
  | 'LEGACY_UNMAPPED'
  | 'UNKNOWN';

export interface CanonicalLocation {
  locationId: string | null;
  locationCode: string | null;
  locationName: string | null;
  locationType: string | null;
  officeCode: string | null;
  officeName: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    district: string | null;
    country: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
  };
  isActive: boolean;
  isCanonical: boolean;
  sourceKind: LocationSourceKind;
  legacyMappingStatus: LegacyMappingStatus;
}

export interface OfficeLocationContextInput {
  officeId?: string | null;
  officeCode?: string | null;
  locationId?: string | null;
  legacyOfficeCode?: string | null;
  legacyLocationId?: string | null;
  departmentCode?: string | null;
  moduleCode?: string | null;
}

export interface OfficeLocationContext {
  officeId: string | null;
  officeCode: string | null;
  officeName: string | null;
  locationId: string | null;
  locationCode: string | null;
  locationName: string | null;
  locationType: string | null;
  address: CanonicalLocation['address'];
  contact: CanonicalLocation['contact'];
  isCanonical: boolean;
  sourceKind: LocationSourceKind;
  legacyMappingStatus: LegacyMappingStatus;
  warnings: string[];
}

export interface LocationOption {
  value: string;
  label: string;
  officeCode: string | null;
  isActive: boolean;
  sourceKind: LocationSourceKind;
}

export interface LocationHealthIssue {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  locationId?: string | null;
  sourceKind?: LocationSourceKind;
}

// ---------- Canonicalisation helpers ----------

function fromCoreOfficeLocation(row: OfficeLocation | null): CanonicalLocation | null {
  if (!row) return null;
  return {
    locationId: row.id,
    locationCode: row.locationCode,
    locationName: row.locationName,
    locationType: row.locationType,
    officeCode: row.officeCode,
    officeName: null,
    address: {
      line1: row.addressLine1,
      line2: row.addressLine2,
      city: row.city,
      district: row.district,
      country: row.country,
    },
    contact: { phone: row.phone, email: row.email },
    isActive: row.isActive,
    isCanonical: true,
    sourceKind: 'core_office_locations',
    legacyMappingStatus: 'CANONICAL',
  };
}

function fromLegacyOfficeLocations(row: any | null): CanonicalLocation | null {
  if (!row) return null;
  return {
    locationId: row.id ?? null,
    locationCode: row.location_code ?? row.branch_code ?? null,
    locationName: row.branch_name ?? row.location_name ?? null,
    locationType: row.location_type ?? null,
    officeCode: row.office_code ?? null,
    officeName: null,
    address: {
      line1: row.address ?? row.address_line_1 ?? null,
      line2: row.address_line_2 ?? null,
      city: row.parish_city ?? row.city ?? null,
      district: row.island_or_region ?? row.district ?? null,
      country: row.country ?? null,
    },
    contact: { phone: row.phone ?? null, email: row.email ?? null },
    isActive: row.is_active !== false,
    isCanonical: false,
    sourceKind: 'office_locations',
    legacyMappingStatus: 'LEGACY_MAPPED',
  };
}

// ---------- Public contract ----------

export { getOffices, getOffice, getOfficeLocations, getOfficeLocation };

export async function getCanonicalLocation(
  locationId: string,
): Promise<CanonicalLocation | null> {
  // Try canonical table first
  const canonical = await getOfficeLocation(locationId).catch(() => null);
  if (canonical) return fromCoreOfficeLocation(canonical);
  // Fall back to legacy office_locations via adapter
  const { data } = await db
    .from('office_locations')
    .select('*')
    .eq('id', locationId)
    .maybeSingle();
  return fromLegacyOfficeLocations(data);
}

export async function getLocationOptions(
  filters: OrganizationFilters = {},
): Promise<LocationOption[]> {
  const rows = await getOfficeLocations({ isActive: true, ...filters });
  return rows.map((r) => ({
    value: r.id,
    label: r.locationCode ? `${r.locationCode} — ${r.locationName}` : r.locationName,
    officeCode: r.officeCode,
    isActive: r.isActive,
    sourceKind: 'core_office_locations',
  }));
}

/**
 * Given any combination of modern or legacy office/location identifiers,
 * return the canonical office+location context along with any warnings.
 *
 * Never throws. Always returns a shape modules can render.
 */
export async function resolveOfficeLocationContext(
  input: OfficeLocationContextInput,
): Promise<OfficeLocationContext> {
  const warnings: string[] = [];
  let canonical: CanonicalLocation | null = null;

  // 1. Prefer explicit canonical locationId
  const locId = input.locationId ?? input.legacyLocationId ?? null;
  if (locId) {
    canonical = await getCanonicalLocation(locId).catch(() => null);
    if (!canonical) warnings.push('Location reference could not be resolved.');
  }

  // 2. Resolve office (canonical or legacy code)
  let office: Office | null = null;
  const officeCode = input.officeCode ?? input.legacyOfficeCode ?? canonical?.officeCode ?? null;
  if (officeCode) {
    office = await getOffice(officeCode).catch(() => null);
    if (!office) warnings.push(`Office code "${officeCode}" not found in canonical view.`);
  }

  if (canonical && !canonical.isActive) warnings.push('Location is inactive.');
  if (canonical && !canonical.isCanonical) {
    warnings.push('Location resolved via legacy compatibility adapter.');
  }

  return {
    officeId: null,
    officeCode: office?.officeCode ?? canonical?.officeCode ?? null,
    officeName: office?.officeName ?? null,
    locationId: canonical?.locationId ?? null,
    locationCode: canonical?.locationCode ?? null,
    locationName: canonical?.locationName ?? null,
    locationType: canonical?.locationType ?? null,
    address:
      canonical?.address ?? {
        line1: office?.addressLine1 ?? null,
        line2: office?.addressLine2 ?? null,
        city: null,
        district: null,
        country: null,
      },
    contact:
      canonical?.contact ?? {
        phone: office?.phone ?? null,
        email: office?.email ?? null,
      },
    isCanonical: canonical?.isCanonical ?? false,
    sourceKind: canonical?.sourceKind ?? (office ? 'core_offices_v' : 'none'),
    legacyMappingStatus: canonical?.legacyMappingStatus ?? (office ? 'CANONICAL' : 'UNKNOWN'),
    warnings,
  };
}

/**
 * Map a legacy `office_locations` id (or code) to a canonical
 * `core_office_locations` id. Returns null when no mapping is possible.
 */
export async function mapLegacyLocationToCanonical(input: {
  legacyLocationId?: string | null;
  legacyLocationCode?: string | null;
}): Promise<{ canonicalId: string | null; status: LegacyMappingStatus }> {
  const { legacyLocationId, legacyLocationCode } = input;
  if (!legacyLocationId && !legacyLocationCode) {
    return { canonicalId: null, status: 'UNKNOWN' };
  }
  // Attempt to match by shared code/name against canonical table.
  let q = db.from('core_office_locations').select('id, location_code, location_name').limit(1);
  if (legacyLocationCode) q = q.eq('location_code', legacyLocationCode);
  const { data } = await q.maybeSingle();
  if (data?.id) return { canonicalId: data.id, status: 'LEGACY_MAPPED' };
  return { canonicalId: null, status: 'LEGACY_UNMAPPED' };
}

/**
 * Structural health checks over the office/location surface.
 * Returns issues in friendly, module-facing wording.
 */
export async function validateLocationCanonicalization(): Promise<LocationHealthIssue[]> {
  const issues: LocationHealthIssue[] = [];

  // Duplicate active canonical codes
  const { data: dupes } = await db.rpc('noop_check_ignore').catch(() => ({ data: null }));
  if (dupes === null) {
    // fallback: inline aggregate
    const { data: codes } = await db
      .from('core_office_locations')
      .select('location_code, is_active');
    const map = new Map<string, number>();
    (codes ?? [])
      .filter((r: any) => r.is_active && r.location_code)
      .forEach((r: any) => map.set(r.location_code, (map.get(r.location_code) ?? 0) + 1));
    for (const [code, n] of map.entries()) {
      if (n > 1) {
        issues.push({
          code: 'LOCATION_DUPLICATE_CODE',
          severity: 'WARNING',
          message: `Two active locations use the same code "${code}".`,
          sourceKind: 'core_office_locations',
        });
      }
    }
  }

  // Legacy rows lacking mapping
  const { data: legacy } = await db
    .from('office_locations')
    .select('id, branch_name, is_active')
    .eq('is_active', true)
    .limit(200);
  for (const row of legacy ?? []) {
    const mapped = await mapLegacyLocationToCanonical({ legacyLocationId: row.id });
    if (mapped.status === 'LEGACY_UNMAPPED') {
      issues.push({
        code: 'LEGACY_LOCATION_UNMAPPED',
        severity: 'WARNING',
        message: `This legacy location "${row.branch_name ?? row.id}" has not been mapped to a canonical location.`,
        locationId: row.id,
        sourceKind: 'office_locations',
      });
    }
  }

  return issues;
}
