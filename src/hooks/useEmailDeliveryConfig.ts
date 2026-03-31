import { usePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchInvoiceTemplate, fetchInvoiceData } from '@/lib/invoicePrinter';

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

/** Fetch an email template from notification_templates by template_code */
async function fetchEmailTemplate(templateCode: string): Promise<{
  id: string;
  subject: string;
  body: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('id, subject, body, html_body')
      .eq('template_code', templateCode)
      .eq('channel', 'email')
      .eq('is_enabled', true)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: (data as any).id,
      subject: (data as any).subject || '',
      body: (data as any).html_body || (data as any).body || '',
    };
  } catch {
    return null;
  }
}

/** Replace placeholders in a template string */
function replacePlaceholders(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(key).join(value);
  }
  return result;
}

/** Generate the full invoice HTML for attachment */
async function generateInvoiceHtml(documentId: string | number): Promise<string | null> {
  try {
    const invoiceId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
    if (isNaN(invoiceId)) return null;

    const [templateHtml, placeholders] = await Promise.all([
      fetchInvoiceTemplate(),
      fetchInvoiceData(invoiceId),
    ]);

    let resolvedHtml = templateHtml;
    for (const [key, value] of Object.entries(placeholders)) {
      resolvedHtml = resolvedHtml.split(key).join(value);
    }
    return resolvedHtml;
  } catch (err) {
    console.error('[EmailDelivery] Failed to generate invoice HTML:', err);
    return null;
  }
}

/**
 * Sends email notification via the send-notification edge function.
 * Fetches DB email template, generates document HTML attachment, and dispatches.
 */
export async function sendDocumentEmail(params: {
  documentType: 'invoice' | 'receipt';
  documentId: string | number;
  documentNumber: string;
  recipientEmail: string;
  userCode: string;
  payerType?: string;
  payerId?: string;
  payerName?: string;
  totalAmount?: string;
  currencyCode?: string;
  documentDate?: string;
}): Promise<SendDocumentEmailResult> {
  const {
    documentType, documentId, documentNumber, recipientEmail, userCode,
    payerType, payerId, payerName, totalAmount, currencyCode, documentDate,
  } = params;

  // Validate email before attempting
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    const msg = !recipientEmail ? 'No email address on file for this payer' : `Invalid email address: ${recipientEmail}`;
    toast.warning(`${documentType === 'invoice' ? 'Invoice' : 'Receipt'} email not sent`, {
      description: msg,
    });
    return { success: false, status: 'skipped', error: msg };
  }

  const label = documentType === 'invoice' ? 'Invoice' : 'Receipt';
  const templateCode = documentType === 'invoice' ? 'INVOICE_EMAIL' : 'RECEIPT_EMAIL';

  // Placeholder values for template substitution
  const placeholderValues: Record<string, string> = {
    '{{DOCUMENT_NUMBER}}': documentNumber,
    '{{PAYER_NAME}}': payerName || payerId || 'Valued Payer',
    '{{PAYER_ID}}': payerId || '',
    '{{TOTAL_AMOUNT}}': totalAmount || '0.00',
    '{{CURRENCY_CODE}}': currencyCode || 'XCD',
    '{{DOCUMENT_DATE}}': documentDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };

  // Fetch DB email template
  const emailTemplate = await fetchEmailTemplate(templateCode);

  let subject: string;
  let body: string;
  let templateId: string | null = null;

  if (emailTemplate) {
    templateId = emailTemplate.id;
    subject = replacePlaceholders(emailTemplate.subject, placeholderValues);
    body = replacePlaceholders(emailTemplate.body, placeholderValues);
  } else {
    // Fallback if template not found in DB
    subject = `${label} ${documentNumber} — SSBM`;
    body = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>${label} Notification</h2>
        <p>Dear ${payerName || 'Payer'},</p>
        <p>Your ${label.toLowerCase()} <strong>${documentNumber}</strong> has been generated.</p>
        <p>Please contact our office for any queries.</p>
        <br/>
        <p>Regards,<br/>SSBM Cashier Department</p>
      </div>
    `;
  }

  // Generate document HTML for attachment (invoice only for now)
  let attachments: { filename: string; content: string; contentType: string }[] = [];
  if (documentType === 'invoice') {
    const invoiceHtml = await generateInvoiceHtml(documentId);
    if (invoiceHtml) {
      // Base64 encode the HTML for attachment
      const base64Content = btoa(unescape(encodeURIComponent(invoiceHtml)));
      attachments.push({
        filename: `${documentNumber}.html`,
        content: base64Content,
        contentType: 'text/html',
      });
    }
  }

  try {
    const requestBody: Record<string, unknown> = {
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
        triggered_by_code: userCode,
      },
      trigger_source: `${documentType}_creation`,
      triggered_by: userCode,
    };

    if (attachments.length > 0) {
      requestBody.attachments = attachments;
    }

    if (templateId) {
      requestBody.template_id = templateId;
    }

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: requestBody,
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
