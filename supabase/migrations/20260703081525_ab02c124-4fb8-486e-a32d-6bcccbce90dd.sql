
-- Reparent the pre-existing dashboard row rather than duplicating it
UPDATE public.app_modules
SET display_name = 'Legal Recovery Dashboard',
    icon         = 'gauge',
    route        = '/legal/lg/legal-recovery-dashboard',
    parent_id    = '1e9a2000-0000-0000-0000-0000000000e0',
    sort_order   = 5,
    is_enabled   = true,
    show_in_menu = true,
    description  = 'EPIC-07 portfolio KPIs',
    updated_at   = now()
WHERE name = 'lg_legal_recovery_dashboard';

INSERT INTO public.app_modules
  (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description)
VALUES
  ('1e9a2000-0000-0000-0000-0000000000f1', 'lg_judgment_compliance', 'Judgment Compliance', 'gavel',          '/legal/lg/judgment-compliance', '1e9a2000-0000-0000-0000-0000000000e0', 50, true, true, 'EPIC-07 judgment compliance workbench'),
  ('1e9a2000-0000-0000-0000-0000000000f2', 'lg_consent_orders',      'Consent Orders',      'file-signature', '/legal/lg/consent-orders',      '1e9a2000-0000-0000-0000-0000000000e0', 55, true, true, 'EPIC-07 consent orders workbench'),
  ('1e9a2000-0000-0000-0000-0000000000f3', 'lg_legal_settlements',   'Legal Settlements',   'handshake',      '/legal/lg/settlements',         '1e9a2000-0000-0000-0000-0000000000e0', 60, true, true, 'EPIC-07 legal settlements workbench'),
  ('1e9a2000-0000-0000-0000-0000000000f4', 'lg_court_filings',       'Court Filings',       'file-text',      '/legal/lg/court-filings',       '1e9a2000-0000-0000-0000-0000000000e0', 65, true, true, 'EPIC-07 court filings workbench'),
  ('1e9a2000-0000-0000-0000-0000000000f5', 'lg_external_counsel',    'External Counsel',    'briefcase',      '/legal/lg/external-counsel',    '1e9a2000-0000-0000-0000-0000000000e0', 70, true, true, 'EPIC-07 external counsel register'),
  ('1e9a2000-0000-0000-0000-0000000000f6', 'lg_legal_cost_recovery', 'Legal Cost Recovery', 'receipt',        '/legal/lg/cost-recovery',       '1e9a2000-0000-0000-0000-0000000000e0', 75, true, true, 'EPIC-07 legal cost recovery workbench')
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    icon         = EXCLUDED.icon,
    route        = EXCLUDED.route,
    parent_id    = EXCLUDED.parent_id,
    sort_order   = EXCLUDED.sort_order,
    is_enabled   = EXCLUDED.is_enabled,
    show_in_menu = EXCLUDED.show_in_menu,
    description  = EXCLUDED.description,
    updated_at   = now();
