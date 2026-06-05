/**
 * Product Version Resolver
 *
 * Resolves the correct ACTIVE product version for a given product (id or
 * benefit_code) at a specific claim date. Used by claim intake, public
 * application config, calculation engine, eligibility check, and document
 * checklist generation.
 *
 * Rules:
 *  - Product must be ACTIVE
 *  - Version must be ACTIVE
 *  - effective_from <= claimDate
 *  - effective_to IS NULL OR claimDate <= effective_to
 *  - 0 matches  → NoActiveVersionError
 *  - >1 matches → OverlappingVersionsError (data integrity)
 */
import { supabase } from '@/integrations/supabase/client';
import type { BnProduct, BnProductVersion } from '@/types/bn';

const db = supabase as any;

export class NoActiveVersionError extends Error {
  code = 'NO_ACTIVE_VERSION' as const;
  constructor(productKey: string, claimDate: string) {
    super(`No ACTIVE benefit product version found for "${productKey}" on ${claimDate}.`);
    this.name = 'NoActiveVersionError';
  }
}

export class OverlappingVersionsError extends Error {
  code = 'OVERLAPPING_VERSIONS' as const;
  versionIds: string[];
  constructor(productKey: string, claimDate: string, versionIds: string[]) {
    super(
      `Data integrity error: multiple ACTIVE versions overlap for "${productKey}" on ${claimDate}. ` +
      `Versions: ${versionIds.join(', ')}.`
    );
    this.name = 'OverlappingVersionsError';
    this.versionIds = versionIds;
  }
}

export class ProductNotActiveError extends Error {
  code = 'PRODUCT_NOT_ACTIVE' as const;
  constructor(productKey: string) {
    super(`Benefit product "${productKey}" is not ACTIVE.`);
    this.name = 'ProductNotActiveError';
  }
}

export interface ResolvedProductVersion {
  product: BnProduct;
  version: BnProductVersion;
}

function toIsoDate(d: string | Date): string {
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d;
  return d.toISOString().slice(0, 10);
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function resolveProductVersion(
  productIdOrCode: string,
  claimDate: string | Date,
): Promise<ResolvedProductVersion> {
  const claim = toIsoDate(claimDate);

  // Resolve product by id or benefit_code
  let productQuery = db.from('bn_product').select('*');
  productQuery = isUuid(productIdOrCode)
    ? productQuery.eq('id', productIdOrCode)
    : productQuery.eq('benefit_code', productIdOrCode);

  const { data: product, error: pErr } = await productQuery.maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new NoActiveVersionError(productIdOrCode, claim);
  if (product.status !== 'ACTIVE') throw new ProductNotActiveError(productIdOrCode);

  // Find matching ACTIVE versions
  const { data: versions, error: vErr } = await db
    .from('bn_product_version')
    .select('*')
    .eq('product_id', product.id)
    .eq('status', 'ACTIVE')
    .lte('effective_from', claim);
  if (vErr) throw vErr;

  const matches = (versions ?? []).filter((v: BnProductVersion) =>
    !v.effective_to || v.effective_to >= claim
  );

  if (matches.length === 0) throw new NoActiveVersionError(productIdOrCode, claim);
  if (matches.length > 1) {
    throw new OverlappingVersionsError(productIdOrCode, claim, matches.map((m: BnProductVersion) => m.id));
  }

  return { product: product as BnProduct, version: matches[0] as BnProductVersion };
}

/**
 * Convenience: returns the resolved version id only, throwing on errors.
 */
export async function resolveProductVersionId(
  productIdOrCode: string,
  claimDate: string | Date,
): Promise<string> {
  const { version } = await resolveProductVersion(productIdOrCode, claimDate);
  return version.id;
}
