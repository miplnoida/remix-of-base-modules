UPDATE ia_document_section_library
SET applies_to = ARRAY['audit_report', 'mgmt_response', 'audit_plan']
WHERE section_key = 'approval';