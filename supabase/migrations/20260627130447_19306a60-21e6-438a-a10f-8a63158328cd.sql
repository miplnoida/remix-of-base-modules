
-- Tag the approved system-default seal with the canonical SSB_OFFICIAL_SEAL code
UPDATE public.comm_media_asset
SET asset_code = 'SSB_OFFICIAL_SEAL', usage_slot = COALESCE(usage_slot,'SSB_OFFICIAL_SEAL')
WHERE category = 'seal'
  AND approval_status = 'approved'
  AND is_active = true
  AND is_system_default = true
  AND (asset_code IS NULL OR asset_code IN ('OSSS'));

-- Tag the approved system-default letterhead footer with canonical SSB_STANDARD_PRINT_FOOTER
UPDATE public.comm_media_asset
SET asset_code = 'SSB_STANDARD_PRINT_FOOTER', usage_slot = COALESCE(usage_slot,'SSB_STANDARD_PRINT_FOOTER')
WHERE category = 'letterhead_footer'
  AND approval_status = 'approved'
  AND is_active = true
  AND is_system_default = true
  AND asset_code IS NULL;

-- Tag the approved system-default signature with SSB_DEFAULT_SIGNATURE (used as fallback only)
UPDATE public.comm_media_asset
SET asset_code = 'SSB_DEFAULT_SIGNATURE', usage_slot = COALESCE(usage_slot,'SSB_DEFAULT_SIGNATURE')
WHERE category = 'signature'
  AND approval_status = 'approved'
  AND is_active = true
  AND is_system_default = true
  AND asset_code IS NULL;
