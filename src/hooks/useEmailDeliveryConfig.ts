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

/**
 * Sends email notification via internal API placeholder.
 * Logs to system_audit_trail and shows a toast.
 */
export async function sendDocumentEmail(params: {
  documentType: 'invoice' | 'receipt';
  documentId: string | number;
  documentNumber: string;
  recipientEmail: string;
  userCode: string;
}) {
  const { documentType, documentId, documentNumber, recipientEmail, userCode } = params;

  try {
    // Log email send attempt to audit trail
    await supabase.from('system_audit_trail').insert({
      action: 'email_send',
      entity_type: documentType === 'invoice' ? 'cn_invoice' : 'cn_receipt',
      entity_id: String(documentId),
      module: 'Payment Module',
      user_name: userCode,
      after_value: {
        document_number: documentNumber,
        recipient_email: recipientEmail,
        status: 'queued',
      },
    } as any);

    toast.success(`${documentType === 'invoice' ? 'Invoice' : 'Receipt'} email queued`, {
      description: `Email will be sent to ${recipientEmail}`,
    });

    return true;
  } catch (err: any) {
    console.error('[EmailDelivery] Failed to queue email:', err);
    toast.error('Failed to queue email', { description: err.message });
    return false;
  }
}
