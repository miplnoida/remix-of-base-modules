
-- ══════════════════════════════════════════════════════════════
-- QA Change Request & Approval Mechanism
-- ══════════════════════════════════════════════════════════════

-- 1. Approval status enum
DO $$ BEGIN
  CREATE TYPE qa_change_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Change requests table
CREATE TABLE IF NOT EXISTS public.qa_change_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type         VARCHAR(50)  NOT NULL CHECK (target_type IN ('knowledge_entry', 'test_case')),
  target_id           UUID,                              -- NULL = new record
  change_type         VARCHAR(30)  NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'archive')),
  module              VARCHAR(100),
  title               TEXT         NOT NULL,
  reason              TEXT         NOT NULL,
  proposed_changes    JSONB        NOT NULL DEFAULT '{}',
  before_snapshot     JSONB,
  status              qa_change_status NOT NULL DEFAULT 'pending',
  requested_by        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_code   VARCHAR(20),
  requested_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reviewed_by         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_code    VARCHAR(20),
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  applied_at          TIMESTAMPTZ,
  applied_by          UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.qa_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to qa_change_requests"
  ON public.qa_change_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Any authenticated user can create a change request (but not approve/apply)
CREATE POLICY "Authenticated users can create change requests"
  ON public.qa_change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- 4. Immutability guard: prevent direct edits to KR entries & test cases without a change request
-- We log attempts in an enforcement log instead of hard-blocking (enforcement is in the UI layer)
CREATE TABLE IF NOT EXISTS public.qa_enforcement_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type     VARCHAR(50)  NOT NULL,
  target_id       UUID         NOT NULL,
  action          VARCHAR(30)  NOT NULL,
  attempted_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  change_request_id UUID       REFERENCES public.qa_change_requests(id) ON DELETE SET NULL,
  was_approved    BOOLEAN      NOT NULL DEFAULT false,
  detail          TEXT,
  attempted_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_enforcement_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to qa_enforcement_log"
  ON public.qa_enforcement_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_qa_change_requests_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_change_requests_updated_at ON public.qa_change_requests;
CREATE TRIGGER trg_qa_change_requests_updated_at
  BEFORE UPDATE ON public.qa_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_qa_change_requests_timestamp();

-- 6. Function to approve and apply a change request to qa_knowledge_entries
CREATE OR REPLACE FUNCTION public.apply_qa_change_request(
  p_request_id    UUID,
  p_reviewer_id   UUID,
  p_reviewer_code VARCHAR(20),
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req  qa_change_requests%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Fetch request
  SELECT * INTO v_req FROM public.qa_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Change request not found');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not pending');
  END IF;

  -- Apply the change
  IF v_req.target_type = 'knowledge_entry' THEN
    IF v_req.change_type = 'update' AND v_req.target_id IS NOT NULL THEN
      -- Soft version: mark old as not latest
      UPDATE public.qa_knowledge_entries SET is_latest = false WHERE id = v_req.target_id;
      -- Insert new version
      INSERT INTO public.qa_knowledge_entries
        SELECT
          gen_random_uuid(),
          (v_req.proposed_changes->>'title')::text,
          (v_req.proposed_changes->>'description')::text,
          COALESCE(v_req.proposed_changes->>'rule_type', e.rule_type)::varchar,
          COALESCE(v_req.proposed_changes->>'module', e.module)::varchar,
          COALESCE(v_req.proposed_changes->>'submodule', e.submodule)::varchar,
          COALESCE(v_req.proposed_changes->>'screen_path', e.screen_path)::varchar,
          COALESCE(v_req.proposed_changes->>'api_endpoint', e.api_endpoint)::varchar,
          COALESCE(v_req.proposed_changes->>'db_table', e.db_table)::varchar,
          COALESCE(v_req.proposed_changes->>'workflow_step', e.workflow_step)::varchar,
          COALESCE(v_req.proposed_changes->>'priority', e.priority)::varchar,
          COALESCE(v_req.proposed_changes->>'status', e.status)::varchar,
          COALESCE(v_req.proposed_changes->'rule_definition', e.rule_definition),
          COALESCE(v_req.proposed_changes->>'expected_behavior', e.expected_behavior),
          COALESCE(v_req.proposed_changes->'positive_example', e.positive_example),
          COALESCE(v_req.proposed_changes->'negative_example', e.negative_example),
          COALESCE(v_req.proposed_changes->'boundary_conditions', e.boundary_conditions),
          e.tags,
          e.version + 1,
          true,       -- is_latest
          e.id,       -- parent_id
          p_reviewer_id,
          p_reviewer_code,
          now(),
          p_reviewer_id,
          p_reviewer_code,
          now()
        FROM public.qa_knowledge_entries e WHERE e.id = v_req.target_id;
    ELSIF v_req.change_type = 'delete' AND v_req.target_id IS NOT NULL THEN
      UPDATE public.qa_knowledge_entries SET status = 'archived' WHERE id = v_req.target_id;
    END IF;
  ELSIF v_req.target_type = 'test_case' THEN
    IF v_req.change_type = 'update' AND v_req.target_id IS NOT NULL THEN
      UPDATE public.qa_test_cases
        SET
          title        = COALESCE(v_req.proposed_changes->>'title', title),
          description  = COALESCE(v_req.proposed_changes->>'description', description),
          priority     = COALESCE(v_req.proposed_changes->>'priority', priority),
          status       = COALESCE(v_req.proposed_changes->>'status', status),
          test_config  = COALESCE(v_req.proposed_changes->'test_config', test_config),
          expected_result = COALESCE(v_req.proposed_changes->'expected_result', expected_result),
          updated_at   = now()
        WHERE id = v_req.target_id;
    ELSIF v_req.change_type = 'archive' AND v_req.target_id IS NOT NULL THEN
      UPDATE public.qa_test_cases SET status = 'archived' WHERE id = v_req.target_id;
    END IF;
  END IF;

  -- Mark approved and applied
  UPDATE public.qa_change_requests
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_by_code = p_reviewer_code,
        reviewed_at = now(),
        review_notes = p_notes,
        applied_at = now(),
        applied_by = p_reviewer_id,
        updated_at = now()
    WHERE id = p_request_id;

  -- Enforcement log
  INSERT INTO public.qa_enforcement_log(target_type, target_id, action, attempted_by, change_request_id, was_approved, detail)
    VALUES(v_req.target_type, COALESCE(v_req.target_id, gen_random_uuid()), v_req.change_type, p_reviewer_id, p_request_id, true, 'Approved and applied by ' || p_reviewer_code);

  RETURN jsonb_build_object('success', true, 'applied', true);
END;
$$;

-- 7. Function to reject a change request
CREATE OR REPLACE FUNCTION public.reject_qa_change_request(
  p_request_id    UUID,
  p_reviewer_id   UUID,
  p_reviewer_code VARCHAR(20),
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req qa_change_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.qa_change_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;
  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not pending');
  END IF;

  UPDATE public.qa_change_requests
    SET status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_by_code = p_reviewer_code,
        reviewed_at = now(),
        review_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id;

  INSERT INTO public.qa_enforcement_log(target_type, target_id, action, attempted_by, change_request_id, was_approved, detail)
    VALUES(v_req.target_type, COALESCE(v_req.target_id, gen_random_uuid()), v_req.change_type, p_reviewer_id, p_request_id, false, 'Rejected by ' || p_reviewer_code);

  RETURN jsonb_build_object('success', true, 'rejected', true);
END;
$$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_qa_change_requests_status ON public.qa_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_qa_change_requests_target ON public.qa_change_requests(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_qa_change_requests_module ON public.qa_change_requests(module);
CREATE INDEX IF NOT EXISTS idx_qa_enforcement_log_target ON public.qa_enforcement_log(target_type, target_id);
