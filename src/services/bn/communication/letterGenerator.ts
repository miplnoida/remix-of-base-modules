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
import { htmlToPdfBase64 } from '@/lib/htmlToPdf';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';
import { renderBnLetter } from './bnLetterRenderer';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export async function renderLetterPdf(letterId: string, userCode: string): Promise<string> {
  const rendered = await renderBnLetter(letterId);
  const pdfBase64 = await htmlToPdfBase64(rendered.printableHtml);
  const storagePath = `data:application/pdf;base64,${pdfBase64}`;

  await db.from('bn_letter').update({ pdf_storage_path: storagePath }).eq('id', letterId);

  await writeBnAudit({
    module: 'BN_COMMUNICATION',
    entityType: 'bn_letter',
    entityId: letterId,
    action: 'LETTER_GENERATED',
    performedBy: userCode,
    afterValue: {
      reference_number: rendered.referenceNumber,
      subject: rendered.subject,
      template_version_id: rendered.templateVersionId,
      template_version_no: rendered.templateVersionNo,
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
