ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS enterprise_metadata jsonb;

COMMENT ON COLUMN public.lg_document_link.enterprise_metadata IS
  'Snapshot of resolveEnterpriseContext() at link time: organization, department, module, location identifiers and display names plus confidentiality.';

CREATE INDEX IF NOT EXISTS lg_document_link_enterprise_org_idx
  ON public.lg_document_link ((enterprise_metadata->>'organization_id'));
CREATE INDEX IF NOT EXISTS lg_document_link_enterprise_dept_idx
  ON public.lg_document_link ((enterprise_metadata->>'department_code'));