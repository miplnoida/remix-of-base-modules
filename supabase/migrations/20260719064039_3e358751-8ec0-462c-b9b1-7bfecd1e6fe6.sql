CREATE TABLE IF NOT EXISTS public.bn_award_pilot_idempotency (
  tenant_id            text        NOT NULL,
  idempotency_key      text        NOT NULL,
  action               text        NOT NULL,
  award_id             text        NOT NULL,
  command_id           text        NOT NULL,
  correlation_id       text        NOT NULL,
  payload_fingerprint  text        NOT NULL,
  status               text        NOT NULL CHECK (status IN ('CLAIMED','COMPLETED','FAILED')),
  result_ref           text,
  error_class          text,
  claimed_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  retention_expires_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS bn_award_pilot_idempotency_retention_idx
  ON public.bn_award_pilot_idempotency (retention_expires_at);
CREATE INDEX IF NOT EXISTS bn_award_pilot_idempotency_correlation_idx
  ON public.bn_award_pilot_idempotency (correlation_id);
CREATE INDEX IF NOT EXISTS bn_award_pilot_idempotency_award_idx
  ON public.bn_award_pilot_idempotency (award_id);

GRANT SELECT, INSERT, UPDATE ON public.bn_award_pilot_idempotency TO authenticated;
GRANT ALL ON public.bn_award_pilot_idempotency TO service_role;

ALTER TABLE public.bn_award_pilot_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot idempotency same-tenant read"
  ON public.bn_award_pilot_idempotency
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = coalesce(
      current_setting('request.jwt.claims', true)::jsonb->>'tenant_id',
      ''
    )
  );

CREATE POLICY "pilot idempotency same-tenant insert"
  ON public.bn_award_pilot_idempotency
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = coalesce(
      current_setting('request.jwt.claims', true)::jsonb->>'tenant_id',
      ''
    )
  );

CREATE POLICY "pilot idempotency same-tenant update"
  ON public.bn_award_pilot_idempotency
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = coalesce(
      current_setting('request.jwt.claims', true)::jsonb->>'tenant_id',
      ''
    )
  )
  WITH CHECK (
    tenant_id = coalesce(
      current_setting('request.jwt.claims', true)::jsonb->>'tenant_id',
      ''
    )
  );

COMMENT ON TABLE public.bn_award_pilot_idempotency IS
  'AW360-WAVE-1-C1 D8: persistent idempotency for the four approved pilot actions. Unique (tenant_id, idempotency_key) enforces atomic-claim semantics; RLS enforces tenant isolation.';