import { supabase } from '@/integrations/supabase/client';

export interface NoticeDeliveryLog {
  id: string;
  notice_id: string;
  attempt_number: number;
  channel: string;
  recipient_address: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  provider_message_id: string | null;
  created_by: string | null;
  created_at: string;
}

// ── Status Transitions ──

export async function sendNotice(noticeId: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Update notice status
  const { error } = await supabase
    .from('ce_notices')
    .update({ status: 'SENT', sent_at: now, updated_by: userCode, updated_at: now } as any)
    .eq('id', noticeId)
    .eq('status', 'DRAFT');
  if (error) throw error;

  // Fetch notice details for delivery log
  const { data: notice } = await supabase
    .from('ce_notices')
    .select('delivery_method, employer_name')
    .eq('id', noticeId)
    .single();

  // Insert delivery log entry
  await supabase.from('ce_notice_delivery_log').insert({
    notice_id: noticeId,
    attempt_number: 1,
    channel: notice?.delivery_method || 'EMAIL',
    recipient_address: notice?.employer_name || '',
    status: 'SENT',
    sent_at: now,
    created_by: userCode,
  } as any);
}

export async function markDelivered(noticeId: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('ce_notices')
    .update({ status: 'DELIVERED', delivered_at: now, updated_by: userCode, updated_at: now } as any)
    .eq('id', noticeId)
    .eq('status', 'SENT');
  if (error) throw error;

  // Log delivery
  const { data: logs } = await supabase
    .from('ce_notice_delivery_log')
    .select('attempt_number')
    .eq('notice_id', noticeId)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const nextAttempt = (logs?.[0]?.attempt_number || 0) + 1;

  await supabase.from('ce_notice_delivery_log').insert({
    notice_id: noticeId,
    attempt_number: nextAttempt,
    channel: 'SYSTEM',
    status: 'DELIVERED',
    delivered_at: now,
    created_by: userCode,
  } as any);
}

export async function recordAcknowledgment(noticeId: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('ce_notices')
    .update({ status: 'ACKNOWLEDGED', acknowledged_at: now, updated_by: userCode, updated_at: now } as any)
    .eq('id', noticeId)
    .eq('status', 'DELIVERED');
  if (error) throw error;
}

export async function recordResponse(
  noticeId: string,
  responseNotes: string,
  responseDate: string,
  userCode: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('ce_notices')
    .update({
      response_received: true,
      response_date: responseDate,
      response_notes: responseNotes,
      updated_by: userCode,
      updated_at: now,
    } as any)
    .eq('id', noticeId);
  if (error) throw error;
}

export async function cancelNotice(noticeId: string, reason: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('ce_notices')
    .update({ status: 'CANCELLED', updated_by: userCode, updated_at: now } as any)
    .eq('id', noticeId);
  if (error) throw error;

  await supabase.from('ce_notice_delivery_log').insert({
    notice_id: noticeId,
    attempt_number: 0,
    channel: 'SYSTEM',
    status: 'CANCELLED',
    created_by: userCode,
  } as any);
}

// ── Delivery Log ──

export async function fetchDeliveryLog(noticeId: string): Promise<NoticeDeliveryLog[]> {
  const { data, error } = await supabase
    .from('ce_notice_delivery_log')
    .select('*')
    .eq('notice_id', noticeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as NoticeDeliveryLog[];
}
