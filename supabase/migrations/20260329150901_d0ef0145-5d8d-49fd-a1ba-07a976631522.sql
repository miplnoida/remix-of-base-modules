
-- Insert Master Data parent module
INSERT INTO public.app_modules (name, display_name, description, is_enabled, show_in_menu, sort_order)
VALUES ('master_data', 'Master Data', 'Master data management modules', true, true, 900)
ON CONFLICT (name) DO NOTHING;

-- Insert 29 child modules under Master Data
DO $$
DECLARE
  parent_id uuid;
  mod_record RECORD;
BEGIN
  SELECT id INTO parent_id FROM public.app_modules WHERE name = 'master_data' LIMIT 1;

  FOR mod_record IN
    SELECT * FROM (VALUES
      ('md_activity', 'Activity Types', 'Manage activity types', 1),
      ('md_bank_code', 'Bank Codes', 'Manage bank codes', 2),
      ('md_batch_status', 'Batch Status', 'Manage batch statuses', 3),
      ('md_c3_status', 'C3 Status', 'Manage C3 statuses', 4),
      ('md_country', 'Countries', 'Manage countries', 5),
      ('md_dependent_relation', 'Dependent Relations', 'Manage dependent relations', 6),
      ('md_district', 'Districts', 'Manage districts', 7),
      ('md_eye_color', 'Eye Colors', 'Manage eye colors', 8),
      ('md_industry', 'Industries', 'Manage industries', 9),
      ('md_inspector', 'Inspectors', 'Manage inspectors', 10),
      ('md_invoice_status', 'Invoice Status', 'Manage invoice statuses', 11),
      ('md_invoice_types', 'Invoice Types', 'Manage invoice types', 12),
      ('md_legal_status', 'Legal Status', 'Manage legal statuses', 13),
      ('md_marital', 'Marital Status', 'Manage marital statuses', 14),
      ('md_merchant', 'Merchants', 'Manage merchants', 15),
      ('md_method_of_payment', 'Methods of Payment', 'Manage payment methods', 16),
      ('md_occupation', 'Occupations', 'Manage occupations', 17),
      ('md_payer_type', 'Payer Types', 'Manage payer types', 18),
      ('md_payment_sources', 'Payment Sources', 'Manage payment sources', 19),
      ('md_payment_type', 'Payment Types', 'Manage payment types', 20),
      ('md_penalty', 'Penalty Rates', 'Manage penalty rates', 21),
      ('md_postal_district', 'Postal Districts', 'Manage postal districts', 22),
      ('md_receipt_status', 'Receipt Status', 'Manage receipt statuses', 23),
      ('md_relation', 'Relations', 'Manage relations', 24),
      ('md_sector', 'Sectors', 'Manage sectors', 25),
      ('md_ssc_rates', 'SSC Rates', 'Manage SSC rates', 26),
      ('md_vc_contrib_rate', 'VC Contrib Rates', 'Manage VC contribution rates', 27),
      ('md_vc_eligibility_config', 'VC Eligibility Config', 'Manage VC eligibility config', 28),
      ('md_verify', 'Verification Types', 'Manage verification types', 29),
      ('md_villages', 'Villages', 'Manage villages', 30)
    ) AS t(name, display_name, description, sort_order)
  LOOP
    INSERT INTO public.app_modules (name, display_name, description, parent_id, is_enabled, show_in_menu, sort_order)
    VALUES (mod_record.name, mod_record.display_name, mod_record.description, parent_id, true, true, mod_record.sort_order)
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END $$;

-- Insert default actions (view, create, edit, delete) for each master data module
DO $$
DECLARE
  mod_record RECORD;
  action_record RECORD;
BEGIN
  FOR mod_record IN
    SELECT id, name FROM public.app_modules
    WHERE name LIKE 'md_%'
  LOOP
    FOR action_record IN
      SELECT * FROM (VALUES ('view', 'View'), ('create', 'Create'), ('edit', 'Edit'), ('delete', 'Delete')) AS t(action_name, display_name)
    LOOP
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (mod_record.id, action_record.action_name, action_record.display_name, true)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
