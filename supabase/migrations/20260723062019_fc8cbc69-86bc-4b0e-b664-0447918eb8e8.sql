
GRANT SELECT ON public.ce_notices TO authenticated;
GRANT SELECT ON public.ce_field_activities TO authenticated;
GRANT SELECT ON public.ce_inspections TO authenticated;
GRANT SELECT ON public.ce_employer_audit_reports TO authenticated;
GRANT SELECT ON public.ce_payment_arrangements TO authenticated;
GRANT SELECT ON public.ce_arrangement_breaches TO authenticated;
GRANT SELECT ON public.ce_audit_employer_responses TO authenticated;
GRANT SELECT ON public.ce_case_assignments TO authenticated;
GRANT ALL ON public.ce_notices TO service_role;
GRANT ALL ON public.ce_field_activities TO service_role;
GRANT ALL ON public.ce_inspections TO service_role;
GRANT ALL ON public.ce_employer_audit_reports TO service_role;
GRANT ALL ON public.ce_payment_arrangements TO service_role;
GRANT ALL ON public.ce_arrangement_breaches TO service_role;
GRANT ALL ON public.ce_audit_employer_responses TO service_role;
GRANT ALL ON public.ce_case_assignments TO service_role;
