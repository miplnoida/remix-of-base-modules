/**
 * BN Public Application Service
 *
 * Single entry point for a future public portal. Reuses the SAME building
 * blocks as staff intake so configuration stays in one place:
 *   - productVersionResolver   → active version for (product, claimDate)
 *   - productAcceptanceService → required documents, eligibility, channel rules
 *   - bnPersonAdapter          → SSN lookup + verified identity fields
 *   - claimIntakeService       → transactional submit (claim + snapshots + workflow)
 *
 * Public rules enforced here:
 *   • SSN lookup is required
 *   • Verified identity fields are read-only (no manual overrides)
 *   • Required documents come from Product Catalog
 *   • Eligibility pre-check messages are user-friendly
 *   • Duplicate active claim is blocked
 *   • No internal notes, no workflow routing choice
 *   • Mandatory blocking documents must be uploaded unless the channel
 *     config allows pending documents
 */
import { supabase } from '@/integrations/supabase/client';
import { bnPersonAdapter } from '@/services/bn/integration';
import { bnDocumentAdapter } from '@/services/bn/integration/documentAdapter';
import { resolveProductVersion } from '@/services/bn/productVersionResolver';
import {
  getProductApplicationConfig,
  validateApplicationBeforeCreate,
} from '@/services/bn/productAcceptanceService';
import {
  submitClaimApplication,
  type SubmitClaimApplicationResult,
} from '@/services/bn/intake/claimIntakeService';

const db = supabase as any;
const CHANNEL = 'ONLINE' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicBenefitProduct {
  productCode: string;
  productName: string;
  description: string | null;
  versionId: string;
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PublicEligibilityHint {
  code: string;
  message: string;        // friendly summary for end users
  severity: 'INFO' | 'WARN' | 'BLOCK';
}

export interface PublicDocumentRequirement {
  code: string;
  name: string;
  mandatory: boolean;
  blocksSubmission: boolean;
  allowsPending: boolean;
  helpText?: string | null;
}

export interface PublicApplicationRequirements {
  product: PublicBenefitProduct;
  verifiedPerson: {
    ssn: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string;
    readOnlyFields: string[];
  };
  documents: PublicDocumentRequirement[];
  eligibility: PublicEligibilityHint[];
  duplicateActiveClaim: { claimId: string; claimNumber: string | null } | null;
  allowsPendingDocuments: boolean;
}

export interface SubmitPublicBenefitApplicationInput {
  ssn: string;
  productCode: string;
  claimDate: string;
  formPayload: Record<string, any>;
  employerRegno?: string | null;
  uploadedDocuments?: Array<{
    code: string;
    file: File;
  }>;
  uploadedDocumentCodes?: string[]; // when files were uploaded out-of-band
  declarationAccepted: boolean;
  sourceIp?: string | null;
  userAgent?: string | null;
}

// ---------------------------------------------------------------------------
// Catalog discovery
// ---------------------------------------------------------------------------

/**
 * Returns the products a person can apply for online at a given claim date.
 * A product is included only when:
 *   - the product is ACTIVE,
 *   - an ACTIVE product version covers the claim date,
 *   - the ONLINE channel is enabled for that version.
 */
export async function getAvailableBenefitProducts(
  ssn: string,
  claimDate: string,
): Promise<PublicBenefitProduct[]> {
  if (!ssn?.trim()) throw new Error('SSN is required.');
  const person = await bnPersonAdapter.lookupPerson(ssn);
  if (!person) throw new Error('We could not find your record. Please contact the office.');

  const { data: products, error } = await db
    .from('bn_product')
    .select('id, benefit_code, name, description, status')
    .eq('status', 'ACTIVE');
  if (error) throw error;

  const results: PublicBenefitProduct[] = [];
  for (const product of products ?? []) {
    try {
      const cfg = await getProductApplicationConfig(product.benefit_code, claimDate, CHANNEL);
      if (!cfg.channelConfig?.is_enabled) continue;
      results.push({
        productCode: product.benefit_code,
        productName: product.name,
        description: product.description ?? null,
        versionId: cfg.version.id,
        versionNumber: cfg.version.version_number,
        effectiveFrom: cfg.version.effective_from,
        effectiveTo: cfg.version.effective_to ?? null,
      });
    } catch {
      // Skip products without an active version or online channel.
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Requirements bundle
// ---------------------------------------------------------------------------

export async function getApplicationRequirements(
  productCode: string,
  ssn: string,
  claimDate: string,
): Promise<PublicApplicationRequirements> {
  if (!ssn?.trim()) throw new Error('SSN is required.');

  const person = await bnPersonAdapter.lookupPerson(ssn);
  if (!person) throw new Error('SSN not found. Please visit the office for assistance.');

  // Same resolver staff uses → guarantees identical product version.
  const resolved = await resolveProductVersion(productCode, claimDate);
  const cfg = await getProductApplicationConfig(productCode, claimDate, CHANNEL);

  const documents: PublicDocumentRequirement[] = cfg.documents.map(d => ({
    code: d.document_type_code,
    name: d.document_name,
    mandatory: !!d.is_mandatory,
    blocksSubmission: !!d.blocks_submission,
    allowsPending: !d.blocks_submission,
    helpText: (d as any).help_text ?? (d as any).description ?? null,
  }));

  const eligibility: PublicEligibilityHint[] = (cfg.eligibility ?? []).map((r: any) => ({
    code: r.rule_code ?? r.code ?? r.id,
    message: toFriendly(r.public_message ?? r.description ?? r.rule_name ?? r.name),
    severity: r.is_blocking || r.blocks_submission ? 'BLOCK' : (r.severity ?? 'INFO'),
  }));

  const duplicateActiveClaim = await findDuplicateActiveClaim(person.ssn, resolved.product.id);

  return {
    product: {
      productCode: resolved.product.benefit_code,
      productName: resolved.product.name,
      description: resolved.product.description ?? null,
      versionId: resolved.version.id,
      versionNumber: resolved.version.version_number,
      effectiveFrom: resolved.version.effective_from,
      effectiveTo: resolved.version.effective_to ?? null,
    },
    verifiedPerson: {
      ssn: person.ssn,
      fullName: person.fullName,
      dateOfBirth: person.dateOfBirth,
      gender: person.gender,
      readOnlyFields: ['ssn', 'fullName', 'dateOfBirth', 'gender', 'address', 'phone', 'email'],
    },
    documents,
    eligibility,
    duplicateActiveClaim,
    allowsPendingDocuments: cfg.channelConfig?.allow_upload_later === true,
  };
}

async function findDuplicateActiveClaim(
  ssn: string,
  productId: string,
): Promise<PublicApplicationRequirements['duplicateActiveClaim']> {
  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_number, status, applicant_ssn, product_id')
    .eq('applicant_ssn', ssn)
    .eq('product_id', productId)
    .not('status', 'in', '("REJECTED","CLOSED","CANCELLED","PAID","COMPLETED")')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0];
  return row ? { claimId: row.id, claimNumber: row.claim_number ?? null } : null;
}

function toFriendly(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\b(SSN|DOB)\b/g, m => (m === 'SSN' ? 'Social Security Number' : 'Date of Birth'));
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export interface SubmitPublicResult extends SubmitClaimApplicationResult {
  uploadedDocumentCodes: string[];
}

export async function submitPublicBenefitApplication(
  input: SubmitPublicBenefitApplicationInput,
): Promise<SubmitPublicResult> {
  if (!input.declarationAccepted) {
    throw new Error('You must accept the declaration before submitting.');
  }

  const requirements = await getApplicationRequirements(input.productCode, input.ssn, input.claimDate);

  if (requirements.duplicateActiveClaim) {
    throw new Error(
      `You already have an active application for this benefit (#${requirements.duplicateActiveClaim.claimNumber ?? requirements.duplicateActiveClaim.claimId}).`,
    );
  }

  // Pre-upload documents so we can carry codes into validation + submission.
  const uploadedCodes = new Set<string>(input.uploadedDocumentCodes ?? []);
  const uploadRefs: Array<{ code: string; storagePath: string; fileName: string }> = [];
  for (const u of input.uploadedDocuments ?? []) {
    const ref = await bnDocumentAdapter.uploadEvidence({
      entityType: 'bn_claim_application',
      entityId: `${input.ssn}-${input.productCode}-${input.claimDate}`,
      documentTypeCode: u.code,
      file: u.file,
    } as any);
    uploadRefs.push({ code: u.code, storagePath: ref.id, fileName: ref.fileName });
    uploadedCodes.add(u.code);
  }

  // Reuse the same validator staff intake uses (channel-aware).
  const validation = await validateApplicationBeforeCreate({
    productCode: input.productCode,
    claimDate: input.claimDate,
    channel: 'ONLINE',
    applicantSsn: input.ssn,
    uploadedDocumentCodes: Array.from(uploadedCodes),
    prechecksPassed: true,
  });
  if (!validation.ok) {
    throw new Error(validation.errors.map(e => e.message).join(' '));
  }

  // Central transactional submit (snapshots + checklist + workflow handled in RPC).
  const result = await submitClaimApplication({
    ssn: input.ssn,
    productCode: input.productCode,
    claimDate: input.claimDate,
    channel: 'PUBLIC_ONLINE',
    formPayload: {
      ...input.formPayload,
      _uploaded_documents: uploadRefs,
      _declaration_accepted: true,
    },
    employerRegno: input.employerRegno ?? null,
    submittedByUserId: null,
    sourceIp: input.sourceIp ?? null,
    userAgent: input.userAgent ?? null,
  });

  // Fire-and-forget audit event (non-blocking).
  void db.from('system_audit_trail').insert({
    module: 'BN',
    action: 'PUBLIC_BENEFIT_APPLICATION_SUBMITTED',
    entity_type: 'bn_claim',
    entity_id: result.claimId,
    user_code: 'PUBLIC',
    metadata: {
      product_code: input.productCode,
      claim_date: input.claimDate,
      ssn: input.ssn,
      channel: 'PUBLIC_ONLINE',
      uploaded_document_codes: Array.from(uploadedCodes),
      source_ip: input.sourceIp ?? null,
      user_agent: input.userAgent ?? null,
    },
  }).then(() => {}, () => {});

  return { ...result, uploadedDocumentCodes: Array.from(uploadedCodes) };
}
