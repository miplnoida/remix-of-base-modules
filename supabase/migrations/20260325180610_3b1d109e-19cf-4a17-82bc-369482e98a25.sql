
INSERT INTO public.notification_templates (name, trigger_event, subject, body, placeholders, is_enabled, channel)
SELECT v.name, v.trigger_event, v.subject, v.body, v.placeholders, v.is_enabled, v.channel::notification_channel
FROM (VALUES
  ('IA Communication Stage Sent', 'ia_comm_stage_sent', 'Audit Communication: {{stage_name}}', 'A {{stage_name}} has been sent for audit engagement {{engagement_name}} to {{recipient_name}}.', '["stage_name","engagement_name","recipient_name"]'::jsonb, true, 'in_app'),
  ('IA Communication Acknowledged', 'ia_comm_acknowledged', 'Acknowledgment Received: {{stage_name}}', '{{recipient_name}} has acknowledged the {{stage_name}} for engagement {{engagement_name}}.', '["stage_name","engagement_name","recipient_name"]'::jsonb, true, 'in_app'),
  ('IA Carry-Forward Escalated', 'ia_carryforward_escalated', 'Carry-Forward Escalation: {{finding_ref}}', 'Finding {{finding_ref}} from {{source_year}} has been escalated ({{escalation_count}} times). Target resolution: {{target_date}}.', '["finding_ref","source_year","escalation_count","target_date"]'::jsonb, true, 'email')
) AS v(name, trigger_event, subject, body, placeholders, is_enabled, channel)
WHERE NOT EXISTS (SELECT 1 FROM notification_templates nt WHERE nt.trigger_event = v.trigger_event);
