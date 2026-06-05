/**
 * BN Form Definition Service
 *
 * Single engine that loads form definitions from Product Catalogue
 * (bn_screen_template + bn_field_metadata + bn_doc_requirement) and
 * validates / submits applications. Used by both the internal staff
 * intake page and the public online benefit application.
 *
 * Falls back to the section catalogue when a product version has no
 * configured screen template or field metadata.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveProductVersion } from '@/services/bn/productVersionResolver';
import {
  FormChannel,
  FormFieldDef,
  FormSectionDef,
  SHARED_SECTIONS,
  SHARED_FIELDS,
  BENEFIT_SECTIONS,
  BENEFIT_FIELDS,
  normalizeBenefitKey,
  getDefaultSectionsForBenefit,
  getDefaultFieldsForBenefit,
} from './sectionCatalogue';

const db = supabase as any;

export interface DocumentRequirementLite {
  id: string;
  document_type_code: string;
  description?: string | null;
  requirement_level: string; // MANDATORY / OPTIONAL / CONDITIONAL
  public_visible?: boolean | null;
  internal_visible?: boolean | null;
  blocks_submission?: boolean | null;
  sort_order?: number | null;
}

export interface FormDefinition {
  productId: string;
  productCode: string;
  productVersionId: string;
  benefitKey: string; // normalized catalogue key
  channel: FormChannel;
  sections: FormSectionDef[];
  fields: FormFieldDef[];
  documents: DocumentRequirementLite[];
  workflow: {
    workflow_template_id?: string | null;
    workflow_definition_id?: string | null;
    hasWorkflow: boolean;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApplicationPayload {
  productCode: string;
  claimDate: string; // yyyy-MM-dd
  values: Record<string, any>;
  uploadedDocumentTypeCodes?: string[]; // documents the user has uploaded (PUBLIC) or marked as available
  userCode?: string;
}

// ─── Loading ─────────────────────────────────────────────────────
export async function getApplicationFormDefinition(
  productCodeOrId: string,
  claimDate: string | Date,
  channel: FormChannel,
): Promise<FormDefinition> {
  const { product, version } = await resolveProductVersion(productCodeOrId, claimDate);
  const benefitKey =
    normalizeBenefitKey(product.benefit_code) ??
    normalizeBenefitKey((product as any).benefit_type) ??
    normalizeBenefitKey(((product as any).code)) ??
    'SICKNESS';

  // Try DB-configured metadata
  let sections: FormSectionDef[] = [];
  let fields: FormFieldDef[] = [];

  const screenTemplateId = (version as any).screen_template_id;
  if (screenTemplateId) {
    const { data: meta } = await db
      .from('bn_field_metadata')
      .select('*')
      .eq('screen_template_id', screenTemplateId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (meta && meta.length) {
      fields = meta.map((m: any) => ({
        field_code: m.field_code,
        field_label: m.field_label,
        field_type: (m.field_type || 'TEXT').toUpperCase(),
        section_code: m.section_code,
        is_required: !!m.is_required,
        visibleForChannels:
          (m.validation_rules?.visibleForChannels as FormChannel[]) ?? ['INTERNAL', 'ASSISTED_OFFLINE', 'PUBLIC'],
        validation_rules: m.validation_rules ?? undefined,
        options_source: m.options_source ?? undefined,
        default_value: m.default_value ?? undefined,
        help_text: m.help_text ?? undefined,
        sort_order: m.sort_order ?? 0,
      }));
      // Build sections from used section_codes, merging shared + benefit-specific titles
      const sectionMap = new Map<string, FormSectionDef>();
      [...SHARED_SECTIONS, BENEFIT_SECTIONS[benefitKey]].filter(Boolean).forEach(s => sectionMap.set(s.section_code, s));
      const used = new Set(fields.map(f => f.section_code));
      sections = Array.from(used)
        .map(code => sectionMap.get(code) ?? { section_code: code, title: code, visibleForChannels: ['INTERNAL', 'ASSISTED_OFFLINE', 'PUBLIC'] as FormChannel[], sort_order: 999 })
        .sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  // Fallback to in-code catalogue
  if (!fields.length) {
    sections = getDefaultSectionsForBenefit(benefitKey);
    fields = getDefaultFieldsForBenefit(benefitKey);
  }

  // Filter by channel
  sections = sections.filter(s => s.visibleForChannels.includes(channel));
  fields = fields.filter(f => f.visibleForChannels.includes(channel) && sections.some(s => s.section_code === f.section_code));

  // Documents
  const { data: docs } = await db
    .from('bn_doc_requirement')
    .select('*')
    .eq('product_version_id', version.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const documents: DocumentRequirementLite[] = (docs ?? [])
    .filter((d: any) => {
      if (channel === 'PUBLIC') return d.public_visible !== false;
      return d.internal_visible !== false;
    })
    .map((d: any) => ({
      id: d.id,
      document_type_code: d.document_type_code,
      description: d.description,
      requirement_level: d.requirement_level,
      public_visible: d.public_visible,
      internal_visible: d.internal_visible,
      blocks_submission: d.blocks_submission,
      sort_order: d.sort_order,
    }));

  const workflow_template_id = (version as any).workflow_template_id ?? null;
  const workflow_definition_id = (version as any).workflow_definition_id ?? null;

  return {
    productId: product.id,
    productCode: product.benefit_code ?? ((product as any).code) ?? product.id,
    productVersionId: version.id,
    benefitKey,
    channel,
    sections,
    fields,
    documents,
    workflow: {
      workflow_template_id,
      workflow_definition_id,
      hasWorkflow: !!(workflow_template_id || workflow_definition_id),
    },
  };
}

export async function getRequiredSections(productVersionId: string, channel: FormChannel) {
  // Implemented via getApplicationFormDefinition; kept as helper for callers that
  // already know the version. For now we re-resolve through the product.
  return SHARED_SECTIONS.filter(s => s.visibleForChannels.includes(channel));
}

export function getVisibleFields(definition: FormDefinition): FormFieldDef[] {
  return definition.fields;
}

// ─── Validation ──────────────────────────────────────────────────
export function validateApplicationPayload(
  payload: ApplicationPayload,
  definition: FormDefinition,
): FieldError[] {
  const errors: FieldError[] = [];
  const values = payload.values ?? {};

  // 1. Required fields
  for (const f of definition.fields) {
    if (!f.is_required) continue;
    const v = values[f.field_code];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) errors.push({ field: f.field_code, message: `${f.field_label} is required.` });
  }

  // 2. Required documents
  const uploaded = new Set(payload.uploadedDocumentTypeCodes ?? []);
  for (const d of definition.documents) {
    const mandatory = d.requirement_level === 'MANDATORY' || d.blocks_submission;
    if (!mandatory) continue;
    if (definition.channel === 'PUBLIC' && !uploaded.has(d.document_type_code)) {
      errors.push({ field: `document:${d.document_type_code}`, message: `${d.description ?? d.document_type_code} must be uploaded.` });
    }
  }

  // 3. Declaration
  if (definition.fields.some(f => f.field_code === 'declaration') && !values.declaration) {
    errors.push({ field: 'declaration', message: 'You must accept the declaration to submit.' });
  }

  return errors;
}

// ─── Submission ──────────────────────────────────────────────────
// Always routes through the central transactional RPC so every channel
// (PUBLIC, ASSISTED_OFFLINE, INTERNAL) produces the same bn_claim +
// bn_claim_application + snapshots + checklist + workflow instance.
import { submitClaimApplication, type ApplicationChannel } from '@/services/bn/intake/claimIntakeService';

const CHANNEL_MAP: Record<FormChannel, ApplicationChannel> = {
  PUBLIC: 'PUBLIC_ONLINE',
  ASSISTED_OFFLINE: 'ASSISTED_COUNTER',
  INTERNAL: 'STAFF_OFFLINE',
};

export async function submitApplication(
  payload: ApplicationPayload,
  channel: FormChannel,
): Promise<{ claimId: string; claimNumber?: string; errors?: FieldError[] }> {
  const definition = await getApplicationFormDefinition(payload.productCode, payload.claimDate, channel);
  const errors = validateApplicationPayload(payload, definition);
  if (errors.length) return { claimId: '', errors };

  const v = payload.values;
  if (!v.ssn) {
    return { claimId: '', errors: [{ field: 'ssn', message: 'SSN is required for claim submission.' }] };
  }

  try {
    const result = await submitClaimApplication({
      ssn: String(v.ssn),
      productCode: definition.productCode,
      claimDate: payload.claimDate,
      channel: CHANNEL_MAP[channel],
      formPayload: { ...v, declaration_accepted: !!v.declaration },
      employerRegno: v.employer_regno ?? null,
      submittedByUserId: payload.userCode ?? null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
    return { claimId: result.claimId, claimNumber: result.claimNumber };
  } catch (e: any) {
    return { claimId: '', errors: [{ field: '_form', message: e?.message ?? 'Failed to submit application.' }] };
  }
}

export async function generateEvidenceChecklist(
  claimId: string,
  productVersionId: string,
): Promise<void> {
  const { data: reqs } = await db
    .from('bn_doc_requirement')
    .select('id, requirement_level, blocks_submission')
    .eq('product_version_id', productVersionId)
    .eq('is_active', true);

  if (!reqs?.length) return;
  const rows = reqs.map((r: any) => ({
    claim_id: claimId,
    requirement_id: r.id,
    status: 'PENDING',
    is_blocking: r.requirement_level === 'MANDATORY' || !!r.blocks_submission,
  }));
  await db.from('bn_evidence_checklist').insert(rows);
}
