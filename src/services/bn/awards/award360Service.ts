/**
 * Award 360 Service — read-only canonical loaders for the /bn/awards/:id
 * workspace. No writes here. No select('*'). Explicit column lists.
 *
 * BN-AWARD360-V2.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  Award360Header,
  AwardPensionerProfile,
  AwardClaimSummary,
  AwardProductSummary,
  AwardBeneficiaryItem,
  AwardScheduleItem,
  AwardPaymentItem,
  AwardLifeCertificateItem,
  AwardMedicalReviewItem,
  AwardSuspensionItem,
  AwardOverpaymentItem,
  AwardCommunicationItem,
  AwardAuditItem,
} from '@/pages/bn/awards/award-360/viewModels';

const db = supabase as any;

const maskSsn = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const v = String(s).trim();
  if (v.length <= 3) return v;
  return `***-**-${v.slice(-3)}`;
};

const maskAccount = (a: string | null | undefined): string | null => {
  if (!a) return null;
  const v = String(a);
  if (v.length <= 4) return `••••${v}`;
  return `••••${v.slice(-4)}`;
};

const num = (v: any): number | null => (v == null ? null : Number(v));

// ─── Header ──────────────────────────────────────────────────────────────
export async function getAward360Header(awardId: string): Promise<Award360Header> {
  const { data: a, error } = await db
    .from('bn_award')
    .select(
      'id, award_number, ssn, benefit_code, award_type, status, base_amount, currency, frequency, start_date, end_date, bn_claim_id, bn_product_id',
    )
    .eq('id', awardId)
    .maybeSingle();
  if (error) throw error;
  if (!a) throw new Error('Award not found');

  let payeeName: string | null = null;
  if (a.ssn) {
    const { data: p } = await db
      .from('ip_master')
      .select('firstname, middle_name, surname')
      .eq('ssn', a.ssn)
      .maybeSingle();
    if (p) payeeName = [p.firstname, p.middle_name, p.surname].filter(Boolean).join(' ') || null;
  }

  let benefitName: string | null = null;
  let productVersion: string | null = null;
  if (a.bn_product_id) {
    const { data: prod } = await db
      .from('bn_product')
      .select('product_name, benefit_code')
      .eq('id', a.bn_product_id)
      .maybeSingle();
    benefitName = prod?.product_name ?? prod?.benefit_code ?? null;
  }
  if (a.bn_claim_id) {
    const { data: claim } = await db
      .from('bn_claim')
      .select('product_version_id')
      .eq('id', a.bn_claim_id)
      .maybeSingle();
    if (claim?.product_version_id) {
      const { data: pv } = await db
        .from('bn_product_version')
        .select('version_number')
        .eq('id', claim.product_version_id)
        .maybeSingle();
      productVersion = pv?.version_number != null ? String(pv.version_number) : null;
    }
  }

  return {
    awardId: a.id,
    awardNumber: a.award_number,
    payeeName,
    ssnMasked: maskSsn(a.ssn),
    benefitName,
    benefitCode: a.benefit_code,
    awardType: a.award_type,
    status: a.status,
    baseAmount: num(a.base_amount),
    currentRate: num(a.base_amount),
    currency: a.currency,
    frequency: a.frequency,
    startDate: a.start_date,
    endDate: a.end_date,
    productVersion,
    lastRefreshedAt: new Date().toISOString(),
  };
}

// ─── Pensioner ───────────────────────────────────────────────────────────
export async function getAwardPensioner(awardId: string): Promise<AwardPensionerProfile | null> {
  const { data: a } = await db.from('bn_award').select('ssn').eq('id', awardId).maybeSingle();
  if (!a?.ssn) return null;

  const { data: p } = await db
    .from('ip_master')
    .select(
      'ssn, firstname, middle_name, surname, dob, sex, nationality, mobile, phone, email_addr, contact_email, resident_addr1, resident_addr2, mailing_addr1, mailing_addr2, is_deceased, dod',
    )
    .eq('ssn', a.ssn)
    .maybeSingle();
  if (!p) return null;

  const dob = p.dob ? new Date(p.dob) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  return {
    fullName: [p.firstname, p.middle_name, p.surname].filter(Boolean).join(' ') || null,
    ssnMasked: maskSsn(p.ssn),
    dob: p.dob,
    age,
    sex: p.sex,
    nationality: p.nationality ?? null,
    isDeceased: Boolean(p.is_deceased),
    dateOfDeath: p.dod ?? null,
    mobile: p.mobile ?? null,
    phone: p.phone ?? null,
    email: p.email_addr ?? p.contact_email ?? null,
    residentialAddress: [p.resident_addr1, p.resident_addr2].filter(Boolean).join(', ') || null,
    mailingAddress: [p.mailing_addr1, p.mailing_addr2].filter(Boolean).join(', ') || null,
    preferredChannel: null,
    payeeDiffersFromPensioner: false,
    payeeName: null,
    verifiedPaymentProfile: null,
  };
}

// ─── Claim ───────────────────────────────────────────────────────────────
export async function getAwardClaim(awardId: string): Promise<AwardClaimSummary | null> {
  const { data: a } = await db.from('bn_award').select('bn_claim_id').eq('id', awardId).maybeSingle();
  if (!a?.bn_claim_id) return null;
  const { data: c } = await db
    .from('bn_claim')
    .select(
      'id, claim_number, status, product_version_id, submission_date, claim_date, application_channel, priority, assigned_officer, eligibility_result, calculation_result, decision_status, approval_status, award_creation_date',
    )
    .eq('id', a.bn_claim_id)
    .maybeSingle();
  if (!c) return null;
  return {
    claimId: c.id,
    claimNumber: c.claim_number ?? null,
    status: c.status ?? null,
    productVersionId: c.product_version_id ?? null,
    submissionDate: c.submission_date ?? null,
    claimDate: c.claim_date ?? null,
    applicationChannel: c.application_channel ?? null,
    priority: c.priority ?? null,
    assignedOfficer: c.assigned_officer ?? null,
    eligibilityResult: c.eligibility_result ?? null,
    calculationResult: c.calculation_result ?? null,
    decisionStatus: c.decision_status ?? null,
    approvalStatus: c.approval_status ?? null,
    awardCreationDate: c.award_creation_date ?? null,
    workbenchRoute: `/bn/claims/${c.id}`,
  };
}

// ─── Product ─────────────────────────────────────────────────────────────
export async function getAwardProduct(awardId: string): Promise<AwardProductSummary | null> {
  const { data: a } = await db
    .from('bn_award')
    .select('bn_product_id, bn_claim_id')
    .eq('id', awardId)
    .maybeSingle();
  if (!a?.bn_product_id) return null;

  const { data: prod } = await db
    .from('bn_product')
    .select(
      'id, product_code, product_name, scheme_id, branch_id, category, payment_type, status, country_code, benefit_duration_type',
    )
    .eq('id', a.bn_product_id)
    .maybeSingle();
  if (!prod) return null;

  let versionRow: any = null;
  if (a.bn_claim_id) {
    const { data: c } = await db
      .from('bn_claim')
      .select('product_version_id')
      .eq('id', a.bn_claim_id)
      .maybeSingle();
    if (c?.product_version_id) {
      const { data: pv } = await db
        .from('bn_product_version')
        .select('id, version_number, status, effective_from, effective_to')
        .eq('id', c.product_version_id)
        .maybeSingle();
      versionRow = pv;
    }
  }

  return {
    productId: prod.id,
    productCode: prod.product_code ?? null,
    productName: prod.product_name ?? null,
    scheme: prod.scheme_id ?? null,
    branch: prod.branch_id ?? null,
    category: prod.category ?? null,
    paymentType: prod.payment_type ?? null,
    status: prod.status ?? null,
    versionId: versionRow?.id ?? null,
    versionNumber: versionRow?.version_number != null ? String(versionRow.version_number) : null,
    versionStatus: versionRow?.status ?? null,
    effectiveFrom: versionRow?.effective_from ?? null,
    effectiveTo: versionRow?.effective_to ?? null,
    country: prod.country_code ?? null,
    benefitDurationType: prod.benefit_duration_type ?? null,
  };
}

// ─── Beneficiaries ───────────────────────────────────────────────────────
export async function listAwardBeneficiaries(awardId: string): Promise<AwardBeneficiaryItem[]> {
  const { data } = await db
    .from('bn_award_beneficiary')
    .select(
      'id, full_name, beneficiary_ssn, relationship, share_percent, share_amount, start_date, end_date, status, bank_acct, bank_code, notes, entered_by, entered_at, modified_by, modified_at',
    )
    .eq('bn_award_id', awardId)
    .order('start_date', { ascending: false });
  const today = new Date().toISOString().slice(0, 10);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    fullName: r.full_name ?? null,
    ssnMasked: maskSsn(r.beneficiary_ssn),
    relationship: r.relationship ?? null,
    sharePercent: num(r.share_percent),
    shareAmount: num(r.share_amount),
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
    status: r.status ?? null,
    bankAccountMasked: maskAccount(r.bank_acct),
    bankCode: r.bank_code ?? null,
    notes: r.notes ?? null,
    enteredBy: r.entered_by ?? null,
    enteredAt: r.entered_at ?? null,
    modifiedBy: r.modified_by ?? null,
    modifiedAt: r.modified_at ?? null,
    hasPaymentDetails: !!(r.bank_acct || r.bank_code),
    isExpired: !!(r.end_date && r.end_date < today),
    validationKeys: [],
  }));
}

// ─── Schedule (canonical fields) ─────────────────────────────────────────
export async function listAwardSchedules(awardId: string): Promise<AwardScheduleItem[]> {
  const { data } = await db
    .from('bn_payment_schedule')
    .select(
      'id, schedule_period, due_date, gross_amount, deductions, net_amount, status, payment_method, payment_ref, paid_at, bn_payment_instruction_id, notes',
    )
    .eq('bn_award_id', awardId)
    .order('due_date', { ascending: false });
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    schedulePeriod: r.schedule_period ?? null,
    dueDate: r.due_date ?? null,
    grossAmount: num(r.gross_amount),
    deductions: num(r.deductions),
    netAmount: num(r.net_amount),
    status: r.status ?? null,
    paymentMethod: r.payment_method ?? null,
    paymentRef: r.payment_ref ?? null,
    paidAt: r.paid_at ?? null,
    paymentInstructionId: r.bn_payment_instruction_id ?? null,
    notes: r.notes ?? null,
  }));
}

// ─── Payments (canonical fields) ─────────────────────────────────────────
export async function listAwardPayments(awardId: string, limit = 100): Promise<AwardPaymentItem[]> {
  const { data } = await db
    .from('bn_payment_instruction')
    .select(
      'id, amount, currency, payment_method, bank_code, account_number, due_date, status, paid_date, payment_reference, cancel_reason',
    )
    .eq('award_id', awardId)
    .order('due_date', { ascending: false })
    .range(0, limit - 1);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: r.payment_reference ?? r.id?.slice?.(0, 8) ?? '—',
    dueDate: r.due_date ?? null,
    amount: num(r.amount),
    currency: r.currency ?? null,
    paymentMethod: r.payment_method ?? null,
    accountMasked: maskAccount(r.account_number),
    status: r.status ?? null,
    paidDate: r.paid_date ?? null,
    cancelReason: r.cancel_reason ?? null,
  }));
}

// ─── Life Certificates ───────────────────────────────────────────────────
export async function listAwardLifeCertificates(
  awardId: string,
): Promise<AwardLifeCertificateItem[]> {
  const { data } = await db
    .from('bn_life_certificate')
    .select(
      'id, required_for_period, due_date, submitted_date, verified_date, verification_method, status, remarks',
    )
    .eq('bn_award_id', awardId)
    .order('due_date', { ascending: false });
  const today = new Date();
  return ((data ?? []) as any[]).map((r) => {
    const overdue =
      r.due_date && r.status !== 'VERIFIED'
        ? Math.max(0, Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000))
        : 0;
    return {
      id: r.id,
      requiredPeriod: r.required_for_period ?? null,
      dueDate: r.due_date ?? null,
      submittedDate: r.submitted_date ?? null,
      verifiedDate: r.verified_date ?? null,
      verificationMethod: r.verification_method ?? null,
      status: r.status ?? null,
      daysOverdue: overdue,
      remarks: r.remarks ?? null,
    };
  });
}

// ─── Medical Reviews ─────────────────────────────────────────────────────
export async function listAwardMedicalReviews(
  awardId: string,
): Promise<AwardMedicalReviewItem[]> {
  const { data } = await db
    .from('bn_medical_review_schedule')
    .select(
      'id, review_type, scheduled_date, examining_provider, status, completed_date, outcome, next_review_date',
    )
    .eq('bn_award_id', awardId)
    .order('scheduled_date', { ascending: false });
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reviewType: r.review_type ?? null,
    scheduledDate: r.scheduled_date ?? null,
    provider: r.examining_provider ?? null,
    status: r.status ?? null,
    completedDate: r.completed_date ?? null,
    outcome: r.outcome ?? null,
    nextReviewDate: r.next_review_date ?? null,
  }));
}

// ─── Suspensions (delegates to canonical awardSuspensionViewService) ─────
// Canonical columns only (see bn_award_suspension_event + core_workflow_task).
// Display status is derived by the accepted resolveDisplayStatus() helper so
// Awards tab and Suspension Requests tab always agree.
import {
  resolveDisplayStatus,
  normaliseEventStatus,
} from '@/services/bn/awardSuspensionViewService';

export async function listAwardSuspensions(awardId: string): Promise<AwardSuspensionItem[]> {
  const { data: evts, error } = await db
    .from('bn_award_suspension_event')
    .select(
      'id, status, suspension_type, suspended_from, suspended_to, resumed_at, reason_code, reason_text, proposed_by_user_id, entered_by, entered_at, workflow_instance_id',
    )
    .eq('bn_award_id', awardId)
    .order('entered_at', { ascending: false });
  if (error) throw error;

  const rows = (evts ?? []) as any[];
  const instanceIds = rows.map((r) => r.workflow_instance_id).filter(Boolean);
  const tasksByInstance = new Map<string, any>();
  if (instanceIds.length) {
    const { data: tasks, error: tErr } = await db
      .from('core_workflow_task')
      .select('workflow_instance_id, task_status, metadata')
      .in('workflow_instance_id', instanceIds);
    if (tErr) throw tErr;
    for (const t of (tasks ?? []) as any[]) {
      const s = String(t.task_status ?? '').toUpperCase();
      if (!['COMPLETED', 'CANCELLED', 'SKIPPED', 'REJECTED', 'APPROVED'].includes(s)) {
        if (!tasksByInstance.has(t.workflow_instance_id)) {
          tasksByInstance.set(t.workflow_instance_id, t);
        }
      }
    }
  }

  const metaNum = (meta: unknown, key: string): number | null => {
    if (!meta || typeof meta !== 'object') return null;
    const v = (meta as Record<string, unknown>)[key];
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const metaStr = (meta: unknown, key: string): string | null => {
    if (!meta || typeof meta !== 'object') return null;
    const v = (meta as Record<string, unknown>)[key];
    return v == null ? null : String(v);
  };

  return rows.map((r): AwardSuspensionItem => {
    const task = r.workflow_instance_id ? tasksByInstance.get(r.workflow_instance_id) ?? null : null;
    const displayStatus = resolveDisplayStatus(normaliseEventStatus(r.status), task);
    return {
      id: r.id,
      eventStatus: r.status ?? null,
      displayStatus,
      suspensionType: r.suspension_type ?? null,
      suspendedFrom: r.suspended_from ?? null,
      suspendedTo: r.suspended_to ?? null,
      resumedAt: r.resumed_at ?? null,
      reasonCode: r.reason_code ?? null,
      reasonText: r.reason_text ?? null,
      proposedBy: r.proposed_by_user_id ?? r.entered_by ?? null,
      currentApprovalLevel: task ? metaNum(task.metadata, 'approval_level') : null,
      workbasketId: task ? metaStr(task.metadata, 'workbasket_id') : null,
      workflowInstanceId: r.workflow_instance_id ?? null,
      enteredAt: r.entered_at ?? null,
    };
  });
}

// ─── Overpayments (canonical fields) ─────────────────────────────────────
export async function listAwardOverpayments(awardId: string): Promise<AwardOverpaymentItem[]> {
  const { data } = await db
    .from('bn_overpayment')
    .select(
      'id, detected_date, period_from, period_to, original_amount, recovered_amount, outstanding_amount, recovery_method, recovery_status, reason_code, remarks',
    )
    .eq('bn_award_id', awardId)
    .order('detected_date', { ascending: false });
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: `OP-${String(r.id).slice(0, 8).toUpperCase()}`,
    detectedDate: r.detected_date ?? null,
    periodFrom: r.period_from ?? null,
    periodTo: r.period_to ?? null,
    originalAmount: num(r.original_amount),
    recoveredAmount: num(r.recovered_amount),
    outstandingAmount: num(r.outstanding_amount),
    recoveryMethod: r.recovery_method ?? null,
    recoveryStatus: r.recovery_status ?? null,
    reasonCode: r.reason_code ?? null,
    remarks: r.remarks ?? null,
  }));
}

// ─── Communications (canonical fields, scoped by claim + award context) ──
const maskAddr = (v: string | null): string | null => {
  if (!v) return null;
  if (v.includes('@')) {
    const [u, d] = v.split('@');
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (v.length > 4) return `••••${v.slice(-4)}`;
  return v;
};

export async function listAwardCommunications(
  awardId: string,
  limit = 100,
): Promise<AwardCommunicationItem[]> {
  const { data: a } = await db
    .from('bn_award')
    .select('bn_claim_id')
    .eq('id', awardId)
    .maybeSingle();
  const claimId = a?.bn_claim_id ?? null;

  const cols =
    'id, event_code, channel, recipient_type, recipient_address, template_id, subject, status, provider_message_id, letter_id, error_message, retry_count, last_retry_at, context, created_at';

  const queries: Promise<any>[] = [];
  if (claimId) {
    queries.push(
      db
        .from('bn_communication_log')
        .select(cols)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .range(0, limit - 1),
    );
  }
  queries.push(
    db
      .from('bn_communication_log')
      .select(cols)
      .contains('context', { award_id: awardId })
      .order('created_at', { ascending: false })
      .range(0, limit - 1),
  );

  const results = await Promise.allSettled(queries);
  const merged = new Map<string, any>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const row of ((r.value as any)?.data ?? []) as any[]) merged.set(row.id, row);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      createdAt: r.created_at ?? null,
      eventCode: r.event_code ?? null,
      channel: r.channel ?? null,
      recipientType: r.recipient_type ?? null,
      recipientAddressMasked: maskAddr(r.recipient_address ?? null),
      templateId: r.template_id ?? null,
      subject: r.subject ?? null,
      status: r.status ?? null,
      providerMessageId: r.provider_message_id ?? null,
      letterId: r.letter_id ?? null,
      errorMessage: r.error_message ?? null,
      retryCount: r.retry_count ?? null,
      lastRetryAt: r.last_retry_at ?? null,
      correlationId: r.context?.correlation_id ?? null,
    }));
}

// ─── Audit (merged timeline; central audit gated by caller) ──────────────
export interface ListAwardAuditOptions {
  includeCentralAudit?: boolean;
}

export async function listAwardAudit(
  awardId: string,
  options: ListAwardAuditOptions = {},
): Promise<AwardAuditItem[]> {
  const items: AwardAuditItem[] = [];

  const [statusRes, rateRes, suspRes] = await Promise.allSettled([
    db
      .from('bn_award_status_event')
      .select('id, event_date, from_status, to_status, reason_code, remarks, entered_by')
      .eq('bn_award_id', awardId)
      .order('event_date', { ascending: false }),
    db
      .from('bn_award_rate_history')
      .select('id, effective_from, rate_amount, reason_code, remarks, entered_by')
      .eq('bn_award_id', awardId)
      .order('effective_from', { ascending: false }),
    db
      .from('bn_award_suspension_event')
      .select('id, entered_at, status, reason_code, proposed_by')
      .eq('bn_award_id', awardId)
      .order('entered_at', { ascending: false }),
  ]);

  if (statusRes.status === 'fulfilled') {
    for (const r of (statusRes.value.data ?? []) as any[]) {
      items.push({
        id: `status:${r.id}`,
        timestamp: r.event_date ?? '',
        domain: 'STATUS',
        action: 'STATUS_CHANGED',
        actor: r.entered_by ?? null,
        fromValue: r.from_status ?? null,
        toValue: r.to_status ?? null,
        reason: r.reason_code ?? r.remarks ?? null,
        correlationId: null,
        severity: 'info',
      });
    }
  }
  if (rateRes.status === 'fulfilled') {
    for (const r of (rateRes.value.data ?? []) as any[]) {
      items.push({
        id: `rate:${r.id}`,
        timestamp: r.effective_from ?? '',
        domain: 'RATE',
        action: 'RATE_CHANGED',
        actor: r.entered_by ?? null,
        fromValue: null,
        toValue: r.rate_amount != null ? String(r.rate_amount) : null,
        reason: r.reason_code ?? r.remarks ?? null,
        correlationId: null,
        severity: 'info',
      });
    }
  }
  if (suspRes.status === 'fulfilled') {
    for (const r of (suspRes.value.data ?? []) as any[]) {
      items.push({
        id: `susp:${r.id}`,
        timestamp: r.entered_at ?? '',
        domain: 'SUSPENSION',
        action: r.status ?? 'SUSPENSION_EVENT',
        actor: r.proposed_by ?? null,
        fromValue: null,
        toValue: r.status ?? null,
        reason: r.reason_code ?? null,
        correlationId: null,
        severity: 'warn',
      });
    }
  }

  if (options.includeCentralAudit) {
    const { data } = await db
      .from('core_audit_log')
      .select(
        'id, occurred_at, action, actor_user_code, before_value, after_value, reason, correlation_id, severity',
      )
      .or(`entity_id.eq.${awardId}`)
      .order('occurred_at', { ascending: false })
      .range(0, 199);
    for (const r of (data ?? []) as any[]) {
      items.push({
        id: `audit:${r.id}`,
        timestamp: r.occurred_at ?? '',
        domain: 'AUDIT',
        action: r.action ?? 'AUDIT',
        actor: r.actor_user_code ?? null,
        fromValue: r.before_value ? JSON.stringify(r.before_value).slice(0, 80) : null,
        toValue: r.after_value ? JSON.stringify(r.after_value).slice(0, 80) : null,
        reason: r.reason ?? null,
        correlationId: r.correlation_id ?? null,
        severity: r.severity ?? 'info',
      });
    }
  }

  return items.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

// ─── Overview aggregator ─────────────────────────────────────────────────
export async function getAward360OverviewCounts(awardId: string) {
  const results = await Promise.allSettled([
    listAwardBeneficiaries(awardId),
    listAwardSchedules(awardId),
    listAwardPayments(awardId, 20),
    listAwardLifeCertificates(awardId),
    listAwardMedicalReviews(awardId),
    listAwardSuspensions(awardId),
    listAwardOverpayments(awardId),
    listAwardCommunications(awardId, 20),
  ]);
  const val = <T>(i: number, fallback: T): T =>
    results[i].status === 'fulfilled' ? ((results[i] as any).value as T) : fallback;
  return {
    beneficiaries: val<AwardBeneficiaryItem[]>(0, []),
    schedules: val<AwardScheduleItem[]>(1, []),
    payments: val<AwardPaymentItem[]>(2, []),
    lifeCertificates: val<AwardLifeCertificateItem[]>(3, []),
    medicalReviews: val<AwardMedicalReviewItem[]>(4, []),
    suspensions: val<AwardSuspensionItem[]>(5, []),
    overpayments: val<AwardOverpaymentItem[]>(6, []),
    communications: val<AwardCommunicationItem[]>(7, []),
    warnings: results
      .map((r, i) => (r.status === 'rejected' ? `Section ${i} failed to load` : null))
      .filter(Boolean) as string[],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BN-AWARD360-B1 — Paged/filtered queries for Schedule, Payments, Life Cert.
// ═══════════════════════════════════════════════════════════════════════════

export interface AwardPagedResult<T, S> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  summary: S;
  warnings: string[];
}

const cmp = (a: any, b: any): number => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

function applySort<T>(rows: T[], sortBy: string | undefined, dir: 'asc' | 'desc' | undefined, accessors: Record<string, (r: T) => any>): T[] {
  if (!sortBy || !accessors[sortBy]) return rows;
  const a = accessors[sortBy];
  const mult = dir === 'desc' ? -1 : 1;
  return [...rows].sort((x, y) => cmp(a(x), a(y)) * mult);
}

function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

const inDateRange = (v: string | null, from?: string, to?: string): boolean => {
  if (!from && !to) return true;
  if (!v) return false;
  const d = v.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

// ─── Schedule (paged) ──────────────────────────────────────────────────────
export interface AwardScheduleQuery {
  awardId: string;
  search?: string;
  statuses?: string[];
  dueFrom?: string;
  dueTo?: string;
  paymentMethod?: string;
  paidState?: 'ALL' | 'PAID' | 'UNPAID';
  hasInstruction?: boolean;
  overdueOnly?: boolean;
  schedulePeriod?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AwardScheduleSummary {
  totalRows: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  paidAmount: number;
  pendingAmount: number;
  heldAmount: number;
  cancelledAmount: number;
  overdueUnpaidAmount: number;
  futureLiability: number;
  nextDueDate: string | null;
  lastPaidDate: string | null;
}

const scheduleSortAccessors: Record<string, (r: AwardScheduleItem) => any> = {
  dueDate: (r) => r.dueDate,
  schedulePeriod: (r) => r.schedulePeriod,
  status: (r) => r.status,
  grossAmount: (r) => r.grossAmount,
  netAmount: (r) => r.netAmount,
  paidAt: (r) => r.paidAt,
  paymentMethod: (r) => r.paymentMethod,
};

export async function listAwardSchedulesPaged(
  q: AwardScheduleQuery,
): Promise<AwardPagedResult<AwardScheduleItem, AwardScheduleSummary>> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_payment_schedule')
    .select(
      'id, schedule_period, due_date, gross_amount, deductions, net_amount, status, payment_method, payment_ref, paid_at, bn_payment_instruction_id, notes',
    )
    .eq('bn_award_id', q.awardId)
    .order('due_date', { ascending: false });
  if (error) throw error;

  const all: AwardScheduleItem[] = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    schedulePeriod: r.schedule_period ?? null,
    dueDate: r.due_date ?? null,
    grossAmount: num(r.gross_amount),
    deductions: num(r.deductions),
    netAmount: num(r.net_amount),
    status: r.status ?? null,
    paymentMethod: r.payment_method ?? null,
    paymentRef: r.payment_ref ?? null,
    paidAt: r.paid_at ?? null,
    paymentInstructionId: r.bn_payment_instruction_id ?? null,
    notes: r.notes ?? null,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const summary: AwardScheduleSummary = {
    totalRows: all.length,
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    paidAmount: 0,
    pendingAmount: 0,
    heldAmount: 0,
    cancelledAmount: 0,
    overdueUnpaidAmount: 0,
    futureLiability: 0,
    nextDueDate: null,
    lastPaidDate: null,
  };
  for (const r of all) {
    summary.totalGross += r.grossAmount ?? 0;
    summary.totalDeductions += r.deductions ?? 0;
    summary.totalNet += r.netAmount ?? 0;
    const s = (r.status ?? '').toUpperCase();
    if (s === 'PAID') summary.paidAmount += r.netAmount ?? 0;
    else if (s === 'HOLD' || s === 'ON_HOLD') summary.heldAmount += r.netAmount ?? 0;
    else if (s === 'CANCELLED') summary.cancelledAmount += r.netAmount ?? 0;
    else summary.pendingAmount += r.netAmount ?? 0;
    if (r.dueDate && r.dueDate < today && s !== 'PAID' && s !== 'CANCELLED') {
      summary.overdueUnpaidAmount += r.netAmount ?? 0;
    }
    if (r.dueDate && r.dueDate >= today && s !== 'PAID' && s !== 'CANCELLED') {
      summary.futureLiability += r.netAmount ?? 0;
      if (!summary.nextDueDate || r.dueDate < summary.nextDueDate) summary.nextDueDate = r.dueDate;
    }
    if (r.paidAt) {
      if (!summary.lastPaidDate || r.paidAt > summary.lastPaidDate) summary.lastPaidDate = r.paidAt;
    }
  }

  // Filters
  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.paymentRef && r.paymentRef.toLowerCase().includes(s)) ||
        (r.notes && r.notes.toLowerCase().includes(s)) ||
        (r.schedulePeriod && r.schedulePeriod.toLowerCase().includes(s)),
    );
  }
  if (q.statuses?.length) {
    const set = new Set(q.statuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.status ?? '').toUpperCase()));
  }
  if (q.paymentMethod && q.paymentMethod !== 'ALL') {
    filtered = filtered.filter((r) => r.paymentMethod === q.paymentMethod);
  }
  if (q.schedulePeriod) {
    filtered = filtered.filter((r) => r.schedulePeriod === q.schedulePeriod);
  }
  if (q.paidState === 'PAID') filtered = filtered.filter((r) => (r.status ?? '').toUpperCase() === 'PAID');
  if (q.paidState === 'UNPAID')
    filtered = filtered.filter((r) => (r.status ?? '').toUpperCase() !== 'PAID');
  if (q.hasInstruction === true) filtered = filtered.filter((r) => !!r.paymentInstructionId);
  if (q.hasInstruction === false) filtered = filtered.filter((r) => !r.paymentInstructionId);
  filtered = filtered.filter((r) => inDateRange(r.dueDate, q.dueFrom, q.dueTo));
  if (q.overdueOnly) {
    filtered = filtered.filter(
      (r) => r.dueDate && r.dueDate < today && (r.status ?? '').toUpperCase() !== 'PAID',
    );
  }

  filtered = applySort(filtered, q.sortBy, q.sortDirection, scheduleSortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);

  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

export async function getAwardScheduleDetail(rowId: string): Promise<{
  row: AwardScheduleItem | null;
  instruction: AwardPaymentItem | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const { data: r, error } = await db
    .from('bn_payment_schedule')
    .select(
      'id, schedule_period, due_date, gross_amount, deductions, net_amount, status, payment_method, payment_ref, paid_at, bn_payment_instruction_id, notes',
    )
    .eq('id', rowId)
    .maybeSingle();
  if (error) throw error;
  if (!r) return { row: null, instruction: null, warnings };
  const row: AwardScheduleItem = {
    id: r.id,
    schedulePeriod: r.schedule_period ?? null,
    dueDate: r.due_date ?? null,
    grossAmount: num(r.gross_amount),
    deductions: num(r.deductions),
    netAmount: num(r.net_amount),
    status: r.status ?? null,
    paymentMethod: r.payment_method ?? null,
    paymentRef: r.payment_ref ?? null,
    paidAt: r.paid_at ?? null,
    paymentInstructionId: r.bn_payment_instruction_id ?? null,
    notes: r.notes ?? null,
  };
  let instruction: AwardPaymentItem | null = null;
  if (r.bn_payment_instruction_id) {
    try {
      const { data: pi, error: piErr } = await db
        .from('bn_payment_instruction')
        .select(
          'id, amount, currency, payment_method, bank_code, account_number, due_date, status, paid_date, payment_reference, cancel_reason',
        )
        .eq('id', r.bn_payment_instruction_id)
        .maybeSingle();
      if (piErr) throw piErr;
      if (pi) {
        instruction = {
          id: pi.id,
          reference: pi.payment_reference ?? String(pi.id).slice(0, 8),
          dueDate: pi.due_date ?? null,
          amount: num(pi.amount),
          currency: pi.currency ?? null,
          paymentMethod: pi.payment_method ?? null,
          accountMasked: maskAccount(pi.account_number),
          status: pi.status ?? null,
          paidDate: pi.paid_date ?? null,
          cancelReason: pi.cancel_reason ?? null,
        };
      }
    } catch (e: any) {
      warnings.push(`Linked payment instruction could not be loaded: ${e?.message ?? e}`);
    }
  }
  return { row, instruction, warnings };
}

// ─── Payments (paged) ──────────────────────────────────────────────────────
export interface AwardPaymentQuery {
  awardId: string;
  search?: string;
  statuses?: string[];
  paymentMethods?: string[];
  dueFrom?: string;
  dueTo?: string;
  paidFrom?: string;
  paidTo?: string;
  failedOnly?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AwardPaymentSummary {
  totalRows: number;
  totalAmount: number;
  paidCount: number;
  failedCount: number;
  cancelledCount: number;
  heldCount: number;
  queuedCount: number;
  otherCount: number;
}

const paymentSortAccessors: Record<string, (r: AwardPaymentItem) => any> = {
  dueDate: (r) => r.dueDate,
  paidDate: (r) => r.paidDate,
  amount: (r) => r.amount,
  status: (r) => r.status,
  reference: (r) => r.reference,
};

const KNOWN_PAID = new Set(['PAID', 'ISSUED']);
const KNOWN_FAIL = new Set(['FAILED', 'REJECTED', 'RETURNED']);
const KNOWN_HELD = new Set(['HOLD', 'ON_HOLD']);
const KNOWN_QUEUED = new Set(['QUEUED', 'PENDING', 'BATCHED', 'READY']);

export async function listAwardPaymentsPaged(
  q: AwardPaymentQuery,
): Promise<AwardPagedResult<AwardPaymentItem, AwardPaymentSummary>> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_payment_instruction')
    .select(
      'id, amount, currency, payment_method, bank_code, account_number, due_date, status, paid_date, payment_reference, cancel_reason',
    )
    .eq('award_id', q.awardId)
    .order('due_date', { ascending: false });
  if (error) throw error;

  const all: AwardPaymentItem[] = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: r.payment_reference ?? String(r.id).slice(0, 8),
    dueDate: r.due_date ?? null,
    amount: num(r.amount),
    currency: r.currency ?? null,
    paymentMethod: r.payment_method ?? null,
    accountMasked: maskAccount(r.account_number),
    status: r.status ?? null,
    paidDate: r.paid_date ?? null,
    cancelReason: r.cancel_reason ?? null,
  }));

  const summary: AwardPaymentSummary = {
    totalRows: all.length,
    totalAmount: 0,
    paidCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    heldCount: 0,
    queuedCount: 0,
    otherCount: 0,
  };
  for (const r of all) {
    summary.totalAmount += r.amount ?? 0;
    const s = (r.status ?? '').toUpperCase();
    if (KNOWN_PAID.has(s)) summary.paidCount++;
    else if (KNOWN_FAIL.has(s)) summary.failedCount++;
    else if (s === 'CANCELLED') summary.cancelledCount++;
    else if (KNOWN_HELD.has(s)) summary.heldCount++;
    else if (KNOWN_QUEUED.has(s)) summary.queuedCount++;
    else if (s) summary.otherCount++;
    else summary.otherCount++;
  }

  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.reference && r.reference.toLowerCase().includes(s)) ||
        (r.id && String(r.id).toLowerCase().includes(s)) ||
        (r.cancelReason && r.cancelReason.toLowerCase().includes(s)),
    );
  }
  if (q.statuses?.length) {
    const set = new Set(q.statuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.status ?? '').toUpperCase()));
  }
  if (q.paymentMethods?.length) {
    const set = new Set(q.paymentMethods);
    filtered = filtered.filter((r) => set.has(r.paymentMethod ?? ''));
  }
  filtered = filtered.filter((r) => inDateRange(r.dueDate, q.dueFrom, q.dueTo));
  filtered = filtered.filter((r) => inDateRange(r.paidDate, q.paidFrom, q.paidTo));
  if (q.failedOnly) filtered = filtered.filter((r) => KNOWN_FAIL.has((r.status ?? '').toUpperCase()));

  filtered = applySort(filtered, q.sortBy, q.sortDirection, paymentSortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);
  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

// ─── Life Certificates (paged) ─────────────────────────────────────────────
export interface AwardLifeCertificateQuery {
  awardId: string;
  search?: string;
  statuses?: string[];
  requiredPeriod?: string;
  dueFrom?: string;
  dueTo?: string;
  verificationMethod?: string;
  overdueOnly?: boolean;
  receivedUnverifiedOnly?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface LifeCertificateComplianceResult {
  state:
    | 'COMPLIANT'
    | 'DUE_SOON'
    | 'DUE'
    | 'OVERDUE'
    | 'RECEIVED_PENDING_VERIFICATION'
    | 'EXEMPT'
    | 'NOT_REQUIRED'
    | 'UNKNOWN';
  latestRecordId?: string;
  nextDueDate?: string;
  daysValue?: number;
  paymentImpact: 'NONE' | 'POTENTIAL_HOLD' | 'PAYMENT_HELD' | 'UNKNOWN';
  explanation: string;
}

export interface AwardLifeCertificateSummary {
  compliance: LifeCertificateComplianceResult;
  totalCycles: number;
  verifiedCycles: number;
  pendingCycles: number;
  receivedUnverified: number;
  overdueCycles: number;
  latestRequiredPeriod: string | null;
  latestVerifiedPeriod: string | null;
  nextDueDate: string | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  reminderCount: number | null;
}

const lcSortAccessors: Record<string, (r: AwardLifeCertificateItem) => any> = {
  dueDate: (r) => r.dueDate,
  submittedDate: (r) => r.submittedDate,
  verifiedDate: (r) => r.verifiedDate,
  status: (r) => r.status,
  requiredPeriod: (r) => r.requiredPeriod,
  daysOverdue: (r) => r.daysOverdue,
};

export function resolveLifeCertificateCompliance(
  records: AwardLifeCertificateItem[],
  award: { status?: string | null; awardType?: string | null } | null,
  _schedules: AwardScheduleItem[],
): LifeCertificateComplianceResult {
  if (!records.length) {
    return {
      state: 'NOT_REQUIRED',
      paymentImpact: 'NONE',
      explanation: 'No life certificate cycles are configured for this award.',
    };
  }
  const today = new Date();
  const sorted = [...records].sort((a, b) =>
    String(b.dueDate ?? '').localeCompare(String(a.dueDate ?? '')),
  );
  const latest = sorted[0];
  const days = latest.dueDate
    ? Math.floor((new Date(latest.dueDate).getTime() - today.getTime()) / 86400000)
    : undefined;
  const status = (latest.status ?? '').toUpperCase();

  if (status === 'EXEMPT' || status === 'WAIVED') {
    return {
      state: 'EXEMPT',
      latestRecordId: latest.id,
      paymentImpact: 'NONE',
      explanation: 'Latest cycle is exempted.',
    };
  }
  if (status === 'VERIFIED') {
    return {
      state: 'COMPLIANT',
      latestRecordId: latest.id,
      nextDueDate: latest.dueDate ?? undefined,
      paymentImpact: 'NONE',
      explanation: 'Latest cycle is verified.',
    };
  }
  if (latest.submittedDate && status !== 'VERIFIED') {
    return {
      state: 'RECEIVED_PENDING_VERIFICATION',
      latestRecordId: latest.id,
      nextDueDate: latest.dueDate ?? undefined,
      paymentImpact: 'POTENTIAL_HOLD',
      explanation:
        'Certificate received but not yet verified. Payment hold cannot be confirmed without an actual award-level hold record.',
    };
  }
  if (latest.daysOverdue > 0) {
    return {
      state: 'OVERDUE',
      latestRecordId: latest.id,
      nextDueDate: latest.dueDate ?? undefined,
      daysValue: latest.daysOverdue,
      paymentImpact: 'POTENTIAL_HOLD',
      explanation: `Cycle is ${latest.daysOverdue} day(s) overdue. Awarding a hold requires the payment/award system to record one.`,
    };
  }
  if (days != null && days <= 30) {
    return {
      state: 'DUE_SOON',
      latestRecordId: latest.id,
      nextDueDate: latest.dueDate ?? undefined,
      daysValue: days,
      paymentImpact: 'NONE',
      explanation: 'Cycle is due within 30 days.',
    };
  }
  return {
    state: 'DUE',
    latestRecordId: latest.id,
    nextDueDate: latest.dueDate ?? undefined,
    daysValue: days,
    paymentImpact: 'NONE',
    explanation: 'Cycle is scheduled.',
  };
}

export async function listAwardLifeCertificatesPaged(
  q: AwardLifeCertificateQuery,
  award: { status?: string | null; awardType?: string | null } | null = null,
): Promise<AwardPagedResult<AwardLifeCertificateItem, AwardLifeCertificateSummary>> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_life_certificate')
    .select(
      'id, required_for_period, due_date, submitted_date, verified_date, verification_method, status, remarks',
    )
    .eq('bn_award_id', q.awardId)
    .order('due_date', { ascending: false });
  if (error) throw error;

  const today = new Date();
  const all: AwardLifeCertificateItem[] = ((data ?? []) as any[]).map((r) => {
    const overdue =
      r.due_date && (r.status ?? '').toUpperCase() !== 'VERIFIED'
        ? Math.max(0, Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000))
        : 0;
    return {
      id: r.id,
      requiredPeriod: r.required_for_period ?? null,
      dueDate: r.due_date ?? null,
      submittedDate: r.submitted_date ?? null,
      verifiedDate: r.verified_date ?? null,
      verificationMethod: r.verification_method ?? null,
      status: r.status ?? null,
      daysOverdue: overdue,
      remarks: r.remarks ?? null,
    };
  });

  const compliance = resolveLifeCertificateCompliance(all, award, []);
  const verified = all.filter((r) => (r.status ?? '').toUpperCase() === 'VERIFIED');
  const receivedUnverified = all.filter(
    (r) => r.submittedDate && (r.status ?? '').toUpperCase() !== 'VERIFIED',
  ).length;
  const overdue = all.filter((r) => r.daysOverdue > 0).length;

  const sortedByDue = [...all].sort((a, b) =>
    String(b.dueDate ?? '').localeCompare(String(a.dueDate ?? '')),
  );
  const nextUnverified = sortedByDue
    .filter((r) => (r.status ?? '').toUpperCase() !== 'VERIFIED')
    .sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')))[0];

  const summary: AwardLifeCertificateSummary = {
    compliance,
    totalCycles: all.length,
    verifiedCycles: verified.length,
    pendingCycles: all.length - verified.length,
    receivedUnverified,
    overdueCycles: overdue,
    latestRequiredPeriod: sortedByDue[0]?.requiredPeriod ?? null,
    latestVerifiedPeriod:
      verified.sort((a, b) => String(b.dueDate ?? '').localeCompare(String(a.dueDate ?? '')))[0]
        ?.requiredPeriod ?? null,
    nextDueDate: nextUnverified?.dueDate ?? null,
    daysUntilDue: nextUnverified?.dueDate
      ? Math.floor(
          (new Date(nextUnverified.dueDate).getTime() - today.getTime()) / 86400000,
        )
      : null,
    daysOverdue: nextUnverified?.daysOverdue ?? null,
    reminderCount: null,
  };

  // Attempt reminder count via communication log (safe partial enrichment).
  try {
    const { data: cA } = await db.from('bn_award').select('bn_claim_id').eq('id', q.awardId).maybeSingle();
    if (cA?.bn_claim_id) {
      const { count } = await db
        .from('bn_communication_log')
        .select('id', { count: 'exact', head: true })
        .eq('claim_id', cA.bn_claim_id)
        .ilike('event_code', '%LIFE_CERT%');
      if (typeof count === 'number') summary.reminderCount = count;
    }
  } catch (e: any) {
    warnings.push(`Reminder count unavailable: ${e?.message ?? e}`);
  }

  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.requiredPeriod && r.requiredPeriod.toLowerCase().includes(s)) ||
        (r.remarks && r.remarks.toLowerCase().includes(s)),
    );
  }
  if (q.statuses?.length) {
    const set = new Set(q.statuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.status ?? '').toUpperCase()));
  }
  if (q.requiredPeriod) filtered = filtered.filter((r) => r.requiredPeriod === q.requiredPeriod);
  if (q.verificationMethod && q.verificationMethod !== 'ALL')
    filtered = filtered.filter((r) => r.verificationMethod === q.verificationMethod);
  filtered = filtered.filter((r) => inDateRange(r.dueDate, q.dueFrom, q.dueTo));
  if (q.overdueOnly) filtered = filtered.filter((r) => r.daysOverdue > 0);
  if (q.receivedUnverifiedOnly)
    filtered = filtered.filter(
      (r) => r.submittedDate && (r.status ?? '').toUpperCase() !== 'VERIFIED',
    );

  filtered = applySort(filtered, q.sortBy, q.sortDirection, lcSortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);
  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

export async function getAwardLifeCertificateReminders(
  awardId: string,
  limit = 20,
): Promise<{ items: AwardCommunicationItem[]; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const all = await listAwardCommunications(awardId, limit * 3);
    const items = all
      .filter((c) => (c.eventCode ?? '').toUpperCase().includes('LIFE_CERT'))
      .slice(0, limit);
    return { items, warnings };
  } catch (e: any) {
    warnings.push(`Reminder history unavailable: ${e?.message ?? e}`);
    return { items: [], warnings };
  }
}

// ─── BN-AWARD360-B2 ──────────────────────────────────────────────────────
// Paged beneficiaries, overpayments, communications + validators.

// Beneficiaries ------------------------------------------------------------
export interface AwardBeneficiaryQuery {
  awardId: string;
  search?: string;
  statuses?: string[];
  relationships?: string[];
  activeOn?: string;
  missingPaymentProfileOnly?: boolean;
  expiredOnly?: boolean;
  hasWarningsOnly?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface BeneficiaryValidationWarning {
  key: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  beneficiaryId?: string;
  message: string;
}

export interface BeneficiaryValidationResult {
  activeCount: number;
  totalSharePercent: number;
  totalShareAmount: number;
  unallocatedPercent: number;
  overallocatedPercent: number;
  awardAmountDifference: number | null;
  warnings: BeneficiaryValidationWarning[];
}

export interface AwardBeneficiarySummary {
  totalRows: number;
  activeCount: number;
  inactiveCount: number;
  totalSharePercent: number;
  totalShareAmount: number;
  unallocatedPercent: number;
  overallocatedPercent: number;
  expiredCount: number;
  missingPaymentDetails: number;
  withValidationWarnings: number;
  validation: BeneficiaryValidationResult;
}

const beneficiarySortAccessors: Record<string, (r: AwardBeneficiaryItem) => any> = {
  fullName: (r) => r.fullName,
  relationship: (r) => r.relationship,
  sharePercent: (r) => r.sharePercent,
  shareAmount: (r) => r.shareAmount,
  startDate: (r) => r.startDate,
  endDate: (r) => r.endDate,
  status: (r) => r.status,
  modifiedAt: (r) => r.modifiedAt,
};

export function validateAwardBeneficiaries(
  beneficiaries: AwardBeneficiaryItem[],
  award: { baseAmount?: number | null; awardType?: string | null } | null,
): BeneficiaryValidationResult {
  const warnings: BeneficiaryValidationWarning[] = [];
  const active = beneficiaries.filter((b) => (b.status ?? '').toUpperCase() === 'ACTIVE');
  const totalPct = active.reduce((s, b) => s + Number(b.sharePercent ?? 0), 0);
  const totalAmt = active.reduce((s, b) => s + Number(b.shareAmount ?? 0), 0);
  const hasPct = active.some((b) => b.sharePercent != null);
  const hasAmt = active.some((b) => b.shareAmount != null);

  for (const b of beneficiaries) {
    if (b.sharePercent != null && b.sharePercent < 0) {
      warnings.push({ key: 'negative-percent', severity: 'ERROR', beneficiaryId: b.id, message: `${b.fullName ?? 'Beneficiary'} has a negative share percentage.` });
    }
    if (b.sharePercent != null && b.sharePercent > 100) {
      warnings.push({ key: 'percent-over-100', severity: 'ERROR', beneficiaryId: b.id, message: `${b.fullName ?? 'Beneficiary'} has a share percentage over 100%.` });
    }
    if (b.shareAmount != null && b.shareAmount < 0) {
      warnings.push({ key: 'negative-amount', severity: 'ERROR', beneficiaryId: b.id, message: `${b.fullName ?? 'Beneficiary'} has a negative share amount.` });
    }
    if (b.startDate && b.endDate && b.endDate < b.startDate) {
      warnings.push({ key: 'end-before-start', severity: 'ERROR', beneficiaryId: b.id, message: `${b.fullName ?? 'Beneficiary'} has an end date earlier than the start date.` });
    }
    if ((b.status ?? '').toUpperCase() === 'ACTIVE' && !b.hasPaymentDetails) {
      warnings.push({ key: 'missing-payment', severity: 'WARNING', beneficiaryId: b.id, message: `${b.fullName ?? 'Beneficiary'} has no payment details.` });
    }
  }

  // Overlap check within same relationship (active only)
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if ((a.relationship ?? '') !== (b.relationship ?? '')) continue;
      const aStart = a.startDate ?? '0000-01-01';
      const aEnd = a.endDate ?? '9999-12-31';
      const bStart = b.startDate ?? '0000-01-01';
      const bEnd = b.endDate ?? '9999-12-31';
      if (aStart <= bEnd && bStart <= aEnd && a.fullName && b.fullName && a.fullName === b.fullName) {
        warnings.push({ key: 'overlap', severity: 'WARNING', beneficiaryId: b.id, message: `Overlapping active period detected for ${b.fullName}.` });
      }
    }
  }

  let unallocated = 0;
  let overallocated = 0;
  if (active.length && hasPct) {
    if (Math.abs(totalPct - 100) > 0.01) {
      if (totalPct < 100) {
        unallocated = 100 - totalPct;
        warnings.push({ key: 'underallocated', severity: 'WARNING', message: `Active beneficiary shares total ${totalPct.toFixed(2)}%; ${unallocated.toFixed(2)}% is unallocated.` });
      } else {
        overallocated = totalPct - 100;
        warnings.push({ key: 'overallocated', severity: 'ERROR', message: `Active beneficiary shares total ${totalPct.toFixed(2)}% — overallocated by ${overallocated.toFixed(2)}%.` });
      }
    }
  } else if (!active.length) {
    warnings.push({ key: 'no-active', severity: 'INFO', message: 'No active beneficiaries on this award.' });
  } else if (!hasPct && !hasAmt) {
    warnings.push({ key: 'no-allocation', severity: 'INFO', message: 'Beneficiary allocation is not configured on this award.' });
  }

  let awardDiff: number | null = null;
  if (hasAmt && award?.baseAmount != null && active.length) {
    awardDiff = Number((totalAmt - Number(award.baseAmount)).toFixed(2));
    if (Math.abs(awardDiff) > 0.01) {
      warnings.push({ key: 'award-amount-mismatch', severity: 'WARNING', message: `Active share amount total (${totalAmt.toFixed(2)}) differs from award base amount (${Number(award.baseAmount).toFixed(2)}) by ${awardDiff.toFixed(2)}.` });
    }
  }

  return {
    activeCount: active.length,
    totalSharePercent: Number(totalPct.toFixed(4)),
    totalShareAmount: Number(totalAmt.toFixed(2)),
    unallocatedPercent: Number(unallocated.toFixed(4)),
    overallocatedPercent: Number(overallocated.toFixed(4)),
    awardAmountDifference: awardDiff,
    warnings,
  };
}

export async function listAwardBeneficiariesPaged(
  q: AwardBeneficiaryQuery,
  award: { baseAmount?: number | null; awardType?: string | null } | null = null,
): Promise<AwardPagedResult<AwardBeneficiaryItem, AwardBeneficiarySummary>> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_award_beneficiary')
    .select(
      'id, full_name, beneficiary_ssn, relationship, share_percent, share_amount, start_date, end_date, status, bank_acct, bank_code, notes, entered_by, entered_at, modified_by, modified_at',
    )
    .eq('bn_award_id', q.awardId)
    .order('start_date', { ascending: false });
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  const all: AwardBeneficiaryItem[] = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    fullName: r.full_name ?? null,
    ssnMasked: maskSsn(r.beneficiary_ssn),
    relationship: r.relationship ?? null,
    sharePercent: num(r.share_percent),
    shareAmount: num(r.share_amount),
    startDate: r.start_date ?? null,
    endDate: r.end_date ?? null,
    status: r.status ?? null,
    bankAccountMasked: maskAccount(r.bank_acct),
    bankCode: r.bank_code ?? null,
    notes: r.notes ?? null,
    enteredBy: r.entered_by ?? null,
    enteredAt: r.entered_at ?? null,
    modifiedBy: r.modified_by ?? null,
    modifiedAt: r.modified_at ?? null,
    hasPaymentDetails: !!(r.bank_acct || r.bank_code),
    isExpired: !!(r.end_date && r.end_date < today),
    validationKeys: [],
  }));

  const validation = validateAwardBeneficiaries(all, award);
  // Annotate row-level validation keys.
  const byBenef = new Map<string, string[]>();
  for (const w of validation.warnings) {
    if (!w.beneficiaryId) continue;
    const arr = byBenef.get(w.beneficiaryId) ?? [];
    arr.push(w.key);
    byBenef.set(w.beneficiaryId, arr);
  }
  for (const r of all) r.validationKeys = byBenef.get(r.id) ?? [];

  const summary: AwardBeneficiarySummary = {
    totalRows: all.length,
    activeCount: validation.activeCount,
    inactiveCount: all.length - validation.activeCount,
    totalSharePercent: validation.totalSharePercent,
    totalShareAmount: validation.totalShareAmount,
    unallocatedPercent: validation.unallocatedPercent,
    overallocatedPercent: validation.overallocatedPercent,
    expiredCount: all.filter((r) => r.isExpired).length,
    missingPaymentDetails: all.filter((r) => (r.status ?? '').toUpperCase() === 'ACTIVE' && !r.hasPaymentDetails).length,
    withValidationWarnings: all.filter((r) => r.validationKeys.length > 0).length,
    validation,
  };

  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.fullName && r.fullName.toLowerCase().includes(s)) ||
        (r.ssnMasked && r.ssnMasked.toLowerCase().includes(s)) ||
        (r.relationship && r.relationship.toLowerCase().includes(s)),
    );
  }
  if (q.statuses?.length) {
    const set = new Set(q.statuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.status ?? '').toUpperCase()));
  }
  if (q.relationships?.length) {
    const set = new Set(q.relationships.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.relationship ?? '').toUpperCase()));
  }
  if (q.activeOn) {
    filtered = filtered.filter(
      (r) =>
        (!r.startDate || r.startDate <= q.activeOn!) &&
        (!r.endDate || r.endDate >= q.activeOn!) &&
        (r.status ?? '').toUpperCase() === 'ACTIVE',
    );
  }
  if (q.missingPaymentProfileOnly) filtered = filtered.filter((r) => !r.hasPaymentDetails);
  if (q.expiredOnly) filtered = filtered.filter((r) => r.isExpired);
  if (q.hasWarningsOnly) filtered = filtered.filter((r) => r.validationKeys.length > 0);

  filtered = applySort(filtered, q.sortBy, q.sortDirection, beneficiarySortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);
  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

export async function getAwardBeneficiaryDetail(id: string): Promise<{
  row: AwardBeneficiaryItem | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_award_beneficiary')
    .select(
      'id, full_name, beneficiary_ssn, relationship, share_percent, share_amount, start_date, end_date, status, bank_acct, bank_code, notes, entered_by, entered_at, modified_by, modified_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { row: null, warnings };
  const today = new Date().toISOString().slice(0, 10);
  const row: AwardBeneficiaryItem = {
    id: data.id,
    fullName: data.full_name ?? null,
    ssnMasked: maskSsn(data.beneficiary_ssn),
    relationship: data.relationship ?? null,
    sharePercent: num(data.share_percent),
    shareAmount: num(data.share_amount),
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    status: data.status ?? null,
    bankAccountMasked: maskAccount(data.bank_acct),
    bankCode: data.bank_code ?? null,
    notes: data.notes ?? null,
    enteredBy: data.entered_by ?? null,
    enteredAt: data.entered_at ?? null,
    modifiedBy: data.modified_by ?? null,
    modifiedAt: data.modified_at ?? null,
    hasPaymentDetails: !!(data.bank_acct || data.bank_code),
    isExpired: !!(data.end_date && data.end_date < today),
    validationKeys: [],
  };
  return { row, warnings };
}

// Overpayments -------------------------------------------------------------
export interface AwardOverpaymentQuery {
  awardId: string;
  search?: string;
  recoveryStatuses?: string[];
  recoveryMethods?: string[];
  reasonCodes?: string[];
  detectedFrom?: string;
  detectedTo?: string;
  outstandingOnly?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AwardOverpaymentSummary {
  totalRows: number;
  originalTotal: number;
  recoveredTotal: number;
  outstandingTotal: number;
  openCases: number;
  activeRecovery: number;
  fullyRecovered: number;
  suspendedRecovery: number;
  waiverCases: number;
  writeOffCases: number;
  oldestOpenDate: string | null;
  oldestOpenAgeDays: number | null;
}

const overpaymentSortAccessors: Record<string, (r: AwardOverpaymentItem) => any> = {
  detectedDate: (r) => r.detectedDate,
  periodFrom: (r) => r.periodFrom,
  originalAmount: (r) => r.originalAmount,
  recoveredAmount: (r) => r.recoveredAmount,
  outstandingAmount: (r) => r.outstandingAmount,
  recoveryStatus: (r) => r.recoveryStatus,
  recoveryMethod: (r) => r.recoveryMethod,
};

const OP_WAIVER_STATUSES = new Set(['WAIVED', 'WAIVER_REQUESTED', 'WAIVER_APPROVED']);
const OP_WRITEOFF_STATUSES = new Set(['WRITTEN_OFF', 'WRITE_OFF', 'WRITEOFF']);
const OP_ACTIVE_STATUSES = new Set(['IN_RECOVERY', 'ACTIVE', 'RECOVERING']);
const OP_SUSPENDED_STATUSES = new Set(['SUSPENDED', 'PAUSED', 'ON_HOLD']);
const OP_FULLY_RECOVERED = new Set(['RECOVERED', 'CLOSED', 'FULLY_RECOVERED']);

export async function listAwardOverpaymentsPaged(
  q: AwardOverpaymentQuery,
): Promise<AwardPagedResult<AwardOverpaymentItem, AwardOverpaymentSummary>> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_overpayment')
    .select(
      'id, detected_date, period_from, period_to, original_amount, recovered_amount, outstanding_amount, recovery_method, recovery_status, reason_code, remarks, entered_by, entered_at, modified_by, modified_at',
    )
    .eq('bn_award_id', q.awardId)
    .order('detected_date', { ascending: false });
  if (error) throw error;

  const all: AwardOverpaymentItem[] = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: `OP-${String(r.id).slice(0, 8).toUpperCase()}`,
    detectedDate: r.detected_date ?? null,
    periodFrom: r.period_from ?? null,
    periodTo: r.period_to ?? null,
    originalAmount: num(r.original_amount),
    recoveredAmount: num(r.recovered_amount),
    outstandingAmount: num(r.outstanding_amount),
    recoveryMethod: r.recovery_method ?? null,
    recoveryStatus: r.recovery_status ?? null,
    reasonCode: r.reason_code ?? null,
    remarks: r.remarks ?? null,
  }));

  const today = new Date();
  const summary: AwardOverpaymentSummary = {
    totalRows: all.length,
    originalTotal: 0,
    recoveredTotal: 0,
    outstandingTotal: 0,
    openCases: 0,
    activeRecovery: 0,
    fullyRecovered: 0,
    suspendedRecovery: 0,
    waiverCases: 0,
    writeOffCases: 0,
    oldestOpenDate: null,
    oldestOpenAgeDays: null,
  };
  for (const r of all) {
    summary.originalTotal += r.originalAmount ?? 0;
    summary.recoveredTotal += r.recoveredAmount ?? 0;
    summary.outstandingTotal += r.outstandingAmount ?? 0;
    const s = (r.recoveryStatus ?? '').toUpperCase();
    if (OP_WAIVER_STATUSES.has(s)) summary.waiverCases++;
    if (OP_WRITEOFF_STATUSES.has(s)) summary.writeOffCases++;
    if (OP_ACTIVE_STATUSES.has(s)) summary.activeRecovery++;
    if (OP_SUSPENDED_STATUSES.has(s)) summary.suspendedRecovery++;
    if (OP_FULLY_RECOVERED.has(s)) summary.fullyRecovered++;
    const isOpen = (r.outstandingAmount ?? 0) > 0 && !OP_WRITEOFF_STATUSES.has(s) && !OP_FULLY_RECOVERED.has(s);
    if (isOpen) {
      summary.openCases++;
      if (r.detectedDate) {
        if (!summary.oldestOpenDate || r.detectedDate < summary.oldestOpenDate) {
          summary.oldestOpenDate = r.detectedDate;
          summary.oldestOpenAgeDays = Math.floor((today.getTime() - new Date(r.detectedDate).getTime()) / 86400000);
        }
      }
    }
  }

  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.reference && r.reference.toLowerCase().includes(s)) ||
        (r.id && String(r.id).toLowerCase().includes(s)) ||
        (r.reasonCode && r.reasonCode.toLowerCase().includes(s)) ||
        (r.remarks && r.remarks.toLowerCase().includes(s)),
    );
  }
  if (q.recoveryStatuses?.length) {
    const set = new Set(q.recoveryStatuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.recoveryStatus ?? '').toUpperCase()));
  }
  if (q.recoveryMethods?.length) {
    const set = new Set(q.recoveryMethods.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.recoveryMethod ?? '').toUpperCase()));
  }
  if (q.reasonCodes?.length) {
    const set = new Set(q.reasonCodes);
    filtered = filtered.filter((r) => set.has(r.reasonCode ?? ''));
  }
  filtered = filtered.filter((r) => inDateRange(r.detectedDate, q.detectedFrom, q.detectedTo));
  if (q.outstandingOnly) filtered = filtered.filter((r) => (r.outstandingAmount ?? 0) > 0);

  filtered = applySort(filtered, q.sortBy, q.sortDirection, overpaymentSortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);
  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

export async function getAwardOverpaymentDetail(id: string): Promise<{
  row: AwardOverpaymentItem | null;
  scheduleDeductions: AwardScheduleItem[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_overpayment')
    .select(
      'id, bn_award_id, detected_date, period_from, period_to, original_amount, recovered_amount, outstanding_amount, recovery_method, recovery_status, reason_code, remarks, entered_by, entered_at, modified_by, modified_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { row: null, scheduleDeductions: [], warnings };
  const row: AwardOverpaymentItem = {
    id: data.id,
    reference: `OP-${String(data.id).slice(0, 8).toUpperCase()}`,
    detectedDate: data.detected_date ?? null,
    periodFrom: data.period_from ?? null,
    periodTo: data.period_to ?? null,
    originalAmount: num(data.original_amount),
    recoveredAmount: num(data.recovered_amount),
    outstandingAmount: num(data.outstanding_amount),
    recoveryMethod: data.recovery_method ?? null,
    recoveryStatus: data.recovery_status ?? null,
    reasonCode: data.reason_code ?? null,
    remarks: data.remarks ?? null,
  };
  // Optional enrichment: schedule rows on same award with deductions > 0.
  let scheduleDeductions: AwardScheduleItem[] = [];
  try {
    const { data: sched, error: sErr } = await db
      .from('bn_payment_schedule')
      .select('id, schedule_period, due_date, gross_amount, deductions, net_amount, status, payment_method, payment_ref, paid_at, bn_payment_instruction_id, notes')
      .eq('bn_award_id', data.bn_award_id)
      .gt('deductions', 0)
      .order('due_date', { ascending: false })
      .range(0, 24);
    if (sErr) throw sErr;
    scheduleDeductions = ((sched ?? []) as any[]).map((r) => ({
      id: r.id,
      schedulePeriod: r.schedule_period ?? null,
      dueDate: r.due_date ?? null,
      grossAmount: num(r.gross_amount),
      deductions: num(r.deductions),
      netAmount: num(r.net_amount),
      status: r.status ?? null,
      paymentMethod: r.payment_method ?? null,
      paymentRef: r.payment_ref ?? null,
      paidAt: r.paid_at ?? null,
      paymentInstructionId: r.bn_payment_instruction_id ?? null,
      notes: r.notes ?? null,
    }));
  } catch (e: any) {
    warnings.push(`Schedule deductions could not be loaded: ${e?.message ?? e}`);
  }
  return { row, scheduleDeductions, warnings };
}

// Communications -----------------------------------------------------------
export interface AwardCommunicationQuery {
  awardId: string;
  search?: string;
  channels?: string[];
  eventCodes?: string[];
  statuses?: string[];
  recipientTypes?: string[];
  createdFrom?: string;
  createdTo?: string;
  failedOnly?: boolean;
  hasLetter?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AwardCommunicationSummary {
  totalRows: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  retrying: number;
  skipped: number;
  lettersDraft: number;
  lettersPendingApproval: number;
  lettersDispatched: number;
  recipientBlocks: number;
  needsAttention: number;
}

const commSortAccessors: Record<string, (r: AwardCommunicationItem) => any> = {
  createdAt: (r) => r.createdAt,
  status: (r) => r.status,
  channel: (r) => r.channel,
  eventCode: (r) => r.eventCode,
  retryCount: (r) => r.retryCount,
};

const COMM_FAIL = new Set(['FAILED', 'ERROR', 'BOUNCED', 'REJECTED']);
const COMM_SENT = new Set(['SENT']);
const COMM_DELIVERED = new Set(['DELIVERED']);
const COMM_QUEUED = new Set(['QUEUED', 'PENDING', 'READY']);
const COMM_RETRYING = new Set(['RETRYING', 'RETRY']);
const COMM_SKIPPED = new Set(['SKIPPED', 'BLOCKED', 'SUPPRESSED']);

export async function listAwardCommunicationsPaged(
  q: AwardCommunicationQuery,
): Promise<AwardPagedResult<AwardCommunicationItem, AwardCommunicationSummary>> {
  const warnings: string[] = [];
  const { data: a } = await db
    .from('bn_award')
    .select('bn_claim_id')
    .eq('id', q.awardId)
    .maybeSingle();
  const claimId = a?.bn_claim_id ?? null;

  const cols =
    'id, event_code, channel, recipient_type, recipient_address, template_id, subject, status, provider_message_id, letter_id, error_message, retry_count, last_retry_at, context, created_at';

  const results: any[] = [];
  const queries: Promise<any>[] = [];
  if (claimId) {
    queries.push(
      db
        .from('bn_communication_log')
        .select(cols)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .range(0, 499),
    );
  }
  queries.push(
    db
      .from('bn_communication_log')
      .select(cols)
      .contains('context', { award_id: q.awardId })
      .order('created_at', { ascending: false })
      .range(0, 499),
  );
  const settled = await Promise.allSettled(queries);
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      if ((s.value as any)?.error) {
        warnings.push(`Communication query returned an error: ${(s.value as any).error.message ?? 'unknown'}`);
        continue;
      }
      results.push(...(((s.value as any)?.data ?? []) as any[]));
    } else {
      warnings.push(`Communication query failed: ${s.reason?.message ?? s.reason}`);
    }
  }

  const merged = new Map<string, any>();
  for (const r of results) merged.set(r.id, r);

  const all: AwardCommunicationItem[] = Array.from(merged.values())
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((r) => ({
      id: r.id,
      createdAt: r.created_at ?? null,
      eventCode: r.event_code ?? null,
      channel: r.channel ?? null,
      recipientType: r.recipient_type ?? null,
      recipientAddressMasked: maskAddr(r.recipient_address ?? null),
      templateId: r.template_id ?? null,
      subject: r.subject ?? null,
      status: r.status ?? null,
      providerMessageId: r.provider_message_id ?? null,
      letterId: r.letter_id ?? null,
      errorMessage: r.error_message ?? null,
      retryCount: r.retry_count ?? null,
      lastRetryAt: r.last_retry_at ?? null,
      correlationId: r.context?.correlation_id ?? null,
    }));

  // Letter enrichment (best-effort)
  const letterIds = all.map((c) => c.letterId).filter(Boolean) as string[];
  const lettersById = new Map<string, any>();
  if (letterIds.length) {
    try {
      const { data: letters, error: lErr } = await db
        .from('bn_letter')
        .select('id, status, generated_at, approved_at, printed_at, dispatched_at, delivered_at, returned_at, cancelled_at, reference_number')
        .in('id', letterIds);
      if (lErr) throw lErr;
      for (const l of (letters ?? []) as any[]) lettersById.set(l.id, l);
    } catch (e: any) {
      warnings.push(`Letter enrichment unavailable: ${e?.message ?? e}`);
    }
  }

  const summary: AwardCommunicationSummary = {
    totalRows: all.length,
    queued: 0, sent: 0, delivered: 0, failed: 0, retrying: 0, skipped: 0,
    lettersDraft: 0, lettersPendingApproval: 0, lettersDispatched: 0,
    recipientBlocks: 0, needsAttention: 0,
  };
  for (const r of all) {
    const s = (r.status ?? '').toUpperCase();
    if (COMM_FAIL.has(s)) { summary.failed++; summary.needsAttention++; }
    else if (COMM_SENT.has(s)) summary.sent++;
    else if (COMM_DELIVERED.has(s)) summary.delivered++;
    else if (COMM_QUEUED.has(s)) summary.queued++;
    else if (COMM_RETRYING.has(s)) { summary.retrying++; summary.needsAttention++; }
    else if (COMM_SKIPPED.has(s)) { summary.skipped++; summary.recipientBlocks++; }
    if (!r.recipientAddressMasked) summary.recipientBlocks++;
    if (r.letterId) {
      const l = lettersById.get(r.letterId);
      const ls = (l?.status ?? '').toUpperCase();
      if (ls === 'DRAFT' || ls === 'GENERATED') summary.lettersDraft++;
      else if (ls === 'PENDING_APPROVAL' || ls === 'AWAITING_APPROVAL') summary.lettersPendingApproval++;
      else if (ls === 'DISPATCHED' || ls === 'PRINTED' || ls === 'DELIVERED') summary.lettersDispatched++;
    }
  }

  let filtered = all;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.subject && r.subject.toLowerCase().includes(s)) ||
        (r.eventCode && r.eventCode.toLowerCase().includes(s)) ||
        (r.recipientAddressMasked && r.recipientAddressMasked.toLowerCase().includes(s)) ||
        (r.providerMessageId && r.providerMessageId.toLowerCase().includes(s)),
    );
  }
  if (q.channels?.length) {
    const set = new Set(q.channels.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.channel ?? '').toUpperCase()));
  }
  if (q.eventCodes?.length) {
    const set = new Set(q.eventCodes);
    filtered = filtered.filter((r) => set.has(r.eventCode ?? ''));
  }
  if (q.statuses?.length) {
    const set = new Set(q.statuses.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.status ?? '').toUpperCase()));
  }
  if (q.recipientTypes?.length) {
    const set = new Set(q.recipientTypes.map((x) => x.toUpperCase()));
    filtered = filtered.filter((r) => set.has((r.recipientType ?? '').toUpperCase()));
  }
  filtered = filtered.filter((r) => inDateRange(r.createdAt?.slice(0, 10) ?? null, q.createdFrom, q.createdTo));
  if (q.failedOnly) filtered = filtered.filter((r) => COMM_FAIL.has((r.status ?? '').toUpperCase()));
  if (q.hasLetter === true) filtered = filtered.filter((r) => !!r.letterId);
  if (q.hasLetter === false) filtered = filtered.filter((r) => !r.letterId);

  filtered = applySort(filtered, q.sortBy, q.sortDirection, commSortAccessors);
  const total = filtered.length;
  const rows = paginate(filtered, q.page, q.pageSize);
  return { rows, total, page: q.page, pageSize: q.pageSize, summary, warnings };
}

export interface AwardCommunicationDetail {
  row: AwardCommunicationItem | null;
  letter: {
    id: string;
    status: string | null;
    generatedAt: string | null;
    approvedAt: string | null;
    printedAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    returnedAt: string | null;
    cancelledAt: string | null;
    referenceNumber: string | null;
    renderedSubject: string | null;
    renderedBodyText: string | null;
  } | null;
  warnings: string[];
}

export async function getAwardCommunicationDetail(
  id: string,
  opts: { canViewContent?: boolean } = {},
): Promise<AwardCommunicationDetail> {
  const warnings: string[] = [];
  const { data, error } = await db
    .from('bn_communication_log')
    .select(
      'id, event_code, channel, recipient_type, recipient_address, template_id, subject, status, provider_message_id, letter_id, error_message, retry_count, last_retry_at, context, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { row: null, letter: null, warnings };
  const row: AwardCommunicationItem = {
    id: data.id,
    createdAt: data.created_at ?? null,
    eventCode: data.event_code ?? null,
    channel: data.channel ?? null,
    recipientType: data.recipient_type ?? null,
    recipientAddressMasked: maskAddr(data.recipient_address ?? null),
    templateId: data.template_id ?? null,
    subject: data.subject ?? null,
    status: data.status ?? null,
    providerMessageId: data.provider_message_id ?? null,
    letterId: data.letter_id ?? null,
    errorMessage: data.error_message ?? null,
    retryCount: data.retry_count ?? null,
    lastRetryAt: data.last_retry_at ?? null,
    correlationId: data.context?.correlation_id ?? null,
  };
  let letter: AwardCommunicationDetail['letter'] = null;
  if (data.letter_id) {
    try {
      const cols = opts.canViewContent
        ? 'id, status, generated_at, approved_at, printed_at, dispatched_at, delivered_at, returned_at, cancelled_at, reference_number, rendered_subject, rendered_body_text'
        : 'id, status, generated_at, approved_at, printed_at, dispatched_at, delivered_at, returned_at, cancelled_at, reference_number';
      const { data: l, error: lErr } = await db.from('bn_letter').select(cols).eq('id', data.letter_id).maybeSingle();
      if (lErr) throw lErr;
      if (l) {
        letter = {
          id: l.id,
          status: l.status ?? null,
          generatedAt: l.generated_at ?? null,
          approvedAt: l.approved_at ?? null,
          printedAt: l.printed_at ?? null,
          dispatchedAt: l.dispatched_at ?? null,
          deliveredAt: l.delivered_at ?? null,
          returnedAt: l.returned_at ?? null,
          cancelledAt: l.cancelled_at ?? null,
          referenceNumber: l.reference_number ?? null,
          renderedSubject: opts.canViewContent ? (l.rendered_subject ?? null) : null,
          renderedBodyText: opts.canViewContent ? (l.rendered_body_text ?? null) : null,
        };
      }
    } catch (e: any) {
      warnings.push(`Letter details unavailable: ${e?.message ?? e}`);
    }
  }
  return { row, letter, warnings };
}
