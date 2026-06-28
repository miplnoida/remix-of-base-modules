
## Goal
One stable Organization Management foundation. Existing masters stay the source of truth. Profiles only extend masters. Communication assets are reusable and scope-assigned. Every module reads through one resolver — no hardcoded org / module / department / branding text anywhere.

## Architecture (final shape)

```text
┌─────────────────────────────────────────────────────────────┐
│  MASTERS (source of truth — already exist, reused as-is)    │
│  core_organization · core_department · app_modules ·        │
│  office_locations · tb_country/currency · profiles/users ·  │
│  core_team · core_workbasket · DMS folder refs              │
└──────────────────────────┬──────────────────────────────────┘
                           │ extended by
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PROFILES (configuration only — never re-master data)       │
│  core_organization (enterprise defaults columns)            │
│  core_department_profile  (1:1 with department)             │
│  core_module_profile      (1:1 with app_modules)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ pulls assets via
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  COMMUNICATION ASSET LIBRARY (reusable)                     │
│  comm_media_asset · comm_letterhead · comm_print_footer ·   │
│  comm_email_signature · comm_disclaimer · core_text_block   │
│      + comm_asset_assignment  (scope-based, prioritised)    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  enterpriseContextResolver.resolve(ctx)                     │
│  Single entry point for every module: Legal, Benefits,      │
│  Compliance, Finance, HR, Procurement, Employer Services,   │
│  Registration, DMS, Reports, Notifications, AI              │
└─────────────────────────────────────────────────────────────┘
```

## Scope of work

### 1. Database (migration + GRANTs, no RLS — role-based per project rule)
- **Reuse**: `core_organization`, `core_department`, `app_modules`, `office_locations`, `core_team`, `core_workbasket`, `comm_*`, `core_text_block`.
- **Extend `core_organization`** with default refs (logo/seal/letterhead/email_signature/disclaimer/print_footer asset IDs, default_location_id, default_dms_folder_id, default_timezone, default_currency, default_language). Most already exist — add only the missing ones.
- **`core_department_profile`** already exists — confirm columns: manager_user_code, deputy_user_code, default_team_id, default_workbasket_id, primary_location_id, active_location_ids[], contact_email, contact_phone, dms_folder_id, ai_context_notes, plus override asset IDs + `inherit_*_from_org` flags. Add what's missing.
- **New `core_module_profile`** (1:1 with `app_modules.id`): owner_department_id, default_workbasket_id, default_dms_folder_id, default_notification_category, override asset IDs, `inherit_*_from_org` flags.
- **New `comm_asset_assignment`**: asset_id, asset_type, scope_type (ORGANIZATION|DEPARTMENT|MODULE|TEMPLATE|LOCATION|DOCUMENT_TYPE), scope_id, priority, is_default, effective_from, effective_to, active, language. Unique partial index on (asset_type, scope_type, scope_id, language, active).
- **Triggers**: on `core_department` insert → ensure `core_department_profile` row; on `app_modules` insert → ensure `core_module_profile` row.
- GRANTs on every new public table to `authenticated` and `service_role`.

### 2. Resolver layer (the only API modules call)
`src/lib/enterprise/enterpriseContextResolver.ts`:

```ts
resolve(input: {
  moduleCode: string;
  departmentId?: string; departmentCode?: string;
  locationId?: string;
  templateId?: string;
  documentType?: string;
  userCode?: string;
  language?: string;
}): Promise<EnterpriseContext>
```

Resolution order for every asset slot:
1. Template / document-type override
2. Module override (`core_module_profile` if `inherit_*_from_org = false`)
3. Department override (`core_department_profile` if `inherit_*_from_org = false`)
4. Location override (when location-scoped assignment exists)
5. Organization default (`core_organization`)
6. System fallback (null + trace entry `MISSING`)

Output: organization, department, module, location, branding (logo/seal/watermark), letterhead, footer, email_signature, disclaimer, dms, notification, ai_context, plus a `trace[]` for the Usage & Validation page.

Existing `src/lib/enterprise/CommunicationResolver.ts` + `organizationContextResolver.ts` are refactored to **delegate** to this single resolver so existing callers keep working.

### 3. UI — System Admin → Organization Management
Single canonical tabbed page `/admin/organization-management` (redirects from old paths). Tabs:

1. **Organization Profile** — defaults, lookups for every asset slot.
2. **Locations / Branches** — wraps existing `OfficesAdmin`.
3. **Communication Assets** — library list (filter by type/status/language/version).
4. **Text Blocks** — wraps existing text-block manager.
5. **Department Profiles** — list of departments with profile editor; auto-creates missing profile rows.
6. **Module Profiles** — list of `app_modules` with profile editor.
7. **Asset Assignments** — grid over `comm_asset_assignment` with scope picker (org/dept/module/template/location/doc-type), priority, effective dates.
8. **Usage & Validation** — health report:
   - asset → list of modules/departments/templates using it
   - departments inheriting org defaults vs overriding
   - missing config (no letterhead, no signature, etc.)
   - templates referencing unknown tokens
   - hardcoded module/department names still present (lint output)

Every screen is tabbed, lookup-driven (SearchableSelect), validated with the standard ValidationSummary pattern, and shows inherited vs overridden values explicitly.

### 4. Validation rules (enforced server + UI)
- No duplicate departments (DB unique constraint).
- No duplicate locations.
- No inactive asset assigned (CHECK + UI filter to active assets only).
- Template token validator (extend existing `expandTextBlockTokens`).
- Department/module profile auto-created on master insert (trigger).
- "Inherited from Organization" badge wherever `inherit_*_from_org = true`.

### 5. Cleanup of hardcoded references
- Add a CI lint script `scripts/lint-hardcoded-org.ts` flagging string literals matching org/department/module names outside resolver call sites. Output feeds Usage & Validation tab.
- Replace any remaining direct `comm_*` / `core_organization` reads in module code with `resolveEnterpriseContext()` calls. Modules touched: Legal, Benefits, Compliance, Finance (receipts/invoices), HR, Registration, Employer Services, Notifications, DMS metadata, Reports header/footer.

### 6. Acceptance checks
- `tsgo` clean.
- Existing Legal / Benefits / Compliance flows render the same letterheads/footers (resolver returns equivalent values).
- Department & module profiles auto-created for every existing master row (one-time backfill in migration).
- Usage & Validation page lists zero "MISSING" for every active module.

## Technical notes
- All ID columns are UUID; all asset references nullable.
- Trace entries reuse existing `ResolutionTraceEntry` type so the Health dashboard works unchanged.
- Resolver is memoised per request (in-memory Map keyed by stable JSON input) to avoid N+1 lookups in lists.
- No RLS — role-based gating remains at the app/edge layer per project rule.
- No mock data; backfill uses real master rows.

## Rollout order
1. Migration (extend org, add module profile, add asset assignment, triggers, backfill, GRANTs).
2. Resolver + delegating shims for existing resolvers.
3. Canonical `/admin/organization-management` page with 8 tabs (reusing existing admin components where present).
4. Replace direct comm/org reads in modules with resolver calls.
5. Hardcoded-name lint + Usage & Validation report.
6. Typecheck, smoke each module.

This is a multi-step build. On approval I'll execute it in the order above, committing after each step so the app stays green throughout.
