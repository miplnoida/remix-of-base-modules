UPDATE ia_org_document_foundation
SET
  color_palette = '{"primary":"#0E5F3A","secondary":"#1A7A4E","accent":"#D4EDDA","tableHeader":"#0E5F3A","tableStripe":"#F0F8F4","text":"#1A1A1A","gold":"#C4A756","gapAnalysisHeader":"#B71C1C"}'::jsonb,
  typography = jsonb_set(
    jsonb_set(
      typography::jsonb,
      '{headingColor}', '"#0E5F3A"'
    ),
    '{bodyColor}', '"#1A1A1A"'
  ),
  table_style = '{"headerBackground":"#0E5F3A","headerTextColor":"#FFFFFF","stripedRows":true,"stripeColor":"#F0F8F4","borderColor":"#C8D6CF","repeatHeaderOnPageBreak":true,"fontSize":"normal","autoFitMode":"auto_fit_window","boldTotalRows":true,"cellPadding":6}'::jsonb,
  updated_at = now()
WHERE foundation_key = 'default';