
-- ─── bn_claim_participant ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_claim_participant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        uuid NOT NULL,
  kind            varchar(20) NOT NULL CHECK (kind IN ('CLAIMANT','EMPLOYER','DOCTOR','OTHER')),
  display_name    text,
  ssn             varchar(20),
  employer_regno  varchar(20),
  provider_code   varchar(50),
  email           text,
  phone           text,
  contact_ref     text,
  invite_token_hash text,
  invite_sent_at  timestamptz,
  status          varchar(20) NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACTIVE','REVOKED','EXPIRED')),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      varchar(50),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_claim_participant_claim ON public.bn_claim_participant(claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_claim_participant_kind ON public.bn_claim_participant(kind, status);
CREATE INDEX IF NOT EXISTS idx_bn_claim_participant_ssn ON public.bn_claim_participant(ssn);
CREATE INDEX IF NOT EXISTS idx_bn_claim_participant_employer ON public.bn_claim_participant(employer_regno);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_participant TO authenticated;
GRANT SELECT ON public.bn_claim_participant TO anon;
GRANT ALL ON public.bn_claim_participant TO service_role;

-- ─── bn_external_task ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_external_task (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id            uuid NOT NULL,
  participant_id      uuid REFERENCES public.bn_claim_participant(id) ON DELETE SET NULL,
  participant_kind    varchar(20) NOT NULL CHECK (participant_kind IN ('CLAIMANT','EMPLOYER','DOCTOR','OTHER')),
  task_type           varchar(50) NOT NULL,
  task_title          text NOT NULL,
  task_description    text,
  screen_template_id  uuid,
  product_code        varchar(50),
  due_at              timestamptz,
  status              varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUBMITTED','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_notes      text,
  blocks_workflow     boolean NOT NULL DEFAULT true,
  workflow_step_id    uuid,
  workflow_task_id    uuid,
  secure_token_hash   text,
  secure_token_expires_at timestamptz,
  secure_token_used_at timestamptz,
  submitted_at        timestamptz,
  submitted_by        varchar(50),
  reviewed_at         timestamptz,
  reviewed_by         varchar(50),
  created_by          varchar(50),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_claim ON public.bn_external_task(claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_participant ON public.bn_external_task(participant_id);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_status ON public.bn_external_task(status, due_at);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_kind ON public.bn_external_task(participant_kind, status);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_token ON public.bn_external_task(secure_token_hash) WHERE secure_token_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_external_task TO authenticated;
GRANT SELECT, UPDATE ON public.bn_external_task TO anon;
GRANT ALL ON public.bn_external_task TO service_role;

-- ─── bn_external_task_document ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_external_task_document (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES public.bn_external_task(id) ON DELETE CASCADE,
  claim_id        uuid NOT NULL,
  document_type_code varchar(50),
  storage_bucket  varchar(63) NOT NULL DEFAULT 'bn-external-tasks',
  storage_path    text NOT NULL,
  file_name       text NOT NULL,
  mime_type       varchar(120),
  size_bytes      bigint,
  sha256          varchar(64),
  uploaded_by     varchar(50),
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_document_task ON public.bn_external_task_document(task_id);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_document_claim ON public.bn_external_task_document(claim_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_external_task_document TO authenticated;
GRANT SELECT, INSERT ON public.bn_external_task_document TO anon;
GRANT ALL ON public.bn_external_task_document TO service_role;

-- ─── bn_external_task_audit ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_external_task_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.bn_external_task(id) ON DELETE CASCADE,
  claim_id    uuid NOT NULL,
  event_type  varchar(40) NOT NULL,
  actor_kind  varchar(20),
  actor_code  varchar(50),
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_audit_task ON public.bn_external_task_audit(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bn_external_task_audit_claim ON public.bn_external_task_audit(claim_id, created_at DESC);

GRANT SELECT, INSERT ON public.bn_external_task_audit TO authenticated;
GRANT SELECT, INSERT ON public.bn_external_task_audit TO anon;
GRANT ALL ON public.bn_external_task_audit TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_external_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_bn_claim_participant_updated_at ON public.bn_claim_participant;
CREATE TRIGGER trg_bn_claim_participant_updated_at
  BEFORE UPDATE ON public.bn_claim_participant
  FOR EACH ROW EXECUTE FUNCTION public.bn_external_set_updated_at();

DROP TRIGGER IF EXISTS trg_bn_external_task_updated_at ON public.bn_external_task;
CREATE TRIGGER trg_bn_external_task_updated_at
  BEFORE UPDATE ON public.bn_external_task
  FOR EACH ROW EXECUTE FUNCTION public.bn_external_set_updated_at();
