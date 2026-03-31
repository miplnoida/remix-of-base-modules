import { usePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DeliveryMode = 'always' | 'ask' | 'never';

export function useEmailDeliveryConfig() {
  const { data: invoiceConfig, isLoading: l1 } = usePaymentConfig('invoice_email_delivery');
  const { data: receiptConfig, isLoading: l2 } = usePaymentConfig('receipt_email_delivery');

  const invoiceMode: DeliveryMode = (invoiceConfig?.config_value as DeliveryMode) || 'never';
  const receiptMode: DeliveryMode = (receiptConfig?.config_value as DeliveryMode) || 'never';

  return {
    invoiceEmailMode: invoiceMode,
    receiptEmailMode: receiptMode,
    isLoading: l1 || l2,
  };
}

/** Basic email format validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Resolve payer email via centralized RPC */
export async function resolvePayerEmail(payerType: string, payerId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('resolve_payer_email', {
      p_payer_type: payerType,
      p_payer_id: payerId.trim(),
    });
    if (error) {
      console.error('[EmailDelivery] resolve_payer_email RPC error:', error);
      return '';
    }
    return (data as string) || '';
  } catch (err) {
    console.error('[EmailDelivery] Failed to resolve payer email:', err);
    return '';
  }
}

export interface SendDocumentEmailResult {
  success: boolean;
  status: 'sent' | 'queued' | 'failed' | 'skipped';
  error?: string;
}

/**
 * Sends email notification via the send-notification edge function.
 * Returns actual delivery result — no success toast shown unless truly sent.
 */
export async function sendDocumentEmail(params: {
  documentType: 'invoice' | 'receipt';
  documentId: string | number;
  documentNumber: string;
  recipientEmail: string;
  userCode: string;
  payerType?: string;
  payerId?: string;
}): Promise<SendDocumentEmailResult> {
  const { documentType, documentId, documentNumber, recipientEmail, userCode, payerType, payerId } = params;

  // Validate email before attempting
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    const msg = !recipientEmail ? 'No email address on file for this payer' : `Invalid email address: ${recipientEmail}`;
    toast.warning(`${documentType === 'invoice' ? 'Invoice' : 'Receipt'} email not sent`, {
      description: msg,
    });
    return { success: false, status: 'skipped', error: msg };
  }

  const label = documentType === 'invoice' ? 'Invoice' : 'Receipt';
  const subject = `${label} ${documentNumber} — SSBM`;
  const body = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>${label} Notification</h2>
      <p>Dear Payer,</p>
      <p>Your ${label.toLowerCase()} <strong>${documentNumber}</strong> has been generated.</p>
      <p>Please contact our office for any queries.</p>
      <br/>
      <p>Regards,<br/>SSBM Cashier Department</p>
    </div>
  `;

  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        recipient_email: recipientEmail,
        subject,
        body,
        from_name: 'SSBM Internal Audit',
        from_email: 'Audit@secureserve.biz',
        metadata: {
          payer_type: payerType || '',
          payer_id: payerId || '',
          document_type: documentType,
          document_number: documentNumber,
        },
        trigger_source: `${documentType}_creation`,
        triggered_by: userCode,
      },
    });

    if (error) throw error;

    const result = data as { success: boolean; status: string; error?: string; resend_id?: string };

    if (result?.status === 'sent') {
      toast.success(`${label} email sent successfully`, {
        description: `Email delivered to ${recipientEmail}`,
      });
      return { success: true, status: 'sent' };
    } else if (result?.status === 'queued') {
      toast.info(`${label} email queued for delivery`, {
        description: `Email will be sent to ${recipientEmail}`,
      });
      return { success: true, status: 'queued' };
    } else {
      toast.error(`${label} email failed`, {
        description: result?.error || 'Unknown error from email service',
      });
      return { success: false, status: 'failed', error: result?.error };
    }
  } catch (err: any) {
    console.error('[EmailDelivery] Edge function invocation failed:', err);
    toast.error(`Failed to send ${label.toLowerCase()} email`, {
      description: err.message || 'Edge function error',
    });
    return { success: false, status: 'failed', error: err.message };
  }
}
