
INSERT INTO public.app_modules (name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES ('benefit_management', 'Benefit Management', 'Heart', '', NULL, 250, true, true);

INSERT INTO public.app_modules (name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('bn_claim_worklist', 'Claim Worklist', 'ClipboardList', '/bn/claims',
    (SELECT id FROM public.app_modules WHERE name = 'benefit_management'), 10, true, true),
  ('bn_register_claim', 'Register New Claim', 'FileText', '/bn/intake/register',
    (SELECT id FROM public.app_modules WHERE name = 'benefit_management'), 20, true, true),
  ('bn_configuration', 'Configuration', 'Settings', '',
    (SELECT id FROM public.app_modules WHERE name = 'benefit_management'), 30, true, true);

INSERT INTO public.app_modules (name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('bn_product_catalog', 'Product Catalog', 'Globe', '/bn/config/products',
    (SELECT id FROM public.app_modules WHERE name = 'bn_configuration'), 10, true, true);
