CREATE TABLE public.comm_asset_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('delete','archive','replace','restore','reference_rewrite')),
  old_reference_id uuid,
  new_reference_id uuid,
  reason text,
  performed_by text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX ix_comm_asset_audit_entity ON public.comm_asset_audit_log(entity_type, entity_id);
CREATE INDEX ix_comm_asset_audit_performed_at ON public.comm_asset_audit_log(performed_at DESC);

GRANT SELECT, INSERT ON public.comm_asset_audit_log TO authenticated;
GRANT ALL ON public.comm_asset_audit_log TO service_role;
-- Per project policy: no RLS on public schema; auth enforced at app/edge layer.