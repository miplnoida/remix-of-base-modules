DO $$
DECLARE v_id uuid; v_parent uuid; a text;
BEGIN
  SELECT id INTO v_parent FROM public.app_modules WHERE name = 'internal_audit_configuration' LIMIT 1;
  SELECT id INTO v_id FROM public.app_modules WHERE name = 'audit_template_library';
  IF v_id IS NULL THEN
    INSERT INTO public.app_modules (name, display_name, description, route, parent_id, is_enabled, show_in_menu, primary_table)
    VALUES ('audit_template_library', 'Audit Template Library',
            'Internal Audit reusable template register and governance (programmes, checklists, plan and document templates)',
            '/audit/template-library', v_parent, true, false, 'ia_audit_programs')
    RETURNING id INTO v_id;
  END IF;
  FOREACH a IN ARRAY ARRAY['view','create','edit','clone','create_version','approve','retire','set_default','delete'] LOOP
    IF NOT EXISTS (SELECT 1 FROM public.module_actions WHERE module_id = v_id AND action_name = a) THEN
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (v_id, a, initcap(replace(a,'_',' ')), true);
    END IF;
  END LOOP;
END $$;