
UPDATE public.notification_types SET is_active = true, updated_at = now() WHERE code = 'SMS';

INSERT INTO public.notification_types (code, display_name, description, icon, display_order, is_active)
SELECT 'PUSH', 'Push Notification', 'Push notification channel', 'bell', 30, true
WHERE NOT EXISTS (SELECT 1 FROM public.notification_types WHERE code = 'PUSH');

INSERT INTO public.notification_types (code, display_name, description, icon, display_order, is_active)
SELECT 'IN_APP', 'In-App Message', 'In-app message channel', 'smartphone', 40, true
WHERE NOT EXISTS (SELECT 1 FROM public.notification_types WHERE code = 'IN_APP');
