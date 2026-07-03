
DROP VIEW IF EXISTS public.ce_v_weekly_plan_candidates;
ALTER TABLE public.ce_cases ALTER COLUMN assigned_officer_id TYPE varchar(64);
CREATE VIEW public.ce_v_weekly_plan_candidates AS
 SELECT 'VIOLATION'::text AS source_type, v.id AS source_id, v.violation_number AS source_ref, v.employer_id,
    COALESCE(v.employer_name, em.name) AS employer_name, v.territory, v.priority, v.status AS source_status,
    v.total_amount AS financial_exposure, v.due_date::timestamp with time zone AS due_date,
    v.assigned_to_user_id::text AS assigned_to_user_id, v.created_at AS source_created_at,
    'Violation: '::text || COALESCE(v.summary, v.violation_number::text) AS description
   FROM ce_violations v LEFT JOIN er_master em ON v.employer_id::text = em.regno::text
  WHERE v.status::text = ANY (ARRAY['OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED'])
UNION ALL
 SELECT 'FOLLOW_UP'::text, fa.id, fa.id::text, fa.employer_id, fa.employer_name, NULL::character varying,
    fa.priority, fa.status, NULL::numeric, fa.due_date::timestamp with time zone,
    fa.assigned_to_user_id::text, fa.created_at,
    (('Follow-up: '::text || COALESCE(fa.action_type, ''::character varying)::text) || ' - '::text) || COALESCE(fa.description, ''::text)
   FROM ce_follow_up_actions fa
  WHERE fa.status::text = ANY (ARRAY['PLANNED','SCHEDULED','OVERDUE'])
UNION ALL
 SELECT 'SCOUTING_LEAD'::text, sl.id, sl.lead_number, sl.linked_employer_id, sl.business_name, sl.territory,
    sl.confidence_level, sl.status, NULL::numeric, NULL::timestamp with time zone,
    sl.assigned_to_user_id::text, sl.created_at,
    (('Scouting: '::text || COALESCE(sl.lead_type, ''::character varying)::text) || ' - '::text) || COALESCE(sl.business_name, sl.location_description::character varying, ''::character varying)::text
   FROM ce_scouting_leads sl
  WHERE sl.status::text = ANY (ARRAY['NEW','UNDER_INVESTIGATION'])
UNION ALL
 SELECT 'CASE'::text, c.id, c.case_number, c.employer_id, c.employer_name, NULL::character varying,
    c.priority, c.status, c.total_amount, NULL::timestamp with time zone,
    c.assigned_officer_id::text, c.created_at,
    (('Case: '::text || COALESCE(c.case_number, ''::character varying)::text) || ' - '::text) || COALESCE(c.summary, ''::text)
   FROM ce_cases c
  WHERE c.status::text = ANY (ARRAY['ACTIVE','ESCALATED_LEGAL'])
UNION ALL
 SELECT 'NOTICE'::text, n.id, n.notice_number, n.employer_id, n.employer_name, NULL::character varying,
    'MEDIUM'::character varying, n.status, NULL::numeric, n.due_response_date::timestamp with time zone,
    NULL::text, n.created_at,
    (('Notice: '::text || COALESCE(n.notice_number, ''::character varying)::text) || ' response due '::text) || COALESCE(n.due_response_date::text, 'N/A'::text)
   FROM ce_notices n
  WHERE (n.status::text = ANY (ARRAY['SENT','DELIVERED'])) AND n.due_response_date IS NOT NULL AND n.due_response_date >= CURRENT_DATE;
GRANT SELECT ON public.ce_v_weekly_plan_candidates TO authenticated, anon, service_role;
