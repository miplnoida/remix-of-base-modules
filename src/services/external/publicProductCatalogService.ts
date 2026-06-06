/**
 * publicProductCatalogService
 * ────────────────────────────
 * Drives the public-channel benefit catalog (Claimant Portal Apply flow)
 * entirely from configuration in bn_product / bn_product_version /
 * bn_product_channel_config + bn_screen_template / bn_field_metadata /
 * bn_doc_requirement / bn_product_participant_config.
 *
 * Nothing in this file hardcodes a benefit. The Claimant Portal must
 * pass an ApplicationContext (intent, applicant persona, verification)
 * and receives only products that match.
 *
 * Server-side enforcement of the same rules lives in the public-benefits
 * edge function — this client-side layer is for catalog browsing, form
 * resolution, and gating the "Start application" button.
 */
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────

export type ApplicantType =
  | 'SELF'
  | 'SURVIVOR'
  | 'GUARDIAN'
  | 'PAYEE'
  | 'REPRESENTATIVE'
  | 'FUNERAL_RESPONSIBLE_PERSON';

export type SubjectType =
  | 'INSURED_PERSON'
  | 'DECEASED_INSURED_PERSON'
  | 'CHILD_DEPENDANT'
  | 'BENEFICIARY'
  | 'AWARD_HOLDER';

export type ApplyIntent = 'self' | 'deceased' | 'child' | 'managed' | 'funeral' | 'not_sure';

export type PortalPersona =
  | 'CLAIMANT'
  | 'INSURED_PERSON'
  | 'PENSIONER'
  | 'AWARD_HOLDER'
  | 'GUARDIAN'
  | 'PAYEE'
  | 'REPRESENTATIVE'
  | 'FUNERAL_APPLICANT';

export interface ApplicationContext {
  intent: ApplyIntent;
  applicantUserId?: string | null;
  applicantPersonas: PortalPersona[];
  applicantType?: ApplicantType;
  subjectType?: SubjectType;
  /** True iff the logged-in user has a VERIFIED SELF link in external_user_person_link. */
  subjectIsSelfVerified?: boolean;
  /** True iff the super-admin "people_i_manage_enabled" feature flag is on. */
  peopleIManageEnabled?: boolean;
}

export interface PublicProductSummary {
  channelConfigId: string;
  productId: string;
  productVersionId: string;
  benefitCode: string;
  benefitName: string;
  shortDescription: string | null;
  whoCanApply: string | null;
  estimatedProcessingDays: number | null;
  category: string | null;
  allowedApplicantTypes: ApplicantType[];
  allowedSubjectTypes: SubjectType[];
  publicIntentTags: ApplyIntent[];
  publicScreenTemplateId: string | null;
  /** Set when product is shown but disabled in the catalog UI. */
  disabledReason?: string;
}

export interface PublicApplicationDefinition {
  product: PublicProductSummary;
  channelConfig: Record<string, unknown>;
  screenTemplate: { id: string; name: string | null } | null;
  fields: Array<{
    id: string;
    fieldCode: string;
    fieldLabel: string;
    fieldType: string;
    sectionCode: string;
    isRequired: boolean;
    helpText: string | null;
    requiresSelfVerified: boolean;
    isInternalOnly: boolean;
    sortOrder: number;
  }>;
  participantRoles: string[];
  documents: Array<{
    id: string;
    documentTypeCode: string;
    requirementLevel: string;
    description: string | null;
    sortOrder: number;
  }>;
}

export interface ContextValidationResult {
  ok: boolean;
  reasons: string[];
}

// ─── Intent → applicant-type mapping ──────────────────────────────────

const INTENT_DEFAULT_APPLICANT: Record<ApplyIntent, ApplicantType | undefined> = {
  self: 'SELF',
  deceased: 'SURVIVOR',
  child: 'GUARDIAN',
  managed: 'REPRESENTATIVE',
  funeral: 'FUNERAL_RESPONSIBLE_PERSON',
  not_sure: undefined,
};

export function resolveApplicantType(ctx: ApplicationContext): ApplicantType | undefined {
  return ctx.applicantType ?? INTENT_DEFAULT_APPLICANT[ctx.intent];
}

// ─── Service ──────────────────────────────────────────────────────────

const CHANNEL_PUBLIC = 'ONLINE';

/**
 * Returns benefits eligible for display in the Claimant Portal catalog
 * for the given context. Products that fail validation are returned with
 * `disabledReason` set so the UI can show "why" without hiding the tile
 * entirely (helps users understand what they could apply for).
 */
export async function getPublicAvailableProducts(
  ctx: ApplicationContext
): Promise<PublicProductSummary[]> {
  const { data, error } = await supabase
    .from('bn_product_channel_config')
    .select(`
      id, product_id, product_version_id, channel_code, public_online_enabled,
      allowed_applicant_types, allowed_subject_types,
      public_intent_tags, public_screen_template_id,
      public_short_description, public_who_can_apply, estimated_processing_days,
      allow_apply_for_self, allow_apply_for_deceased, allow_apply_for_child_dependant,
      allow_apply_as_guardian, allow_apply_as_payee, allow_apply_as_representative,
      allow_managed_contributor_selection, applicant_must_equal_insured,
      allow_employer_initiated, allow_doctor_initiated,
      requires_self_verified_ssn, requires_deceased_person, requires_active_award,
      requires_existing_ei_claim, requires_employer_task, requires_doctor_task, requires_school_task,
      public_card_message, public_disabled_reason,
      bn_product:product_id ( id, benefit_code, benefit_name, category, description, status )
    `)
    .eq('channel_code', CHANNEL_PUBLIC)
    .eq('public_online_enabled', true);

  if (error) throw error;

  const wantedApplicant = resolveApplicantType(ctx);

  const rows = (data ?? []) as any[];
  const results: PublicProductSummary[] = [];

  for (const row of rows) {
    const product = row.bn_product;
    if (!product || product.status === 'INACTIVE') continue;

    const allowedApplicant: ApplicantType[] = row.allowed_applicant_types ?? [];
    const allowedSubject: SubjectType[] = row.allowed_subject_types ?? [];
    const intentTags: ApplyIntent[] = row.public_intent_tags ?? [];

    // Hide employer/doctor-only products from claimant catalog entirely.
    const claimantCanApply =
      row.allow_apply_for_self || row.allow_apply_for_deceased ||
      row.allow_apply_for_child_dependant || row.allow_apply_as_guardian ||
      row.allow_apply_as_payee || row.allow_apply_as_representative;
    if (!claimantCanApply) continue;

    // Intent filter (not_sure shows everything that's intent-tagged)
    if (ctx.intent !== 'not_sure' && intentTags.length && !intentTags.includes(ctx.intent)) {
      continue;
    }

    const summary: PublicProductSummary = {
      channelConfigId: row.id,
      productId: row.product_id,
      productVersionId: row.product_version_id,
      benefitCode: product.benefit_code,
      benefitName: product.benefit_name,
      shortDescription: row.public_short_description ?? row.public_card_message ?? product.description ?? null,
      whoCanApply: row.public_who_can_apply ?? null,
      estimatedProcessingDays: row.estimated_processing_days ?? null,
      category: product.category ?? null,
      allowedApplicantTypes: allowedApplicant,
      allowedSubjectTypes: allowedSubject,
      publicIntentTags: intentTags,
      publicScreenTemplateId: row.public_screen_template_id ?? null,
    };

    // Disable reasons, in priority order. Self-only + missing SSN is the
    // ONLY case where we tell the user to link their SSN. Deceased,
    // survivor, funeral, award-service products never show that message.
    const isSelfOnlyProduct =
      row.allow_apply_for_self &&
      !row.allow_apply_for_deceased &&
      !row.allow_apply_for_child_dependant &&
      !row.allow_apply_as_guardian &&
      !row.allow_apply_as_payee &&
      !row.allow_apply_as_representative;

    if (row.public_disabled_reason) {
      summary.disabledReason = row.public_disabled_reason;
    } else if (wantedApplicant && allowedApplicant.length && !allowedApplicant.includes(wantedApplicant)) {
      summary.disabledReason = 'Not available for this type of application.';
    } else if (ctx.intent === 'managed' && !row.allow_managed_contributor_selection &&
               !row.allow_apply_as_representative && !row.allow_apply_as_guardian && !row.allow_apply_as_payee) {
      summary.disabledReason = 'This benefit cannot be filed on behalf of someone you manage.';
    } else if (row.requires_deceased_person && (ctx.intent === 'self' || ctx.intent === 'child')) {
      summary.disabledReason = 'Requires deceased person details.';
    } else if (row.requires_active_award && ctx.intent === 'self' && !ctx.subjectIsSelfVerified) {
      summary.disabledReason = 'Requires an active award.';
    } else if (isSelfOnlyProduct && row.requires_self_verified_ssn && !ctx.subjectIsSelfVerified) {
      summary.disabledReason = 'Link your SSN to apply for yourself.';
    } else if (!summary.publicScreenTemplateId) {
      summary.disabledReason = 'Application form is not yet available.';
    }

    results.push(summary);
  }

  return results.sort((a, b) => a.benefitName.localeCompare(b.benefitName));
}

/**
 * Returns the full form definition for a specific product+context. Pulls
 * template fields, document checklist, and required participant roles.
 */
export async function getPublicApplicationDefinition(
  benefitCode: string,
  ctx: ApplicationContext
): Promise<PublicApplicationDefinition> {
  // 1. Resolve product + active version + public channel config
  const { data: productRow, error: productErr } = await supabase
    .from('bn_product')
    .select('id, benefit_code, benefit_name, category, description, status')
    .eq('benefit_code', benefitCode)
    .maybeSingle();
  if (productErr) throw productErr;
  if (!productRow) throw new Error(`Benefit ${benefitCode} not found`);

  const { data: cfgRow, error: cfgErr } = await supabase
    .from('bn_product_channel_config')
    .select('*')
    .eq('product_id', productRow.id)
    .eq('channel_code', CHANNEL_PUBLIC)
    .eq('public_online_enabled', true)
    .maybeSingle();
  if (cfgErr) throw cfgErr;
  if (!cfgRow) throw new Error(`Benefit ${benefitCode} is not enabled for public application.`);

  const productVersionId: string | null = (cfgRow as any).product_version_id ?? null;
  const templateId: string | null = (cfgRow as any).public_screen_template_id ?? null;

  // 2. Template + fields
  let screenTemplate: PublicApplicationDefinition['screenTemplate'] = null;
  let fields: PublicApplicationDefinition['fields'] = [];

  if (templateId) {
    const [{ data: tpl }, { data: fmRows }] = await Promise.all([
      supabase.from('bn_screen_template').select('id, template_name').eq('id', templateId).maybeSingle(),
      supabase
        .from('bn_field_metadata')
        .select('id, field_code, field_label, field_type, section_code, is_required, help_text, sort_order, requires_self_verified, is_internal_only')
        .eq('screen_template_id', templateId)
        .order('sort_order', { ascending: true }),
    ]);
    if (tpl) screenTemplate = { id: tpl.id, name: (tpl as any).template_name ?? null };
    fields = ((fmRows ?? []) as any[])
      .filter((f) => !f.is_internal_only)
      .filter((f) => !f.requires_self_verified || ctx.subjectIsSelfVerified === true)
      .map((f) => ({
        id: f.id,
        fieldCode: f.field_code,
        fieldLabel: f.field_label,
        fieldType: f.field_type,
        sectionCode: f.section_code,
        isRequired: f.is_required,
        helpText: f.help_text,
        requiresSelfVerified: f.requires_self_verified,
        isInternalOnly: f.is_internal_only,
        sortOrder: f.sort_order ?? 0,
      }));
  }

  // 3. Document checklist for this version
  let documents: PublicApplicationDefinition['documents'] = [];
  if (productVersionId) {
    const { data: docRows } = await supabase
      .from('bn_doc_requirement')
      .select('id, document_type_code, requirement_level, description, sort_order, public_visible, is_active, channel_code')
      .eq('product_version_id', productVersionId)
      .eq('is_active', true);
    documents = ((docRows ?? []) as any[])
      .filter((d) => d.public_visible !== false && (d.channel_code === 'BOTH' || d.channel_code === CHANNEL_PUBLIC))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((d) => ({
        id: d.id,
        documentTypeCode: d.document_type_code,
        requirementLevel: d.requirement_level,
        description: d.description,
        sortOrder: d.sort_order ?? 0,
      }));
  }

  const product: PublicProductSummary = {
    channelConfigId: (cfgRow as any).id,
    productId: productRow.id,
    productVersionId: productVersionId ?? '',
    benefitCode: productRow.benefit_code,
    benefitName: productRow.benefit_name,
    shortDescription: (cfgRow as any).public_short_description ?? productRow.description ?? null,
    whoCanApply: (cfgRow as any).public_who_can_apply ?? null,
    estimatedProcessingDays: (cfgRow as any).estimated_processing_days ?? null,
    category: productRow.category ?? null,
    allowedApplicantTypes: (cfgRow as any).allowed_applicant_types ?? [],
    allowedSubjectTypes: (cfgRow as any).allowed_subject_types ?? [],
    publicIntentTags: (cfgRow as any).public_intent_tags ?? [],
    publicScreenTemplateId: templateId,
  };

  return {
    product,
    channelConfig: cfgRow as Record<string, unknown>,
    screenTemplate,
    fields,
    participantRoles: (cfgRow as any).required_participant_roles ?? [],
    documents,
  };
}

/**
 * Pure-config gate run before opening the application form. The server
 * (public-benefits edge function) re-runs the equivalent of this check
 * on submit; clients cannot bypass.
 */
export function validatePublicApplicationContext(
  cfgRow: Record<string, any>,
  ctx: ApplicationContext
): ContextValidationResult {
  const reasons: string[] = [];
  if (!cfgRow?.public_online_enabled) reasons.push('Benefit is not enabled for public application.');
  if (!cfgRow?.public_screen_template_id) reasons.push('Application form is not yet available.');

  const applicant = resolveApplicantType(ctx);
  const allowed: ApplicantType[] = cfgRow?.allowed_applicant_types ?? [];
  if (applicant && allowed.length && !allowed.includes(applicant)) {
    reasons.push('This benefit cannot be applied for in this capacity.');
  }

  if (cfgRow?.applicant_must_equal_insured && applicant !== 'SELF') {
    reasons.push('This benefit can only be applied for by the insured person themselves.');
  }

  if (ctx.intent === 'managed' && !cfgRow?.allow_managed_contributor_selection) {
    reasons.push('This benefit does not support applying on behalf of a managed contributor.');
  }

  if (ctx.intent === 'managed' && ctx.peopleIManageEnabled === false) {
    reasons.push('The "People I Manage" feature is currently disabled.');
  }

  return { ok: reasons.length === 0, reasons };
}

export async function getRequiredParticipants(
  productVersionId: string,
  _ctx: ApplicationContext
): Promise<string[]> {
  const { data, error } = await supabase
    .from('bn_product_participant_config')
    .select('participant_role')
    .eq('product_version_id', productVersionId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.participant_role).filter(Boolean);
}

export async function getRequiredDocuments(
  productVersionId: string,
  _ctx: ApplicationContext
): Promise<PublicApplicationDefinition['documents']> {
  const { data, error } = await supabase
    .from('bn_doc_requirement')
    .select('id, document_type_code, requirement_level, description, sort_order, public_visible, is_active, channel_code')
    .eq('product_version_id', productVersionId)
    .eq('is_active', true);
  if (error) throw error;
  return ((data ?? []) as any[])
    .filter((d) => d.public_visible !== false && (d.channel_code === 'BOTH' || d.channel_code === CHANNEL_PUBLIC))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((d) => ({
      id: d.id,
      documentTypeCode: d.document_type_code,
      requirementLevel: d.requirement_level,
      description: d.description,
      sortOrder: d.sort_order ?? 0,
    }));
}

/**
 * Loads whether the super-admin "people_i_manage_enabled" feature flag
 * is on. Returns false on any error so the UI defaults to the safer state.
 */
export async function isPeopleIManageEnabled(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('external_portal_feature_config')
      .select('enabled')
      .eq('feature_key', 'people_i_manage_enabled')
      .maybeSingle();
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

/**
 * True iff the logged-in user has a VERIFIED SELF link to an SSN.
 * Used as the gate for showing contribution data on the public channel.
 */
export async function isCurrentUserSelfVerified(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from('external_user_person_link')
      .select('id')
      .eq('user_id', userId)
      .eq('relationship_type', 'SELF')
      .eq('verification_status', 'VERIFIED')
      .limit(1)
      .maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}
