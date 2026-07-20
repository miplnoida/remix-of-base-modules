
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_event         FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_event_history FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_award_impact  FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_referral      FROM authenticated;

REVOKE ALL ON public.bn_mortality_event         FROM anon;
REVOKE ALL ON public.bn_mortality_event_history FROM anon;
REVOKE ALL ON public.bn_mortality_award_impact  FROM anon;
REVOKE ALL ON public.bn_mortality_referral      FROM anon;

GRANT ALL ON public.bn_mortality_event         TO service_role;
GRANT ALL ON public.bn_mortality_event_history TO service_role;
GRANT ALL ON public.bn_mortality_award_impact  TO service_role;
GRANT ALL ON public.bn_mortality_referral      TO service_role;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, a.action_name, a.display_name, a.description, true
FROM public.app_modules m
CROSS JOIN (VALUES
  ('draft_save',        'Save Draft',          'Save a draft mortality event before submission'),
  ('match_person',      'Match Person',        'Match a reported death to a person of interest'),
  ('mark_duplicate',    'Mark Duplicate',      'Mark a mortality report as a duplicate of another event'),
  ('assign',            'Assign Case',         'Assign or reassign a mortality case to a caseworker'),
  ('release_hold',      'Release Hold',        'Release a provisional hold placed on affected awards'),
  ('resolve_conflict',  'Resolve Conflict',    'Resolve a conflict flag on a mortality event'),
  ('prepare_impact',    'Prepare Impact',      'Prepare award impact package for approval'),
  ('submit_impact',     'Submit Impact',       'Submit prepared award impact for approval'),
  ('return_impact',     'Return Impact',       'Return submitted impact for correction'),
  ('cancel',            'Cancel Event',        'Cancel a mortality event prior to confirmation'),
  ('complete_followon', 'Complete Follow-on',  'Complete follow-on processing (survivor / funeral / estate)')
) AS a(action_name, display_name, description)
WHERE m.name = 'bn_mortality'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
    WHERE ma.module_id = m.id AND ma.action_name = a.action_name
  );
