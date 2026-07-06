UPDATE public.ssb_configuration_asset
SET canonical_route = '/admin/workflows',
    canonical_table = 'workflow_definitions',
    canonical_service = 'useWorkflowManagement',
    updated_at = now()
WHERE asset_key = 'ssb.workflow';