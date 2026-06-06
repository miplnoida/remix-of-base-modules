/**
 * BN Intake Readiness Service
 *
 * Pre-RPC validation gate for `submitClaimApplication`. Ensures that:
 *  - the product version actually allows the requested channel
 *  - channel-specific submission requirements are met (identity, OTP,
 *    staff review, etc.) before any DB row is created
 *  - required documents are present per the product's channel config
 *  - lookup requirements (person, employer) are satisfied per channel
 *
 * Returns a structured result. Callers should throw a single user-friendly
 * error when `ok=false`; the `failures` array is for UI display and audit.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ApplicationChannel } from './claimIntakeService';

const db = supabase as any;

const CHANNEL_TO_CONFIG: Record<ApplicationChannel, 'ONLINE' | 'OFFLINE'> = {
  PUBLIC_ONLINE: 'ONLINE',
  STAFF_OFFLINE: 'OFFLINE',
  ASSISTED_COUNTER: 'OFFLINE',
  BACK_OFFICE_ENTRY: 'OFFLINE',
  MIGRATED_LEGACY: 'OFFLINE',
};

export interface ReadinessFailure {
  code: string;
  severity: 'BLOCK' | 'WARN';
  message: string;
  details?: Record<string, any>;
}

export interface ReadinessResult {
  ok: boolean;
  failures: ReadinessFailure[];
  warnings: ReadinessFailure[];
  productVersionId: string | null;
  channelConfigId: string | null;
}

export interface ResolveContext {
  productCode: string;
  claimDate: string;
  channel: ApplicationChannel;
}

async function resolveProductVersion(ctx: ResolveContext) {
  const channelCode = CHANNEL_TO_CONFIG[ctx.channel];
  const { data } = await db
    .from('bn_product')
    .select(
      `id, benefit_code, status,
       bn_product_version!inner(
         id, status, effective_from, effective_to, workflow_template_id,
         bn_product_channel_config(
           id, channel_code, is_enabled,
           requires_identity_verification, requires_email_or_phone_otp,
           requires_staff_review_before_acceptance,
           blocks_submission_if_documents_missing,
           blocks_submission_if_precheck_fails,
           workflow_definition_id, workflow_template_id
         )
       )`,
    )
    .eq('benefit_code', ctx.productCode)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!data) return { product: null, version: null, channelConfig: null };
  const versions = (data as any).bn_product_version ?? [];
  const version = versions.find(
    (v: any) =>
      v.status === 'ACTIVE' &&
      v.effective_from <= ctx.claimDate &&
      (v.effective_to === null || v.effective_to >= ctx.claimDate),
  );
  if (!version) return { product: data, version: null, channelConfig: null };
  const channelConfig =
    (version.bn_product_channel_config ?? []).find(
      (c: any) => c.channel_code === channelCode,
    ) ?? null;
  return { product: data, version, channelConfig };
}

export async function validateChannelAllowed(
  ctx: ResolveContext,
): Promise<ReadinessResult> {
  const { version, channelConfig } = await resolveProductVersion(ctx);
  const failures: ReadinessFailure[] = [];

  if (!version) {
    failures.push({
      code: 'NO_ACTIVE_VERSION',
      severity: 'BLOCK',
      message: `No active product version for ${ctx.productCode} on ${ctx.claimDate}.`,
    });
  } else if (!channelConfig) {
    failures.push({
      code: 'CHANNEL_NOT_CONFIGURED',
      severity: 'BLOCK',
      message: `Channel ${ctx.channel} is not configured on the active product version.`,
    });
  } else if (channelConfig.is_enabled === false) {
    failures.push({
      code: 'CHANNEL_DISABLED',
      severity: 'BLOCK',
      message: `Channel ${ctx.channel} is disabled for this product.`,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings: [],
    productVersionId: version?.id ?? null,
    channelConfigId: channelConfig?.id ?? null,
  };
}

export interface SubmissionPayload {
  ssn: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  identity_verified?: boolean;
  otp_verified?: boolean;
  uploaded_document_codes?: string[];
}

export async function validateSubmissionRequirements(
  ctx: ResolveContext,
  payload: SubmissionPayload,
): Promise<ReadinessResult> {
  const base = await validateChannelAllowed(ctx);
  if (!base.ok) return base;

  const { channelConfig } = await resolveProductVersion(ctx);
  const failures: ReadinessFailure[] = [];
  const warnings: ReadinessFailure[] = [];

  if (!payload.ssn || !payload.ssn.trim()) {
    failures.push({
      code: 'SSN_REQUIRED',
      severity: 'BLOCK',
      message: 'SSN is required to submit a claim.',
    });
  }

  if (channelConfig?.requires_identity_verification && !payload.identity_verified) {
    failures.push({
      code: 'IDENTITY_VERIFICATION_REQUIRED',
      severity: 'BLOCK',
      message: 'Identity verification is required for this channel.',
    });
  }

  if (channelConfig?.requires_email_or_phone_otp && !payload.otp_verified) {
    failures.push({
      code: 'OTP_REQUIRED',
      severity: 'BLOCK',
      message: 'Email or phone OTP verification is required for this channel.',
    });
  }

  if (channelConfig?.requires_staff_review_before_acceptance) {
    warnings.push({
      code: 'STAFF_REVIEW_PENDING',
      severity: 'WARN',
      message: 'Submission will require staff review before acceptance.',
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    productVersionId: base.productVersionId,
    channelConfigId: base.channelConfigId,
  };
}

export async function validateRequiredDocuments(
  productVersionId: string,
  channel: ApplicationChannel,
  uploadedDocumentCodes: string[] = [],
): Promise<ReadinessResult> {
  const channelCode = CHANNEL_TO_CONFIG[channel];
  const failures: ReadinessFailure[] = [];
  const warnings: ReadinessFailure[] = [];

  const { data: reqs } = await db
    .from('bn_doc_requirement')
    .select('id, document_type_code, requirement_level, blocks_submission, channel_code, is_active')
    .eq('product_version_id', productVersionId);

  const { data: cfg } = await db
    .from('bn_product_channel_config')
    .select('blocks_submission_if_documents_missing')
    .eq('product_version_id', productVersionId)
    .eq('channel_code', channelCode)
    .maybeSingle();

  const uploaded = new Set((uploadedDocumentCodes ?? []).map((c) => c.toUpperCase()));
  const blocksOnMissing = cfg?.blocks_submission_if_documents_missing !== false;

  for (const r of reqs ?? []) {
    if (r.is_active === false) continue;
    if (r.channel_code && r.channel_code !== 'BOTH' && r.channel_code !== channelCode) continue;
    const isMandatory = r.requirement_level === 'MANDATORY';
    if (!isMandatory) continue;
    if (uploaded.has(String(r.document_type_code).toUpperCase())) continue;

    const entry: ReadinessFailure = {
      code: 'DOCUMENT_MISSING',
      severity: r.blocks_submission && blocksOnMissing ? 'BLOCK' : 'WARN',
      message: `Required document missing: ${r.document_type_code}`,
      details: { document_type_code: r.document_type_code, requirement_id: r.id },
    };
    if (entry.severity === 'BLOCK') failures.push(entry);
    else warnings.push(entry);
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    productVersionId,
    channelConfigId: null,
  };
}

export async function validateLookupRequirements(
  channel: ApplicationChannel,
  payload: { ssn: string; employerRegno?: string | null },
): Promise<ReadinessResult> {
  const failures: ReadinessFailure[] = [];
  const warnings: ReadinessFailure[] = [];

  const { data: person } = await db
    .from('ip_master')
    .select('ssn')
    .eq('ssn', payload.ssn)
    .maybeSingle();

  if (!person) {
    // PUBLIC_ONLINE blocks; staff channels allow pending verification.
    if (channel === 'PUBLIC_ONLINE') {
      failures.push({
        code: 'PERSON_NOT_FOUND',
        severity: 'BLOCK',
        message: 'No registered person found for the provided SSN. Online submission requires a registered identity.',
      });
    } else {
      warnings.push({
        code: 'PERSON_NOT_FOUND',
        severity: 'WARN',
        message: 'Person not found in registry — claim will be created pending identity verification.',
      });
    }
  }

  if (payload.employerRegno) {
    const { data: er } = await db
      .from('er_master')
      .select('regno')
      .eq('regno', payload.employerRegno)
      .maybeSingle();
    if (!er) {
      warnings.push({
        code: 'EMPLOYER_NOT_FOUND',
        severity: 'WARN',
        message: `Employer ${payload.employerRegno} not found in registry.`,
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    productVersionId: null,
    channelConfigId: null,
  };
}

/** Run all readiness checks and return a combined result. */
export async function validateReadiness(
  ctx: ResolveContext,
  payload: SubmissionPayload & { employerRegno?: string | null },
): Promise<ReadinessResult> {
  const channelOk = await validateChannelAllowed(ctx);
  if (!channelOk.ok) return channelOk;

  const reqOk = await validateSubmissionRequirements(ctx, payload);
  const docOk = channelOk.productVersionId
    ? await validateRequiredDocuments(
        channelOk.productVersionId,
        ctx.channel,
        payload.uploaded_document_codes ?? [],
      )
    : { ok: true, failures: [], warnings: [], productVersionId: null, channelConfigId: null };
  const lookupOk = await validateLookupRequirements(ctx.channel, {
    ssn: payload.ssn,
    employerRegno: payload.employerRegno ?? null,
  });

  const failures = [
    ...reqOk.failures,
    ...docOk.failures,
    ...lookupOk.failures,
  ];
  const warnings = [
    ...reqOk.warnings,
    ...docOk.warnings,
    ...lookupOk.warnings,
  ];

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    productVersionId: channelOk.productVersionId,
    channelConfigId: channelOk.channelConfigId,
  };
}

export class ClaimIntakeReadinessError extends Error {
  readonly code = 'BN_INTAKE_NOT_READY';
  readonly failures: ReadinessFailure[];
  readonly warnings: ReadinessFailure[];
  constructor(result: ReadinessResult) {
    super(
      `Claim submission blocked: ${result.failures.map((f) => f.message).join('; ')}`,
    );
    this.name = 'ClaimIntakeReadinessError';
    this.failures = result.failures;
    this.warnings = result.warnings;
  }
}
