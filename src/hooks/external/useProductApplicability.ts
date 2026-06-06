/**
 * useProductApplicability
 *
 * Per PR-B answer #3: intelligently inspect bn_product_participant_config
 * to decide which products can be applied for by a NON-SELF applicant
 * (guardian / payee / representative).
 *
 * A product allows "apply for others" when ANY of:
 *   - applicant_must_equal_insured = false
 *   - allowed_applicant_kinds contains a role other than 'APPLICANT'
 *     (e.g. GUARDIAN, PAYEE, REPRESENTATIVE)
 *
 * Returned product rows include:
 *   { id, benefit_code, benefit_name, category, payment_type,
 *     allowsSelf, allowsOthers, requiresDeceased, requiresBeneficiaries }
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ApplicableProduct {
  id: string;
  benefit_code: string;
  benefit_name: string;
  category: string | null;
  payment_type: string | null;
  allowsSelf: boolean;
  allowsOthers: boolean;
  requiresDeceased: boolean;
  requiresBeneficiaries: boolean;
  allowedApplicantKinds: string[];
}

async function fetchApplicableProducts(): Promise<ApplicableProduct[]> {
  const { data: products, error } = await db
    .from('bn_product')
    .select('id, benefit_code, benefit_name, category, payment_type')
    .eq('status', 'ACTIVE')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const productList = (products ?? []) as Array<any>;
  if (productList.length === 0) return [];

  const productIds = productList.map(p => p.id);
  const today = new Date().toISOString().slice(0, 10);
  const { data: versions } = await db
    .from('bn_product_version')
    .select('id, product_id, status, effective_from, effective_to')
    .in('product_id', productIds)
    .lte('effective_from', today);
  const versionList = (versions ?? []) as Array<any>;

  // Pick latest effective PUBLISHED (or any) version per product.
  const versionByProduct = new Map<string, any>();
  for (const v of versionList) {
    if (v.effective_to && v.effective_to < today) continue;
    const prev = versionByProduct.get(v.product_id);
    if (!prev || (v.effective_from ?? '') > (prev.effective_from ?? '')) {
      versionByProduct.set(v.product_id, v);
    }
  }

  const versionIds = Array.from(versionByProduct.values()).map(v => v.id);
  let configs: any[] = [];
  if (versionIds.length > 0) {
    const { data: cfgs } = await db
      .from('bn_product_participant_config')
      .select(
        'product_version_id, applicant_must_equal_insured, allowed_applicant_kinds, requires_deceased, requires_beneficiaries',
      )
      .in('product_version_id', versionIds);
    configs = (cfgs ?? []) as any[];
  }
  const cfgByVersion = new Map<string, any>(configs.map(c => [c.product_version_id, c]));

  return productList.map(p => {
    const v = versionByProduct.get(p.id);
    const cfg = v ? cfgByVersion.get(v.id) : null;
    const kinds: string[] = (cfg?.allowed_applicant_kinds ?? ['APPLICANT']) as string[];
    const mustEqual = cfg ? !!cfg.applicant_must_equal_insured : true;
    const allowsOthers =
      !mustEqual ||
      kinds.some(k => ['GUARDIAN', 'PAYEE', 'REPRESENTATIVE', 'NEXT_OF_KIN'].includes(k));
    return {
      id: p.id,
      benefit_code: p.benefit_code,
      benefit_name: p.benefit_name,
      category: p.category,
      payment_type: p.payment_type,
      allowsSelf: true, // SELF can always start their own application if eligible
      allowsOthers,
      requiresDeceased: !!cfg?.requires_deceased,
      requiresBeneficiaries: !!cfg?.requires_beneficiaries,
      allowedApplicantKinds: kinds,
    };
  });
}

export function useProductApplicability() {
  return useQuery({
    queryKey: ['external', 'productApplicability'],
    queryFn: fetchApplicableProducts,
    staleTime: 60_000,
  });
}
