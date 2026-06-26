
-- 1. Activate General Legal Team
UPDATE public.lg_team SET is_active=true, updated_at=now()
WHERE id='0b02b652-f86d-45fe-9d5d-a0590a59d546';
UPDATE public.lg_team SET manager_user_id='11111111-aaaa-4aaa-8aaa-000000000004', updated_at=now()
WHERE id='0b02b652-f86d-45fe-9d5d-a0590a59d546' AND (manager_user_id IS NULL OR manager_user_id<>'11111111-aaaa-4aaa-8aaa-000000000004');

-- 2. lg_staff
INSERT INTO public.lg_staff (user_id,user_code,full_name,email,role_code,team_id,country_code,is_active,availability,max_active_cases,max_high_priority_cases,created_by)
VALUES
  ('11111111-aaaa-4aaa-8aaa-000000000001','LOne','Legal Officer One','legalofficer1@mishainfotech.com','LEGAL_OFFICER','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'available',50,15,'SYSTEM'),
  ('11111111-aaaa-4aaa-8aaa-000000000002','LTwo','Legal Officer Two','legalofficer2@mishainfotech.com','LEGAL_OFFICER','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'available',50,15,'SYSTEM'),
  ('11111111-aaaa-4aaa-8aaa-000000000003','LOne2','Senior Legal Officer','legalsenior1@mishainfotech.com','SENIOR_LEGAL_OFFICER','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'available',40,20,'SYSTEM'),
  ('11111111-aaaa-4aaa-8aaa-000000000004','LOne3','Legal Manager','legalmanager1@mishainfotech.com','LEGAL_MANAGER','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'available',30,30,'SYSTEM'),
  ('11111111-aaaa-4aaa-8aaa-000000000005','LOne4','Legal Read-Only User','legalreadonly1@mishainfotech.com','LEGAL_READ_ONLY','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'inactive',0,0,'SYSTEM'),
  ('11111111-aaaa-4aaa-8aaa-000000000006','LOne5','Legal Admin','legaladmin1@mishainfotech.com','LEGAL_ADMIN','0b02b652-f86d-45fe-9d5d-a0590a59d546','SKN',true,'inactive',0,0,'SYSTEM')
ON CONFLICT (user_id) DO UPDATE SET role_code=EXCLUDED.role_code, team_id=EXCLUDED.team_id, is_active=EXCLUDED.is_active, availability=EXCLUDED.availability, updated_at=now();

-- 3. Workbaskets
INSERT INTO public.lg_workbasket_role (workbasket_code,owning_team_code,responsible_role_code,description,is_active) VALUES
  ('LEGAL_BENEFITS_REFERRAL','GENERAL_LEGAL','LEGAL_OFFICER','Referrals from Benefits module',true),
  ('LEGAL_COMPLIANCE_REFERRAL','GENERAL_LEGAL','LEGAL_OFFICER','Referrals from Compliance module',true),
  ('LEGAL_CONTRACT_REVIEW','GENERAL_LEGAL','LEGAL_OFFICER','Contract / document review requests',true),
  ('LEGAL_ADVICE_REVIEW','GENERAL_LEGAL','SENIOR_LEGAL_OFFICER','Legal advice requests',true),
  ('LEGAL_COURT_ACTION','GENERAL_LEGAL','LEGAL_OFFICER','Active court action queue',true),
  ('LEGAL_INFO_RESPONSE_REVIEW','GENERAL_LEGAL','LEGAL_OFFICER','Information response review',true),
  ('LEGAL_ADMIN_REVIEW','GENERAL_LEGAL','LEGAL_ADMIN','Admin review queue',true)
ON CONFLICT (workbasket_code) DO UPDATE SET owning_team_code=EXCLUDED.owning_team_code, responsible_role_code=EXCLUDED.responsible_role_code, description=EXCLUDED.description, is_active=true, updated_at=now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='lg_team_workbasket_team_wb_uk') THEN
    CREATE UNIQUE INDEX lg_team_workbasket_team_wb_uk ON public.lg_team_workbasket(team_id, workbasket_code);
  END IF;
END $$;

INSERT INTO public.lg_team_workbasket (team_id,workbasket_code,responsibility_type,can_receive_new_cases,can_auto_assign,is_active,created_by)
SELECT '0b02b652-f86d-45fe-9d5d-a0590a59d546', wb,'OWNER',true,true,true,'SYSTEM'
FROM (VALUES ('LEGAL_BENEFITS_REFERRAL'),('LEGAL_COMPLIANCE_REFERRAL'),('LEGAL_CONTRACT_REVIEW'),('LEGAL_ADVICE_REVIEW'),('LEGAL_COURT_ACTION'),('LEGAL_INFO_RESPONSE_REVIEW'),('LEGAL_ADMIN_REVIEW')) AS v(wb)
ON CONFLICT (team_id, workbasket_code) DO NOTHING;

-- 4. Routing
UPDATE public.lg_routing_source_map
SET workbasket_code='LEGAL_COMPLIANCE_REFERRAL', assignment_strategy='BY_WORKLOAD', updated_at=now(), updated_by='SYSTEM'
WHERE source_code='COMPLIANCE_REFERRAL';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='lg_routing_source_map_uk') THEN
    CREATE UNIQUE INDEX lg_routing_source_map_uk ON public.lg_routing_source_map(country_code, source_code) WHERE is_active=true;
  END IF;
END $$;

INSERT INTO public.lg_routing_source_map (country_code,source_code,workbasket_code,team_code,assignment_strategy,is_active,updated_by) VALUES
  ('SKN','BENEFITS','LEGAL_BENEFITS_REFERRAL','GENERAL_LEGAL','BY_WORKLOAD',true,'SYSTEM'),
  ('SKN','COMPLIANCE','LEGAL_COMPLIANCE_REFERRAL','GENERAL_LEGAL','BY_WORKLOAD',true,'SYSTEM'),
  ('SKN','CONTRACT_REVIEW','LEGAL_CONTRACT_REVIEW','GENERAL_LEGAL','WORKBASKET_ONLY',true,'SYSTEM'),
  ('SKN','LEGAL_ADVICE','LEGAL_ADVICE_REVIEW','GENERAL_LEGAL','WORKBASKET_ONLY',true,'SYSTEM'),
  ('SKN','INFO_RESPONSE','LEGAL_INFO_RESPONSE_REVIEW','GENERAL_LEGAL','BY_WORKLOAD',true,'SYSTEM'),
  ('SKN','INTERNAL_ADMIN','LEGAL_ADVICE_REVIEW','GENERAL_LEGAL','WORKBASKET_ONLY',true,'SYSTEM')
ON CONFLICT (country_code, source_code) WHERE is_active = true DO NOTHING;

UPDATE public.lg_routing_source_map SET assignment_strategy=COALESCE(assignment_strategy,'BY_WORKLOAD') WHERE assignment_strategy IS NULL;

-- 5. Assignment engine
DROP FUNCTION IF EXISTS public.lg_assign_next_owner(text,text);
CREATE OR REPLACE FUNCTION public.lg_assign_next_owner(p_workbasket_code text, p_country_code text DEFAULT 'SKN')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_team_code text; v_team_id uuid; v_strategy text; v_owner uuid;
BEGIN
  SELECT owning_team_code INTO v_team_code FROM public.lg_workbasket_role WHERE workbasket_code=p_workbasket_code AND is_active=true LIMIT 1;
  IF v_team_code IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_team_id FROM public.lg_team WHERE team_code=v_team_code AND is_active=true AND country_code=p_country_code LIMIT 1;
  IF v_team_id IS NULL THEN RETURN NULL; END IF;
  SELECT assignment_strategy INTO v_strategy FROM public.lg_routing_source_map WHERE workbasket_code=p_workbasket_code AND is_active=true ORDER BY updated_at DESC NULLS LAST LIMIT 1;
  v_strategy := COALESCE(v_strategy,'BY_WORKLOAD');
  IF v_strategy='WORKBASKET_ONLY' THEN RETURN NULL; END IF;
  IF v_strategy='ROUND_ROBIN' THEN
    SELECT tm.user_id INTO v_owner FROM public.lg_team_member tm
    LEFT JOIN (SELECT assigned_to_user_id, MAX(assigned_at) last_at FROM public.lg_case_assignment WHERE is_current=true GROUP BY 1) la ON la.assigned_to_user_id=tm.user_id
    WHERE tm.team_id=v_team_id AND tm.is_active=true AND tm.can_own_case=true AND tm.role_code IN ('LEGAL_OFFICER','SENIOR_LEGAL_OFFICER')
    ORDER BY la.last_at NULLS FIRST LIMIT 1;
  ELSE
    SELECT tm.user_id INTO v_owner FROM public.lg_team_member tm
    LEFT JOIN (SELECT assigned_to_user_id, COUNT(*) open_cnt FROM public.lg_case_assignment WHERE is_current=true GROUP BY 1) wl ON wl.assigned_to_user_id=tm.user_id
    WHERE tm.team_id=v_team_id AND tm.is_active=true AND tm.can_own_case=true AND tm.role_code IN ('LEGAL_OFFICER','SENIOR_LEGAL_OFFICER')
    ORDER BY COALESCE(wl.open_cnt,0), random() LIMIT 1;
  END IF;
  RETURN v_owner;
END; $$;
GRANT EXECUTE ON FUNCTION public.lg_assign_next_owner(text,text) TO authenticated, service_role;

-- 6. Integrity report
DROP FUNCTION IF EXISTS public.lg_assignment_integrity_report();
CREATE OR REPLACE FUNCTION public.lg_assignment_integrity_report()
RETURNS TABLE(case_id uuid, lg_case_no text, source_module text, workbasket_code text, team_code text, assigned_owner_email text, assignment_strategy text, issue_code text, issue_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH base AS (
    SELECT c.id AS case_id, c.lg_case_no, c.source_module,
           ca.assigned_team_code AS team_code, ca.assigned_to_user_id AS owner_id,
           rsm.workbasket_code, rsm.assignment_strategy, p.email AS owner_email
    FROM public.lg_case c
    LEFT JOIN public.lg_case_assignment ca ON ca.lg_case_id=c.id AND ca.is_current=true
    LEFT JOIN public.lg_routing_source_map rsm ON rsm.source_code=c.source_module AND rsm.is_active=true
    LEFT JOIN public.profiles p ON p.id=ca.assigned_to_user_id
  )
  SELECT case_id, lg_case_no, source_module, workbasket_code, team_code, owner_email, assignment_strategy, 'NO_WORKBASKET'::text, 'Case is not mapped to any workbasket'::text FROM base WHERE workbasket_code IS NULL
  UNION ALL SELECT case_id, lg_case_no, source_module, workbasket_code, team_code, owner_email, assignment_strategy, 'NO_TEAM','Case has no team assignment' FROM base WHERE team_code IS NULL AND workbasket_code IS NOT NULL
  UNION ALL SELECT case_id, lg_case_no, source_module, workbasket_code, team_code, owner_email, assignment_strategy, 'NO_ELIGIBLE_OWNER','Workbasket has no eligible owner assigned' FROM base WHERE owner_id IS NULL AND assignment_strategy IN ('BY_WORKLOAD','ROUND_ROBIN')
  UNION ALL SELECT b.case_id,b.lg_case_no,b.source_module,b.workbasket_code,b.team_code,b.owner_email,b.assignment_strategy,'OWNER_NOT_IN_TEAM','Assigned user is not an active member of the owning team'
    FROM base b LEFT JOIN public.lg_team t ON t.team_code=b.team_code LEFT JOIN public.lg_team_member tm ON tm.user_id=b.owner_id AND tm.team_id=t.id AND tm.is_active=true
    WHERE b.owner_id IS NOT NULL AND tm.id IS NULL
  UNION ALL SELECT b.case_id,b.lg_case_no,b.source_module,b.workbasket_code,b.team_code,b.owner_email,b.assignment_strategy,'READ_ONLY_OWNER','Read-only user is assigned as case owner'
    FROM base b JOIN public.user_roles ur ON ur.user_id=b.owner_id AND ur.role='LEGAL_READ_ONLY' WHERE b.owner_id IS NOT NULL
  UNION ALL SELECT b.case_id,b.lg_case_no,b.source_module,b.workbasket_code,b.team_code,b.owner_email,b.assignment_strategy,'WORKBASKET_NO_TEAM','Workbasket has no owning team mapped'
    FROM base b LEFT JOIN public.lg_workbasket_role wr ON wr.workbasket_code=b.workbasket_code AND wr.is_active=true
    WHERE b.workbasket_code IS NOT NULL AND wr.owning_team_code IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.lg_assignment_integrity_report() TO authenticated, service_role;

-- 7. Test referrals
DO $$ DECLARE v_case_id uuid; v_owner uuid; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lg_case WHERE lg_case_no='SEED-LG-BEN-001') THEN
    INSERT INTO public.lg_case (id,lg_case_no,country_code,case_type_code,current_stage_code,status_code,priority_code,source_module,source_type,case_source_code,primary_entity_type,assigned_team_code,summary,opened_date,created_by)
    VALUES (gen_random_uuid(),'SEED-LG-BEN-001','SKN','BENEFIT_LITIGATION','REFERRAL_RECEIVED','OPEN','MEDIUM','BENEFITS','REFERRAL','BENEFITS','CLAIM','GENERAL_LEGAL','SEED-test benefits referral',CURRENT_DATE,'SYSTEM') RETURNING id INTO v_case_id;
    v_owner := public.lg_assign_next_owner('LEGAL_BENEFITS_REFERRAL','SKN');
    INSERT INTO public.lg_case_assignment (lg_case_id,assigned_to_user_id,assigned_team_code,assignment_role,assigned_by,reason,is_current)
    VALUES (v_case_id,v_owner,'GENERAL_LEGAL','OWNER','SYSTEM','Auto-assigned on seed',true);
    IF v_owner IS NOT NULL THEN UPDATE public.lg_case SET assigned_legal_officer_id=v_owner WHERE id=v_case_id; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lg_case WHERE lg_case_no='SEED-LG-CMP-001') THEN
    INSERT INTO public.lg_case (id,lg_case_no,country_code,case_type_code,current_stage_code,status_code,priority_code,source_module,source_type,case_source_code,primary_entity_type,assigned_team_code,summary,opened_date,created_by)
    VALUES (gen_random_uuid(),'SEED-LG-CMP-001','SKN','CONTRIBUTION_RECOVERY','REFERRAL_RECEIVED','OPEN','HIGH','COMPLIANCE','REFERRAL','COMPLIANCE','EMPLOYER','GENERAL_LEGAL','SEED-test compliance referral',CURRENT_DATE,'SYSTEM') RETURNING id INTO v_case_id;
    v_owner := public.lg_assign_next_owner('LEGAL_COMPLIANCE_REFERRAL','SKN');
    INSERT INTO public.lg_case_assignment (lg_case_id,assigned_to_user_id,assigned_team_code,assignment_role,assigned_by,reason,is_current)
    VALUES (v_case_id,v_owner,'GENERAL_LEGAL','OWNER','SYSTEM','Auto-assigned on seed',true);
    IF v_owner IS NOT NULL THEN UPDATE public.lg_case SET assigned_legal_officer_id=v_owner WHERE id=v_case_id; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lg_case WHERE lg_case_no='SEED-LG-ADV-001') THEN
    INSERT INTO public.lg_case (id,lg_case_no,country_code,case_type_code,current_stage_code,status_code,priority_code,source_module,source_type,case_source_code,primary_entity_type,assigned_team_code,summary,opened_date,created_by)
    VALUES (gen_random_uuid(),'SEED-LG-ADV-001','SKN','RECOVERY','REFERRAL_RECEIVED','OPEN','MEDIUM','LEGAL_ADVICE','ADVICE','INTERNAL_ADMIN','EMPLOYER','GENERAL_LEGAL','SEED-test legal advice request',CURRENT_DATE,'SYSTEM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lg_case WHERE lg_case_no='SEED-LG-CON-001') THEN
    INSERT INTO public.lg_case (id,lg_case_no,country_code,case_type_code,current_stage_code,status_code,priority_code,source_module,source_type,case_source_code,primary_entity_type,assigned_team_code,summary,opened_date,created_by)
    VALUES (gen_random_uuid(),'SEED-LG-CON-001','SKN','RECOVERY','REFERRAL_RECEIVED','OPEN','MEDIUM','CONTRACT_REVIEW','REVIEW','INTERNAL_ADMIN','EMPLOYER','GENERAL_LEGAL','SEED-test contract review',CURRENT_DATE,'SYSTEM');
  END IF;
END $$;
