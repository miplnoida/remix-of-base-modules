
-- =========================================================================
-- EPIC CH-TRACE-1 — Universal Communication Trace Center
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.communication_hub_trace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_no text UNIQUE NOT NULL,
  correlation_id text,
  module_code text,
  event_code text,
  channel text NOT NULL DEFAULT 'email',
  entity_type text,
  entity_id text,
  reference_no text,
  source_module text,
  source_screen text,
  source_action text,
  initiated_by uuid,
  recipient_email_masked text,
  recipient_domain text,
  status text NOT NULL DEFAULT 'initiated',
  current_stage text,
  blocked_stage text,
  blocker_codes text[] NOT NULL DEFAULT '{}',
  request_id uuid,
  request_no text,
  message_id uuid,
  provider_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_hub_trace TO authenticated;
GRANT ALL ON public.communication_hub_trace TO service_role;

ALTER TABLE public.communication_hub_trace ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trace_admin_select" ON public.communication_hub_trace;
CREATE POLICY "trace_admin_select" ON public.communication_hub_trace
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ch_trace_module_event ON public.communication_hub_trace(module_code, event_code);
CREATE INDEX IF NOT EXISTS idx_ch_trace_request_id ON public.communication_hub_trace(request_id);
CREATE INDEX IF NOT EXISTS idx_ch_trace_request_no ON public.communication_hub_trace(request_no);
CREATE INDEX IF NOT EXISTS idx_ch_trace_message_id ON public.communication_hub_trace(message_id);
CREATE INDEX IF NOT EXISTS idx_ch_trace_entity ON public.communication_hub_trace(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ch_trace_reference_no ON public.communication_hub_trace(reference_no);
CREATE INDEX IF NOT EXISTS idx_ch_trace_status ON public.communication_hub_trace(status);
CREATE INDEX IF NOT EXISTS idx_ch_trace_created_at ON public.communication_hub_trace(created_at DESC);

CREATE TABLE IF NOT EXISTS public.communication_hub_trace_step (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL REFERENCES public.communication_hub_trace(id) ON DELETE CASCADE,
  stage_code text NOT NULL,
  stage_name text NOT NULL,
  status text NOT NULL,
  blocker_codes text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  plain_summary text,
  fix_href text,
  request_id uuid,
  message_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_hub_trace_step TO authenticated;
GRANT ALL ON public.communication_hub_trace_step TO service_role;

ALTER TABLE public.communication_hub_trace_step ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trace_step_admin_select" ON public.communication_hub_trace_step;
CREATE POLICY "trace_step_admin_select" ON public.communication_hub_trace_step
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ch_trace_step_trace_id ON public.communication_hub_trace_step(trace_id, created_at);

CREATE SEQUENCE IF NOT EXISTS public.communication_hub_trace_no_seq;

CREATE OR REPLACE FUNCTION public._ch_mask_email(p_email text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_at int; v_local text; v_domain text; v_head text;
BEGIN
  IF p_email IS NULL OR length(p_email) = 0 THEN RETURN NULL; END IF;
  v_at := position('@' in p_email);
  IF v_at <= 1 THEN RETURN p_email; END IF;
  v_local := substr(p_email, 1, v_at - 1);
  v_domain := substr(p_email, v_at + 1);
  v_head := substr(v_local, 1, LEAST(2, length(v_local)));
  RETURN v_head || repeat('*', GREATEST(1, length(v_local) - length(v_head))) || '@' || v_domain;
END; $$;

CREATE OR REPLACE FUNCTION public._ch_extract_domain(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_email IS NULL OR position('@' in p_email) = 0 THEN NULL
              ELSE lower(substr(p_email, position('@' in p_email) + 1)) END
$$;

CREATE OR REPLACE FUNCTION public.start_comm_hub_trace(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_no text; v_email text;
BEGIN
  v_no := 'TRC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.communication_hub_trace_no_seq')::text, 6, '0');
  v_email := NULLIF(p_payload->>'recipient_email', '');
  INSERT INTO public.communication_hub_trace (
    trace_no, correlation_id, module_code, event_code, channel,
    entity_type, entity_id, reference_no, source_module, source_screen, source_action,
    initiated_by, recipient_email_masked, recipient_domain, status, current_stage, metadata
  ) VALUES (
    v_no, NULLIF(p_payload->>'correlation_id',''), NULLIF(p_payload->>'module_code',''),
    NULLIF(p_payload->>'event_code',''), COALESCE(NULLIF(p_payload->>'channel',''), 'email'),
    NULLIF(p_payload->>'entity_type',''), NULLIF(p_payload->>'entity_id',''),
    NULLIF(p_payload->>'reference_no',''), NULLIF(p_payload->>'source_module',''),
    NULLIF(p_payload->>'source_screen',''), NULLIF(p_payload->>'source_action',''),
    NULLIF(p_payload->>'initiated_by','')::uuid,
    public._ch_mask_email(v_email), public._ch_extract_domain(v_email),
    COALESCE(NULLIF(p_payload->>'status',''), 'initiated'),
    NULLIF(p_payload->>'current_stage',''),
    COALESCE(p_payload->'metadata', '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'trace_id', v_id, 'trace_no', v_no);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.start_comm_hub_trace(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.append_comm_hub_trace_step(p_trace_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_step_id uuid;
  v_blockers text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'blocker_codes','[]'::jsonb)));
  v_warnings text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'warnings','[]'::jsonb)));
BEGIN
  IF p_trace_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'trace_id required'); END IF;
  INSERT INTO public.communication_hub_trace_step (
    trace_id, stage_code, stage_name, status, blocker_codes, warnings,
    plain_summary, fix_href, request_id, message_id, payload
  ) VALUES (
    p_trace_id,
    COALESCE(NULLIF(p_payload->>'stage_code',''), 'UNKNOWN'),
    COALESCE(NULLIF(p_payload->>'stage_name',''), NULLIF(p_payload->>'stage_code',''), 'Unknown'),
    COALESCE(NULLIF(p_payload->>'status',''), 'info'),
    v_blockers, v_warnings,
    NULLIF(p_payload->>'plain_summary',''), NULLIF(p_payload->>'fix_href',''),
    NULLIF(p_payload->>'request_id','')::uuid, NULLIF(p_payload->>'message_id','')::uuid,
    COALESCE(p_payload->'payload','{}'::jsonb)
  ) RETURNING id INTO v_step_id;

  UPDATE public.communication_hub_trace
     SET updated_at = now(),
         current_stage = COALESCE(NULLIF(p_payload->>'set_current_stage',''), NULLIF(p_payload->>'stage_code',''), current_stage),
         status = COALESCE(NULLIF(p_payload->>'set_status',''), status),
         blocked_stage = COALESCE(NULLIF(p_payload->>'set_blocked_stage',''), blocked_stage),
         blocker_codes = CASE WHEN array_length(v_blockers,1) IS NULL THEN blocker_codes
                              ELSE ARRAY(SELECT DISTINCT unnest(blocker_codes || v_blockers)) END
   WHERE id = p_trace_id;
  RETURN jsonb_build_object('ok', true, 'step_id', v_step_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END; $$;
GRANT EXECUTE ON FUNCTION public.append_comm_hub_trace_step(uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.link_comm_hub_trace_request(p_trace_id uuid, p_request_id uuid, p_request_no text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.communication_hub_trace
     SET request_id = COALESCE(request_id, p_request_id),
         request_no = COALESCE(request_no, p_request_no),
         updated_at = now()
   WHERE id = p_trace_id;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END; $$;
GRANT EXECUTE ON FUNCTION public.link_comm_hub_trace_request(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.link_comm_hub_trace_message(p_trace_id uuid, p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.communication_hub_trace
     SET message_id = COALESCE(message_id, p_message_id), updated_at = now()
   WHERE id = p_trace_id;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END; $$;
GRANT EXECUTE ON FUNCTION public.link_comm_hub_trace_message(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_comm_hub_trace(p_trace_id uuid, p_status text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.communication_hub_trace
     SET status = COALESCE(p_status, status),
         current_stage = COALESCE(NULLIF(p_payload->>'current_stage',''), current_stage),
         blocked_stage = COALESCE(NULLIF(p_payload->>'blocked_stage',''), blocked_stage),
         provider_message_id = COALESCE(NULLIF(p_payload->>'provider_message_id',''), provider_message_id),
         updated_at = now()
   WHERE id = p_trace_id;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_comm_hub_trace(uuid, text, jsonb) TO authenticated, service_role;

-- Unified view (native + reconstructed from legacy)
CREATE OR REPLACE VIEW public.communication_hub_trace_unified_view AS
SELECT
  t.id AS trace_id, t.trace_no, 'native'::text AS trace_kind,
  t.module_code, t.event_code, t.channel, t.entity_type, t.entity_id, t.reference_no,
  t.recipient_email_masked, t.recipient_domain, t.status, t.current_stage, t.blocked_stage,
  t.blocker_codes, t.request_id, t.request_no, t.message_id, t.provider_message_id,
  t.correlation_id, t.source_module, t.created_at, t.updated_at,
  NULL::text AS reconstructed_note
FROM public.communication_hub_trace t
UNION ALL
SELECT
  r.id AS trace_id, ('REC-' || r.request_no) AS trace_no, 'reconstructed'::text AS trace_kind,
  r.module_code, r.event_code, COALESCE(m.channel::text, 'email') AS channel,
  r.entity_type, r.entity_id, r.reference_no,
  public._ch_mask_email(cr.email) AS recipient_email_masked,
  public._ch_extract_domain(cr.email) AS recipient_domain,
  COALESCE(r.status, 'unknown') AS status,
  NULL::text AS current_stage, NULL::text AS blocked_stage,
  '{}'::text[] AS blocker_codes,
  r.id AS request_id, r.request_no, m.id AS message_id, m.provider_message_id,
  NULLIF(r.context->>'correlation_id','') AS correlation_id,
  r.module_code AS source_module,
  r.created_at, COALESCE(r.updated_at, r.created_at) AS updated_at,
  'Legacy trace reconstructed from request/message/event logs'::text AS reconstructed_note
FROM public.communication_request r
LEFT JOIN LATERAL (
  SELECT cm.id, cm.channel, cm.provider_message_id
    FROM public.communication_message cm WHERE cm.request_id = r.id
   ORDER BY cm.created_at ASC LIMIT 1
) m ON true
LEFT JOIN LATERAL (
  SELECT crx.email FROM public.communication_recipient crx
   WHERE crx.request_id = r.id ORDER BY crx.created_at ASC LIMIT 1
) cr ON true
WHERE NOT EXISTS (SELECT 1 FROM public.communication_hub_trace t2 WHERE t2.request_id = r.id);

GRANT SELECT ON public.communication_hub_trace_unified_view TO authenticated, service_role;
