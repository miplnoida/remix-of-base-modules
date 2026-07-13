-- Communication Hub — Template mapping production-readiness assertion.
--
-- PROD-ENV-1. SELECT-only. NEVER mutates data.
--
-- Purpose:
--   Verify every active event → template mapping is fully wired for
--   production sending. Run before any live promotion (see
--   docs/communication-hub/PROD_RUNBOOK.md, Section 4).
--
-- Usage (Cloud → Advanced → Run SQL, target environment selected):
--     \i scripts/comm-hub/assert_template_mapping.sql
--   Or paste each block individually. Every block must return ZERO rows.
--   Any non-empty result set is a production blocker.
--
-- The script covers what the current schema supports:
--   1. Active mapping has a resolvable template (by template_code and,
--      when set, template_id).
--   2. Mapped template is active (is_active=true).
--   3. Mapped template has an active_version_id.
--   4. active_version_id resolves to an existing core_template_version row.
--   5. The resolved version status is publish-ready
--      (APPROVED, PUBLISHED, or ACTIVE — case-insensitive).
--   6. Where sender_profile_id is set, it resolves to an enabled sender
--      profile.
--   7. Mapping does not reference a disabled/inactive template.

\echo === 1. Active mappings with no matching template ===
SELECT m.id AS mapping_id, m.module_code, m.event_code, m.channel, m.template_code
FROM public.communication_hub_event_template_map m
LEFT JOIN public.core_template t
  ON t.code = m.template_code
 AND (m.template_id IS NULL OR t.id = m.template_id)
WHERE m.active = true
  AND t.id IS NULL;

\echo === 2. Active mappings pointing to inactive templates ===
SELECT m.id AS mapping_id, m.module_code, m.event_code, m.template_code,
       t.id AS template_id, t.is_active
FROM public.communication_hub_event_template_map m
JOIN public.core_template t
  ON t.code = m.template_code
 AND (m.template_id IS NULL OR t.id = m.template_id)
WHERE m.active = true
  AND t.is_active = false;

\echo === 3. Templates used by active mappings that have no active_version_id ===
SELECT DISTINCT t.id AS template_id, t.code, t.name, t.status
FROM public.communication_hub_event_template_map m
JOIN public.core_template t
  ON t.code = m.template_code
 AND (m.template_id IS NULL OR t.id = m.template_id)
WHERE m.active = true
  AND t.active_version_id IS NULL;

\echo === 4. active_version_id references a non-existent version row ===
SELECT t.id AS template_id, t.code, t.active_version_id
FROM public.core_template t
LEFT JOIN public.core_template_version v
  ON v.id = t.active_version_id
WHERE t.active_version_id IS NOT NULL
  AND v.id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.communication_hub_event_template_map m
    WHERE m.active = true
      AND m.template_code = t.code
      AND (m.template_id IS NULL OR m.template_id = t.id)
  );

\echo === 5. Active-version status is not publish-ready (APPROVED / PUBLISHED / ACTIVE) ===
SELECT t.id AS template_id, t.code, v.id AS version_id, v.version_no, v.status
FROM public.core_template t
JOIN public.core_template_version v
  ON v.id = t.active_version_id
WHERE UPPER(COALESCE(v.status, '')) NOT IN ('APPROVED', 'PUBLISHED', 'ACTIVE')
  AND EXISTS (
    SELECT 1 FROM public.communication_hub_event_template_map m
    WHERE m.active = true
      AND m.template_code = t.code
      AND (m.template_id IS NULL OR m.template_id = t.id)
  );

\echo === 6a. Mapping references a sender_profile_id that no longer exists ===
SELECT m.id AS mapping_id, m.module_code, m.event_code, m.sender_profile_id
FROM public.communication_hub_event_template_map m
LEFT JOIN public.communication_hub_sender_profile sp
  ON sp.id = m.sender_profile_id
WHERE m.active = true
  AND m.sender_profile_id IS NOT NULL
  AND sp.id IS NULL;

\echo === 6b. Mapping references a disabled sender profile ===
SELECT m.id AS mapping_id, m.module_code, m.event_code,
       sp.id AS sender_profile_id, sp.profile_code, sp.is_enabled
FROM public.communication_hub_event_template_map m
JOIN public.communication_hub_sender_profile sp
  ON sp.id = m.sender_profile_id
WHERE m.active = true
  AND sp.is_enabled = false;

\echo === 7. Summary — active mappings inspected ===
SELECT COUNT(*) AS active_mappings
FROM public.communication_hub_event_template_map
WHERE active = true;
