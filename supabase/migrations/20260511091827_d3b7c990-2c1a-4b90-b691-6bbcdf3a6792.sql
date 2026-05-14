UPDATE public.app_modules
SET base_url = 'https://compliance.secureserve.biz',
    updated_at = now()
WHERE id = 'ca000000-0000-0000-0000-000000000001'
  AND name = 'compliance_audit';