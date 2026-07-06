
UPDATE public.ssb_workflow_policy SET workflow_code='7e20a0ef-c4c0-4618-829e-546862bb22de', updated_at=now() WHERE id='1c62640f-5e2c-4d2e-aae8-03de78c4796a';
UPDATE public.ssb_workflow_policy SET workflow_code='3425a302-1107-425a-8cf3-884fcf5d71d4', updated_at=now() WHERE id='9ea3b311-38ff-4487-b1b7-7df763ae5f44';
UPDATE public.ssb_workflow_policy SET workflow_code='19cce9dc-fd87-4f58-9fee-8e77b07556a0', updated_at=now() WHERE id='ffc4b9ff-b436-4d3d-9c9f-4fc36ed642e1';
UPDATE public.ssb_workflow_policy SET workflow_code='067763e4-a289-4c91-9032-b16f2f2d8e0f', updated_at=now() WHERE id='705583d8-0617-42f9-833c-cabf49da1c0e';
UPDATE public.ssb_workflow_policy SET workflow_code='7bcedae7-b883-4acb-9d43-fd45f1238b9b', updated_at=now() WHERE id='6bfa344a-1a5e-45b2-a9a5-78e7db30b9b6';

INSERT INTO public.core_number_sequence (module_code, entity_type, country_code, prefix_pattern, number_pattern, separator, padding_length, current_number, reset_frequency, is_active, description)
SELECT * FROM (VALUES
  ('SSB.KN.MEMBER',   'MEMBER',   'KN', 'M',  '{seq}', '-', 6, 0, 'NEVER',  true, 'SSB KN Member sequence (canonical)'),
  ('SSB.KN.EMPLOYER', 'EMPLOYER', 'KN', 'E',  '{seq}', '-', 6, 0, 'NEVER',  true, 'SSB KN Employer sequence (canonical)'),
  ('SSB.KN.CLAIM',    'CLAIM',    'KN', 'CL', '{seq}', '-', 8, 0, 'YEARLY', true, 'SSB KN Claim sequence (canonical)'),
  ('SSB.KN.BENEFIT',  'BENEFIT',  'KN', 'BN', '{seq}', '-', 8, 0, 'YEARLY', true, 'SSB KN Benefit sequence (canonical)')
) AS v(module_code, entity_type, country_code, prefix_pattern, number_pattern, separator, padding_length, current_number, reset_frequency, is_active, description)
WHERE NOT EXISTS (SELECT 1 FROM public.core_number_sequence s WHERE s.module_code = v.module_code);

INSERT INTO public.ssp_communication_channel (code, name, category, is_two_way, supports_attachments, description, is_active, sort_order)
SELECT * FROM (VALUES
  ('CASH',   'Cash',                     'PAYMENT', false, false, 'Cash payment channel',           true, 100),
  ('CHEQUE', 'Cheque',                   'PAYMENT', false, true,  'Cheque payment channel',         true, 101),
  ('EFT',    'Electronic Funds Transfer','PAYMENT', false, false, 'EFT payment channel',            true, 102),
  ('ONLINE', 'Online Payment',           'PAYMENT', false, false, 'Online/gateway payment channel', true, 103)
) AS v(code, name, category, is_two_way, supports_attachments, description, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ssp_communication_channel c WHERE c.code = v.code);

INSERT INTO public.ssp_bank (bank_code, bank_name, short_name, country_code, is_active, sort_order)
SELECT 'DEFERRED', 'Deferred / To Be Bound', 'DEFERRED', 'KN', true, 999
WHERE NOT EXISTS (SELECT 1 FROM public.ssp_bank b WHERE b.bank_code='DEFERRED');

INSERT INTO public.core_template (code, name, module_code, country_code, institution_code, template_type, template_category, status, source_system, is_active, scope, owner_scope, is_base_layout, description)
SELECT 'SMS_CHANNEL_DECISION', 'SMS Channel Decision Notification', 'SSB', 'KN', 'SSB', 'SMS', 'DECISION', 'PUBLISHED', 'CORE', true, 'COUNTRY', 'GLOBAL', false, 'Canonical SSB SMS template for channel decision notifications (BN Wave 1 canonical binding).'
WHERE NOT EXISTS (SELECT 1 FROM public.core_template t WHERE t.code='SMS_CHANNEL_DECISION');
