CREATE OR REPLACE VIEW public.ce_v_employer_timeline AS

SELECT v.employer_id, v.created_at AS event_date, 'VIOLATION_CREATED' AS event_type, 'VIOLATION' AS event_category,
  'Violation Created: ' || v.violation_number AS title,
  COALESCE(vt.name, v.summary, 'New violation') AS description,
  v.status, v.id AS reference_id, 'ce_violations' AS source_table
FROM ce_violations v LEFT JOIN ce_violation_types vt ON v.violation_type_id = vt.id
WHERE v.is_deleted = false

UNION ALL

SELECT v.employer_id, vh.performed_at AS event_date, 'VIOLATION_STATUS_CHANGE' AS event_type, 'VIOLATION' AS event_category,
  'Status: ' || COALESCE(vh.from_value, '?') || ' → ' || COALESCE(vh.to_value, '?') AS title,
  COALESCE(vh.notes, '') AS description,
  vh.to_value AS status, v.id AS reference_id, 'ce_violation_history' AS source_table
FROM ce_violation_history vh JOIN ce_violations v ON vh.violation_id = v.id
WHERE v.is_deleted = false

UNION ALL

SELECT n.employer_id, COALESCE(n.sent_at, n.created_at) AS event_date,
  CASE n.status WHEN 'DRAFT' THEN 'NOTICE_CREATED' WHEN 'SENT' THEN 'NOTICE_SENT' WHEN 'DELIVERED' THEN 'NOTICE_DELIVERED' WHEN 'ACKNOWLEDGED' THEN 'NOTICE_ACKNOWLEDGED' ELSE 'NOTICE_UPDATED' END AS event_type,
  'NOTICE' AS event_category,
  'Notice ' || n.notice_number || ': ' || COALESCE(REPLACE(n.notice_type, '_', ' '), '') AS title,
  COALESCE(n.subject, '') AS description,
  n.status, n.id AS reference_id, 'ce_notices' AS source_table
FROM ce_notices n

UNION ALL

SELECT fa.employer_id, COALESCE(fa.due_date, fa.created_at) AS event_date,
  CASE fa.status WHEN 'COMPLETED' THEN 'FOLLOWUP_COMPLETED' WHEN 'CANCELLED' THEN 'FOLLOWUP_CANCELLED' ELSE 'FOLLOWUP_SCHEDULED' END AS event_type,
  'FOLLOW_UP' AS event_category,
  REPLACE(fa.action_type, '_', ' ') || ' — Follow-up' AS title,
  COALESCE(fa.description, '') AS description,
  fa.status, fa.id AS reference_id, 'ce_follow_up_actions' AS source_table
FROM ce_follow_up_actions fa

UNION ALL

SELECT rp.employer_id, rsh.calculated_at AS event_date, 'RISK_SCORE_CHANGE' AS event_type, 'RISK' AS event_category,
  'Risk: ' || ROUND(rsh.new_score, 1) || ' (' || COALESCE(rsh.new_band, '?') || ')' AS title,
  'Previous: ' || ROUND(rsh.previous_score, 1) || ' (' || COALESCE(rsh.previous_band, '?') || ')' AS description,
  rsh.new_band AS status, rsh.id AS reference_id, 'ce_risk_score_history' AS source_table
FROM ce_risk_score_history rsh
JOIN ce_risk_profiles rp ON rsh.risk_profile_id = rp.id;

COMMENT ON VIEW public.ce_v_employer_timeline IS 'Unified chronological event stream for employer 360 view';