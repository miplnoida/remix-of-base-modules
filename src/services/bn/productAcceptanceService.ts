/**
 * BN Product Acceptance Service
 *
 * Product Catalogue is the single configuration source for accepting and
 * processing benefit applications. This service is the contract used by:
 *   - internal staff intake (ClaimWorkbench / NewClaim wizard)
 *   - future public online application portal
 *
 * All behaviour (eligible products, required fields, required documents,
 * eligibility prechecks, workflow start, audit) is derived from the
 * resolved bn_product_version. No product-specific intake code may
 * hardcode field lists, document lists, or workflow logic.
 */
import { supabase } from '@/integrations/supabase/client';
import { requireUserCode } from '@/lib/bn/requireUserCode';
import { resolveField } from './eligibility/fieldResolver';
import { evaluateOperator } from './eligibility/operatorEvaluator';
import { getFieldDef } from './eligibility/fieldRegistry';
import { bnWorkflowAdapter } from './integration/workflowAdapter';
import type { BnProduct, BnProductVersion, BnEligibilityRule, BnDocRequirement } from '@/types/bn';

const db = supabase as any;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface ApplicantContext {
  ssn: string;
  claimDate: string; // ISO yyyy-MM-dd
  employerRegNo?: string;
  benefitType?: string;
}

export interface ScreenTemplateField {
  field_code: string;
  field_label: string;
  field_type: string;
  section_code: string;
  is_required: boolean;
  validation_rules: Record<string, any>;
  options_source?: string | null;
  default_value?: string | null;
  help_text?: string | null;
  sort_order: number;
}

export interface ProductApplicationConfig {
  product: BnProduct;
  productVersion: BnProductVersion;
  /** Dynamic form fields from bn_screen_template/bn_field_metadata. */
  formFields: ScreenTemplateField[];
  /** Document requirements from bn_doc_requirement (INTAKE + general). */
  documentRequirements: BnDocRequirement[];
  /** Eligibility prechecks (rules flagged for intake stage). */
  eligibilityRules: BnEligibilityRule[];
  /** Workflow definition / template that will be started. */
  workflow: {
    workflowTemplateId: string | null;
    workflowDefinitionId: string | null;
    fallbackToTransitionRules: boolean;
  };
}

export interface PrecheckResult {
  fieldKey: string;
  passed: boolean;
  reason: string;
  failAction: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  prechecks: PrecheckResult[];
}

export interface SubmitApplicationPayload {
  productCode: string;
  ssn: string;
  claimDate: string;
  employerRegNo?: string;
  source?: 'WALK_IN' | 'ONLINE' | 'AGENT' | 'PHONE';
  contactPhone?: string;
  contactEmail?: string;
  bankAccount?: string;
  bankRoutingNumber?: string;
  declaration: boolean;
  digitalSignature?: string;
  /** Values keyed by bn_field_metadata.field_code. */
  formValues: Record<string, any>;
  /** Operator user_code — REQUIRED for audit. */
  actorUserCode: string;
}

export interface SubmitApplicationResult {
  claimId: string;
  claimNumber: string | null;
  workflowInstanceId: string | null;
  checklistItemsCreated: number;
  auditSnapshot: AuditSnapshot;
}

export interface AuditSnapshot {
  productId: string;
  productVersionId: string;
  documentProfileId: string | null;
  screenTemplateId: string | null;
  workflowTemplateId: string | null;
  ruleVersion: number;
  capturedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Product Version Resolution
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the active bn_product_version for a given product (id or code)
 * and a claim date. Returns the version whose effective range contains the
 * claim date and whose status is ACTIVE.
 */
export async function resolveProductVersion(
  productKey: { productId?: string; productCode?: string },
  claimDate: string,
): Promise<{ product: BnProduct; version: BnProductVersion }> {
  let productRow: BnProduct | null = null;
  if (productKey.productId) {
    const { data, error } = await db.from('bn_product').select('*').eq('id', productKey.productId).maybeSingle();
    if (error) throw error;
    productRow = data;
  } else if (productKey.productCode) {
    const { data, error } = await db.from('bn_product').select('*').eq('benefit_code', productKey.productCode).maybeSingle();
    if (error) throw error;
    productRow = data;
  }
  if (!productRow) throw new Error('Product not found');
  if (String(productRow.status).toUpperCase() !== 'ACTIVE') {
    throw new Error(`Product ${productRow.benefit_code} is not ACTIVE`);
  }

  const { data: versions, error: vErr } = await db
    .from('bn_product_version')
    .select('*')
    .eq('product_id', productRow.id)
    .eq('status', 'ACTIVE')
    .lte('effective_from', claimDate)
    .order('version_number', { ascending: false });
  if (vErr) throw vErr;

  const active = (versions ?? []).find((v: BnProductVersion) =>
    !v.effective_to || v.effective_to >= claimDate
  );
  if (!active) throw new Error(`No ACTIVE product version for ${productRow.benefit_code} on ${claimDate}`);

  return { product: productRow, version: active };
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Application Config (shared by internal + public portal)
// ────────────────────────────────────────────────────────────────────────────

export async function getProductApplicationConfig(
  productCode: string,
  claimDate: string,
  _applicantContext?: ApplicantContext,
): Promise<ProductApplicationConfig> {
  const { product, version } = await resolveProductVersion({ productCode }, claimDate);

  // Screen template → form fields
  let formFields: ScreenTemplateField[] = [];
  if (version.screen_template_id) {
    const { data, error } = await db
      .from('bn_field_metadata')
      .select('*')
      .eq('screen_template_id', version.screen_template_id)
      .eq('is_active', true)
      .order('section_code')
      .order('sort_order');
    if (error) throw error;
    formFields = (data ?? []) as ScreenTemplateField[];
  }

  // Document requirements (by version OR by product fallback)
  const { data: docsByVersion } = await db
    .from('bn_doc_requirement')
    .select('*').eq('is_active', true).eq('product_version_id', version.id).order('sort_order');
  const docs = (docsByVersion ?? []) as BnDocRequirement[];
  if (docs.length === 0) {
    const { data: docsByProduct } = await db
      .from('bn_doc_requirement')
      .select('*').eq('is_active', true).eq('product_id', product.id).order('sort_order');
    docs.push(...((docsByProduct ?? []) as BnDocRequirement[]));
  }

  // Eligibility rules for the version
  const { data: eligRules } = await db
    .from('bn_eligibility_rule').select('*')
    .eq('product_version_id', version.id).eq('is_active', true).order('sort_order');

  return {
    product,
    productVersion: version,
    formFields,
    documentRequirements: docs,
    eligibilityRules: (eligRules ?? []) as BnEligibilityRule[],
    workflow: {
      workflowTemplateId: version.workflow_template_id ?? null,
      workflowDefinitionId: (version as any).workflow_definition_id ?? null,
      fallbackToTransitionRules: !version.workflow_template_id && !(version as any).workflow_definition_id,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Validation
// ────────────────────────────────────────────────────────────────────────────

export async function validateApplicationBeforeCreate(
  payload: SubmitApplicationPayload,
): Promise<ValidationResult> {
  const errors: { field: string; message: string }[] = [];
  const prechecks: PrecheckResult[] = [];

  if (!payload.ssn) errors.push({ field: 'ssn', message: 'SSN is required' });
  if (!payload.claimDate) errors.push({ field: 'claimDate', message: 'Claim date is required' });
  if (!payload.declaration) errors.push({ field: 'declaration', message: 'Declaration must be accepted' });

  let config: ProductApplicationConfig | null = null;
  try {
    config = await getProductApplicationConfig(payload.productCode, payload.claimDate);
  } catch (e: any) {
    errors.push({ field: 'productCode', message: e?.message ?? 'Product/version resolution failed' });
    return { valid: false, errors, prechecks };
  }

  // Required form fields
  for (const f of config.formFields) {
    if (f.is_required) {
      const v = payload.formValues?.[f.field_code];
      if (v === undefined || v === null || v === '') {
        errors.push({ field: f.field_code, message: `${f.field_label} is required` });
      }
    }
  }

  // Eligibility prechecks (rules that have a field_key)
  for (const rule of config.eligibilityRules) {
    const def = (rule.rule_definition || {}) as any;
    if (!def.field_key) continue;
    const fdef = getFieldDef(def.field_key);
    if (!fdef) continue;
    try {
      const resolved = await resolveField(def.field_key, {
        ssn: payload.ssn,
        claimDate: payload.claimDate,
        benefitType: config.product.benefit_code,
        employerRegNo: payload.employerRegNo,
      }, {
        windowType: def.window_type,
        windowFrom: def.window_from,
        windowTo: def.window_to,
        documentTypeCode: def.document_type_code,
      });
      const evalResult = evaluateOperator(
        resolved.value, def.operator, def.value, fdef.valueType,
        { rangeFrom: def.range_from, rangeTo: def.range_to },
      );
      prechecks.push({
        fieldKey: def.field_key,
        passed: evalResult.passed,
        reason: evalResult.reason,
        failAction: rule.fail_action ?? 'REJECT',
      });
      if (!evalResult.passed && (rule.fail_action ?? 'REJECT') === 'REJECT') {
        errors.push({
          field: def.field_key,
          message: rule.fail_message || `Eligibility rule "${rule.rule_name}" failed`,
        });
      }
    } catch (e: any) {
      prechecks.push({ fieldKey: def.field_key, passed: false, reason: e?.message ?? 'resolve error', failAction: 'REJECT' });
      errors.push({ field: def.field_key, message: e?.message ?? 'Precheck failed' });
    }
  }

  return { valid: errors.length === 0, errors, prechecks };
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Create claim from config + checklist + workflow
// ────────────────────────────────────────────────────────────────────────────

export async function generateEvidenceChecklist(
  claimId: string,
  productVersionId: string,
): Promise<number> {
  // Load doc requirements for the version (or product fallback)
  const { data: reqs } = await db
    .from('bn_doc_requirement').select('*')
    .eq('is_active', true).eq('product_version_id', productVersionId);
  let requirements = (reqs ?? []) as BnDocRequirement[];
  if (requirements.length === 0) {
    const { data: claim } = await db.from('bn_claim').select('product_id').eq('id', claimId).maybeSingle();
    if (claim?.product_id) {
      const { data: pReqs } = await db
        .from('bn_doc_requirement').select('*')
        .eq('is_active', true).eq('product_id', claim.product_id);
      requirements = (pReqs ?? []) as BnDocRequirement[];
    }
  }

  if (requirements.length === 0) return 0;
  const rows = requirements.map((r) => ({
    claim_id: claimId,
    requirement_id: r.id,
    status: 'OUTSTANDING',
    is_blocking: String(r.requirement_level).toUpperCase() === 'MANDATORY',
  }));
  const { error } = await db.from('bn_evidence_checklist').insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function startProductWorkflow(
  claimId: string,
  productVersionId: string,
  actorUserCode: string,
): Promise<string | null> {
  const actor = requireUserCode(actorUserCode, 'startProductWorkflow');
  const { data: version } = await db.from('bn_product_version').select('workflow_template_id').eq('id', productVersionId).maybeSingle();
  const templateId = version?.workflow_template_id;
  if (!templateId) {
    // Fallback: bn_claim_transition_rule handles state machine. Nothing to start.
    return null;
  }
  // Read workflow_template → workflow_definitions template_key
  const { data: tpl } = await db.from('bn_workflow_template').select('template_key').eq('id', templateId).maybeSingle();
  const templateKey = tpl?.template_key ?? `bn_claim_${templateId}`;
  const { instanceId } = await bnWorkflowAdapter.startWorkflow({
    templateKey,
    entityType: 'bn_claim',
    entityId: claimId,
    context: { productVersionId },
    initiatedBy: actor,
  });
  // Stamp claim
  await db.from('bn_claim').update({ workflow_instance_id: instanceId, modified_by: actor }).eq('id', claimId);
  return instanceId;
}

export async function createApplicationFromConfig(
  payload: SubmitApplicationPayload,
): Promise<SubmitApplicationResult> {
  const actor = requireUserCode(payload.actorUserCode, 'createApplicationFromConfig');

  const validation = await validateApplicationBeforeCreate(payload);
  if (!validation.valid) {
    const err: any = new Error('Application validation failed');
    err.code = 'BN_APPLICATION_INVALID';
    err.details = validation;
    throw err;
  }

  const config = await getProductApplicationConfig(payload.productCode, payload.claimDate);

  // Insert claim
  const { data: inserted, error: insErr } = await db.from('bn_claim').insert({
    ssn: payload.ssn,
    product_id: config.product.id,
    product_version_id: config.productVersion.id,
    employer_regno: payload.employerRegNo ?? null,
    claim_date: payload.claimDate,
    source: payload.source ?? 'WALK_IN',
    status: 'SUBMITTED',
    submission_date: new Date().toISOString(),
    contact_phone: payload.contactPhone ?? null,
    contact_email: payload.contactEmail ?? null,
    bank_account: payload.bankAccount ?? null,
    bank_routing_number: payload.bankRoutingNumber ?? null,
    declaration: payload.declaration,
    digital_signature: payload.digitalSignature ?? null,
    entered_by: actor,
    modified_by: actor,
  }).select('id, claim_number').single();
  if (insErr) throw insErr;

  const claimId: string = inserted.id;
  const claimNumber: string | null = inserted.claim_number ?? null;

  // Persist dynamic form values
  if (payload.formValues && Object.keys(payload.formValues).length > 0) {
    await db.from('bn_claim_detail').insert({
      claim_id: claimId,
      detail_type: 'APPLICATION_FORM',
      detail_data: payload.formValues,
    }).then(() => undefined).catch(() => undefined);
  }

  // Checklist
  const checklistItemsCreated = await generateEvidenceChecklist(claimId, config.productVersion.id);

  // Workflow
  const workflowInstanceId = await startProductWorkflow(claimId, config.productVersion.id, actor);

  // Audit snapshot
  const auditSnapshot: AuditSnapshot = {
    productId: config.product.id,
    productVersionId: config.productVersion.id,
    documentProfileId: config.productVersion.document_profile_id ?? null,
    screenTemplateId: config.productVersion.screen_template_id ?? null,
    workflowTemplateId: config.productVersion.workflow_template_id ?? null,
    ruleVersion: config.productVersion.version_number,
    capturedAt: new Date().toISOString(),
  };
  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: 'APPLICATION_SUBMITTED',
    from_status: 'DRAFT',
    to_status: 'SUBMITTED',
    performed_by: actor,
    metadata: {
      snapshot: auditSnapshot,
      prechecks: validation.prechecks,
      formFieldCount: config.formFields.length,
      docRequirementCount: config.documentRequirements.length,
      source: payload.source ?? 'WALK_IN',
    },
  });

  return { claimId, claimNumber, workflowInstanceId, checklistItemsCreated, auditSnapshot };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Public portal contract (same config, no UI assumptions)
// ────────────────────────────────────────────────────────────────────────────

export async function getAvailableBenefitProducts(
  ssn: string,
  claimDate: string,
): Promise<Array<{ product: BnProduct; version: BnProductVersion }>> {
  if (!ssn) throw new Error('SSN is required');
  const { data: products } = await db
    .from('bn_product').select('*').eq('status', 'ACTIVE').order('sort_order');
  const out: Array<{ product: BnProduct; version: BnProductVersion }> = [];
  for (const p of (products ?? []) as BnProduct[]) {
    try {
      const { version } = await resolveProductVersion({ productId: p.id }, claimDate);
      out.push({ product: p, version });
    } catch { /* skip products without an active version on claimDate */ }
  }
  return out;
}

export async function getApplicationRequirements(
  productCode: string,
  ssn: string,
  claimDate: string,
): Promise<ProductApplicationConfig & { precheckHints: PrecheckResult[] }> {
  const config = await getProductApplicationConfig(productCode, claimDate, { ssn, claimDate });
  // Run advisory prechecks (no claim is created)
  const prechecks: PrecheckResult[] = [];
  for (const rule of config.eligibilityRules) {
    const def = (rule.rule_definition || {}) as any;
    if (!def.field_key) continue;
    const fdef = getFieldDef(def.field_key);
    if (!fdef) continue;
    try {
      const resolved = await resolveField(def.field_key, {
        ssn, claimDate, benefitType: config.product.benefit_code,
      }, {
        windowType: def.window_type, windowFrom: def.window_from, windowTo: def.window_to,
        documentTypeCode: def.document_type_code,
      });
      const ev = evaluateOperator(resolved.value, def.operator, def.value, fdef.valueType,
        { rangeFrom: def.range_from, rangeTo: def.range_to });
      prechecks.push({ fieldKey: def.field_key, passed: ev.passed, reason: ev.reason, failAction: rule.fail_action ?? 'REJECT' });
    } catch (e: any) {
      prechecks.push({ fieldKey: def.field_key, passed: false, reason: e?.message ?? 'error', failAction: 'REJECT' });
    }
  }
  return { ...config, precheckHints: prechecks };
}

export async function submitBenefitApplication(
  payload: SubmitApplicationPayload,
): Promise<SubmitApplicationResult> {
  return createApplicationFromConfig(payload);
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Evidence gate helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when every mandatory (blocking) checklist item for the claim
 * has been received/verified or waived. Used to gate progression past the
 * evidence review step.
 */
export async function isEvidenceGateSatisfied(claimId: string): Promise<{
  satisfied: boolean;
  outstanding: number;
  blocking: number;
}> {
  const { data, error } = await db
    .from('bn_evidence_checklist')
    .select('status, is_blocking')
    .eq('claim_id', claimId);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ status: string; is_blocking: boolean }>;
  const blocking = rows.filter((r) => r.is_blocking);
  const outstanding = blocking.filter((r) =>
    !['FULFILLED', 'VERIFIED', 'WAIVED', 'ACCEPTED'].includes(String(r.status).toUpperCase()),
  );
  return { satisfied: outstanding.length === 0, outstanding: outstanding.length, blocking: blocking.length };
}
