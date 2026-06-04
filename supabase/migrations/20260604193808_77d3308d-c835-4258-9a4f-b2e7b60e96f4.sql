
ALTER TABLE public.bn_override_policy
  ADD COLUMN IF NOT EXISTS allowed_role_id uuid NULL REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allowed_role_code varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS allowed_permission_key varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS override_level int NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.bn_override_policy ALTER COLUMN allowed_role DROP NOT NULL;

-- Backfill: try to match existing free-text allowed_role to roles.role_name (case-insensitive). Flag unmatched.
UPDATE public.bn_override_policy op
SET allowed_role_id = r.id,
    allowed_role_code = r.role_name
FROM public.roles r
WHERE op.allowed_role_id IS NULL
  AND op.allowed_role IS NOT NULL
  AND lower(r.role_name) = lower(op.allowed_role);

UPDATE public.bn_override_policy
SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{review_status}', '"NEEDS_REVIEW"'::jsonb, true)
WHERE allowed_role_id IS NULL
  AND allowed_permission_key IS NULL
  AND override_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_bn_override_policy_role_id ON public.bn_override_policy(allowed_role_id);
