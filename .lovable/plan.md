# OM-9.7 — Department Profile Inheritance, Classification, Preview & Seeding

## Goal
Make Department Profile a clear one-time department configuration screen that:
- Correctly inherits from Organisation Profile where appropriate
- Cleanly separates department-only fields
- Uses OM-7 Configuration Center for scoped assignments
- Uses canonical OM-6 `resolveEffectiveSettingsBundle` for preview (no infinite spinner)
- Guarantees every active department has a safe, audited profile

## 1. Field Classification Model (new)

Create `src/platform/organization-settings/departmentProfileFieldModel.ts` — a single source of truth used by the UI, health checks, and backfill.

Each entry:
```
{ fieldKey, label, category, resourceType?, supportsOverride, supportsReset, sourceDescription, healthRules }
```

Categories:
- **ORG_INHERITABLE** — location, letterhead, email signature, disclaimer, print footer, logo, seal, watermark, language, output channel
- **SCOPED_ASSIGNMENT** — document template, notification template, text block, retention policy, approval workflow
- **DEPARTMENT_ONLY** — manager, deputy, escalation contact, document owner, email, phone, fax, website, office hours, workbasket, team, queue, notes, DMS folder, AI prompt
- **PLANNED** — anything without a safe catalogue yet (labeled clearly, never hidden)

## 2. UI Restructure — `DepartmentProfilesPage.tsx` dialog

Replace current tabs with classification-driven layout:
1. **Overview** — counts (inherited/override/dept-only/planned/health), quick actions (Health Check, Reset All, Open Org Defaults, Open Config Center)
2. **People & Contact** — DEPARTMENT_ONLY people/contact fields
3. **Office & Location** — canonical OM-9 location, inherit/override
4. **Inherited Defaults** — cards for ORG_INHERITABLE settings with Inherited / Override / Missing state, per-card Override / Reset
5. **Department Overrides** — filtered view of only currently-overridden entries
6. **Department-Only Settings** — DEPARTMENT_ONLY non-contact fields (workbasket/team/queue/notes/DMS/AI)
7. **Preview & Health** — canonical `resolveEffectiveSettingsBundle` (fixes spinner)
8. **Advanced** — legacy `DepartmentEffectivePreview` clearly labeled Legacy

New sub-components:
- `DepartmentInheritedDefaultsCards.tsx` (already partly built as `DepartmentCommDefaultsCards`, extend to handle SCOPED_ASSIGNMENT + PLANNED)
- `DepartmentScopedAssignmentCard.tsx` — override → create/update DEPARTMENT-scope `core_configuration_assignment`; reset → deactivate that assignment
- `DepartmentOnlySettingsPanel.tsx`
- `DepartmentOverviewPanel.tsx`

## 3. Preview Stabilization

`DepartmentPreviewAndHealth.tsx`:
- Use `resolveEffectiveSettingsBundle` only
- Explicit loading / success / empty / error states with Retry
- Timeout guard (10s) → error state, no infinite spinner
- Sample Document / Email / Print Footer views using resolved letterhead/template/signature/footer
- If no template exists, render sample content inside resolved letterhead (not spinner)

## 4. Override / Reset Behavior

Direct inherit fields (ORG_INHERITABLE):
- Override → set `inherit_*_from_org=false` + override column
- Reset → set `inherit_*_from_org=true` + null the override
- Reset All → confirmation modal, single transaction, audit `DEPARTMENT_PROFILE_ALL_OVERRIDES_RESET`

Scoped settings (SCOPED_ASSIGNMENT):
- Override → upsert `core_configuration_assignment` at DEPARTMENT scope
- Reset → deactivate that DEPARTMENT-scope row so resolver falls back
- Audit `DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_*`

## 5. Seeding / Backfill

New service `src/platform/organization-defaults/departmentProfileBackfill.ts`:
```
seedDepartmentProfilesFromOrganisationDefaults()
```
Idempotent. For each active department:
- If no profile → create with all inherit flags true, override columns null
- If profile exists → do NOT overwrite overrides
- Copy dept email/phone/manager from existing dept/contact data if present; never copy Org contact into dept override
- Emit `DEPARTMENT_PROFILE_BACKFILL_CREATED` or `_SKIPPED_EXISTING`
- Final `DEPARTMENT_PROFILE_BACKFILL_RUN` summary
- Seed `DEPARTMENT_PROFILE_SEED_VERIFIED` attestation on success

Admin action button on Overview tab: **Create / Repair Missing Department Profiles** (gated by `core.admin.org.departments.manage`, confirmation required).

## 6. Health Checks

Extend `src/platform/organization-defaults/defaultsHealth.ts` (or dept equivalent) to detect:
- Missing / duplicate profiles
- Override set but inherit flag true (and vice versa)
- Assignment points to inactive resource
- No effective letterhead / signature / disclaimer / footer / location
- Missing dept contact email/phone (warning)
- Missing manager (warning)
- Preview failed
- Legacy vs canonical preview differ

## 7. Audit + Reference + Registry + Release Readiness

- Register missing audit event types in `src/platform/audit/auditEventTypes.ts` (the full list from the spec)
- Register/verify reference groups: `DEPARTMENT_PROFILE_FIELD_CATEGORY`, `_OVERRIDE_MODE`, `_HEALTH_STATUS`, `_SOURCE_TYPE`, `_PREVIEW_TYPE`, `_SEED_STATUS`, `_SETTING_KEY`
- Verify table registry entries for the 14 tables listed
- Add `checkDepartmentProfileConfiguration()` to `src/platform/release-readiness/checks.ts`
- Seed `DEPARTMENT_PROFILE_SEED_VERIFIED` attestation

## 8. Migration

One SQL migration:
- INSERT audit event types (idempotent, `ON CONFLICT DO NOTHING`)
- INSERT reference groups + values
- Verify/insert table registry rows
- Insert release-readiness attestation
- Run seed of missing `core_department_profile` rows for active departments (inherit flags true, no override overwrites)

No schema changes to `core_department_profile` — columns already exist from OM-9.6.

## 9. Files touched

Created:
- `src/platform/organization-settings/departmentProfileFieldModel.ts`
- `src/platform/organization-defaults/departmentProfileBackfill.ts`
- `src/components/organization/DepartmentInheritedDefaultsCards.tsx`
- `src/components/organization/DepartmentScopedAssignmentCard.tsx`
- `src/components/organization/DepartmentOnlySettingsPanel.tsx`
- `src/components/organization/DepartmentOverviewPanel.tsx`
- `supabase/migrations/<ts>_om_9_7_department_profile.sql`

Edited:
- `src/pages/admin/organization/DepartmentProfilesPage.tsx`
- `src/components/organization/DepartmentPreviewAndHealth.tsx`
- `src/components/organization/DepartmentCommDefaultsCards.tsx` (extend for SCOPED_ASSIGNMENT + PLANNED)
- `src/platform/audit/auditEventTypes.ts`
- `src/platform/release-readiness/checks.ts`

## 10. Acceptance verification

Before wrap-up:
- Typecheck
- Verify no `DepartmentProfilesPage` runtime error
- Confirm existing routes untouched
- Confirm Organisation Profile untouched (no schema/logic change there)

## Deferred (out of scope)
- Adding new ORG_INHERITABLE columns to `core_organization` (kept read from existing OM-9.5 defaults)
- DMS catalogue (still PLANNED)
- AI settings governance (still PLANNED)
- Business module integration
