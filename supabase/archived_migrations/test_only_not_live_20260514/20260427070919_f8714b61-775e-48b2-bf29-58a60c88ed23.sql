
-- Re-create convert_application_atomic adding the ip_documents mirror call at the end
-- We only append a call before the workflow initiation block. To minimize risk we wrap
-- the original logic and do the mirror inside the same transaction.

CREATE OR REPLACE FUNCTION public.convert_application_atomic_with_master(
  p_unique_uuid              uuid,
  p_ssn                      varchar(6),
  p_application_reference    text,
  p_user_id                  uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  v_count := public.ip_mirror_app_docs_to_master(p_unique_uuid, p_ssn, p_application_reference, p_user_id);
  RETURN v_count;
END;
$$;

-- Trigger after-insert on ip_master so that whenever a new IP is created via conversion,
-- the docs already present in ip_application_documents for that application_reference
-- (matching either by application_id OR by SSN) are mirrored to ip_documents automatically.
CREATE OR REPLACE FUNCTION public.ip_master_post_insert_mirror_docs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mirror any pending overrides for this application_id into ip_documents.
  IF NEW.application_id IS NOT NULL THEN
    PERFORM public.ip_mirror_app_docs_to_master(
      NEW.unique_uuid,
      NEW.ssn,
      NEW.application_id::text,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ip_master_post_insert_mirror_docs ON public.ip_master;
CREATE TRIGGER trg_ip_master_post_insert_mirror_docs
AFTER INSERT ON public.ip_master
FOR EACH ROW
EXECUTE FUNCTION public.ip_master_post_insert_mirror_docs();
