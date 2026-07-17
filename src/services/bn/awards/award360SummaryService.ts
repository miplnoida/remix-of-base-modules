/**
 * Award 360 lightweight summary service — BN-AWARD360-B5.
 *
 * Powers the shell (tab badges + alerts + summary cards) without loading full
 * row collections. Uses count/head queries and narrowly bounded column
 * selects. No `select('*')`. No sensitive medical fields, no communication
 * rendered content ever enter this cache.
 *
 * Every section is a tri-state:
 *   { status: 'ok', value }
 *   { status: 'restricted' }
 *   { status: 'unavailable', reason }
 *
 * Failed sections are NEVER collapsed to zero — that is the whole point of the
 * tri-state, distinguishing "confirmed zero" from "we couldn't ask".
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type SectionResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'restricted' }
  | { status: 'unavailable'; reason: string };

export interface Award360SummaryInput {
  includeBeneficiaries?: boolean;
  includeSchedule?: boolean;
  includePayments?: boolean;
  includeLifeCertificates?: boolean;
  includeMedical?: boolean;
  includeSuspensions?: boolean;
  includeOverpayments?: boolean;
  includeCommunications?: boolean;
}

export interface Award360Summary {
  awardId: string;
  beneficiaries: SectionResult<{
    count: number;
    activeCount: number;
    activeShareTotal: number;
  }>;
  schedule: SectionResult<{
    count: number;
    nextDueDate: string | null;
    overdueUnpaidCount: number;
  }>;
  payments: SectionResult<{
    count: number;
    lastPaidAmount: number | null;
    lastPaidCurrency: string | null;
    holdCount: number;
    failedCount: number;
  }>;
  lifeCertificates: SectionResult<{
    overdueCount: number;
    nextDueDate: string | null;
    maxDaysOverdue: number;
    overdueSampleDueDate: string | null;
  }>;
  medical: SectionResult<{
    dueOrOverdueCount: number;
    nextScheduledDate: string | null;
    overdueSampleDate: string | null;
  }>;
  suspensions: SectionResult<{
    pendingCount: number;
    pendingSampleType: string | null;
    pendingSampleStatus: string | null;
  }>;
  overpayments: SectionResult<{
    outstandingTotal: number;
    openCount: number;
  }>;
  communications: SectionResult<{
    failedCount: number;
  }>;
  warnings: string[];
}

const ok = <T,>(value: T): SectionResult<T> => ({ status: 'ok', value });
const restricted = <T,>(): SectionResult<T> => ({ status: 'restricted' });
const unavailable = <T,>(reason: string): SectionResult<T> => ({ status: 'unavailable', reason });

type SafeResult<T> = { kind: 'ok'; value: T } | { kind: 'err'; error: string };
async function safe<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const value = await fn();
    return { kind: 'ok', value };
  } catch (e: any) {
    return { kind: 'err', error: e?.message ?? 'query failed' };
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function getAward360Summary(
  awardId: string,
  opts: Award360SummaryInput = {},
): Promise<Award360Summary> {
  const warnings: string[] = [];

  // ─── beneficiaries ─────────────────────────────────────────────────────
  let beneficiaries: Award360Summary['beneficiaries'];
  if (!opts.includeBeneficiaries) {
    beneficiaries = restricted();
  } else {
    const r = await safe(async () => {
      const { data, error } = await db
        .from('bn_award_beneficiary')
        .select('id,status,share_percent')
        .eq('award_id', awardId);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ status: string | null; share_percent: number | null }>;
      const active = rows.filter((r) => r.status === 'ACTIVE');
      return {
        count: rows.length,
        activeCount: active.length,
        activeShareTotal: active.reduce((s, x) => s + Number(x.share_percent ?? 0), 0),
      };
    });
    if (r.kind === 'err') {
      beneficiaries = unavailable(r.error);
      warnings.push(`Beneficiaries summary unavailable: ${r.error}`);
    } else {
      beneficiaries = ok(r.value);
    }
  }

  // ─── schedule ──────────────────────────────────────────────────────────
  let schedule: Award360Summary['schedule'];
  if (!opts.includeSchedule) {
    schedule = restricted();
  } else {
    const today = todayIso();
    const r = await safe(async () => {
      const countRes = await db
        .from('bn_payment_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId);
      if (countRes.error) throw new Error(countRes.error.message);
      const overdueRes = await db
        .from('bn_payment_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId)
        .in('status', ['PENDING', 'DUE', 'UNPAID', 'HELD'])
        .lt('due_date', today);
      if (overdueRes.error) throw new Error(overdueRes.error.message);
      const nextRes = await db
        .from('bn_payment_schedule')
        .select('id,due_date,status')
        .eq('award_id', awardId)
        .neq('status', 'PAID')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(1);
      if (nextRes.error) throw new Error(nextRes.error.message);
      const nextRow = (nextRes.data ?? [])[0] as { due_date: string | null } | undefined;
      return {
        count: countRes.count ?? 0,
        nextDueDate: nextRow?.due_date ?? null,
        overdueUnpaidCount: overdueRes.count ?? 0,
      };
    });
    if (r.kind === 'err') {
      schedule = unavailable(r.error);
      warnings.push(`Schedule summary unavailable: ${r.error}`);
    } else {
      schedule = ok(r.value);
    }
  }

  // ─── payments ──────────────────────────────────────────────────────────
  let payments: Award360Summary['payments'];
  if (!opts.includePayments) {
    payments = restricted();
  } else {
    const r = await safe(async () => {
      const countRes = await db
        .from('bn_payment_instruction')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId);
      if (countRes.error) throw new Error(countRes.error.message);
      const lastPaidRes = await db
        .from('bn_payment_instruction')
        .select('id,amount,currency,paid_at')
        .eq('award_id', awardId)
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(1);
      if (lastPaidRes.error) throw new Error(lastPaidRes.error.message);
      const holdRes = await db
        .from('bn_payment_instruction')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId)
        .in('status', ['HOLD', 'ON_HOLD']);
      if (holdRes.error) throw new Error(holdRes.error.message);
      const failedRes = await db
        .from('bn_payment_instruction')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId)
        .in('status', ['FAILED', 'REJECTED', 'RETURNED']);
      if (failedRes.error) throw new Error(failedRes.error.message);
      const last = (lastPaidRes.data ?? [])[0] as
        | { amount: number | null; currency: string | null }
        | undefined;
      return {
        count: countRes.count ?? 0,
        lastPaidAmount: last?.amount ?? null,
        lastPaidCurrency: last?.currency ?? null,
        holdCount: holdRes.count ?? 0,
        failedCount: failedRes.count ?? 0,
      };
    });
    if (r.kind === 'err') {
      payments = unavailable(r.error);
      warnings.push(`Payments summary unavailable: ${r.error}`);
    } else {
      payments = ok(r.value);
    }
  }

  // ─── life certificates ─────────────────────────────────────────────────
  let lifeCertificates: Award360Summary['lifeCertificates'];
  if (!opts.includeLifeCertificates) {
    lifeCertificates = restricted();
  } else {
    const today = todayIso();
    const r = await safe(async () => {
      const overdueRes = await db
        .from('bn_life_certificate')
        .select('id,due_date,status')
        .eq('award_id', awardId)
        .lt('due_date', today)
        .neq('status', 'VERIFIED')
        .order('due_date', { ascending: true })
        .limit(50);
      if (overdueRes.error) throw new Error(overdueRes.error.message);
      const nextRes = await db
        .from('bn_life_certificate')
        .select('id,due_date')
        .eq('award_id', awardId)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(1);
      if (nextRes.error) throw new Error(nextRes.error.message);
      const overdue = (overdueRes.data ?? []) as Array<{ due_date: string | null }>;
      const overdueSample = overdue[0]?.due_date ?? null;
      let maxDaysOverdue = 0;
      for (const r of overdue) {
        if (r.due_date) {
          const days = Math.floor((Date.parse(today) - Date.parse(r.due_date)) / 86400000);
          if (days > maxDaysOverdue) maxDaysOverdue = days;
        }
      }
      const next = (nextRes.data ?? [])[0] as { due_date: string | null } | undefined;
      return {
        overdueCount: overdue.length,
        nextDueDate: next?.due_date ?? null,
        maxDaysOverdue,
        overdueSampleDueDate: overdueSample,
      };
    });
    if (r.kind === 'err') {
      lifeCertificates = unavailable(r.error);
      warnings.push(`Life certificate summary unavailable: ${r.error}`);
    } else {
      lifeCertificates = ok(r.value);
    }
  }

  // ─── medical (no sensitive columns) ───────────────────────────────────
  let medical: Award360Summary['medical'];
  if (!opts.includeMedical) {
    medical = restricted();
  } else {
    const today = todayIso();
    const r = await safe(async () => {
      const dueRes = await db
        .from('bn_medical_review_schedule')
        .select('id,scheduled_date,status')
        .eq('award_id', awardId)
        .lte('scheduled_date', today)
        .not('status', 'in', '(COMPLETED,CANCELLED)')
        .order('scheduled_date', { ascending: true })
        .limit(50);
      if (dueRes.error) throw new Error(dueRes.error.message);
      const nextRes = await db
        .from('bn_medical_review_schedule')
        .select('id,scheduled_date')
        .eq('award_id', awardId)
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(1);
      if (nextRes.error) throw new Error(nextRes.error.message);
      const due = (dueRes.data ?? []) as Array<{ scheduled_date: string | null }>;
      const next = (nextRes.data ?? [])[0] as { scheduled_date: string | null } | undefined;
      return {
        dueOrOverdueCount: due.length,
        nextScheduledDate: next?.scheduled_date ?? null,
        overdueSampleDate: due[0]?.scheduled_date ?? null,
      };
    });
    if (r.kind === 'err') {
      medical = unavailable(r.error);
      warnings.push(`Medical review summary unavailable: ${r.error}`);
    } else {
      medical = ok(r.value);
    }
  }

  // ─── suspensions ───────────────────────────────────────────────────────
  let suspensions: Award360Summary['suspensions'];
  if (!opts.includeSuspensions) {
    suspensions = restricted();
  } else {
    const r = await safe(async () => {
      const res = await db
        .from('bn_award_suspension_event')
        .select('id,event_status,suspension_type')
        .eq('award_id', awardId)
        .in('event_status', ['PROPOSED', 'PENDING_APPROVAL', 'PENDING'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as Array<{ event_status: string | null; suspension_type: string | null }>;
      const sample = rows[0];
      return {
        pendingCount: rows.length,
        pendingSampleType: sample?.suspension_type ?? null,
        pendingSampleStatus: sample?.event_status ?? null,
      };
    });
    if (r.kind === 'err') {
      suspensions = unavailable(r.error);
      warnings.push(`Suspensions summary unavailable: ${r.error}`);
    } else {
      suspensions = ok(r.value);
    }
  }

  // ─── overpayments ──────────────────────────────────────────────────────
  let overpayments: Award360Summary['overpayments'];
  if (!opts.includeOverpayments) {
    overpayments = restricted();
  } else {
    const r = await safe(async () => {
      const res = await db
        .from('bn_overpayment')
        .select('id,outstanding_amount,recovery_status')
        .eq('award_id', awardId);
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as Array<{ outstanding_amount: number | null; recovery_status: string | null }>;
      const outstandingTotal = rows.reduce((s, x) => s + Number(x.outstanding_amount ?? 0), 0);
      const openCount = rows.filter((x) => (x.outstanding_amount ?? 0) > 0).length;
      return { outstandingTotal, openCount };
    });
    if (r.kind === 'err') {
      overpayments = unavailable(r.error);
      warnings.push(`Overpayments summary unavailable: ${r.error}`);
    } else {
      overpayments = ok(r.value);
    }
  }

  // ─── communications (metadata only; no rendered content) ───────────────
  let communications: Award360Summary['communications'];
  if (!opts.includeCommunications) {
    communications = restricted();
  } else {
    const r = await safe(async () => {
      const failedRes = await db
        .from('bn_communication_log')
        .select('id', { count: 'exact', head: true })
        .eq('award_id', awardId)
        .in('status', ['FAILED', 'BOUNCED', 'REJECTED']);
      if (failedRes.error) throw new Error(failedRes.error.message);
      return { failedCount: failedRes.count ?? 0 };
    });
    if (r.kind === 'err') {
      communications = unavailable(r.error);
      warnings.push(`Communications summary unavailable: ${r.error}`);
    } else {
      communications = ok(r.value);
    }
  }

  return {
    awardId,
    beneficiaries,
    schedule,
    payments,
    lifeCertificates,
    medical,
    suspensions,
    overpayments,
    communications,
    warnings,
  };
}
