import { supabase } from '@/integrations/supabase/client';

// ── Cases linked to employer ──
export async function fetchEmployerCases(employerId: string) {
  const { data, error } = await supabase
    .from('ce_cases')
    .select('id, case_number, case_type, status, priority, created_at, assigned_to, resolved_at, is_locked')
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
      .select('id, correspondence_type, subject, status, created_at, direction')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (noticesRes.error) throw noticesRes.error;
  if (corrRes.error) throw corrRes.error;

  const notices = (noticesRes.data ?? []).map(n => ({
    ...n,
    source: 'NOTICE' as const,
    date: n.sent_at || n.created_at,
    title: `${(n.notice_type || '').replace(/_/g, ' ')} — ${n.notice_number || ''}`,
    detail: `Status: ${n.status} | Delivery: ${(n.delivery_method || '').replace(/_/g, ' ')}`,
  }));
  const corrs = (corrRes.data ?? []).map(c => ({
    ...c,
    source: 'CORRESPONDENCE' as const,
    date: c.created_at,
    title: c.subject || (c.correspondence_type || '').replace(/_/g, ' '),
    detail: `${c.direction || 'OUTBOUND'} | Status: ${c.status}`,
  }));

  return [...notices, ...corrs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── Documents from cases + legal ──
export async function fetchEmployerDocuments(employerId: string) {
  const [caseDocsRes, legalDocsRes] = await Promise.all([
    supabase
      .from('ce_case_documents')
      .select('id, document_name, document_type, uploaded_at, uploaded_by, file_url, case_id')
      .eq('employer_id', employerId)
      .order('uploaded_at', { ascending: false })
      .limit(50),
    supabase
      .from('ce_legal_documents')
      .select('id, document_name, document_type, uploaded_at, uploaded_by, file_url')
      .eq('employer_id', employerId)
      .order('uploaded_at', { ascending: false })
      .limit(50),
  ]);
  if (caseDocsRes.error) throw caseDocsRes.error;
  if (legalDocsRes.error) throw legalDocsRes.error;

  const caseDocs = (caseDocsRes.data ?? []).map(d => ({ ...d, source: 'CASE' as const }));
  const legalDocs = (legalDocsRes.data ?? []).map(d => ({ ...d, source: 'LEGAL' as const }));
  return [...caseDocs, ...legalDocs].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

// ── Payment arrangements ──
export async function fetchEmployerArrangements(employerId: string) {
  const { data, error } = await supabase
    .from('ce_payment_arrangements')
    .select('id, arrangement_number, status, total_amount, paid_amount, remaining_balance, start_date, end_date, created_at')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
