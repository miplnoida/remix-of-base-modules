
CREATE OR REPLACE FUNCTION public.comm_asset_where_used(p_asset_id uuid)
RETURNS TABLE (
  scope text,
  ref_id uuid,
  ref_code text,
  ref_name text,
  detail text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'DEPARTMENT'::text,
         dp.id,
         dp.department_code,
         dp.department_name,
         CASE
           WHEN dp.default_logo_asset_id          = p_asset_id THEN 'default_logo'
           WHEN dp.default_small_logo_asset_id    = p_asset_id THEN 'default_small_logo'
           WHEN dp.default_header_asset_id        = p_asset_id THEN 'default_header'
           WHEN dp.default_footer_asset_id        = p_asset_id THEN 'default_footer'
           WHEN dp.default_email_header_asset_id  = p_asset_id THEN 'default_email_header'
           WHEN dp.default_email_footer_asset_id  = p_asset_id THEN 'default_email_footer'
           WHEN dp.default_watermark_asset_id     = p_asset_id THEN 'default_watermark'
           WHEN dp.default_seal_asset_id          = p_asset_id THEN 'default_seal'
           WHEN dp.default_stamp_asset_id         = p_asset_id THEN 'default_stamp'
           WHEN dp.default_signature_asset_id     = p_asset_id THEN 'default_signature'
           WHEN dp.default_qr_asset_id            = p_asset_id THEN 'default_qr'
           WHEN dp.default_letterhead_id          = p_asset_id THEN 'default_letterhead'
         END
  FROM public.core_department_profile dp
  WHERE p_asset_id IN (
    dp.default_logo_asset_id, dp.default_small_logo_asset_id, dp.default_header_asset_id,
    dp.default_footer_asset_id, dp.default_email_header_asset_id, dp.default_email_footer_asset_id,
    dp.default_watermark_asset_id, dp.default_seal_asset_id, dp.default_stamp_asset_id,
    dp.default_signature_asset_id, dp.default_qr_asset_id, dp.default_letterhead_id
  )
  UNION ALL
  SELECT 'OVERRIDE'::text, m.id,
         m.communication_type,
         COALESCE(m.communication_type, m.module_code, m.department_code, 'global'),
         m.category::text || COALESCE(' · ' || m.communication_type, '')
  FROM public.comm_asset_mapping m
  WHERE m.asset_id = p_asset_id AND m.is_active
  UNION ALL
  SELECT 'GENERATED'::text, g.id, g.reference_no, g.doc_type_code,
         g.generated_at::text
  FROM public.core_generated_document g
  WHERE (to_jsonb(g.*) ->> 'resolved_tokens') ILIKE '%' || p_asset_id::text || '%'
  ORDER BY 1
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.comm_asset_where_used(uuid) TO authenticated, service_role;
