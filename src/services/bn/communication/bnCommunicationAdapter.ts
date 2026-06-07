/**
 * BN Communication Adapter
 *
 * BN does NOT own a separate communication module. It delegates to the
 * existing platform notification + notice infrastructure
 * (notification_templates, notification_queue, in_app_notifications)
 * and to the BN-scoped letter lifecycle (bn_letter).
 *
 * Flow:
 *   triggerClaimCommunication(eventCode, claimId, ctx?)
 *     → resolve bn_comm_mapping rows for event (+ optional product version / step)
 *     → resolve recipient address per recipient_type
 *     → for EMAIL/SMS/IN_APP/INTERNAL_EMAIL → enqueue via notification_queue / in_app_notifications
 *     → for LETTER → create bn_letter row (DRAFT) ready for generation/approval/print
 *     → always write bn_communication_log + bn_claim_event for the timeline
 *     → fallback: if no email/phone for digital channels, auto-promote to LETTER
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type BnChannel = 'EMAIL' | 'SMS' | 'LETTER' | 'IN_APP' | 'INTERNAL_EMAIL';
export type BnRecipientType =
  | 'CLAIMANT' | 'PAYEE' | 'EMPLOYER' | 'ASSIGNED_OFFICER'
  | 'SUPERVISOR' | 'FINANCE' | 'MEDICAL_BOARD' | 'AUDITOR';

export interface BnCommContext {
  productVersionId?: string;
  workflowStepId?: string;
  reasonCode?: string;
  reasonDescription?: string;
  appealDeadline?: string;
  userCode?: string;
  extra?: Record<string, any>;
}

export interface BnCommDispatchResult {
  eventCode: string;
  dispatched: number;
  skipped: number;
  failed: number;
  blocked: number;
  letters: string[];
  logIds: string[];
  warnings: string[];
}

export interface RecipientDiagnosis {
  resolvable: boolean;
  recipient?: { name?: string; email?: string; phone?: string; address?: any; userId?: string };
  missing: string[];
  reason?: string;
}

/**
 * Recipient diagnostics — single source of truth for "can this comm actually go out?".
 * Returns structured missing-data reasons used to set BLOCKED status with actionable details.
 */
export async function diagnoseRecipient(
  claimId: string,
  recipientType: BnRecipientType,
  channel: BnChannel,
): Promise<RecipientDiagnosis> {
  const recipient = await resolveRecipient(claimId, recipientType, channel);
  if (!recipient) {
    return { resolvable: false, missing: ['recipient'], reason: `${recipientType} record not found on claim` };
  }
  const missing: string[] = [];
  if ((channel === 'EMAIL' || channel === 'INTERNAL_EMAIL') && !recipient.email) missing.push('email');
  if (channel === 'SMS' && !recipient.phone) missing.push('phone');
  if (channel === 'LETTER') {
    const a: any = recipient.address || {};
    if (!a.line1 && !a.city) missing.push('postal address');
  }
  if (channel === 'IN_APP' && !recipient.userId) missing.push('internal user account');
  if (missing.length) {
    return { resolvable: false, recipient, missing, reason: `${recipientType} is missing: ${missing.join(', ')}` };
  }
  return { resolvable: true, recipient, missing: [] };
}

// ─── Merge context ────────────────────────────────────────────────
export async function buildBnMergeContext(claimId: string, extra?: Record<string, any>): Promise<Record<string, any>> {
  const { data: claim } = await db
    .from('bn_claim')
    .select('id, claim_number, ssn, employer_regno, product_id, status, submitted_at, created_at')
    .eq('id', claimId)
    .maybeSingle();
  if (!claim) return { ClaimNumber: '', ClaimantName: '', ...(extra || {}) };

  const [{ data: person }, { data: product }, { data: latestDecision }, { data: latestCalc }, { data: missingDocs }, { data: latestEligArr }] = await Promise.all([
    claim.ssn
      ? db.from('ip_master').select('first_name, surname, email, phone_cell, phone_home, mailing_address').eq('ssn', String(claim.ssn).trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    claim.product_id
      ? db.from('bn_product').select('product_name, product_code').eq('id', claim.product_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('bn_claim_decision').select('decision_type, reason_code, narrative, decided_at').eq('claim_id', claimId).order('decided_at', { ascending: false }).limit(1),
    db.from('bn_claim_calculation').select('weekly_rate, monthly_rate, lump_sum, effective_date').eq('claim_id', claimId).order('calculated_at', { ascending: false }).limit(1),
    db.from('bn_evidence_checklist').select('document_label').eq('claim_id', claimId).neq('status', 'VERIFIED').neq('status', 'WAIVED'),
    db.from('bn_claim_eligibility').select('id, overall_result, override_applied, rule_results, check_date').eq('claim_id', claimId).order('check_date', { ascending: false }).limit(1),
  ]);

  const ssnRaw = String(claim.ssn || '');
  const maskedSsn = ssnRaw ? ssnRaw.replace(/.(?=.{2})/g, '*') : '';
  const dec = latestDecision?.[0];
  const calc = latestCalc?.[0];
  const latestElig = (extra?.latestEligibility as any) ?? (Array.isArray(latestEligArr) ? latestEligArr[0] : null);


  // Build failed rules summary from extra.failedRules (preferred) or latest eligibility snapshot
  const failedRulesArr: any[] = Array.isArray(extra?.failedRules)
    ? (extra!.failedRules as any[])
    : Array.isArray(latestElig?.rule_results)
      ? (latestElig!.rule_results as any[]).filter((r: any) => !r.passed && r.result_state !== 'OVERRIDDEN')
      : [];
  const failedRulesText = failedRulesArr
    .map((r: any) => `• ${r.rule_name || r.rule_code || 'Rule'}${r.message ? ` — ${r.message}` : ''}`)
    .join('\n');
  const failedReasonSummary = failedRulesArr.length
    ? `${failedRulesArr.length} eligibility check${failedRulesArr.length === 1 ? '' : 's'} did not pass.`
    : '';

  const missingDocsText = (missingDocs || []).map((d: any) => d.document_label).join(', ');
  const product_name = product?.product_name || '';
  const claim_number = claim.claim_number || claim.id;
  const claimant_name = person ? `${person.first_name || ''} ${person.surname || ''}`.trim() : '';
  const today = new Date().toISOString().slice(0, 10);
  const decision_date = dec?.decided_at || today;

  return {
    // Camel-case keys (used by notification_queue/template_data)
    ClaimNumber: claim_number,
    ClaimantName: claimant_name,
    SSN: ssnRaw,
    SSNMasked: maskedSsn,
    BenefitType: product_name,
    BenefitName: product_name,
    SubmissionDate: claim.submitted_at || claim.created_at || '',
    DecisionDate: decision_date,
    ReasonCode: dec?.reason_code || extra?.reasonCode || '',
    ReasonDescription: dec?.narrative || extra?.reasonDescription || '',
    AppealDeadline: extra?.appealDeadline || '',
    AppealInstructions: extra?.appealInstructions || 'You may appeal this decision in writing within 30 days of receipt.',
    WeeklyRate: calc?.weekly_rate ?? '',
    MonthlyRate: calc?.monthly_rate ?? '',
    LumpSum: calc?.lump_sum ?? '',
    EffectiveDate: calc?.effective_date || '',
    PaymentMethod: '',
    MissingDocuments: missingDocsText,
    FailedRules: failedRulesText,
    FailedReasonSummary: failedReasonSummary,
    NextSteps: extra?.nextSteps || 'Please review the listed checks and contact the claims office to discuss next steps.',
    OfficePhone: extra?.officePhone || extra?.officeContact || '',
    OfficeEmail: extra?.officeEmail || '',
    DueDate: extra?.dueDate || '',
    OfficerName: extra?.officerName || '',
    OfficeContact: extra?.officeContact || '',
    EmployerName: '',
    Today: today,
    // Snake/upper-case duplicates for {{PLACEHOLDER}}-style templates
    CLAIM_NUMBER: claim_number,
    CLAIMANT_NAME: claimant_name,
    SSN_MASKED: maskedSsn,
    BENEFIT_NAME: product_name,
    BENEFIT_TYPE: product_name,
    APPLICATION_DATE: claim.submitted_at || claim.created_at || '',
    DECISION_DATE: decision_date,
    FAILED_RULES: failedRulesText || '—',
    FAILED_REASON_SUMMARY: failedReasonSummary || '—',
    MISSING_DOCUMENTS: missingDocsText || '—',
    NEXT_STEPS: extra?.nextSteps || 'Please contact the claims office to discuss next steps.',
    APPEAL_INSTRUCTIONS: extra?.appealInstructions || 'You may appeal this decision in writing within 30 days of receipt.',
    OFFICE_PHONE: extra?.officePhone || extra?.officeContact || '',
    OFFICE_EMAIL: extra?.officeEmail || '',
    TODAY: today,
    ...(extra || {}),
  };
}


// ─── Recipient resolution ─────────────────────────────────────────
export async function resolveRecipient(claimId: string, recipientType: BnRecipientType, channel: BnChannel): Promise<{ name?: string; email?: string; phone?: string; address?: any; userId?: string } | null> {
  const { data: claim } = await db.from('bn_claim').select('ssn, employer_regno, assigned_to').eq('id', claimId).maybeSingle();
  if (!claim) return null;

  if (recipientType === 'CLAIMANT' || recipientType === 'PAYEE') {
    if (!claim.ssn) return null;
    const { data: p } = await db.from('ip_master')
      .select('first_name, surname, email, phone_cell, phone_home, mailing_address, mailing_address_2, mailing_city, mailing_country, mailing_postal_code, mailing_state')
      .eq('ssn', String(claim.ssn).trim()).maybeSingle();
    if (!p) return null;
    return {
      name: `${p.first_name || ''} ${p.surname || ''}`.trim(),
      email: p.email || undefined,
      phone: p.phone_cell || p.phone_home || undefined,
      address: {
        line1: p.mailing_address,
        line2: p.mailing_address_2,
        city: p.mailing_city,
        state: p.mailing_state,
        postal: p.mailing_postal_code,
        country: p.mailing_country,
      },
    };
  }

  if (recipientType === 'EMPLOYER' && claim.employer_regno) {
    const { data: e } = await db.from('er_master').select('legal_name, email, phone, mail_address, mail_city, mail_country, mail_postal_code').eq('regno', claim.employer_regno).maybeSingle();
    if (!e) return null;
    return {
      name: e.legal_name,
      email: e.email || undefined,
      phone: e.phone || undefined,
      address: { line1: e.mail_address, city: e.mail_city, postal: e.mail_postal_code, country: e.mail_country },
    };
  }

  // Internal recipients — best-effort lookup; downstream caller may resolve user_code separately.
  return { name: recipientType, userId: claim.assigned_to || undefined };
}

// ─── Channel dispatchers ──────────────────────────────────────────
async function queueNotificationQueue(channel: 'EMAIL' | 'SMS', recipient: any, templateId: string | null, subject: string | null, mergeContext: Record<string, any>, claimId: string, eventCode: string) {
  const row = {
    template_key: templateId || `bn-${eventCode}`,
    recipient_email: channel === 'EMAIL' ? recipient?.email : null,
    recipient_phone: channel === 'SMS' ? recipient?.phone : null,
    recipient_name: recipient?.name || '',
    channel: channel.toLowerCase(),
    template_data: { ...mergeContext, claimId, eventCode },
    module: 'benefit_management',
    entity_type: 'bn_claim',
    entity_id: claimId,
    status: 'pending',
  };
  const { data, error } = await db.from('notification_queue').insert(row).select('id').single();
  if (error) throw error;
  return data?.id as string;
}

async function createInAppNotification(userIdOrCode: string | undefined, subject: string, body: string, claimId: string, eventCode: string) {
  if (!userIdOrCode) return null;
  const { data, error } = await db.from('in_app_notifications').insert({
    user_id: userIdOrCode,
    title: subject,
    body,
    category: 'benefit_management',
    entity_type: 'bn_claim',
    entity_id: claimId,
    metadata: { eventCode },
    is_read: false,
  }).select('id').single();
  if (error) return null;
  return data?.id as string;
}

// ─── Letter creation (DRAFT state — print/dispatch happens via UI) ──
async function createLetter(params: {
  claimId: string; eventCode: string; templateId: string | null;
  recipientType: BnRecipientType; recipient: any; subject: string;
  mergeContext: Record<string, any>; isMandatoryLetter: boolean; userCode?: string;
}) {
  const { data, error } = await db.from('bn_letter').insert({
    claim_id: params.claimId,
    event_code: params.eventCode,
    template_id: params.templateId,
    recipient_type: params.recipientType,
    recipient_name: params.recipient?.name || '',
    recipient_address_snapshot: params.recipient?.address || null,
    subject: params.subject,
    merge_context: params.mergeContext,
    status: params.isMandatoryLetter ? 'PENDING_APPROVAL' : 'GENERATED',
    generated_at: new Date().toISOString(),
    created_by: params.userCode || null,
  }).select('id').single();
  if (error) throw error;
  return data?.id as string;
}

// ─── Communication log ────────────────────────────────────────────
async function writeCommLog(row: {
  claimId: string; eventCode: string; channel: BnChannel; recipientType: BnRecipientType;
  recipientAddress?: string; templateId?: string | null; subject?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED' | 'BLOCKED' | 'GENERATED' | 'PRINT_PENDING' | 'PRINTED' | 'DISPATCHED' | 'RETRYING' | 'DELIVERED';
  providerId?: string | null;
  letterId?: string | null; workflowStepId?: string; error?: string;
  context?: Record<string, any>; userCode?: string;
}) {
  const { data, error } = await db.from('bn_communication_log').insert({
    claim_id: row.claimId,
    event_code: row.eventCode,
    channel: row.channel, // legacy
    delivery_method: row.channel,
    recipient_type: row.recipientType,
    recipient_address: row.recipientAddress,
    template_id: row.templateId || null,
    subject: row.subject,
    status: row.status,
    provider_message_id: row.providerId || null,
    letter_id: row.letterId || null,
    workflow_step_id: row.workflowStepId || null,
    error_message: row.error || null,
    context: row.context || null,
    created_by: row.userCode || null,
  }).select('id').single();
  if (error) return null;
  return data?.id as string;
}

// ─── Top-level event dispatcher ────────────────────────────────────
export async function triggerClaimCommunication(eventCode: string, claimId: string, ctx?: BnCommContext): Promise<BnCommDispatchResult> {
  const result: BnCommDispatchResult = { eventCode, dispatched: 0, skipped: 0, failed: 0, blocked: 0, letters: [], logIds: [], warnings: [] };

  // 1. Resolve event metadata
  const { data: event } = await db.from('bn_comm_event').select('*').eq('event_code', eventCode).maybeSingle();
  if (!event || !event.active) {
    result.warnings.push(`Event ${eventCode} not registered or inactive.`);
    return result;
  }

  // 2. Resolve mappings (product-scoped first, then global)
  let mappingQuery = db.from('bn_comm_mapping').select('*').eq('event_code', eventCode).eq('active', true);
  const { data: allMappings } = await mappingQuery;
  let mappings: any[] = (allMappings || []).map((m: any) => ({
    ...m,
    // Normalize: prefer delivery_method, fall back to legacy channel
    channel: m.delivery_method || m.channel,
    delivery_method: m.delivery_method || m.channel,
  }));
  if (ctx?.productVersionId) {
    const scoped = mappings.filter(m => m.bn_product_version_id === ctx.productVersionId);
    if (scoped.length > 0) mappings = scoped;
    else mappings = mappings.filter(m => !m.bn_product_version_id);
  } else {
    mappings = mappings.filter(m => !m.bn_product_version_id);
  }

  // 3. Build merge context once
  const mergeContext = await buildBnMergeContext(claimId, {
    reasonCode: ctx?.reasonCode,
    reasonDescription: ctx?.reasonDescription,
    appealDeadline: ctx?.appealDeadline,
    ...(ctx?.extra || {}),
  });

  // 4. Ensure mandatory letter even if no mapping exists yet
  const hasLetterMapping = mappings.some(m => m.channel === 'LETTER');
  if (event.is_mandatory_letter && !hasLetterMapping) {
    mappings.push({
      event_code: eventCode,
      channel: 'LETTER',
      delivery_method: 'LETTER',
      recipient_type: 'CLAIMANT',
      template_id: null,
      is_required: true,
      fallback_priority: 999,
    });
  }

  // 5. If no mappings at all, log a BLOCKED entry — required event with no configured mapping.
  if (mappings.length === 0) {
    const id = await writeCommLog({
      claimId, eventCode, channel: 'IN_APP', recipientType: 'ASSIGNED_OFFICER',
      status: 'BLOCKED', error: 'No communication mapping configured for this event in Product Catalog',
      userCode: ctx?.userCode, workflowStepId: ctx?.workflowStepId,
      context: { missing: ['mapping'], action: 'Configure mapping in Product Catalog → Communications' },
    });
    if (id) result.logIds.push(id);
    result.blocked += 1;
    return result;
  }

  // 6. Dispatch each mapping
  for (const m of mappings) {
    const isRequired = m.is_required === true || event.is_mandatory_letter === true;
    try {
      const diag = await diagnoseRecipient(claimId, m.recipient_type as BnRecipientType, m.channel as BnChannel);
      const recipient = diag.recipient;
      const subject = `${event.event_name}${mergeContext.ClaimNumber ? ` — ${mergeContext.ClaimNumber}` : ''}`;

      if (!diag.resolvable) {
        // If channel is digital but event mandates a letter, fall back to letter generation
        const canFallbackToLetter = event.is_mandatory_letter && m.channel !== 'LETTER';
        if (canFallbackToLetter) {
          const letterId = await createLetter({
            claimId, eventCode, templateId: m.template_id, recipientType: m.recipient_type,
            recipient: recipient || { name: m.recipient_type }, subject, mergeContext,
            isMandatoryLetter: true, userCode: ctx?.userCode,
          });
          result.letters.push(letterId);
          const id = await writeCommLog({
            claimId, eventCode, channel: 'LETTER', recipientType: m.recipient_type,
            recipientAddress: recipient?.name, templateId: m.template_id, subject,
            status: 'GENERATED', letterId, userCode: ctx?.userCode,
            workflowStepId: ctx?.workflowStepId,
            context: { fallbackFrom: m.channel, missing: diag.missing, reason: diag.reason },
          });
          if (id) result.logIds.push(id);
          result.dispatched += 1;
          continue;
        }

        const status: 'BLOCKED' | 'SKIPPED' = isRequired ? 'BLOCKED' : 'SKIPPED';
        if (status === 'BLOCKED') result.blocked += 1; else result.skipped += 1;
        const id = await writeCommLog({
          claimId, eventCode, channel: m.channel, recipientType: m.recipient_type,
          status, error: diag.reason || 'Recipient not resolved',
          templateId: m.template_id, workflowStepId: ctx?.workflowStepId, userCode: ctx?.userCode,
          context: { missing: diag.missing, required: isRequired },
        });
        if (id) result.logIds.push(id);
        continue;
      }

      // Channel-specific dispatch
      if (m.channel === 'EMAIL' || m.channel === 'INTERNAL_EMAIL') {
        const providerId = await queueNotificationQueue('EMAIL', recipient, m.template_id, subject, mergeContext, claimId, eventCode);
        const id = await writeCommLog({
          claimId, eventCode, channel: m.channel, recipientType: m.recipient_type, recipientAddress: recipient!.email,
          templateId: m.template_id, subject, status: 'QUEUED', providerId, userCode: ctx?.userCode,
          workflowStepId: ctx?.workflowStepId,
        });
        if (id) result.logIds.push(id);
        result.dispatched += 1;
      } else if (m.channel === 'SMS') {
        const providerId = await queueNotificationQueue('SMS', recipient, m.template_id, subject, mergeContext, claimId, eventCode);
        const id = await writeCommLog({
          claimId, eventCode, channel: 'SMS', recipientType: m.recipient_type, recipientAddress: recipient!.phone,
          templateId: m.template_id, subject, status: 'QUEUED', providerId, userCode: ctx?.userCode,
          workflowStepId: ctx?.workflowStepId,
        });
        if (id) result.logIds.push(id);
        result.dispatched += 1;
      } else if (m.channel === 'IN_APP') {
        const inAppId = await createInAppNotification(recipient!.userId, subject, mergeContext.ReasonDescription || event.description || '', claimId, eventCode);
        const id = await writeCommLog({
          claimId, eventCode, channel: 'IN_APP', recipientType: m.recipient_type, recipientAddress: recipient!.userId,
          templateId: m.template_id, subject, status: inAppId ? 'SENT' : (isRequired ? 'BLOCKED' : 'SKIPPED'),
          providerId: inAppId, userCode: ctx?.userCode, workflowStepId: ctx?.workflowStepId,
          error: inAppId ? undefined : 'In-app delivery failed',
        });
        if (id) result.logIds.push(id);
        if (inAppId) result.dispatched += 1;
        else if (isRequired) result.blocked += 1;
        else result.skipped += 1;
      } else if (m.channel === 'LETTER') {
        const letterId = await createLetter({
          claimId, eventCode, templateId: m.template_id, recipientType: m.recipient_type,
          recipient: recipient!, subject, mergeContext, isMandatoryLetter: !!event.is_mandatory_letter, userCode: ctx?.userCode,
        });
        result.letters.push(letterId);
        const id = await writeCommLog({
          claimId, eventCode, channel: 'LETTER', recipientType: m.recipient_type, recipientAddress: recipient!.name,
          templateId: m.template_id, subject, status: 'GENERATED', letterId, userCode: ctx?.userCode,
          workflowStepId: ctx?.workflowStepId,
        });
        if (id) result.logIds.push(id);
        result.dispatched += 1;
      }
    } catch (err: any) {
      result.failed += 1;
      const id = await writeCommLog({
        claimId, eventCode, channel: m.channel, recipientType: m.recipient_type,
        status: 'FAILED', error: err?.message || 'Unknown error',
        templateId: m.template_id, workflowStepId: ctx?.workflowStepId, userCode: ctx?.userCode,
      });
      if (id) result.logIds.push(id);
    }
  }

  // 7. Mirror to claim timeline (non-blocking)
  try {
    await db.from('bn_claim_event').insert({
      claim_id: claimId,
      event_type: `COMM_${eventCode}`,
      notes: `Dispatched ${result.dispatched} • Skipped ${result.skipped} • Failed ${result.failed}`,
      performed_by: ctx?.userCode || 'SYSTEM',
      performed_at: new Date().toISOString(),
      metadata: { eventCode, ...result },
    });
  } catch { /* non-blocking */ }

  return result;
}

// ─── Convenience wrappers (named per spec §4) ─────────────────────
export const generateClaimLetter = (eventCode: string, claimId: string, ctx?: BnCommContext) =>
  triggerClaimCommunication(eventCode, claimId, ctx);
export const queueClaimEmail = generateClaimLetter;
export const queueClaimSms = generateClaimLetter;

// ─── History ──────────────────────────────────────────────────────
export async function getClaimCommunicationHistory(claimId: string) {
  const [{ data: logs }, { data: letters }] = await Promise.all([
    db.from('bn_communication_log').select('*').eq('claim_id', claimId).order('created_at', { ascending: false }).limit(500),
    db.from('bn_letter').select('*').eq('claim_id', claimId).order('created_at', { ascending: false }).limit(200),
  ]);
  return { logs: logs || [], letters: letters || [] };
}

// ─── Letter lifecycle actions (UI-triggered) ──────────────────────
export async function updateLetterStatus(letterId: string, newStatus: string, userCode: string, notes?: string) {
  const patch: any = { status: newStatus, notes };
  const now = new Date().toISOString();
  if (newStatus === 'APPROVED_TO_PRINT') { patch.approved_at = now; patch.approved_by = userCode; }
  if (newStatus === 'PRINTED') { patch.printed_at = now; patch.printed_by = userCode; }
  if (newStatus === 'DISPATCHED') { patch.dispatched_at = now; patch.dispatched_by = userCode; }
  if (newStatus === 'DELIVERED') { patch.delivered_at = now; }
  if (newStatus === 'RETURNED') { patch.returned_at = now; }
  if (newStatus === 'CANCELLED') { patch.cancelled_at = now; }
  const { error } = await db.from('bn_letter').update(patch).eq('id', letterId);
  if (error) throw error;
  return true;
}

export async function retryCommunication(logId: string, userCode: string) {
  const { data: log } = await db.from('bn_communication_log').select('*').eq('id', logId).maybeSingle();
  if (!log) throw new Error('Log entry not found');
  if (!['FAILED', 'SKIPPED', 'BLOCKED'].includes(log.status)) throw new Error('Only failed/skipped/blocked entries can be retried');
  await db.from('bn_communication_log').update({
    retry_count: (log.retry_count || 0) + 1,
    last_retry_at: new Date().toISOString(),
    status: 'RETRYING',
  }).eq('id', logId);
  return triggerClaimCommunication(log.event_code, log.claim_id, { userCode });
}
