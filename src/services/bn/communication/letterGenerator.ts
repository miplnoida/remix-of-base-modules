/**
 * BN Standard Letter Generator
 *
 * Loads the central notification_template + its latest active version,
 * merges with `bn_letter.merge_context`, renders a PDF, and writes back:
 *   - rendered_subject / rendered_body_html / rendered_body_text
 *   - subject / body_html (legacy mirror)
 *   - pdf_storage_path
 *   - template_version_id + template_version_no (snapshot reference)
 *
 * Snapshot fields preserve the exact content used at generation time even if
 * the template later changes.
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
    if (v !== undefined && v !== null && v !== '') return String(v);
    // Case-insensitive fallback against the merge context (CLAIM_NUMBER vs ClaimNumber)
    const lc = key.toLowerCase();
    for (const k of Object.keys(ctx || {})) {
      if (k.toLowerCase() === lc) {
        const val = (ctx as any)[k];
        return val === undefined || val === null ? '' : String(val);
      }
    }
    return '';
  });
}

export async function renderLetterPdf(letterId: string, userCode: string): Promise<string> {
  const { data: letter, error } = await db
    .from('bn_letter')
    .select('id, claim_id, template_id, template_version_id, subject, rendered_subject, body_html, rendered_body_html, merge_context, recipient_name, recipient_address_snapshot')
    .eq('id', letterId)
    .maybeSingle();
  if (error || !letter) throw new Error(error?.message || 'Letter not found');

  // Prefer existing snapshot (re-print scenario). Otherwise resolve from central template.
  let subjectTpl: string = letter.rendered_subject || letter.subject || '';
  let htmlTpl: string | null = letter.rendered_body_html || letter.body_html || null;
  let textTpl: string | null = null;
  let templateVersionId: string | null = letter.template_version_id || null;
  let templateVersionNo: number | null = null;

  const hasSnapshot = !!letter.rendered_body_html;

  if (!hasSnapshot && letter.template_id) {
    // Load latest active version (snapshot for the future)
    const { data: versionRows } = await db
      .from('notification_template_versions')
      .select('id, version_no, subject, html_body, body')
      .eq('template_id', letter.template_id)
      .order('version_no', { ascending: false })
      .limit(1);
    const ver = Array.isArray(versionRows) ? versionRows[0] : null;
    if (ver) {
      subjectTpl = subjectTpl || ver.subject || '';
      htmlTpl = htmlTpl || ver.html_body || (ver.body ? `<pre style="white-space:pre-wrap">${ver.body}</pre>` : null);
      textTpl = ver.body || null;
      templateVersionId = ver.id;
      templateVersionNo = ver.version_no;
    }
    if (!htmlTpl) {
      const { data: tpl } = await db
        .from('notification_templates')
        .select('subject, html_body, body, version_no')
        .eq('id', letter.template_id)
        .maybeSingle();
      subjectTpl = subjectTpl || tpl?.subject || '';
      htmlTpl = htmlTpl || tpl?.html_body || (tpl?.body ? `<pre style="white-space:pre-wrap">${tpl.body}</pre>` : null);
      textTpl = textTpl || tpl?.body || null;
      templateVersionNo = templateVersionNo ?? tpl?.version_no ?? null;
    }
  }

  if (!htmlTpl) throw new Error('No template body available for letter');

  const ctx = letter.merge_context || {};
  const renderedBodyHtml = mergePlaceholders(htmlTpl, ctx);
  const renderedSubject = mergePlaceholders(subjectTpl, ctx);
  const renderedBodyText = textTpl ? mergePlaceholders(textTpl, ctx) : null;
  const addr = letter.recipient_address_snapshot || {};
  const addressBlock = [
    letter.recipient_name,
    addr.line1, addr.line2,
    [addr.city, addr.state || addr.parish].filter(Boolean).join(', '),
    addr.postal, addr.country,
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
      <div>${renderedBodyHtml}</div>
    </body></html>`;

  const pdfBase64 = await htmlToPdfBase64(fullHtml);
  const storagePath = `data:application/pdf;base64,${pdfBase64}`;

  await db.from('bn_letter').update({
    pdf_storage_path: storagePath,
    rendered_subject: renderedSubject,
    rendered_body_html: renderedBodyHtml,
    rendered_body_text: renderedBodyText,
    template_version_id: templateVersionId,
    template_version_no: templateVersionNo,
    // Legacy mirror so older consumers keep working
    body_html: renderedBodyHtml,
    subject: renderedSubject || subjectTpl,
    generated_at: new Date().toISOString(),
    status: 'GENERATED',
  }).eq('id', letterId);

  await writeBnAudit({
    module: 'BN_COMMUNICATION',
    entityType: 'bn_letter',
    entityId: letterId,
    action: 'LETTER_GENERATED',
    performedBy: userCode,
    afterValue: { subject: renderedSubject, template_version_id: templateVersionId, template_version_no: templateVersionNo, has_pdf: true },
  });

  return storagePath;
}

export async function downloadLetterPdf(letterId: string, userCode: string): Promise<void> {
  let { data: letter } = await db.from('bn_letter').select('id, pdf_storage_path, subject, rendered_subject').eq('id', letterId).maybeSingle();
  if (!letter?.pdf_storage_path) {
    await renderLetterPdf(letterId, userCode);
    const refreshed = await db.from('bn_letter').select('id, pdf_storage_path, subject, rendered_subject').eq('id', letterId).maybeSingle();
    letter = refreshed.data;
  }
  if (!letter?.pdf_storage_path) throw new Error('Failed to generate PDF');
  const a = document.createElement('a');
  a.href = letter.pdf_storage_path;
  const fname = (letter.rendered_subject || letter.subject || 'letter').replace(/[^a-z0-9-]+/gi, '_');
  a.download = `${fname}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
