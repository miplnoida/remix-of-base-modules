INSERT INTO public.communication_request (id, request_no, module_code, event_code, channels, status)
VALUES ('11111111-2222-3333-4444-55555555ec01', 'REQ-B8E1-RECHECK-001', 'System', 'WebhookSelfTest', ARRAY['email']::text[], 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.communication_message (id, request_id, channel, test_mode, status, subject, body_text, attempt_count, sent_at, provider_message_id, origin)
VALUES ('22222222-2222-3333-4444-55555555ec01', '11111111-2222-3333-4444-55555555ec01', 'email', true, 'sent', 'webhook selftest recheck', 'test', 1, now(), 'resend-test-webhook-b8e1-recheck-001', 'comm_hub')
ON CONFLICT (id) DO NOTHING;