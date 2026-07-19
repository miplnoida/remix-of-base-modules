
-- 1) bn_mortality_event ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_mortality_event (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_reference       text NOT NULL UNIQUE,
  status                text NOT NULL DEFAULT 'DRAFT',
  source                text NOT NULL,
  reporter_name         text,
  reporter_relationship text,
  reporter_contact      text,
  reporter_user_id      uuid,
  deceased_full_name    text NOT NULL,
  deceased_national_id  text,
  deceased_dob          date,
  deceased_gender       text,
  matched_ip_id         bigint,
  match_confidence      text,
  match_score           numeric(5,2),
  matched_at            timestamptz,
  matched_by            uuid,
  death_date            date,
  death_time            time,
  death_place           text,
  death_cause           text,
  registrar_reference   text,
  verification_confidence text NOT NULL DEFAULT 'UNVERIFIED',
  verified_at           timestamptz,
  verified_by           uuid,
  provisional_hold_at   timestamptz,
  provisional_hold_by   uuid,
  rejected_reason       text,
  duplicate_of_event_id uuid,
  closed_at             timestamptz,
  reversed_at           timestamptz,
  sla_due_at            timestamptz,
  correlation_id        uuid,
  row_version           bigint NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid
);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_status ON public.bn_mortality_event (status);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_matched_ip ON public.bn_mortality_event (matched_ip_id);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_death_date ON public.bn_mortality_event (death_date);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_created_at ON public.bn_mortality_event (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_event TO authenticated;
GRANT ALL ON public.bn_mortality_event TO service_role;
ALTER TABLE public.bn_mortality_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mortality_event read authenticated"   ON public.bn_mortality_event FOR SELECT TO authenticated USING (true);
CREATE POLICY "mortality_event insert authenticated" ON public.bn_mortality_event FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mortality_event update authenticated" ON public.bn_mortality_event FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mortality_event delete authenticated" ON public.bn_mortality_event FOR DELETE TO authenticated USING (true);

-- 2) bn_mortality_event_history ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_mortality_event_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.bn_mortality_event(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text NOT NULL,
  command_name   text NOT NULL,
  correlation_id uuid,
  actor_user_id  uuid,
  actor_user_code text,
  reason_code    text,
  justification  text,
  payload_hash   text,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_history_event ON public.bn_mortality_event_history (event_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.bn_mortality_event_history TO authenticated;
GRANT ALL ON public.bn_mortality_event_history TO service_role;
ALTER TABLE public.bn_mortality_event_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mortality_history read authenticated"   ON public.bn_mortality_event_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "mortality_history insert authenticated" ON public.bn_mortality_event_history FOR INSERT TO authenticated WITH CHECK (true);

-- 3) bn_mortality_award_impact ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_mortality_award_impact (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES public.bn_mortality_event(id) ON DELETE CASCADE,
  bn_award_id         uuid,
  bn_claim_id         uuid,
  award_reference     text,
  action              text NOT NULL,
  effective_date      date,
  payment_after_death_minor bigint NOT NULL DEFAULT 0,
  currency_code       text,
  overpayment_id      uuid,
  overpayment_reference text,
  approval_state      text NOT NULL DEFAULT 'PENDING',
  approved_at         timestamptz,
  approved_by         uuid,
  notes               text,
  row_version         bigint NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid
);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_award_impact_event ON public.bn_mortality_award_impact (event_id);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_award_impact_award ON public.bn_mortality_award_impact (bn_award_id);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_award_impact_overpayment ON public.bn_mortality_award_impact (overpayment_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_mortality_award_impact_event_award
  ON public.bn_mortality_award_impact (event_id, bn_award_id) WHERE bn_award_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_award_impact TO authenticated;
GRANT ALL ON public.bn_mortality_award_impact TO service_role;
ALTER TABLE public.bn_mortality_award_impact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mortality_impact read authenticated"   ON public.bn_mortality_award_impact FOR SELECT TO authenticated USING (true);
CREATE POLICY "mortality_impact insert authenticated" ON public.bn_mortality_award_impact FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mortality_impact update authenticated" ON public.bn_mortality_award_impact FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mortality_impact delete authenticated" ON public.bn_mortality_award_impact FOR DELETE TO authenticated USING (true);

-- 4) bn_mortality_referral --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_mortality_referral (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.bn_mortality_event(id) ON DELETE CASCADE,
  referral_type   text NOT NULL,
  target_module   text NOT NULL,
  target_ref_type text,
  target_ref_id   text,
  status          text NOT NULL DEFAULT 'RAISED',
  response        text,
  raised_at       timestamptz NOT NULL DEFAULT now(),
  raised_by       uuid,
  responded_at    timestamptz,
  responded_by    uuid,
  correlation_id  uuid,
  row_version     bigint NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_referral_event ON public.bn_mortality_referral (event_id);
CREATE INDEX IF NOT EXISTS ix_bn_mortality_referral_type_status ON public.bn_mortality_referral (referral_type, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_referral TO authenticated;
GRANT ALL ON public.bn_mortality_referral TO service_role;
ALTER TABLE public.bn_mortality_referral ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mortality_referral read authenticated"   ON public.bn_mortality_referral FOR SELECT TO authenticated USING (true);
CREATE POLICY "mortality_referral insert authenticated" ON public.bn_mortality_referral FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mortality_referral update authenticated" ON public.bn_mortality_referral FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mortality_referral delete authenticated" ON public.bn_mortality_referral FOR DELETE TO authenticated USING (true);

-- Shared updated_at/row_version trigger
CREATE OR REPLACE FUNCTION public.bn_mortality_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME IN ('bn_mortality_event','bn_mortality_award_impact','bn_mortality_referral') THEN
    NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bn_mortality_event_touch ON public.bn_mortality_event;
CREATE TRIGGER tr_bn_mortality_event_touch BEFORE UPDATE ON public.bn_mortality_event
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_touch_updated_at();

DROP TRIGGER IF EXISTS tr_bn_mortality_award_impact_touch ON public.bn_mortality_award_impact;
CREATE TRIGGER tr_bn_mortality_award_impact_touch BEFORE UPDATE ON public.bn_mortality_award_impact
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_touch_updated_at();

DROP TRIGGER IF EXISTS tr_bn_mortality_referral_touch ON public.bn_mortality_referral;
CREATE TRIGGER tr_bn_mortality_referral_touch BEFORE UPDATE ON public.bn_mortality_referral
  FOR EACH ROW EXECUTE FUNCTION public.bn_mortality_touch_updated_at();

-- Seed the eight required module actions for bn_mortality
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, v.action_name, v.display_name, true
FROM public.app_modules m
CROSS JOIN (VALUES
  ('view','View'),
  ('read','Read'),
  ('write','Write'),
  ('decide','Decide'),
  ('admin','Admin'),
  ('verify','Verify'),
  ('approve_impact','Approve Impact'),
  ('reverse','Reverse')
) AS v(action_name, display_name)
WHERE m.name = 'bn_mortality'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
    WHERE ma.module_id = m.id AND ma.action_name = v.action_name
  );
