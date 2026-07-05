
BEGIN;

INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('e1a00000-0000-4000-8000-000000000031','md_group_geography','Geography & Location','Countries, districts, villages, postal areas','MapPin',NULL,'e1a00000-0000-4000-8000-000000000003',1,true,true),
  ('e1a00000-0000-4000-8000-000000000032','md_group_people','People & Demographics','Relations, marital status, demographic codes','Users',NULL,'e1a00000-0000-4000-8000-000000000003',2,true,true),
  ('e1a00000-0000-4000-8000-000000000033','md_group_employment','Employment & Organisation','Industries, sectors, occupations, designations','Briefcase',NULL,'e1a00000-0000-4000-8000-000000000003',3,true,true),
  ('e1a00000-0000-4000-8000-000000000034','md_group_finance','Finance & Payment','Banks, merchants, payment types & sources','CreditCard',NULL,'e1a00000-0000-4000-8000-000000000003',4,true,true),
  ('e1a00000-0000-4000-8000-000000000035','md_group_contribution','Contribution & Payroll','Income codes, rates, pay periods, penalties','Calculator',NULL,'e1a00000-0000-4000-8000-000000000003',5,true,true),
  ('e1a00000-0000-4000-8000-000000000036','md_group_status','Status & Workflow Codes','Batch, C3, invoice, receipt, legal status codes','ListChecks',NULL,'e1a00000-0000-4000-8000-000000000003',6,true,true),
  ('e1a00000-0000-4000-8000-000000000037','md_group_compliance','Compliance & Inspection','Inspectors, verification types','ShieldCheck',NULL,'e1a00000-0000-4000-8000-000000000003',7,true,true),
  ('e1a00000-0000-4000-8000-000000000038','md_group_legacy','Legacy / To Be Migrated','Deprecated or pending-migration items','Archive',NULL,'e1a00000-0000-4000-8000-000000000003',8,true,false)
ON CONFLICT (id) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  description=EXCLUDED.description,
  icon=EXCLUDED.icon,
  parent_id=EXCLUDED.parent_id,
  sort_order=EXCLUDED.sort_order,
  is_enabled=EXCLUDED.is_enabled,
  show_in_menu=EXCLUDED.show_in_menu;

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000031', sort_order=1 WHERE name='md_country';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000031', sort_order=2 WHERE name='md_district';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000031', sort_order=3 WHERE name='md_postal_district';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000031', sort_order=4 WHERE name='md_villages';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000032', sort_order=1 WHERE name='md_relation';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000032', sort_order=2 WHERE name='md_dependent_relation';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000032', sort_order=3 WHERE name='md_marital';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000032', sort_order=4 WHERE name='md_eye_color';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000033', sort_order=1 WHERE name='md_industry';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000033', sort_order=2 WHERE name='md_sector';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000033', sort_order=3 WHERE name='md_activity';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000033', sort_order=4 WHERE name='md_occupation';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000033', sort_order=5 WHERE name='master_designations';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=1 WHERE name='md_bank_code';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=2 WHERE name='md_merchant';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=3 WHERE name='md_method_of_payment';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=4 WHERE name='md_payment_type';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=5 WHERE name='md_payment_sources';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000034', sort_order=6 WHERE name='md_payer_type';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=1 WHERE name='income_category_management';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=2 WHERE name='income_code_management';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=3 WHERE name='md_pay_periods';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=4 WHERE name='md_ssc_rates';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=5 WHERE name='md_vc_contrib_rate';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=6 WHERE name='md_vc_eligibility_config';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000035', sort_order=7 WHERE name='md_penalty';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=1 WHERE name='md_batch_status';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=2 WHERE name='md_c3_status';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=3 WHERE name='md_invoice_status';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=4 WHERE name='md_invoice_types';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=5 WHERE name='md_receipt_status';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000036', sort_order=6 WHERE name='md_legal_status';

UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000037', sort_order=1 WHERE name='md_inspector';
UPDATE public.app_modules SET parent_id='e1a00000-0000-4000-8000-000000000037', sort_order=2 WHERE name='md_verify';

UPDATE public.app_modules
   SET parent_id='e1a00000-0000-4000-8000-000000000038', sort_order=1, show_in_menu=false
 WHERE id='d7aae631-5057-4a12-8f4c-53aca7846b60';

COMMIT;
