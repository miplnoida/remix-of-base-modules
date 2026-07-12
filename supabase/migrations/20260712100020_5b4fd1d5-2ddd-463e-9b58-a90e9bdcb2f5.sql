
-- CH-TRACE-HARDEN-1: Restrict trace SELECT to admins & comm hub admin permission
DROP POLICY IF EXISTS trace_admin_select ON public.communication_hub_trace;
DROP POLICY IF EXISTS trace_step_admin_select ON public.communication_hub_trace_step;

CREATE POLICY trace_admin_select ON public.communication_hub_trace
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'Admin'::app_role)
    OR public.has_permission(auth.uid(), 'communication_hub', 'view')
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  );

CREATE POLICY trace_step_admin_select ON public.communication_hub_trace_step
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'Admin'::app_role)
    OR public.has_permission(auth.uid(), 'communication_hub', 'view')
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  );

-- Ensure the unified view inherits base-table RLS (invoker context)
ALTER VIEW public.communication_hub_trace_unified_view SET (security_invoker = true);
