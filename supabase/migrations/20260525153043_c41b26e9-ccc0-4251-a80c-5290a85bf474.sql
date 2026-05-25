
UPDATE public.app_modules SET display_name = 'Administration' WHERE id = 'ca000000-0000-0000-0000-000000000100';
UPDATE public.app_modules SET display_name = 'Compliance Cases' WHERE id = 'ca000000-0000-0000-0000-000000000025';
UPDATE public.app_modules SET display_name = 'Legal Escalations' WHERE id = 'ca000000-0000-0000-0000-000000000070';

-- Top-level categories (reusing existing ce_inspections id 0032)
INSERT INTO public.app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000000-0000-0000-0000-000000000200','ce_my_work_queue','My Work Queue','Personal work queue','Inbox','/compliance/my-work-queue','ca000000-0000-0000-0000-000000000001',15,true),
  ('cb000000-0000-0000-0000-000000000400','ce_notices_comm','Notices And Communications','Notice register, generation, delivery','Mail',NULL,'ca000000-0000-0000-0000-000000000001',35,true),
  ('cb000000-0000-0000-0000-000000000500','ce_payment_arrangements','Payment Arrangements','Payment arrangements lifecycle','Handshake',NULL,'ca000000-0000-0000-0000-000000000001',40,true),
  ('cb000000-0000-0000-0000-000000000700','ce_risk_employer','Risk And Employer Profile','Risk scoring & employer profiles','Target',NULL,'ca000000-0000-0000-0000-000000000001',48,true)
ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name,icon=EXCLUDED.icon,route=EXCLUDED.route,parent_id=EXCLUDED.parent_id,sort_order=EXCLUDED.sort_order,is_enabled=EXCLUDED.is_enabled;

-- Make sure Inspections (existing 0032) is positioned correctly
UPDATE public.app_modules SET display_name='Inspections', icon='ClipboardList', sort_order=42, is_enabled=true WHERE id='ca000000-0000-0000-0000-000000000032';

-- Violations placeholders
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000201','ce_violations_verification_queue','Verification Queue','CheckCircle','/compliance/violations/verification-queue','ca000000-0000-0000-0000-000000000020',30,true),
  ('cb000001-0000-0000-0000-000000000202','ce_violations_rule_detected','Rule-Detected Violations','Zap','/compliance/violations/rule-detected','ca000000-0000-0000-0000-000000000020',40,true),
  ('cb000001-0000-0000-0000-000000000203','ce_violations_duplicate_review','Duplicate Review','Copy','/compliance/violations/duplicate-review','ca000000-0000-0000-0000-000000000020',50,true),
  ('cb000001-0000-0000-0000-000000000204','ce_violations_history','Violation History','History','/compliance/violations/history','ca000000-0000-0000-0000-000000000020',60,true)
ON CONFLICT (id) DO NOTHING;

-- Cases placeholders
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000251','ce_cases_intake','Case Intake','Inbox','/compliance/cases/intake','ca000000-0000-0000-0000-000000000025',10,true),
  ('cb000001-0000-0000-0000-000000000252','ce_cases_assigned','Assigned Cases','UserCheck','/compliance/cases/assigned','ca000000-0000-0000-0000-000000000025',20,true),
  ('cb000001-0000-0000-0000-000000000253','ce_cases_merge_review','Merge Review','GitMerge','/compliance/cases/merge-review','ca000000-0000-0000-0000-000000000025',30,true),
  ('cb000001-0000-0000-0000-000000000254','ce_cases_reopen','Reopen Requests','RotateCcw','/compliance/cases/reopen-requests','ca000000-0000-0000-0000-000000000025',40,true),
  ('cb000001-0000-0000-0000-000000000255','ce_cases_closure','Case Closure','CheckSquare','/compliance/cases/closure','ca000000-0000-0000-0000-000000000025',50,true)
ON CONFLICT (id) DO NOTHING;

-- Notices children
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000401','ce_notices_register','Notice Register','BookOpen','/compliance/enforcement/notices','cb000000-0000-0000-0000-000000000400',10,true),
  ('cb000001-0000-0000-0000-000000000402','ce_notices_generate','Generate Notice','FilePlus','/compliance/notices/generate','cb000000-0000-0000-0000-000000000400',20,true),
  ('cb000001-0000-0000-0000-000000000403','ce_notices_pending_approval','Pending Approval','Clock','/compliance/notices/pending-approval','cb000000-0000-0000-0000-000000000400',30,true),
  ('cb000001-0000-0000-0000-000000000404','ce_notices_delivery','Delivery Tracking','Truck','/compliance/notices/delivery-tracking','cb000000-0000-0000-0000-000000000400',40,true),
  ('cb000001-0000-0000-0000-000000000405','ce_notices_employer_responses','Employer Responses','MessageSquare','/compliance/notices/employer-responses','cb000000-0000-0000-0000-000000000400',50,true),
  ('cb000001-0000-0000-0000-000000000406','ce_notices_history','Communication History','History','/compliance/notices/communication-history','cb000000-0000-0000-0000-000000000400',60,true)
ON CONFLICT (id) DO NOTHING;

-- Arrangements children
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000501','ce_arr_all','All Arrangements','List','/compliance/enforcement/arrangements','cb000000-0000-0000-0000-000000000500',10,true),
  ('cb000001-0000-0000-0000-000000000502','ce_arr_new','New Arrangement','Plus','/compliance/arrangements/new','cb000000-0000-0000-0000-000000000500',20,true),
  ('cb000001-0000-0000-0000-000000000503','ce_arr_pending','Pending Approval','Clock','/compliance/arrangements/pending-approval','cb000000-0000-0000-0000-000000000500',30,true),
  ('cb000001-0000-0000-0000-000000000504','ce_arr_active','Active Arrangements','PlayCircle','/compliance/arrangements/active','cb000000-0000-0000-0000-000000000500',40,true),
  ('cb000001-0000-0000-0000-000000000505','ce_arr_installments_due','Installments Due','CalendarClock','/compliance/arrangements/installments-due','cb000000-0000-0000-0000-000000000500',50,true),
  ('cb000001-0000-0000-0000-000000000506','ce_arr_payment_alloc','Payment Allocation','Coins','/compliance/arrangements/payment-allocation','cb000000-0000-0000-0000-000000000500',60,true),
  ('cb000001-0000-0000-0000-000000000507','ce_arr_breaches','Breaches','AlertOctagon','/compliance/enforcement/breaches','cb000000-0000-0000-0000-000000000500',70,true)
ON CONFLICT (id) DO NOTHING;

-- Inspections children (parent existing 0032)
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000601','ce_insp_plans','Inspection Plans','CalendarCheck','/compliance/field/plan-builder','ca000000-0000-0000-0000-000000000032',10,true),
  ('cb000001-0000-0000-0000-000000000602','ce_insp_assigned','Assigned Plans','UserCheck','/compliance/field/my-plans','ca000000-0000-0000-0000-000000000032',20,true),
  ('cb000001-0000-0000-0000-000000000603','ce_insp_field_visits','Field Visits','MapPin','/compliance/field/execution','ca000000-0000-0000-0000-000000000032',30,true),
  ('cb000001-0000-0000-0000-000000000604','ce_insp_findings','Findings','FileSearch','/compliance/field/findings','ca000000-0000-0000-0000-000000000032',40,true),
  ('cb000001-0000-0000-0000-000000000605','ce_insp_evidence','Evidence','Paperclip','/compliance/inspections/evidence','ca000000-0000-0000-0000-000000000032',50,true),
  ('cb000001-0000-0000-0000-000000000606','ce_insp_convert','Convert Finding to Violation','Shuffle','/compliance/inspections/convert-finding','ca000000-0000-0000-0000-000000000032',60,true)
ON CONFLICT (id) DO NOTHING;

-- Legal placeholders
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000701','ce_legal_review_queue','Review Queue','Eye','/compliance/enforcement/legal-queue','ca000000-0000-0000-0000-000000000070',1,true),
  ('cb000001-0000-0000-0000-000000000702','ce_legal_status_tracking','Status Tracking','Activity','/compliance/enforcement/proceedings','ca000000-0000-0000-0000-000000000070',2,true),
  ('cb000001-0000-0000-0000-000000000703','ce_legal_pack_prep','Legal Pack Preparation','FileStack','/compliance/legal/pack-preparation','ca000000-0000-0000-0000-000000000070',5,true),
  ('cb000001-0000-0000-0000-000000000704','ce_legal_approved','Approved Escalations','CheckCircle2','/compliance/legal/approved-escalations','ca000000-0000-0000-0000-000000000070',6,true),
  ('cb000001-0000-0000-0000-000000000705','ce_legal_returned','Returned from Legal','Undo2','/compliance/legal/returned-from-legal','ca000000-0000-0000-0000-000000000070',7,true)
ON CONFLICT (id) DO NOTHING;

-- Risk & Employer Profile children
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000751','ce_risk_register','Employer Risk Register','Target','/compliance/field/employer-360','cb000000-0000-0000-0000-000000000700',10,true),
  ('cb000001-0000-0000-0000-000000000752','ce_risk_score_details','Risk Score Details','BarChart3','/compliance/risk/score-details','cb000000-0000-0000-0000-000000000700',20,true),
  ('cb000001-0000-0000-0000-000000000753','ce_risk_repeat_defaulters','Repeat Defaulters','Repeat','/compliance/risk/repeat-defaulters','cb000000-0000-0000-0000-000000000700',30,true),
  ('cb000001-0000-0000-0000-000000000754','ce_risk_high_risk','High-Risk Employers','AlertTriangle','/compliance/risk/high-risk','cb000000-0000-0000-0000-000000000700',40,true),
  ('cb000001-0000-0000-0000-000000000755','ce_risk_watchlist','Watchlist','BookmarkCheck','/compliance/risk/watchlist','cb000000-0000-0000-0000-000000000700',50,true)
ON CONFLICT (id) DO NOTHING;

-- Reports
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000000801','ce_reports_automation_jobs','Automation Jobs Report','Cog','/compliance/reports/automation-jobs','ca000000-0000-0000-0000-000000000080',95,true)
ON CONFLICT (id) DO NOTHING;

-- Administration placeholders
INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled) VALUES
  ('cb000001-0000-0000-0000-000000001001','ce_admin_setup_wizard','Setup Wizard','Wand2','/compliance/admin/setup-wizard','ca000000-0000-0000-0000-000000000100',5,true),
  ('cb000001-0000-0000-0000-000000001002','ce_admin_feature_toggles','Feature Toggles','ToggleRight','/compliance/admin/feature-toggles','ca000000-0000-0000-0000-000000000100',7,true),
  ('cb000001-0000-0000-0000-000000001003','ce_admin_calc_rules','Calculation Rules','Calculator','/compliance/admin/calculation-rules','ca000000-0000-0000-0000-000000000100',40,true),
  ('cb000001-0000-0000-0000-000000001004','ce_admin_escalation_rules','Escalation Rules','TrendingUp','/compliance/admin/escalation-rules','ca000000-0000-0000-0000-000000000100',41,true),
  ('cb000001-0000-0000-0000-000000001005','ce_admin_case_families','Case Families','Boxes','/compliance/admin/case-families','ca000000-0000-0000-0000-000000000100',42,true),
  ('cb000001-0000-0000-0000-000000001006','ce_admin_workflow_mapping','Workflow Mapping','GitBranch','/compliance/admin/workflow-mapping','ca000000-0000-0000-0000-000000000100',43,true),
  ('cb000001-0000-0000-0000-000000001007','ce_admin_schedule_settings','Schedule Settings','CalendarCog','/compliance/admin/schedule-settings','ca000000-0000-0000-0000-000000000100',44,true),
  ('cb000001-0000-0000-0000-000000001008','ce_admin_arr_rules','Payment Arrangement Rules','Handshake','/compliance/admin/payment-arrangement-rules','ca000000-0000-0000-0000-000000000100',45,true),
  ('cb000001-0000-0000-0000-000000001009','ce_admin_waiver_rules','Waiver Rules','ShieldOff','/compliance/admin/waiver-rules','ca000000-0000-0000-0000-000000000100',46,true),
  ('cb000001-0000-0000-0000-000000001010','ce_admin_legal_handoff_rules','Legal Handoff Rules','Gavel','/compliance/admin/legal-handoff-rules','ca000000-0000-0000-0000-000000000100',47,true),
  ('cb000001-0000-0000-0000-000000001011','ce_admin_help','Help & Instructions','HelpCircle','/compliance/admin/help','ca000000-0000-0000-0000-000000000100',90,true)
ON CONFLICT (id) DO NOTHING;
