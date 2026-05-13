DO $$
DECLARE
  v_root           uuid := '839cee37-4006-43a4-a53c-6d0cea76a6b0';
  v_config         uuid := '92c8c16d-91c7-4868-bbce-04254af6fc97';
  v_country        uuid := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  v_operations     uuid;
  v_payment_prep   uuid;
  v_inquiry        uuid;
BEGIN
  INSERT INTO public.app_modules (name, display_name, icon, parent_id, sort_order, show_in_menu, is_enabled)
  VALUES ('bn_operations', 'Operations', 'ClipboardList', v_root, 10, true, true)
  ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name, parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order, show_in_menu = true, is_enabled = true,
        icon = EXCLUDED.icon
  RETURNING id INTO v_operations;

  INSERT INTO public.app_modules (name, display_name, icon, parent_id, sort_order, show_in_menu, is_enabled)
  VALUES ('bn_payment_preparation', 'Payment Preparation', 'CreditCard', v_root, 20, true, true)
  ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name, parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order, show_in_menu = true, is_enabled = true,
        icon = EXCLUDED.icon
  RETURNING id INTO v_payment_prep;

  INSERT INTO public.app_modules (name, display_name, icon, parent_id, sort_order, show_in_menu, is_enabled)
  VALUES ('bn_inquiry_history', 'Inquiry & History', 'History', v_root, 30, true, true)
  ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name, parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order, show_in_menu = true, is_enabled = true,
        icon = EXCLUDED.icon
  RETURNING id INTO v_inquiry;

  -- OPERATIONS
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=10, display_name='Dashboard / Worklist', show_in_menu=true, is_enabled=true WHERE name='bn_claim_worklist';
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=20, display_name='Claim Queue', show_in_menu=true, is_enabled=true WHERE name='bn_claim_queue';
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=30, display_name='Register New Claim', show_in_menu=true, is_enabled=true WHERE name='bn_register_claim';
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=40, display_name='Claim 360 / Person 360', show_in_menu=true, is_enabled=true WHERE name='bn_person_360';
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=50, display_name='Approval Console', show_in_menu=true, is_enabled=true WHERE name='bn_approval_console';
  UPDATE public.app_modules SET parent_id=v_operations, sort_order=60, display_name='Entitlements', show_in_menu=true, is_enabled=true WHERE name='bn_entitlements';

  -- PAYMENT PREPARATION
  UPDATE public.app_modules SET parent_id=v_payment_prep, sort_order=10, display_name='Payables Queue', show_in_menu=true, is_enabled=true WHERE name='bn_payables_queue';
  UPDATE public.app_modules SET parent_id=v_payment_prep, sort_order=20, display_name='Payment Schedules', show_in_menu=true, is_enabled=true WHERE name='bn_payment_schedules';
  UPDATE public.app_modules SET parent_id=v_payment_prep, sort_order=30, display_name='Batch Operations', show_in_menu=true, is_enabled=true WHERE name='bn_batch_operations';
  UPDATE public.app_modules SET parent_id=v_payment_prep, sort_order=40, display_name='Payment Issue', show_in_menu=true, is_enabled=true WHERE name='bn_payment_issue';
  UPDATE public.app_modules SET parent_id=v_payment_prep, sort_order=50, display_name='Post-Issue Review', show_in_menu=true, is_enabled=true WHERE name='bn_post_issue';

  -- INQUIRY & HISTORY
  UPDATE public.app_modules SET parent_id=v_inquiry, sort_order=10, display_name='Historical Inquiry', show_in_menu=true, is_enabled=true WHERE name='bn_historical_inquiry';
  UPDATE public.app_modules SET parent_id=v_inquiry, sort_order=20, display_name='Calculation Simulation', show_in_menu=true, is_enabled=true WHERE name='bn_simulation';

  -- CONFIGURATION group ordering
  UPDATE public.app_modules SET parent_id=v_root, sort_order=40, display_name='Configuration', show_in_menu=true, is_enabled=true WHERE id=v_config;
  UPDATE public.app_modules SET sort_order=10  WHERE name='bn_product_catalog';
  UPDATE public.app_modules SET sort_order=20  WHERE name='bn_rule_groups';
  UPDATE public.app_modules SET sort_order=30  WHERE name='bn_rules_admin';
  UPDATE public.app_modules SET sort_order=40  WHERE name='bn_formulas';
  UPDATE public.app_modules SET sort_order=50  WHERE name='bn_doc_setup';
  UPDATE public.app_modules SET sort_order=60  WHERE name='bn_screen_setup';
  UPDATE public.app_modules SET sort_order=70  WHERE name='bn_calc_engine';
  UPDATE public.app_modules SET sort_order=80  WHERE name='bn_transitions';
  UPDATE public.app_modules SET sort_order=90  WHERE name='bn_reason_codes';
  UPDATE public.app_modules SET sort_order=100 WHERE name='bn_workbaskets';
  UPDATE public.app_modules SET sort_order=110 WHERE name='bn_escalation';
  UPDATE public.app_modules SET sort_order=120 WHERE name='bn_service_doc_types';

  -- COUNTRY PACKS – move under Benefit Management root, sort 50
  UPDATE public.app_modules SET parent_id=v_root, sort_order=50, display_name='Country Packs', show_in_menu=true, is_enabled=true WHERE id=v_country;
  UPDATE public.app_modules SET show_in_menu=true, is_enabled=true WHERE parent_id=v_country;

  -- Hide entries not in the new spec
  UPDATE public.app_modules SET show_in_menu=false WHERE name IN (
     'bn_dashboard','bn_worklist_enhanced','bn_approval_queue','bn_exceptions',
     'bn_post_issue_enhanced','bn_payment_history','bn_audit_history',
     'bn_life_certificates','bn_medical_reviews','bn_overpayments',
     'bn_award_suspension','bn_survivors'
  );

  -- Ensure root visible
  UPDATE public.app_modules
     SET display_name='Benefit Management', show_in_menu=true, is_enabled=true,
         icon=COALESCE(icon,'Heart')
   WHERE id=v_root;
END $$;