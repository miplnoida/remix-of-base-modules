import { supabase } from '@/integrations/supabase/client';
import { bnDocumentTypeFor, generateReferenceNumber, MissingReferenceSequenceError } from '@/services/reference/referenceNumberService';
import { getDefaultOffice, officeMergeTokens } from '@/services/system/officeSettingsService';

const db = supabase as any;

export interface RenderedBnLetter {
  letterId: string;
  referenceNumber: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  printableHtml: string;
  templateId: string;
  templateVersionId: string | null;
  templateVersionNo: number | null;
  mergeContext: Record<string, any>;
  office: any | null;
}

const normalizeNewlines = (value: string) => String(value || '').replace(/\\r\\n|\\n|\\r/g, '\n');

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const stripHtml = (value: string) => String(value || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .trim();

const textToHtml = (value: string) => normalizeNewlines(value)
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
  .join('\n');

export function mergePlaceholders(template: string, context: Record<string, any>): string {
  if (!template) return '';
  return normalizeNewlines(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const direct = context?.[key];
    if (direct !== undefined && direct !== null && direct !== '') return String(direct);
    const lowerKey = key.toLowerCase();
    for (const ctxKey of Object.keys(context || {})) {
      if (ctxKey.toLowerCase() === lowerKey) {
        const value = context[ctxKey];
        return value === undefined || value === null ? '' : String(value);
      }
    }
    return '';
  });
}

function formatDateForLetter(value = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(value);
}

function addressLines(address: any): string[] {
  return [
    address?.line1,
    address?.line2,
    [address?.city, address?.state || address?.parish].filter(Boolean).join(', '),
    address?.postal,
    address?.country,
  ].filter(Boolean);
}

function buildFormalLetterHtml(opts: {
  office: any | null;
  referenceNumber: string;
  dateIssued: string;
  recipientName?: string | null;
  recipientAddress: any;
  subject: string;
  bodyHtml: string;
}): string {
  const office = opts.office || {};
  const officeAddress = [
    office.address_line_1,
    office.address_line_2,
    [office.city, office.state].filter(Boolean).join(', '),
    office.postal_code,
    office.country,
  ].filter(Boolean);
  const recipient = [opts.recipientName, ...addressLines(opts.recipientAddress)].filter(Boolean);
  const logo = office.logo_url
    ? `<img class="letter-logo" src="${escapeHtml(office.logo_url)}" alt="St. Kitts and Nevis Social Security Board logo"/>`
    : `<div class="letter-logo-fallback">SSB</div>`;
  const signature = office.signature_block
    ? textToHtml(office.signature_block)
    : textToHtml('Yours faithfully,\n\nBenefits Department\nSt. Christopher and Nevis Social Security Board');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.subject || 'Benefit Letter')}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.55; }
    .letter-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 18mm 18mm; background: #ffffff; }
    .letter-head { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; padding-bottom: 14px; border-bottom: 3px solid #0e5f3a; }
    .office-name { margin: 0; color: #0e5f3a; font-size: 18pt; font-weight: 700; letter-spacing: 0; }
    .department-name { margin: 2px 0 8px; font-size: 12pt; font-weight: 700; color: #374151; }
    .office-lines { color: #4b5563; font-size: 10.5pt; line-height: 1.4; }
    .letter-logo { max-height: 72px; max-width: 96px; object-fit: contain; }
    .letter-logo-fallback { width: 72px; height: 72px; border: 2px solid #0e5f3a; color: #0e5f3a; display: grid; place-items: center; font-weight: 700; border-radius: 999px; }
    .letter-meta { display: grid; grid-template-columns: 1fr auto; gap: 16px; margin: 18px 0 22px; font-size: 10.5pt; }
    .recipient { margin: 0 0 18px; white-space: pre-line; }
    .subject { margin: 0 0 18px; font-weight: 700; text-transform: none; }
    .body p { margin: 0 0 12px; }
    .body ul, .body ol { margin: 0 0 12px 22px; padding: 0; }
    .signature { margin-top: 34px; }
    .signature p { margin: 0 0 6px; }
    .footer { margin-top: 34px; padding-top: 10px; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 9pt; text-align: center; }
    @media print { body { background: #ffffff; } .letter-page { width: auto; min-height: auto; margin: 0; padding: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <main class="letter-page">
    <header class="letter-head">
      <section>
        <h1 class="office-name">${escapeHtml(office.office_name || 'St. Christopher and Nevis Social Security Board')}</h1>
        <div class="department-name">${escapeHtml(office.department_name || 'Benefits Department')}</div>
        <div class="office-lines">
          ${officeAddress.map(escapeHtml).join('<br/>')}
          ${(office.phone || office.email) ? `<br/>${[office.phone, office.email].filter(Boolean).map(escapeHtml).join(' | ')}` : ''}
        </div>
      </section>
      ${logo}
    </header>

    <section class="letter-meta">
      <div><strong>Reference No.:</strong> ${escapeHtml(opts.referenceNumber)}</div>
      <div><strong>Date:</strong> ${escapeHtml(opts.dateIssued)}</div>
    </section>

    <section class="recipient">${recipient.map(escapeHtml).join('\n')}</section>
    ${opts.subject ? `<section class="subject">Subject: ${escapeHtml(opts.subject)}</section>` : ''}
    <section class="body">${opts.bodyHtml}</section>
    <section class="signature">${signature}</section>
    <footer class="footer">This is an official communication from the St. Christopher and Nevis Social Security Board. Please quote the reference number in all correspondence.</footer>
  </main>
</body>
</html>`;
}

async function loadLatestLetterTemplate(templateId: string) {
  const { data: template, error: templateError } = await db
    .from('notification_templates')
    .select('id, template_code, name, channel, subject, body, html_body, version_no, is_enabled')
    .eq('id', templateId)
    .maybeSingle();
  if (templateError) throw templateError;
  if (!template) throw new Error('No letter template configured for this event/product.');
  if (String(template.channel || '').toUpperCase() !== 'LETTER') {
    throw new Error('No letter template configured for this event/product.');
  }

  const { data: versions } = await db
    .from('notification_template_versions')
    .select('id, version_no, subject, body, html_body')
    .eq('template_id', templateId)
    .order('version_no', { ascending: false })
    .limit(1);
  const version = Array.isArray(versions) ? versions[0] : null;

  return {
    template,
    version,
    subject: version?.subject || template.subject || '',
    html: version?.html_body || template.html_body || (version?.body || template.body ? textToHtml(version?.body || template.body) : ''),
    text: version?.body || template.body || stripHtml(version?.html_body || template.html_body || ''),
    versionId: version?.id || null,
    versionNo: version?.version_no ?? template.version_no ?? null,
  };
}

export async function renderBnLetter(letterId: string): Promise<RenderedBnLetter> {
  const { data: letter, error } = await db
    .from('bn_letter')
    .select('*')
    .eq('id', letterId)
    .maybeSingle();
  if (error || !letter) throw new Error(error?.message || 'Letter not found');

  if (!letter.template_id) throw new Error('No letter template configured for this event/product.');

  const office = await getDefaultOffice();
  if (!office) throw new Error('No issuing office is configured for Benefit letters.');

  const documentType = letter.document_type || bnDocumentTypeFor(letter.event_code) || 'LETTER';
  const departmentCode = letter.issued_department_code || letter.department_code || 'BENEFITS';
  let referenceNumber = letter.reference_number as string | null;
  if (!referenceNumber) {
    try {
      const ref = await generateReferenceNumber({ moduleCode: 'BN', departmentCode, documentType });
      referenceNumber = ref.referenceNumber;
    } catch (err: any) {
      if (err instanceof MissingReferenceSequenceError) throw err;
      throw new Error(err?.message || 'Missing reference sequence blocks letter generation.');
    }
  }

  const tpl = letter.rendered_body_html
    ? null
    : await loadLatestLetterTemplate(letter.template_id);
  const baseSubject = letter.rendered_subject || letter.subject || tpl?.subject || '';
  const baseHtml = letter.rendered_body_html || letter.body_html || tpl?.html || '';
  const baseText = letter.rendered_body_text || tpl?.text || stripHtml(baseHtml);
  const mergeContext = {
    ...(letter.merge_context || {}),
    ...officeMergeTokens(office),
    REFERENCE_NUMBER: referenceNumber,
    ReferenceNumber: referenceNumber,
    DATE: formatDateForLetter(),
    TODAY: formatDateForLetter(),
    OFFICER_NAME: (letter.merge_context || {}).OFFICER_NAME || (letter.merge_context || {}).OfficerName || '',
    DEPARTMENT_NAME: office.department_name || 'Benefits Department',
    SIGNATURE_BLOCK: office.signature_block || '',
  };

  const subject = letter.rendered_subject ? baseSubject : mergePlaceholders(baseSubject, mergeContext);
  const bodyHtml = letter.rendered_body_html ? baseHtml : mergePlaceholders(baseHtml, mergeContext);
  const bodyText = letter.rendered_body_text ? baseText : mergePlaceholders(baseText, mergeContext);
  const printableHtml = buildFormalLetterHtml({
    office,
    referenceNumber,
    dateIssued: formatDateForLetter(),
    recipientName: letter.recipient_name,
    recipientAddress: letter.recipient_address_snapshot || {},
    subject,
    bodyHtml,
  });

  const updatePayload = {
    reference_number: referenceNumber,
    template_id: letter.template_id,
    template_version_id: letter.template_version_id || tpl?.versionId || null,
    template_version_no: letter.template_version_no || tpl?.versionNo || null,
    rendered_subject: subject,
    rendered_body_html: bodyHtml,
    rendered_body_text: bodyText,
    body_html: bodyHtml,
    subject,
    merge_context: mergeContext,
    document_type: documentType,
    department_code: departmentCode,
    issued_department_code: departmentCode,
    issued_office_code: office.office_code,
    issued_by_office: office.id || null,
    generated_at: letter.generated_at || new Date().toISOString(),
    status: ['DRAFT', null, undefined].includes(letter.status) ? 'GENERATED' : letter.status,
  };

  const { error: updateError } = await db.from('bn_letter').update(updatePayload).eq('id', letterId);
  if (updateError) throw updateError;

  return {
    letterId,
    referenceNumber,
    subject,
    bodyHtml,
    bodyText,
    printableHtml,
    templateId: letter.template_id,
    templateVersionId: updatePayload.template_version_id,
    templateVersionNo: updatePayload.template_version_no,
    mergeContext,
    office,
  };
}

export async function ensureBnLetterSnapshot(letterId: string): Promise<RenderedBnLetter> {
  return renderBnLetter(letterId);
}