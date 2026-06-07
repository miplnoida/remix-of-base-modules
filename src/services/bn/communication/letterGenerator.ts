/**
 * BN Standard Letter Generator
 *
 * Loads the central notification_template + its latest active version,
 * merges with `bn_letter.merge_context`, generates a central reference
 * number, renders a branded PDF, and writes back:
 *   - rendered_subject / rendered_body_html / rendered_body_text
 *   - reference_number, department_code, document_type, issued_by_office
 *   - subject / body_html (legacy mirror)
 *   - pdf_storage_path
 *   - template_version_id + template_version_no (snapshot reference)
 */
import { supabase } from '@/integrations/supabase/client';
import { htmlToPdfBase64 } from '@/lib/htmlToPdf';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';
import { generateReferenceNumber, bnDocumentTypeFor, MissingReferenceSequenceError } from '@/services/reference/referenceNumberService';
import { getDefaultOffice, officeMergeTokens } from '@/services/system/officeSettingsService';

const db = supabase as any;

function mergePlaceholders(template: string, ctx: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split('.');
    let v: any = ctx;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== '') return String(v);
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

function buildBrandedHtml(opts: {
  office: any | null;
  referenceNumber: string;
  dateIssued: string;
  recipientName?: string | null;
  addressBlock: string;
  subject: string;
  bodyHtml: string;
}): string {
  const o = opts.office || {};
  const officeAddr = [o.address_line_1, o.address_line_2, [o.city, o.state].filter(Boolean).join(', '), o.postal_code, o.country]
    .filter(Boolean).join('<br/>');
  const logoTag = o.logo_url ? `<img src="${o.logo_url}" alt="logo" style="height:64px"/>` : '';
  const sig = (o.signature_block || '').replace(/\n/g, '<br/>');
  return `
    <html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#111;padding:32px;}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #064e3b;padding-bottom:12px;margin-bottom:18px;}
      .office{font-size:11pt;line-height:1.35;}
      .office .name{font-weight:bold;font-size:13pt;color:#064e3b}
      .meta{margin:18px 0;font-size:10pt;color:#444;display:flex;justify-content:space-between}
      .addr{margin:12px 0;padding:8px 12px;border-left:3px solid #064e3b;background:#f7faf9}
      .subject{font-weight:bold;margin:18px 0 8px;font-size:12.5pt}
      .body{line-height:1.5}
      .sig{margin-top:36px;font-size:11pt;color:#222}
      .foot{margin-top:32px;border-top:1px solid #ddd;padding-top:8px;font-size:9pt;color:#666;text-align:center}
    </style></head><body>
      <div class="head">
        <div class="office">
          <div class="name">${o.office_name || 'St. Kitts and Nevis Social Security Board'}</div>
          ${o.department_name ? `<div>${o.department_name}</div>` : ''}
          <div>${officeAddr}</div>
          <div>${[o.phone, o.email].filter(Boolean).join(' · ')}</div>
        </div>
        <div>${logoTag}</div>
      </div>
      <div class="meta">
        <div><strong>Ref:</strong> ${opts.referenceNumber}</div>
        <div><strong>Date:</strong> ${opts.dateIssued}</div>
      </div>
      <div class="addr">
        ${opts.recipientName ? `<strong>${opts.recipientName}</strong><br/>` : ''}
        ${opts.addressBlock || '—'}
      </div>
      ${opts.subject ? `<div class="subject">Subject: ${opts.subject}</div>` : ''}
      <div class="body">${opts.bodyHtml}</div>
      ${sig ? `<div class="sig">${sig}</div>` : ''}
      <div class="foot">This is an official communication from the Social Security Board. Quote ref ${opts.referenceNumber} in all correspondence.</div>
    </body></html>`;
}

export async function renderLetterPdf(letterId: string, userCode: string): Promise<string> {
  const { data: letter, error } = await db
    .from('bn_letter')
    .select('id, claim_id, template_id, template_version_id, subject, rendered_subject, body_html, rendered_body_html, merge_context, recipient_name, recipient_address_snapshot, reference_number, department_code, document_type, issued_by_office, event_code')
    .eq('id', letterId)
    .maybeSingle();
  if (error || !letter) throw new Error(error?.message || 'Letter not found');

  // 1) Office branding
  const office = await getDefaultOffice();
  const officeTokens = officeMergeTokens(office);

  // 2) Reference number (allocate if missing)
  let referenceNumber = letter.reference_number as string | null;
  let documentType = letter.document_type || bnDocumentTypeFor(letter.event_code);
  let departmentCode = letter.department_code || 'BENEFITS';
  if (!referenceNumber) {
    try {
      const ref = await generateReferenceNumber({
        moduleCode: 'BN',
        departmentCode,
        documentType,
      });
      referenceNumber = ref.referenceNumber;
    } catch (e: any) {
      if (e instanceof MissingReferenceSequenceError) throw e;
      throw new Error(`Failed to allocate reference number: ${e?.message || e}`);
    }
  }

  // Helpers for safe plain-text → HTML conversion (preserves blank lines, escapes HTML).
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const normalizeNewlines = (s: string) => s.replace(/\\r\\n|\\n|\\r/g, '\n');
  const textToHtml = (s: string) => normalizeNewlines(s)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 10px">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // 3) Template snapshot resolution
  let subjectTpl: string = letter.rendered_subject || letter.subject || '';
  let htmlTpl: string | null = letter.rendered_body_html || letter.body_html || null;
  let textTpl: string | null = null;
  let templateVersionId: string | null = letter.template_version_id || null;
  let templateVersionNo: number | null = null;
  const hasSnapshot = !!letter.rendered_body_html;

  if (!hasSnapshot && letter.template_id) {
    const { data: versionRows } = await db
      .from('notification_template_versions')
      .select('id, version_no, subject, html_body, body')
      .eq('template_id', letter.template_id)
      .order('version_no', { ascending: false })
      .limit(1);
    const ver = Array.isArray(versionRows) ? versionRows[0] : null;
    if (ver) {
      subjectTpl = subjectTpl || ver.subject || '';
      htmlTpl = htmlTpl || ver.html_body || (ver.body ? textToHtml(ver.body) : null);
      textTpl = ver.body ? normalizeNewlines(ver.body) : null;
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
      htmlTpl = htmlTpl || tpl?.html_body || (tpl?.body ? textToHtml(tpl.body) : null);
      textTpl = textTpl || (tpl?.body ? normalizeNewlines(tpl.body) : null);
      templateVersionNo = templateVersionNo ?? tpl?.version_no ?? null;
    }
  }

  if (!htmlTpl) throw new Error('No template body available for letter');

  // 4) Merge with full context (claim ctx + office tokens + reference)
  const dateIssued = new Date().toISOString().slice(0, 10);
  const ctx = {
    ...(letter.merge_context || {}),
    ...officeTokens,
    REFERENCE_NUMBER: referenceNumber,
    ReferenceNumber: referenceNumber,
    SIGNATURE_BLOCK: office?.signature_block || '',
    SignatureBlock: office?.signature_block || '',
  };
  const renderedBodyHtml = mergePlaceholders(htmlTpl, ctx);
  const renderedSubject = mergePlaceholders(subjectTpl, ctx);
  const renderedBodyText = textTpl ? mergePlaceholders(textTpl, ctx) : null;
  const addr = letter.recipient_address_snapshot || {};
  const addressBlock = [
    addr.line1, addr.line2,
    [addr.city, addr.state || addr.parish].filter(Boolean).join(', '),
    addr.postal, addr.country,
  ].filter(Boolean).join('<br/>');

  const fullHtml = buildBrandedHtml({
    office,
    referenceNumber: referenceNumber!,
    dateIssued,
    recipientName: letter.recipient_name,
    addressBlock,
    subject: renderedSubject,
    bodyHtml: renderedBodyHtml,
  });

  const pdfBase64 = await htmlToPdfBase64(fullHtml);
  const storagePath = `data:application/pdf;base64,${pdfBase64}`;

  await db.from('bn_letter').update({
    pdf_storage_path: storagePath,
    reference_number: referenceNumber,
    department_code: departmentCode,
    document_type: documentType,
    issued_by_office: office?.id || null,
    rendered_subject: renderedSubject,
    rendered_body_html: renderedBodyHtml,
    rendered_body_text: renderedBodyText,
    template_version_id: templateVersionId,
    template_version_no: templateVersionNo,
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
    afterValue: {
      reference_number: referenceNumber,
      document_type: documentType,
      department_code: departmentCode,
      subject: renderedSubject,
      template_version_id: templateVersionId,
      template_version_no: templateVersionNo,
      has_pdf: true,
    },
  });

  return storagePath;
}

export async function downloadLetterPdf(letterId: string, userCode: string): Promise<void> {
  let { data: letter } = await db.from('bn_letter').select('id, pdf_storage_path, subject, rendered_subject, reference_number').eq('id', letterId).maybeSingle();
  if (!letter?.pdf_storage_path) {
    await renderLetterPdf(letterId, userCode);
    const refreshed = await db.from('bn_letter').select('id, pdf_storage_path, subject, rendered_subject, reference_number').eq('id', letterId).maybeSingle();
    letter = refreshed.data;
  }
  if (!letter?.pdf_storage_path) throw new Error('Failed to generate PDF');
  const a = document.createElement('a');
  a.href = letter.pdf_storage_path;
  const refPart = (letter.reference_number || letter.rendered_subject || letter.subject || 'letter').replace(/[^a-z0-9-]+/gi, '_');
  a.download = `${refPart}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
