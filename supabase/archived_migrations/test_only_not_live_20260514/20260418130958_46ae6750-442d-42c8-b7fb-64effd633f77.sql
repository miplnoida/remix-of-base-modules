-- Single source of truth for session timeout = password_policies (idempotent)

-- 1) Align active policy to industry-standard defaults (30 min idle / 8 h absolute)
UPDATE public.password_policies
SET idle_timeout_minutes = 30,
    session_timeout_minutes = 480,
    updated_at = now()
WHERE is_active = true;

-- 2) Soft-retire the duplicate setting in Global Settings (preserve row for audit)
UPDATE public.system_settings
SET is_editable = false,
    description = COALESCE(description, '') || E'\n[DEPRECATED] Session timeout is now configured exclusively under Password Policy (idle_timeout_minutes / session_timeout_minutes). This row is retained for audit history only and is no longer read by the application.',
    updated_at = now()
WHERE setting_key = 'session_timeout_minutes'
  AND is_editable = true;

-- 3) Document canonical source
COMMENT ON COLUMN public.password_policies.idle_timeout_minutes
  IS 'CANONICAL: Sliding idle timeout in minutes. Resets on user activity (DOM events, network calls, cross-tab activity). Single source of truth.';
COMMENT ON COLUMN public.password_policies.session_timeout_minutes
  IS 'CANONICAL: Absolute session ceiling in minutes. Hard logout regardless of activity. Never reset on token refresh. Single source of truth.';
