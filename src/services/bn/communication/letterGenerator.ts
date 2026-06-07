/**
 * BN Standard Letter Generator (Phase E)
 *
 * Given a `bn_letter` row already created by the communication adapter,
 * this service renders the bound template's `html_body` against the
 * letter's `merge_context`, produces a PDF via `htmlToPdfBase64`, and
 * stores the result as a base64 data URL in `bn_letter.pdf_storage_path`.
 *
 * Centralised here so the workbench, the "Generate Letter Instead"
 * action, and any batch printer all use the same code path.
 */
import { supabase } from '@/integrations/supabase/client';
import { htmlToPdfBase64 } from '@/lib/htmlToPdf';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';

const db = supabase as any;

function mergePlaceholders(template: string, ctx: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split('.');
    let v: any = ctx;
    for (const p of parts) v = v?.[p];
    return v === undefined || v === null ? '' : String(v);
  });
}

export async function renderLetterPdf(letterId: string, userCode: string): Promise<string> {
  const { data: letter, error } = await db
    .from('bn_letter')
    .select('id, claim_id, template_id, subject, body_html, merge_context, recipient_name, recipient_address_snapshot')
    .eq('id', letterId)
    .maybeSingle();
  if (error || !letter) throw new Error(error?.message || 'Letter not found');

  let htmlBody: string | null = letter.body_html;
  let subject: string = letter.subject || '';

  if (!htmlBody && letter.template_id) {
    const { data: tpl } = await db
      .from('notification_templates')
      .select('subject, html_body, body')
      .eq('id', letter.template_id)
      .maybeSingle();
    htmlBody = tpl?.html_body || (tpl?.body ? `<pre style="white-space:pre-wrap">${tpl.body}</pre>` : null);
    subject = subject || tpl?.subject || '';
  }

  if (!htmlBody) throw new Error('No template body available for letter');

  const ctx = letter.merge_context || {};
  const rendered = mergePlaceholders(htmlBody, ctx);
  const renderedSubject = mergePlaceholders(subject, ctx);
  const addr = letter.recipient_address_snapshot || {};
  const addressBlock = [
    letter.recipient_name,
    addr.line1, addr.line2, addr.city, addr.parish, addr.country,
  ].filter(Boolean).join('<br/>');

  const fullHtml = `
    <html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#111;padding:32px;}
      h1{font-size:14pt;margin:0 0 12px}
      .addr{margin:24px 0;padding:12px;border:1px solid #ddd}
      .subject{font-weight:bold;margin:16px 0}
    </style></head><body>
      <div class="addr">${addressBlock || '—'}</div>
      ${renderedSubject ? `<div class="subject">${renderedSubject}</div>` : ''}
      <div>${rendered}</div>
    </body></html>`;

  const pdfBase64 = await htmlToPdfBase64(fullHtml);
  const storagePath = `data:application/pdf;base64,${pdfBase64}`;

  await db.from('bn_letter').update({
    pdf_storage_path: storagePath,
    body_html: rendered,
    subject: renderedSubject || subject,
    generated_at: new Date().toISOString(),
  }).eq('id', letterId);

  await writeBnAudit({
    module: 'BN_COMMUNICATION',
    entityType: 'bn_letter',
    entityId: letterId,
    action: 'LETTER_GENERATED',
    performedBy: userCode,
    afterValue: { subject: renderedSubject, has_pdf: true },
  });

  return storagePath;
}

export async function downloadLetterPdf(letterId: string, userCode: string): Promise<void> {
  let { data: letter } = await db.from('bn_letter').select('id, pdf_storage_path, subject').eq('id', letterId).maybeSingle();
  if (!letter?.pdf_storage_path) {
    await renderLetterPdf(letterId, userCode);
    const refreshed = await db.from('bn_letter').select('id, pdf_storage_path, subject').eq('id', letterId).maybeSingle();
    letter = refreshed.data;
  }
  if (!letter?.pdf_storage_path) throw new Error('Failed to generate PDF');
  const a = document.createElement('a');
  a.href = letter.pdf_storage_path;
  a.download = `${(letter.subject || 'letter').replace(/[^a-z0-9-]+/gi, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
