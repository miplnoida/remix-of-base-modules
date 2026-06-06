/**
 * BN Configuration Impact Analysis Service
 *
 * Before deleting/deactivating any reusable configuration object
 * (formula, document, reason code, workbasket, escalation policy,
 * medical policy, screen template), call the corresponding usage
 * function. If the object is referenced by an ACTIVE product version,
 * the caller MUST throw ConfigInUseError and surface the impact report
 * to the user instead of silently breaking live claims.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ImpactReference {
  product_version_id: string;
  product_id?: string | null;
  product_name?: string | null;
  version_number?: number | null;
  status?: string | null;
  context?: string | null; // e.g. 'eligibility_rule', 'calculation_rule', 'doc_requirement'
}

export interface ImpactReport {
  activeVersionCount: number;
  totalReferences: number;
  references: ImpactReference[];
}

export class ConfigInUseError extends Error {
  constructor(public readonly impact: ImpactReport, message?: string) {
    super(
      message ??
        `Configuration is in use by ${impact.activeVersionCount} ACTIVE product version(s) ` +
          `and ${impact.totalReferences} total reference(s). Retire dependents first.`,
    );
    this.name = 'ConfigInUseError';
  }
}

async function enrichWithVersions(versionIds: string[], context: string): Promise<ImpactReference[]> {
  const unique = Array.from(new Set(versionIds.filter(Boolean)));
  if (unique.length === 0) return [];
  const { data: versions } = await db
    .from('bn_product_version')
    .select('id, product_id, version_number, status')
    .in('id', unique);
  const productIds = Array.from(new Set((versions ?? []).map((v: any) => v.product_id).filter(Boolean)));
  let productMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await db
      .from('bn_product')
      .select('id, name')
      .in('id', productIds);
    productMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
  }
  return (versions ?? []).map((v: any) => ({
    product_version_id: v.id,
    product_id: v.product_id,
    product_name: productMap.get(v.product_id) ?? null,
    version_number: v.version_number,
    status: v.status,
    context,
  }));
}

function summarize(refs: ImpactReference[]): ImpactReport {
  return {
    activeVersionCount: refs.filter(r => r.status === 'ACTIVE').length,
    totalReferences: refs.length,
    references: refs,
  };
}

/** Formula / calculation rule template usage */
export async function getFormulaUsage(formulaTemplateId: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_calculation_rule')
    .select('product_version_id')
    .eq('formula_template_id', formulaTemplateId);
  const refs = await enrichWithVersions(
    (data ?? []).map((r: any) => r.product_version_id),
    'calculation_rule',
  );
  return summarize(refs);
}

/** Document profile / requirement usage (by document_type_code) */
export async function getDocumentUsage(documentTypeCode: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_doc_requirement')
    .select('product_version_id')
    .eq('document_type_code', documentTypeCode);
  const refs = await enrichWithVersions(
    (data ?? []).map((r: any) => r.product_version_id),
    'doc_requirement',
  );
  return summarize(refs);
}

/** Reason code usage on live claim decisions (no version-scoped link in current schema). */
export async function getReasonCodeUsage(reasonCodeId: string): Promise<ImpactReport> {
  const { data: decisions } = await db
    .from('bn_claim_decision')
    .select('claim_id')
    .eq('reason_code_id', reasonCodeId)
    .limit(1);
  const refs: ImpactReference[] = [];
  if ((decisions ?? []).length > 0) {
    refs.push({
      product_version_id: '(live-claim-decisions)',
      status: 'ACTIVE',
      context: 'claim_decision',
    });
  }
  return summarize(refs);
}

/** Workbasket usage in open queue assignments. */
export async function getWorkbasketUsage(workbasketId: string): Promise<ImpactReport> {
  const { data: assignments } = await db
    .from('bn_claim_queue_assignment')
    .select('claim_id')
    .eq('workbasket_id', workbasketId)
    .limit(1);
  const refs: ImpactReference[] = [];
  if ((assignments ?? []).length > 0) {
    refs.push({
      product_version_id: '(open-queue-assignments)',
      status: 'ACTIVE',
      context: 'queue_assignment',
    });
  }
  return summarize(refs);
}

/** Escalation policy usage — policy is category-scoped; flag if active. */
export async function getEscalationPolicyUsage(policyId: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_escalation_policy')
    .select('id, is_active, product_category')
    .eq('id', policyId)
    .maybeSingle();
  const refs: ImpactReference[] = [];
  if (data?.is_active) {
    refs.push({
      product_version_id: `(category:${data.product_category ?? 'ALL'})`,
      status: 'ACTIVE',
      context: 'escalation_policy_active',
    });
  }
  return summarize(refs);
}

/** Medical referral rule usage */
export async function getMedicalPolicyUsage(ruleId: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_medical_referral_rule')
    .select('product_version_id')
    .eq('id', ruleId);
  const refs = await enrichWithVersions(
    (data ?? []).map((r: any) => r.product_version_id),
    'medical_referral_rule',
  );
  return summarize(refs);
}

/** Screen template usage on product versions */
export async function getScreenTemplateUsage(templateId: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_product_version')
    .select('id, product_id, version_number, status')
    .eq('screen_template_id', templateId);
  const productIds = Array.from(new Set((data ?? []).map((v: any) => v.product_id).filter(Boolean)));
  let productMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await db.from('bn_product').select('id, name').in('id', productIds);
    productMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
  }
  const refs: ImpactReference[] = (data ?? []).map((v: any) => ({
    product_version_id: v.id,
    product_id: v.product_id,
    product_name: productMap.get(v.product_id) ?? null,
    version_number: v.version_number,
    status: v.status,
    context: 'screen_template_assignment',
  }));
  return summarize(refs);
}

/** Workflow template usage on product versions */
export async function getWorkflowTemplateUsage(templateId: string): Promise<ImpactReport> {
  const { data } = await db
    .from('bn_product_version')
    .select('id, product_id, version_number, status')
    .eq('workflow_template_id', templateId);
  const productIds = Array.from(new Set((data ?? []).map((v: any) => v.product_id).filter(Boolean)));
  let productMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await db.from('bn_product').select('id, name').in('id', productIds);
    productMap = new Map((products ?? []).map((p: any) => [p.id, p.name]));
  }
  const refs: ImpactReference[] = (data ?? []).map((v: any) => ({
    product_version_id: v.id,
    product_id: v.product_id,
    product_name: productMap.get(v.product_id) ?? null,
    version_number: v.version_number,
    status: v.status,
    context: 'workflow_template_assignment',
  }));
  return summarize(refs);
}

/**
 * Guard helper: throws ConfigInUseError if the report shows ACTIVE references.
 * Use before delete/deactivate mutations.
 */
export function assertSafeToRemove(report: ImpactReport, label: string): void {
  if (report.activeVersionCount > 0) {
    throw new ConfigInUseError(
      report,
      `Cannot remove ${label}: in use by ${report.activeVersionCount} ACTIVE product version(s).`,
    );
  }
}

/**
 * Guard that an arbitrary product_version_id is mutable (not ACTIVE).
 * Use inside services that update version-scoped configuration tables.
 */
export async function assertVersionMutable(versionId: string): Promise<void> {
  if (!versionId) return;
  const { data } = await db
    .from('bn_product_version')
    .select('id, status, version_number')
    .eq('id', versionId)
    .maybeSingle();
  if (data && data.status === 'ACTIVE') {
    throw new Error(
      `Version ${data.version_number} is ACTIVE and locked. Create a new DRAFT version to make changes.`,
    );
  }
}
