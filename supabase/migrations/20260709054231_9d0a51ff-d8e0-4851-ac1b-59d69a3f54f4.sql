
DO $$
DECLARE
  v_req_id uuid := gen_random_uuid();
  v_rcpt_id uuid := gen_random_uuid();
  v_msg_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.communication_request (
    id, request_no, module_code, event_code, channels, priority, status, payload, context, idempotency_key, created_at
  ) VALUES (
    v_req_id,
    'CHR-LIVE-TEST-001-' || to_char(now(),'YYYYMMDDHH24MISS'),
    'platform_test', 'comm_hub.live_test_001',
    ARRAY['email']::text[], 'normal', 'pending',
    '{"subject":"Comm Hub live test 001","greeting":"Hello Rohit"}'::jsonb,
    jsonb_build_object('origin','comm_hub','correlation_id', gen_random_uuid()::text, 'note','first controlled live test'),
    'comm-hub-live-test-001',
    now()
  );

  INSERT INTO public.communication_recipient (
    id, request_id, role, recipient_type, name, email, channel_hint
  ) VALUES (
    v_rcpt_id, v_req_id, 'to', 'user',
    'Rohit (Comm Hub live test)', 'rohit@mishainfotech.com', 'email'
  );

  INSERT INTO public.communication_message (
    id, request_id, recipient_id, channel, subject, body_text, body_html,
    status, origin, test_mode, created_at
  ) VALUES (
    v_msg_id, v_req_id, v_rcpt_id, 'email',
    'Comm Hub live test 001',
    'Hello Rohit,'||chr(10)||chr(10)||'This is the Communication Hub Phase 1C-B3 first controlled live email test.'||chr(10)||'Idempotency key: comm-hub-live-test-001.'||chr(10)||chr(10)||'-- SSBM Platform',
    '<p>Hello Rohit,</p><p>This is the <strong>Communication Hub</strong> Phase 1C-B3 first controlled live email test.</p><p>Idempotency key: <code>comm-hub-live-test-001</code>.</p><p>-- SSBM Platform</p>',
    'queued', 'comm_hub', false, now()
  );

  INSERT INTO public.communication_event_log (request_id, message_id, event_type, source, payload)
  VALUES (v_req_id, v_msg_id, 'queued', 'manual-live-test',
          jsonb_build_object('stage','SEEDED_FOR_LIVE_TEST','test_id','comm-hub-live-test-001'));
END $$;
