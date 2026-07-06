INSERT INTO public.enterprise_capability_registry (capability_key, capability_name, category, grouping, owner, consumers, dependencies, description, status)
SELECT 'platform_readiness_centre','Platform Readiness Centre','setup_readiness','Setup Centre','Social Security Board Configuration',
  ARRAY['Configuration Centre','SSB Setup','Configuration Governance','BN Product Builder']::text[],
  ARRAY['Configuration Governance','Policy Registry','Business Process Resolvers','Source-Control Verification']::text[],
  'Single readiness cockpit gating BN Product Builder Wave 1.','active'
WHERE NOT EXISTS (SELECT 1 FROM public.enterprise_capability_registry WHERE capability_key='platform_readiness_centre');