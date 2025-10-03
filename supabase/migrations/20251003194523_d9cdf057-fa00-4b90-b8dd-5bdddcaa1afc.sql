-- Fix search_path for log_document_action function
CREATE OR REPLACE FUNCTION log_document_action()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      NEW.uploaded_by,
      (SELECT full_name FROM profiles WHERE id = NEW.uploaded_by),
      'Uploaded document: ' || NEW.name || ' (' || NEW.type || ')'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.version > OLD.version THEN
    INSERT INTO legal_timeline_events (case_id, type, actor_id, actor_name, description)
    VALUES (
      NEW.case_id,
      'Document',
      auth.uid(),
      (SELECT full_name FROM profiles WHERE id = auth.uid()),
      'New version of document: ' || NEW.name || ' (v' || NEW.version || ')'
    );
  END IF;
  RETURN NEW;
END;
$$;