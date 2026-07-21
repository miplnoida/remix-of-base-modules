
-- CH-SIMPLE-P3G — Navigation Simplification
-- Create four new group parents under Communication Hub and re-parent existing rows.
-- Parent Comm Hub id: c0110000-0000-4000-8000-000000000001

-- 1. Create/upsert group parent rows (no route -> group headers)
INSERT INTO public.app_modules (id, name, display_name, parent_id, sort_order, icon, route, show_in_menu, is_enabled)
VALUES
  ('c0110000-0000-4000-8000-0000000000a1', 'communication_hub_events_templates', 'Events & Templates',
     'c0110000-0000-4000-8000-000000000001', 20, 'FileText', NULL, true, true),
  ('c0110000-0000-4000-8000-0000000000a2', 'communication_hub_operations', 'Operations',
     'c0110000-0000-4000-8000-000000000001', 30, 'Activity', NULL, true, true),
  ('c0110000-0000-4000-8000-0000000000a3', 'communication_hub_settings', 'Settings',
     'c0110000-0000-4000-8000-000000000001', 40, 'Settings', NULL, true, true),
  ('c0110000-0000-4000-8000-0000000000a4', 'communication_hub_advanced_diagnostics', 'Advanced Diagnostics',
     'c0110000-0000-4000-8000-000000000001', 50, 'FlaskConical', NULL, true, true)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    icon = EXCLUDED.icon,
    show_in_menu = EXCLUDED.show_in_menu,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = now();

-- 2. Keep Overview + Go Live at Communication Hub root
UPDATE public.app_modules SET sort_order = 5,  parent_id='c0110000-0000-4000-8000-000000000001', show_in_menu=true
  WHERE id='c0110000-0000-4000-8000-000000000010'; -- Overview
UPDATE public.app_modules SET sort_order = 10, parent_id='c0110000-0000-4000-8000-000000000001', show_in_menu=true, display_name='Go Live', icon='Rocket'
  WHERE id='c0110000-0000-4000-8000-00000000001a'; -- Go Live

-- 3. Re-parent existing rows under new groups

-- Operations
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=10
  WHERE id='c0110000-0000-4000-8000-000000000040'; -- Delivery Monitor
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=20
  WHERE id='c0110000-0000-4000-8000-000000000030'; -- Communication Requests
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=30
  WHERE id='c0110000-0000-4000-8000-000000000060'; -- Lifecycle Event Log
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=40
  WHERE id='c0110000-0000-4000-8000-000000000050'; -- Dispatch Register
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=50
  WHERE id='c0110000-0000-4000-8000-000000000070'; -- Failed & Retry Queue
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a2', sort_order=60
  WHERE id='c0110000-0000-4000-8000-000000000080'; -- Print Queue

-- Events & Templates: Design & Templates + Module Onboarding land here
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a1', sort_order=10, display_name='Event → Template Mapping'
  WHERE id='c0110000-0000-4000-8000-000000000021'; -- Design & Templates
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a1', sort_order=20
  WHERE id='c0110000-0000-4000-8000-000000000022'; -- Module Onboarding

-- Settings: Control Center is authoritative operating-mode + emergency stop
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a3', sort_order=10, display_name='Operating Mode & Emergency Stop'
  WHERE id='c0110000-0000-4000-8000-000000000020'; -- Control Center

-- Advanced Diagnostics: Pilots + Governance harnesses
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a4', sort_order=10, display_name='Pilots (Diagnostics)'
  WHERE id='c0110000-0000-4000-8000-000000000023'; -- Pilots
UPDATE public.app_modules SET parent_id='c0110000-0000-4000-8000-0000000000a4', sort_order=20, display_name='Governance & Live Control (Diagnostics)'
  WHERE id='c0110000-0000-4000-8000-000000000024'; -- Governance

-- Log
DO $$ BEGIN
  RAISE NOTICE 'CH-SIMPLE-P3G navigation restructure applied';
END $$;
