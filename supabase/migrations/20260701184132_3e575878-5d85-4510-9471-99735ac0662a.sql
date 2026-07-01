
INSERT INTO public.core_template_layout (code, name, description, has_letterhead, page_size, orientation, show_page_numbers, show_generated_date, show_doc_reference, is_pre_printed, is_active, created_by)
VALUES
  ('BASE_EMAIL',        'Base Email Layout',        'Canonical email shell: brand header, resolved signature slot, resolved footer + disclaimer, language fallback.', false, 'A4', 'portrait', false, true,  false, false, true, 'SEED-CORE'),
  ('BASE_LETTER',       'Base Letter Layout',       'Canonical letter shell: resolved letterhead, body, resolved signature block, resolved footer + disclaimer.',      true,  'A4', 'portrait', true,  true,  true,  false, true, 'SEED-CORE'),
  ('BASE_NOTICE',       'Base Notice Layout',       'Canonical notice shell: resolved letterhead, subject band, body, signature, legal disclaimer.',                    true,  'A4', 'portrait', true,  true,  true,  false, true, 'SEED-CORE'),
  ('BASE_CERTIFICATE',  'Base Certificate Layout',  'Certificate shell with ornamental frame, resolved letterhead + seal, signature slot.',                             true,  'A4', 'landscape',false, true,  true,  false, true, 'SEED-CORE'),
  ('BASE_STATEMENT',    'Base Statement Layout',    'Statement shell: letterhead, tabular body, page numbers, resolved footer.',                                        true,  'A4', 'portrait', true,  true,  true,  false, true, 'SEED-CORE'),
  ('BASE_RECEIPT',      'Base Receipt Layout',      'Receipt shell: compact header, transaction table, footer note.',                                                   true,  'A5', 'portrait', false, true,  true,  false, true, 'SEED-CORE'),
  ('BASE_REPORT',       'Base Report Layout',       'Report shell: cover, TOC-ready sections, page numbers, footer.',                                                   true,  'A4', 'portrait', true,  true,  true,  false, true, 'SEED-CORE'),
  ('BASE_SMS',          'Base SMS Layout',          'SMS shell: 160-char guidance, sender ID, opt-out token.',                                                          false, 'A4', 'portrait', false, false, false, false, true, 'SEED-CORE'),
  ('BASE_WHATSAPP',     'Base WhatsApp Layout',     'WhatsApp shell: header/body/footer components, template button slots.',                                            false, 'A4', 'portrait', false, false, false, false, true, 'SEED-CORE'),
  ('BASE_IN_APP',       'Base In-App Notification', 'In-app shell: title, body, action buttons, severity icon slot.',                                                   false, 'A4', 'portrait', false, false, false, false, true, 'SEED-CORE')
ON CONFLICT (code) DO NOTHING;
