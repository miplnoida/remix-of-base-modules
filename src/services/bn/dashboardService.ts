/**
 * Benefits Dashboard Service
 * 
 * Provides aggregated read-only data for the BN operational dashboard.
 * All queries are read-only — no writes.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface BnDashboardSummary {
  totalClaims: number;
  openClaims: number;
  pendingApproval: number;
  inPayment: number;
  closedThisMonth: number;
  deniedThisMonth: number;
  avgProcessingDays: number;
}

export interface BnClaimsByStatus {
  status: string;
  count: number;
}

export interface BnClaimsByProduct {
  product_name: string;
  product_code: string;
  count: number;
}

export interface BnAgingBucket {
  bucket: string;
  count: number;
  min_days: number;
  max_days: number;
}

export interface BnRecentActivity {
  id: string;
  claim_id: string;
  claim_number: string | null;
  event_type: string;
  description: string | null;
  performed_by: string | null;
  event_date: string;
  ssn: string | null;
}

export interface BnMyAssignment {
  id: string;
  claim_id: string;
  claim_number: string | null;
  ssn: string;
  status: string;
  priority: string;
  product_name: string | null;
  product_code: string | null;
  claim_date: string;
  assigned_at: string | null;
}

// ── Summary KPIs ──────────────────────────────────────────

export async function fetchDashboardSummary(): Promise<BnDashboardSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch all claims with minimal fields
  const { data: claims, error } = await db
    .from('bn_claim')
    .select('id, status, entered_at, claim_date');
  if (error) throw error;

  const all = claims || [];
  const openStatuses = ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'PENDING_INFO'];
  const approvalStatuses = ['DECISION'];
  const paymentStatuses = ['PAYMENT_QUEUE', 'IN_PAYMENT', 'AWARD_SETUP'];

  const openClaims = all.filter((c: any) => openStatuses.includes(c.status));
  const closedThisMonth = all.filter((c: any) => c.status === 'CLOSED' && c.entered_at >= monthStart);
  const deniedThisMonth = all.filter((c: any) => c.status === 'DENIED' && c.entered_at >= monthStart);

  // Calculate average processing days for closed claims
  const closedClaims = all.filter((c: any) => c.status === 'CLOSED' || c.status === 'DENIED');
  let avgDays = 0;
  if (closedClaims.length > 0) {
    const totalDays = closedClaims.reduce((sum: number, c: any) => {
      const start = new Date(c.claim_date || c.entered_at);
      const end = new Date(c.entered_at);
      return sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }, 0);
    avgDays = Math.round(totalDays / closedClaims.length);
  }

  return {
    totalClaims: all.length,
    openClaims: openClaims.length,
    pendingApproval: all.filter((c: any) => approvalStatuses.includes(c.status)).length,
    inPayment: all.filter((c: any) => paymentStatuses.includes(c.status)).length,
    closedThisMonth: closedThisMonth.length,
    deniedThisMonth: deniedThisMonth.length,
    avgProcessingDays: avgDays,
  };
}

// ── Claims by Status (for pie chart) ──────────────────────

export async function fetchClaimsByStatus(): Promise<BnClaimsByStatus[]> {
  const { data, error } = await db
    .from('bn_claim')
    .select('status');
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data || []).forEach((c: any) => {
    counts[c.status] = (counts[c.status] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Claims by Product (for bar chart) ─────────────────────

export async function fetchClaimsByProduct(): Promise<BnClaimsByProduct[]> {
  const { data, error } = await db
    .from('bn_claim')
    .select('product_id, bn_product(benefit_code, benefit_name)');
  if (error) throw error;

  const counts: Record<string, { name: string; code: string; count: number }> = {};
  (data || []).forEach((c: any) => {
    const pid = c.product_id;
    if (!counts[pid]) {
      counts[pid] = {
        name: c.bn_product?.benefit_name || 'Unknown',
        code: c.bn_product?.benefit_code || '?',
        count: 0,
      };
    }
    counts[pid].count++;
  });

  return Object.values(counts)
    .map(v => ({ product_name: v.name, product_code: v.code, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

// ── Aging Buckets ─────────────────────────────────────────

export async function fetchClaimAging(): Promise<BnAgingBucket[]> {
  const openStatuses = ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'PENDING_INFO'];

  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_date, entered_at, status')
    .in('status', openStatuses);
  if (error) throw error;

  const now = Date.now();
  const buckets = [
    { bucket: '0-7 days', min_days: 0, max_days: 7, count: 0 },
    { bucket: '8-14 days', min_days: 8, max_days: 14, count: 0 },
    { bucket: '15-30 days', min_days: 15, max_days: 30, count: 0 },
    { bucket: '31-60 days', min_days: 31, max_days: 60, count: 0 },
    { bucket: '61-90 days', min_days: 61, max_days: 90, count: 0 },
    { bucket: '90+ days', min_days: 91, max_days: 9999, count: 0 },
  ];

  (data || []).forEach((c: any) => {
    const days = Math.floor((now - new Date(c.claim_date || c.entered_at).getTime()) / (1000 * 60 * 60 * 24));
    const b = buckets.find(b => days >= b.min_days && days <= b.max_days);
    if (b) b.count++;
  });

  return buckets;
}

// ── Recent Activity ───────────────────────────────────────

export async function fetchRecentActivity(limit = 20): Promise<BnRecentActivity[]> {
  const { data, error } = await db
    .from('bn_claim_event')
    .select('id, claim_id, event_type, description, performed_by, event_date, bn_claim(claim_number, ssn)')
    .order('event_date', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data || []).map((e: any) => ({
    id: e.id,
    claim_id: e.claim_id,
    claim_number: e.bn_claim?.claim_number || null,
    event_type: e.event_type,
    description: e.description,
    performed_by: e.performed_by,
    event_date: e.event_date,
    ssn: e.bn_claim?.ssn || null,
  }));
}

// ── My Assignments ────────────────────────────────────────

export async function fetchMyAssignments(userCode: string): Promise<BnMyAssignment[]> {
  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_number, ssn, status, priority, claim_date, assigned_to, entered_at, bn_product(benefit_code, benefit_name)')
    .eq('assigned_to', userCode)
    .in('status', ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'PENDING_INFO'])
    .order('priority', { ascending: true })
    .order('claim_date', { ascending: true })
    .limit(50);
  if (error) throw error;

  return (data || []).map((c: any) => ({
    id: c.id,
    claim_id: c.id,
    claim_number: c.claim_number,
    ssn: c.ssn,
    status: c.status,
    priority: c.priority || 'NORMAL',
    product_name: c.bn_product?.benefit_name || null,
    product_code: c.bn_product?.benefit_code || null,
    claim_date: c.claim_date,
    assigned_at: c.entered_at,
  }));
}
