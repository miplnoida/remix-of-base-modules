CREATE OR REPLACE FUNCTION public.ia_q_my_audits()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH me AS (SELECT public.ia_current_auditor_id() AS aid),
scope AS (
  SELECT e.*
    FROM public.ia_audit_engagements e
   WHERE public.ia_can_read_all() OR public.ia_can_access_engagement_internal(e.id)
),
rows AS (
  SELECT
    s.id                                   AS engagement_id,
    s.engagement_code,
    s.engagement_name,
    s.department_id,
    d.name                                 AS department_name,
    COALESCE(s.execution_status, 'Planned') AS stage,
    COALESCE(s.status, 'Planned')          AS status,
    s.planned_start_date,
    s.planned_end_date,
    CASE
      WHEN s.lead_auditor_id = (SELECT aid FROM me) THEN 'Lead Auditor'
      WHEN s.reviewer_id = (SELECT aid FROM me) THEN 'Reviewer'
      WHEN (SELECT aid FROM me) IS NOT NULL
       AND s.team_member_ids @> to_jsonb((SELECT aid FROM me)::text) THEN 'Team Member'
      WHEN (SELECT aid FROM me) IS NOT NULL
       AND s.supportive_auditor_ids @> to_jsonb((SELECT aid FROM me)::text) THEN 'Support'
      ELSE 'Oversight'
    END                                    AS my_role,
    (COALESCE(s.execution_status,'Planned') IN
      ('Closed','Cancelled','Closed - Actions Pending','Closed – Actions Pending')
      OR COALESCE(s.status,'') IN ('Closed','Cancelled'))  AS is_closed,
    (SELECT count(*) FROM public.ia_engagement_programme_steps st
      WHERE st.engagement_id = s.id)                                  AS procedures_total,
    (SELECT count(*) FROM public.ia_engagement_programme_steps st
      WHERE st.engagement_id = s.id
        AND COALESCE(st.execution_status,'Not Started')
            IN ('Completed','Concluded','Not Applicable'))            AS procedures_done,
    (SELECT count(*) FROM public.ia_findings f
      WHERE f.engagement_id = s.id)                                   AS findings_total,
    (SELECT count(*) FROM public.ia_findings f
      WHERE f.engagement_id = s.id
        AND COALESCE(f.lifecycle_status,'Draft') IN ('Draft','Under Review')) AS findings_open,
    (SELECT count(*) FROM public.ia_test_exceptions x
      WHERE x.engagement_id = s.id
        AND COALESCE(x.evaluation_status,'Pending') NOT IN ('Evaluated','Closed')) AS exceptions_open,
    (SELECT count(*) FROM public.ia_action_tracking a
      WHERE a.engagement_id = s.id
        AND a.current_target_date IS NOT NULL
        AND a.current_target_date < CURRENT_DATE
        AND COALESCE(a.lifecycle_status,'') NOT IN ('Closed','Verified','Completed')) AS actions_overdue
  FROM scope s
  LEFT JOIN public.ia_departments d ON d.id = s.department_id
)
SELECT COALESCE(
  jsonb_agg(row_to_json(r)::jsonb ORDER BY r.is_closed, r.planned_end_date NULLS LAST),
  '[]'::jsonb)
FROM rows r;
$function$;

CREATE OR REPLACE FUNCTION public.ia_q_continue_audit()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH me AS (SELECT public.ia_current_auditor_id() AS aid),
scope AS (
  SELECT e.*
    FROM public.ia_audit_engagements e
   WHERE (public.ia_can_read_all() OR public.ia_can_access_engagement_internal(e.id))
     AND COALESCE(e.execution_status,'Planned') NOT IN
         ('Closed','Cancelled','Closed - Actions Pending','Closed – Actions Pending','Deferred')
     AND COALESCE(e.status,'Planned') NOT IN
         ('Closed','Cancelled','Carried Forward','Superseded','Completed')
),
cand AS (
  SELECT s.id AS engagement_id, 1 AS priority, 'action_verification' AS work_type,
         ('Verify corrective action ' || COALESCE(a.action_ref,'')) AS work_label,
         'Action is marked ready for verification' AS work_detail,
         'A corrective action on this audit requires your verification' AS reason,
         ('/audit/action-centre?tab=verification&actionId=' || a.id) AS link
    FROM public.ia_action_tracking a JOIN scope s ON s.id = a.engagement_id
   WHERE a.lifecycle_status = 'Verification Required'

  UNION ALL
  SELECT s.id, 2, 'review_rework', 'Address quality review points',
         'Quality review returned the engagement for rework',
         'Quality review requires rework before the audit can progress',
         ('/audit/audits/' || s.id || '?tab=quality-review')
    FROM public.ia_quality_reviews qr JOIN scope s ON s.id = qr.engagement_id
   WHERE COALESCE(qr.final_disposition,'') = 'Rework Required'
      OR COALESCE(qr.status,'') = 'Rework Required'

  UNION ALL
  SELECT s.id, 2, 'activity_review',
         ('Review ' || COALESCE(act.name, act.title, 'completed activity')),
         'Completed fieldwork activity is awaiting your review',
         'You are the reviewer for a completed activity',
         ('/audit/audits/' || s.id || '?tab=activities')
    FROM public.ia_activities act JOIN scope s ON s.id = act.engagement_id
    CROSS JOIN me
   WHERE act.status = 'Completed'
     AND COALESCE(act.review_status,'') <> 'Reviewed'
     AND me.aid IS NOT NULL
     AND act.reviewer_auditor_id = me.aid

  UNION ALL
  SELECT s.id, 3, 'procedure',
         ('Continue ' || COALESCE(st.title, 'procedure ' || COALESCE(st.step_no,''))),
         CASE
           WHEN COALESCE(smp.total,0) = 0 AND COALESCE(st.planned_sample_size,0) > 0
             THEN '0 of ' || st.planned_sample_size || ' sample items tested'
           WHEN COALESCE(smp.total,0) > 0
             THEN COALESCE(smp.tested,0) || ' of ' ||
                  GREATEST(COALESCE(smp.total,0), COALESCE(st.planned_sample_size,0)) ||
                  ' sample items tested'
           ELSE 'Testing not started'
         END,
         'Programme procedure is not yet concluded',
         ('/audit/audits/' || s.id || '?tab=programme&stepId=' || st.id)
    FROM public.ia_engagement_programme_steps st
    JOIN scope s ON s.id = st.engagement_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS total,
             count(*) FILTER (WHERE r.result IS NOT NULL) AS tested
        FROM public.ia_control_test_results r
       WHERE r.engagement_programme_step_id = st.id
    ) smp ON true
   WHERE COALESCE(st.execution_status,'Not Started')
         NOT IN ('Completed','Concluded','Not Applicable')

  UNION ALL
  SELECT s.id, 4, 'exception',
         ('Evaluate exception ' || COALESCE(x.exception_no,'')),
         COALESCE(left(x.condition, 120), 'Exception awaiting auditor evaluation'),
         'An exception raised during testing has not been evaluated',
         ('/audit/audits/' || s.id || '?tab=programme&exceptionId=' || x.id)
    FROM public.ia_test_exceptions x JOIN scope s ON s.id = x.engagement_id
   WHERE COALESCE(x.evaluation_status,'Pending') NOT IN ('Evaluated','Closed')

  UNION ALL
  SELECT s.id, 5, 'programme_blocker', 'Approve the audit programme',
         'Fieldwork cannot be executed until a programme is bound and approved',
         'No approved audit programme is bound to this audit',
         ('/audit/audits/' || s.id || '?tab=programme')
    FROM scope s
   WHERE COALESCE(s.execution_status,'Planned') IN
         ('Fieldwork In Progress','Opening Meeting Scheduled','Notification Sent')
     AND NOT EXISTS (
       SELECT 1 FROM public.ia_engagement_programmes p
        WHERE p.engagement_id = s.id
          AND COALESCE(p.status,'') IN ('Approved','Frozen','Active'))

  UNION ALL
  SELECT s.id, 5, 'preparation_blocker', 'Complete audit preparation',
         'Preparation has not been signed off',
         'Preparation must be completed before fieldwork',
         ('/audit/audits/' || s.id || '?tab=preparation')
    FROM scope s
   WHERE COALESCE(s.execution_status,'Planned') IN ('Planned','Ready for Launch')
     AND NOT EXISTS (
       SELECT 1 FROM public.ia_audit_event ev
        WHERE ev.engagement_id = s.id
          AND ev.event_code = 'IA.PREPARATION.COMPLETED')

  UNION ALL
  SELECT s.id, 6, 'findings', 'Progress draft findings',
         (count(*)::text || ' finding(s) still in draft or review'),
         'Findings must be confirmed before management response',
         ('/audit/audits/' || s.id || '?tab=findings')
    FROM public.ia_findings f JOIN scope s ON s.id = f.engagement_id
   WHERE COALESCE(f.lifecycle_status,'Draft') IN ('Draft','Under Review')
   GROUP BY s.id

  UNION ALL
  SELECT s.id, 6, 'responses', 'Review management responses',
         (count(*)::text || ' response(s) awaiting audit review'),
         'Management responses have not been reviewed',
         ('/audit/audits/' || s.id || '?tab=responses')
    FROM public.ia_management_responses mr JOIN scope s ON s.id = mr.engagement_id
   WHERE mr.review_outcome IS NULL
   GROUP BY s.id

  UNION ALL
  SELECT s.id, 7, 'overview', 'Open the audit',
         'No outstanding auditor work detected',
         'Nothing specific is outstanding — opening the audit overview',
         ('/audit/audits/' || s.id || '?tab=overview')
    FROM scope s
),
ranked AS (
  SELECT c.*,
         row_number() OVER (PARTITION BY c.engagement_id
                            ORDER BY c.priority, c.work_label) AS rn
    FROM cand c
)
SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.priority, x.planned_end_date NULLS LAST), '[]'::jsonb)
FROM (
  SELECT r.engagement_id, r.priority, r.work_type, r.work_label, r.work_detail, r.reason, r.link,
         s.engagement_code, s.engagement_name,
         COALESCE(s.execution_status,'Planned') AS stage,
         s.planned_end_date,
         d.name AS department_name
    FROM ranked r
    JOIN public.ia_audit_engagements s ON s.id = r.engagement_id
    LEFT JOIN public.ia_departments d ON d.id = s.department_id
   WHERE r.rn = 1
) x;
$function$;

REVOKE ALL ON FUNCTION public.ia_q_my_audits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ia_q_continue_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ia_q_my_audits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ia_q_continue_audit() TO authenticated;