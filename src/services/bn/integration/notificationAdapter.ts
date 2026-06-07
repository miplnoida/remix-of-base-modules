/**
 * BN Notification Adapter — Bridges to existing notification system
 * 
 * Uses the platform's notification_templates and internal email/SMS APIs.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnNotificationAdapter, BnNotificationRequest } from './contracts';

const db = supabase as any;

// Maps BN notification types to platform template keys
const TEMPLATE_MAP: Record<string, string> = {
  CLAIM_RECEIVED: 'bn_claim_received',
  DOCS_REQUIRED: 'bn_docs_required',
  CLAIM_APPROVED: 'bn_claim_approved',
  CLAIM_DENIED: 'bn_claim_denied',
  PAYMENT_SCHEDULED: 'bn_payment_scheduled',
  REVIEW_DUE: 'bn_review_due',
  AWARD_SUSPENDED: 'bn_award_suspended',
  AWARD_RESUMED: 'bn_award_resumed',
  AWARD_TERMINATED: 'bn_award_terminated',
  LIFE_CERT_DUE: 'bn_life_cert_due',
};

export const bnNotificationAdapter: IBnNotificationAdapter = {
  async sendClaimNotification(request: BnNotificationRequest) {
    const templateKey = TEMPLATE_MAP[request.type];
    if (!templateKey) {
      console.warn(`No notification template mapped for BN type: ${request.type}`);
      return { sent: false };
    }

    // Look up the person's contact info
    const { data: person } = await db
      .from('ip_master')
      .select('email_addr, contact_email, mobile, phone_mobile, contact_mobile, phone, telephone, firstname, surname')
      .eq('ssn', request.recipientSsn.trim())
      .maybeSingle();

    if (!person) {
      console.warn(`Cannot send notification: person not found for SSN ${request.recipientSsn}`);
      return { sent: false };
    }

    const email = person.email_addr || person.contact_email || null;
    const phone = person.mobile || person.phone_mobile || person.contact_mobile || person.phone || person.telephone || null;

    // Insert into the platform's notification queue
    const { data, error } = await db
      .from('notification_queue')
      .insert({
        template_key: templateKey,
        recipient_email: request.channel !== 'sms' ? email : null,
        recipient_phone: request.channel !== 'email' ? phone : null,
        recipient_name: `${person.firstname || ''} ${person.surname || ''}`.trim(),
        channel: request.channel,
        template_data: {
          ...request.templateData,
          claimId: request.claimId,
          awardId: request.awardId,
          recipientName: `${person.firstname || ''} ${person.surname || ''}`.trim(),
        },
        module: 'benefit_management',
        entity_type: request.claimId ? 'claim' : 'award',
        entity_id: request.claimId || request.awardId || '',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to queue BN notification:', error);
      return { sent: false };
    }

    return { sent: true, messageId: data.id };
  },

  async getNotificationHistory(ssn, claimId) {
    let q = db
      .from('notification_queue')
      .select('template_key, sent_at, channel')
      .eq('module', 'benefit_management')
      .order('created_at', { ascending: false })
      .limit(50);

    if (claimId) {
      q = q.eq('entity_id', claimId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((n: any) => ({
      type: n.template_key,
      sentAt: n.sent_at,
      channel: n.channel,
    }));
  },
};
