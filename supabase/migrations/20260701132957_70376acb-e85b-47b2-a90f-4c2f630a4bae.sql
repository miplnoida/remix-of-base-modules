
-- Seed the numbering sequence used to auto-generate text_block_code values.
-- Pattern: TB-{DEPARTMENT}-{SEQ}   e.g. TB-BN-0007, TB-SHARED-0002
-- department_code is passed in as the module (BN, CE, GLOBAL, SHARED, ...) so
-- the code carries scope, while the counter is shared and monotonic.

INSERT INTO public.core_number_sequence (
  module_code, entity_type, country_code,
  prefix_pattern, number_pattern, separator,
  padding_length, current_number, reset_frequency,
  is_active, description
) VALUES (
  'CORE', 'TEXT_BLOCK', 'SKN',
  '', 'TB-{DEPARTMENT}-{SEQ}', '-',
  4, 0, 'NEVER',
  TRUE,
  'Auto-generated codes for core_text_block. Consumed by Text Blocks admin — replaces manual code entry.'
)
ON CONFLICT (module_code, entity_type, country_code) DO NOTHING;
