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
      'id, full_name, beneficiary_ssn, relationship, share_percent, share_amount, start_date, end_date, status, bank_acct',
    )
    .eq('bn_award_id', awardId)
    .order('start_date', { ascending: false });
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
