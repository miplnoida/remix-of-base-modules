ALTER TABLE ia_document_template_sections DROP CONSTRAINT IF EXISTS ia_doc_tmpl_sections_section_fk;

UPDATE ia_document_section_library SET section_key = 'approval' WHERE section_key = 'approval_signoff';
UPDATE ia_document_template_sections SET section_key = 'approval' WHERE section_key = 'approval_signoff';

ALTER TABLE ia_document_template_sections
  ADD CONSTRAINT ia_doc_tmpl_sections_section_fk
  FOREIGN KEY (section_key) REFERENCES ia_document_section_library(section_key);