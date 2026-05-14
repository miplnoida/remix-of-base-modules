UPDATE ia_org_document_foundation
SET
  color_palette = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              color_palette::jsonb,
              '{primary}', '"#1B365D"'
            ),
            '{secondary}', '"#2F855A"'
          ),
          '{accent}', '"#E8EDF3"'
        ),
        '{tableHeader}', '"#1B365D"'
      ),
      '{tableStripe}', '"#F7F8FA"'
    ),
    '{text}', '"#2D3748"'
  ),
  typography = jsonb_set(
    jsonb_set(
      typography::jsonb,
      '{headingColor}', '"#1B365D"'
    ),
    '{bodyColor}', '"#2D3748"'
  ),
  table_style = jsonb_set(
    jsonb_set(
      jsonb_set(
        table_style::jsonb,
        '{headerBackground}', '"#1B365D"'
      ),
      '{stripeColor}', '"#F7F8FA"'
    ),
    '{borderColor}', '"#D2D6DC"'
  ),
  updated_at = now()
WHERE foundation_key = 'default';