-- BN-ENV-T1.1 — Local-only auth.uid() probe.
--
-- This file is intentionally NOT a migration. It is loaded into a local
-- Supabase database by scripts/run-bn-suspension-integration-local.sh and by
-- the GitHub Actions workflow, exclusively through:
--
--   supabase db query --file supabase/test-support/bn_env_auth_uid_probe.sql \
--                     --output table
--
-- It creates a SECURITY INVOKER function that returns the caller's auth.uid()
-- so integration tests can prove that a signed-in JWT resolves to the
-- expected user UUID at the PostgreSQL level (not merely at /auth/v1/user).

create or replace function public.bn_test_auth_uid_probe()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select auth.uid();
$$;

revoke all on function public.bn_test_auth_uid_probe() from public;
grant execute on function public.bn_test_auth_uid_probe() to authenticated;
