REVOKE EXECUTE ON FUNCTION public.bn_award_suspension_propose_v1(uuid,text,date,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bn_award_suspension_approve_v1(uuid,uuid,text,integer,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bn_award_suspension_reject_v1(uuid,uuid,text,text,integer,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bn_award_suspension_withdraw_v1(uuid,text,integer,text,text) FROM anon;