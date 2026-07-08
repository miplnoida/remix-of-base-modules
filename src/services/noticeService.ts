import { supabase } from '@/integrations/supabase/client';
import { requestTransition } from '@/services/ceWorkflowStatusService';
import { notificationsAdapter } from '@/adapters/notificationsAdapter';

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
// All status changes route through the central CE workflow engine
// (ce_apply_status_transition RPC). The RPC validates from→to, writes
// system_audit_trail, and updates ce_notices.status atomically.
// Side-effect columns (sent_at / delivered_at / acknowledged_at) and the
// ce_notice_delivery_log entries are written here, since they are not
// part of the generic status transition.

export async function sendNotice(noticeId: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();

  const result = await requestTransition({
    entityType: 'notice',
    recordId: noticeId,
    actionCode: 'SEND',
    userCode,
  });
  if (!result.success) throw new Error(result.error || 'Failed to send notice');

  // Stamp sent_at (status already moved to SENT by RPC)
  await supabase
    .from('ce_notices')
    .update({ sent_at: now } as any)
    .eq('id', noticeId);

  // Fetch notice details (needed for delivery log + email dispatch)
  const { data: notice } = await supabase
    .from('ce_notices')
    .select('delivery_method, employer_name, employer_id, subject, body, notice_number, notice_type, template_id')
    .eq('id', noticeId)
    .single();

  const channel = (notice?.delivery_method || 'EMAIL').toString().toUpperCase();

  // Resolve employer email (ce_notices has no email column, so look it up on the employer master)
  let recipientEmail: string | null = null;
  if (notice?.employer_id) {
    const { data: employer } = await supabase
      .from('er_master')
      .select('email')
      .eq('id', notice.employer_id)
      .maybeSingle();
    recipientEmail = (employer as any)?.email || null;
  }

  // Actually dispatch the email/SMS/print notification when the channel supports it.
  // Previously the notice was only marked SENT in the DB — no email ever left the system.
  let dispatchStatus: 'SENT' | 'FAILED' = 'SENT';
  let dispatchFailureReason: string | null = null;
  let providerMessageId: string | null = null;
  if (channel === 'EMAIL' || channel === 'SMS' || channel === 'PRINT') {
    if (channel === 'EMAIL' && !recipientEmail) {
      dispatchStatus = 'FAILED';
      dispatchFailureReason = 'No employer email address on file';
      console.warn('[noticeService.sendNotice] No employer email for notice', noticeId);
    } else {
      try {
        const result = await notificationsAdapter.dispatch({
          channel: (channel === 'SMS' ? 'SMS' : channel === 'PRINT' ? 'Print' : 'Email') as any,
          to: recipientEmail ? [recipientEmail] : [],
          templateId: notice?.template_id || `CE_NOTICE_${notice?.notice_type || 'GENERIC'}`,
          mergeData: {
            notice_number: notice?.notice_number,
            notice_type: notice?.notice_type,
            employer_name: notice?.employer_name,
            subject: notice?.subject,
            body: notice?.body,
          },
        });
        providerMessageId = result?.messageId ?? null;
        if (result?.status === 'Failed') {
          dispatchStatus = 'FAILED';
          dispatchFailureReason = 'Notification provider reported failure';
        }
      } catch (e: any) {
        dispatchStatus = 'FAILED';
        dispatchFailureReason = e?.message || 'Dispatch error';
        console.error('[noticeService.sendNotice] Dispatch failed:', e);
      }
    }
  }

  // Insert delivery log entry using the resolved recipient (not the employer name)
  await supabase.from('ce_notice_delivery_log').insert({
    notice_id: noticeId,
    attempt_number: 1,
    channel,
    recipient_address: recipientEmail || notice?.employer_name || '',
    status: dispatchStatus,
    sent_at: now,
    failure_reason: dispatchFailureReason,
    provider_message_id: providerMessageId,
    created_by: userCode,
  } as any);

  if (dispatchStatus === 'FAILED') {
    throw new Error(dispatchFailureReason || 'Failed to deliver notice');
  }
}

export async function markDelivered(noticeId: string, userCode: string): Promise<void> {
  const now = new Date().toISOString();

  const result = await requestTransition({
    entityType: 'notice',
    recordId: noticeId,
    actionCode: 'MARK_DELIVERED',
    userCode,
  });
  if (!result.success) throw new Error(result.error || 'Failed to mark notice delivered');

  await supabase
    .from('ce_notices')
    .update({ delivered_at: now } as any)
    .eq('id', noticeId);

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

  const result = await requestTransition({
    entityType: 'notice',
    recordId: noticeId,
    actionCode: 'ACKNOWLEDGE',
    userCode,
  });
  if (!result.success) throw new Error(result.error || 'Failed to record acknowledgment');

  await supabase
    .from('ce_notices')
    .update({ acknowledged_at: now } as any)
    .eq('id', noticeId);
}

export async function recordResponse(
  noticeId: string,
  responseNotes: string,
  responseDate: string,
  userCode: string
): Promise<void> {
  const now = new Date().toISOString();

  // Recording a response is metadata-only; the workflow status is not
  // automatically advanced (admins can map a workflow if they want that).
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
  const result = await requestTransition({
    entityType: 'notice',
    recordId: noticeId,
    actionCode: 'CANCEL',
    userCode,
    notes: reason,
  });
  if (!result.success) throw new Error(result.error || 'Failed to cancel notice');

  await supabase.from('ce_notice_delivery_log').insert({
    notice_id: noticeId,
    attempt_number: 0,
    channel: 'SYSTEM',
    status: 'CANCELLED',
    failure_reason: reason,
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
