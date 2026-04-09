UPDATE ia_document_section_library
SET applies_to = ARRAY['audit_report', 'audit_plan', 'mgmt_response']
WHERE section_key = 'executive_summary';