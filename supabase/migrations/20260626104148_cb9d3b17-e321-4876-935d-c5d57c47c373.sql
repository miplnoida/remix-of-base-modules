
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id,
       '1e9a1000-0000-0000-0000-000000000230'::uuid,
       'b08cf28d-50ae-4109-ad27-cd7a72dced83'::uuid,
       true
FROM public.roles r
WHERE r.role_name IN ('Admin','LEGAL_ADMIN','LEGAL_MANAGER','LEGAL_OFFICER','SENIOR_LEGAL_OFFICER','LEGAL_READ_ONLY')
ON CONFLICT DO NOTHING;
