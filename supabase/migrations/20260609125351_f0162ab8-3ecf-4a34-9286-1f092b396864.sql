
-- ============================================================================
-- BN Workbasket Multi-Role, Role Bundles, Delegation, Self-Approval Guard
-- ============================================================================

-- 1. Add BN_BENEFIT_OFFICER_GENERALIST role
INSERT INTO public.roles (role_name, description, is_active, is_system_role)
VALUES ('BN_BENEFIT_OFFICER_GENERALIST',
        'SEED- Benefit generalist role bundle: intake, document, eligibility, calculation, claims',
        true, true)
ON CONFLICT (role_name) DO NOTHING;

-- 2. bn_workbasket_role (multi-role assignment)
CREATE TABLE IF NOT EXISTS public.bn_workbasket_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workbasket_id uuid NOT NULL REFERENCES public.bn_workbasket(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES public.roles(role_name) ON UPDATE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  UNIQUE (workbasket_id, role_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_workbasket_role TO authenticated;
GRANT ALL ON public.bn_workbasket_role TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_workbasket_role_role ON public.bn_workbasket_role(role_name);
CREATE INDEX IF NOT EXISTS idx_bn_workbasket_role_wb ON public.bn_workbasket_role(workbasket_id);

-- Backfill from existing assigned_role
INSERT INTO public.bn_workbasket_role (workbasket_id, role_name, is_primary)
SELECT wb.id, wb.assigned_role, true
FROM public.bn_workbasket wb
WHERE wb.assigned_role IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.roles r WHERE r.role_name = wb.assigned_role)
ON CONFLICT (workbasket_id, role_name) DO NOTHING;

-- 3. bn_role_bundle + members
CREATE TABLE IF NOT EXISTS public.bn_role_bundle (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_role_bundle TO authenticated;
GRANT ALL ON public.bn_role_bundle TO service_role;

CREATE TABLE IF NOT EXISTS public.bn_role_bundle_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_code text NOT NULL REFERENCES public.bn_role_bundle(code) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES public.roles(role_name) ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_code, role_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_role_bundle_member TO authenticated;
GRANT ALL ON public.bn_role_bundle_member TO service_role;

-- Seed bundle
INSERT INTO public.bn_role_bundle (code, name, description)
VALUES ('BN_BENEFIT_OFFICER_GENERALIST',
        'Benefit Officer (Generalist)',
        'SEED- Small-office bundle granting intake, document, eligibility, calculation, and claims roles')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.bn_role_bundle_member (bundle_code, role_name)
VALUES
  ('BN_BENEFIT_OFFICER_GENERALIST','BN_INTAKE_OFFICER'),
  ('BN_BENEFIT_OFFICER_GENERALIST','BN_DOCUMENT_OFFICER'),
  ('BN_BENEFIT_OFFICER_GENERALIST','BN_ELIGIBILITY_OFFICER'),
  ('BN_BENEFIT_OFFICER_GENERALIST','BN_CALCULATION_OFFICER'),
  ('BN_BENEFIT_OFFICER_GENERALIST','BN_CLAIMS_OFFICER')
ON CONFLICT DO NOTHING;

-- 4. bn_role_delegation
CREATE TABLE IF NOT EXISTS public.bn_role_delegation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES public.roles(role_name) ON UPDATE CASCADE,
  workbasket_id uuid REFERENCES public.bn_workbasket(id) ON DELETE CASCADE,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  CONSTRAINT bn_role_delegation_status_chk CHECK (status IN ('PENDING','APPROVED','REVOKED','EXPIRED')),
  CONSTRAINT bn_role_delegation_range_chk CHECK (valid_to >= valid_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_role_delegation TO authenticated;
GRANT ALL ON public.bn_role_delegation TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_role_delegation_to ON public.bn_role_delegation(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_bn_role_delegation_from ON public.bn_role_delegation(from_user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_role_delegation_uat()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_bn_role_delegation_uat ON public.bn_role_delegation;
CREATE TRIGGER trg_bn_role_delegation_uat
  BEFORE UPDATE ON public.bn_role_delegation
  FOR EACH ROW EXECUTE FUNCTION public.bn_role_delegation_uat();

-- 5. Self-approval guard column
ALTER TABLE public.bn_approval_policy
  ADD COLUMN IF NOT EXISTS restricted_action boolean NOT NULL DEFAULT false;

-- Flag known high-risk areas as restricted
UPDATE public.bn_approval_policy
SET restricted_action = true
WHERE policy_area IN (
  'ELIGIBILITY_OVERRIDE','CALCULATION_OVERRIDE','DOCUMENT_WAIVER',
  'FINAL_CLAIM_APPROVAL','PAYMENT_RELEASE'
);

-- 6. Effective roles view (direct + bundle expansion + active delegation)
CREATE OR REPLACE VIEW public.v_bn_user_effective_roles AS
SELECT ur.user_id, ur.role AS role_name, 'DIRECT'::text AS source
FROM public.user_roles ur
UNION
SELECT ur.user_id, brm.role_name, 'BUNDLE'::text AS source
FROM public.user_roles ur
JOIN public.bn_role_bundle rb ON rb.code = ur.role AND rb.is_active = true
JOIN public.bn_role_bundle_member brm ON brm.bundle_code = rb.code
UNION
SELECT d.to_user_id AS user_id, d.role_name, 'DELEGATION'::text AS source
FROM public.bn_role_delegation d
WHERE d.status = 'APPROVED'
  AND CURRENT_DATE BETWEEN d.valid_from AND d.valid_to;

GRANT SELECT ON public.v_bn_user_effective_roles TO authenticated, service_role;

-- 7. bn_can_approve RPC
CREATE OR REPLACE FUNCTION public.bn_can_approve(
  p_user_id uuid,
  p_policy_id uuid,
  p_requester_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self_allowed boolean;
  v_restricted boolean;
  v_approval_role text;
  v_has_role boolean;
BEGIN
  SELECT self_approval_allowed, restricted_action, approval_role
    INTO v_self_allowed, v_restricted, v_approval_role
  FROM public.bn_approval_policy
  WHERE id = p_policy_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- self-approval block for restricted actions
  IF p_user_id = p_requester_user_id
     AND v_restricted = true
     AND v_self_allowed = false THEN
    RETURN false;
  END IF;

  IF v_approval_role IS NULL THEN
    -- no role gate => any user passes the role check
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.v_bn_user_effective_roles
    WHERE user_id = p_user_id AND role_name = v_approval_role
  ) INTO v_has_role;

  RETURN COALESCE(v_has_role, false);
END $$;

GRANT EXECUTE ON FUNCTION public.bn_can_approve(uuid, uuid, uuid) TO authenticated, service_role;

-- 8. Workbasket access RPC: list workbaskets for a user via effective roles
CREATE OR REPLACE FUNCTION public.bn_workbaskets_for_user(p_user_id uuid)
RETURNS TABLE (
  workbasket_id uuid,
  basket_code varchar,
  basket_name varchar,
  role_name text,
  is_primary boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT wb.id, wb.basket_code, wb.basket_name, wbr.role_name, wbr.is_primary
  FROM public.bn_workbasket wb
  JOIN public.bn_workbasket_role wbr ON wbr.workbasket_id = wb.id
  JOIN public.v_bn_user_effective_roles er
    ON er.role_name = wbr.role_name AND er.user_id = p_user_id
  WHERE wb.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.bn_workbaskets_for_user(uuid) TO authenticated, service_role;
