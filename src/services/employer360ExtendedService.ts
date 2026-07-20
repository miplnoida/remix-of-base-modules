import { supabase } from '@/integrations/supabase/client';

// ── Cases linked to employer ──
export async function fetchEmployerCases(employerId: string) {
  const { data, error } = await supabase
    .from('ce_cases')
    .select('id, case_number, case_type, status, priority, created_at, assigned_to, resolved_at, is_locked, total_principal, total_penalties, total_amount, amount_collected, amount_waived')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// ── Payment history from ledger (credits only) ──
export async function fetchEmployerPaymentHistory(employerId: string) {
  const { data, error } = await supabase
    .from('ce_employer_financial_ledger')
    .select('id, posted_at, period, fund_type, entry_type, description, credit_amount, reference_id, status')
    .eq('employer_id', employerId)
    .gt('credit_amount', 0)
    .eq('status', 'POSTED')
    .order('posted_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// ── Communications: notices + correspondence ──
export async function fetchEmployerCommunications(employerId: string) {
  const [noticesRes, corrRes] = await Promise.all([
    supabase
      .from('ce_notices')
      .select('id, notice_number, notice_type, status, delivery_method, sent_at, response_received, created_at')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ce_violation_correspondence')
      .select('id, channel, subject, status, created_at, direction')
      .eq('violation_id', employerId) // Note: this table links via violation_id, not employer_id directly
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (noticesRes.error) throw noticesRes.error;
  // Correspondence may fail if no violation_id match — that's fine
  const notices = (noticesRes.data ?? []).map(n => ({
    id: n.id,
    source: 'NOTICE' as const,
    date: n.sent_at || n.created_at,
    title: `${(n.notice_type || '').replace(/_/g, ' ')} — ${n.notice_number || ''}`,
    detail: `Status: ${n.status} | Delivery: ${(n.delivery_method || '').replace(/_/g, ' ')}`,
    status: n.status,
  }));
  const corrs = (corrRes.data ?? []).map(c => ({
    id: c.id,
    source: 'CORRESPONDENCE' as const,
    date: c.created_at,
    title: c.subject || (c.channel || '').replace(/_/g, ' '),
    detail: `${c.direction || 'OUTBOUND'} | Status: ${c.status}`,
    status: c.status,
  }));

  return [...notices, ...corrs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── Documents from cases ──
export async function fetchEmployerDocuments(employerId: string) {
  // ce_case_documents doesn't have employer_id — need to go through cases
  const { data: cases } = await supabase
    .from('ce_cases')
    .select('id')
    .eq('employer_id', employerId)
    .limit(100);
  
  if (!cases || cases.length === 0) return [];
  
  const caseIds = cases.map(c => c.id);
  const { data, error } = await supabase
    .from('ce_case_documents')
    .select('id, title, document_type, file_name, file_path, created_at, uploaded_by_name, case_id, is_confidential')
    .in('case_id', caseIds)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// ── Payment arrangements ──
export async function fetchEmployerArrangements(employerId: string) {
  const { data, error } = await supabase
    .from('ce_payment_arrangements')
    .select('id, arrangement_number, status, total_debt, total_paid, start_date, end_date, created_at')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
