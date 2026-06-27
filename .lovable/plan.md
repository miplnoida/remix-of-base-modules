
# Organization Management as Enterprise Configuration Foundation

This is a foundational, cross-module change. To avoid duplicate tables and rework, I'll deliver it in **4 phases**, each independently shippable. Phase 1 (audit) is mandatory before any schema work.

---

## Phase 1 — Audit (deliverable: report, no code/schema changes)

I'll inventory the existing DB and produce a markdown audit at `docs/organization/AUDIT.md` with the required table:

`Existing Table | Purpose | Reused For | New Table Needed? | Reason`

Tables I will audit (already visible in schema):

- **Organization**: `core_organization` ✅ exists (31 cols, has logo/seal/currency/language/timezone)
- **Departments**: `core_department`, `core_department_profile` (50 cols), `core_department_location`, `core_module_department_map`, `tb_office_departments`, `tb_dept`
- **Modules**: `app_modules` ✅ (25 cols) — single source of truth
- **Locations**: `office_locations`, `core_department_location`, `er_locations`, `tb_office`
- **Teams/Workbaskets**: `core_team`, `core_workbasket`, `bn_workbasket`, `la_workbasket`
- **Comm assets**: `comm_media_asset`, `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_print_footer`, `comm_asset_mapping` ✅ already centralized
- **Templates**: `core_template` + `core_template_*` family ✅ rich
- **DMS**: `core_dms_provider`, `core_dms_document_type`, `core_dms_module_mapping`, `core_dms_storage_policy`
- **Masters**: `tb_country`, `core_reference_group/value` (currency, language, timezone), `tb_currencies`
- **Legacy/duplicate**: `lg_department_profile` (legal-only, 57 cols) → mark for migration into `core_department_profile`

**Expected finding**: ~95% of required infrastructure already exists. The gap is **not new tables** — it's a **resolver service**, a **text-block table**, and **inherit flags + UI wiring**.

---

## Phase 2 — Schema gaps only (1 small migration)

Only what's genuinely missing:

1. **`core_text_block`** (new) — reusable text blocks (confidentiality notice, disclaimers, footer text, appeal instructions, etc.)
   - `text_block_code`, `module_code` (nullable, FK→app_modules), `department_code` (nullable), `language_code`, `version_no`, `content_html`, `content_text`, `effective_from`, `effective_to`, `is_active`, `category`
2. **`core_organization` additive columns** (if missing):
   - `default_letterhead_asset_id`, `default_email_signature_asset_id`, `default_disclaimer_asset_id`, `default_print_footer_asset_id`, `default_dms_folder_id`, `default_location_id`, `registration_no`, `main_email`, `main_phone` (check first; some exist)
3. **`core_department_profile` additive**:
   - `inherit_letterhead_from_org`, `inherit_email_signature_from_org`, `inherit_disclaimer_from_org`, `inherit_print_footer_from_org`, `inherit_location_from_org`, `inherit_dms_from_org` (boolean, default true)
   - `override_letterhead_asset_id`, `override_email_signature_asset_id`, `override_disclaimer_asset_id`, `override_print_footer_asset_id` (if not present)
   - `ai_context_notes` (text)
4. **`app_modules` confirm fields**: `module_short_name`, `module_owner_department_id`, `module_icon`, `module_route` (add only if missing)

**No new department, location, module, or asset tables.** Per audit, all exist.

---

## Phase 3 — Resolver service + module/text-block hooks (code)

1. **`src/lib/org/organizationContextResolver.ts`** — single entry point:
   ```ts
   resolveOrganizationContext({ moduleCode, departmentCode?, locationId?, transactionOverrides? })
     → { organization, department, module, location, letterhead, email_signature,
         disclaimer, print_footer, logo, seal, dms, ai_context }
   ```
   Resolution order: transaction override → department override → module default → organization default → system fallback.
   Wraps existing `resolveCommunicationContext`, `resolveCommAsset`, adds module + text-block resolution.

2. **`src/hooks/org/useOrganizationContext.ts`** — React Query wrapper (5-min cache).
3. **`src/hooks/org/useAppModules.ts`** — reads `app_modules` for display names (no hardcoded "LEGAL"/"BENEFITS" strings in UI).
4. **`src/hooks/org/useTextBlock.ts`** — fetch text block by code+language with effective-date filter.
5. **Deprecation shims**: keep `resolveDepartmentProfile` exports working; mark legacy `lg_department_profile` reads as deprecated.

---

## Phase 4 — UI: thin v1 of the 7 screens

Replace current Organization Management sub-menu with:

```text
Organization Management
├── Organization Profile         (existing — wire to new fields, tabs: Identity / Defaults / Branding / Contact)
├── Locations & Branches         (existing office_locations — add CRUD if missing)
├── Communication Assets         (existing MediaLibraryPage — keep v2 layout)
├── Text Blocks                  (NEW — table + editor, language + version + effective dates)
├── Department Profiles          (NEW list across modules — inherit toggles, override pickers)
├── Module Registry              (NEW — read/edit app_modules: display name, owner dept, icon, route, active)
└── Usage & Validation           (existing UsageValidationPage — extend with text-block + module checks)
```

All screens: tabbed forms (not long pages), `AssetPickerField` for assets, `SearchableSelect` for masters, semantic tokens only.

**Validation rules wired** (block vs warn) per spec: inactive asset/location, missing owner dept, unknown tokens, hardcoded text detection in templates.

---

## What I need from you before starting

This is ~2–3 build sessions of work. I'd like to confirm:

1. **Start with Phase 1 audit only this turn?** (recommended — confirms no duplicate tables before any migration)
2. **Or proceed Phase 1 → 4 in sequence without stopping?** (faster, but you'd review the audit + migration together)
3. **Legacy `lg_department_profile`** — migrate Legal to `core_department_profile` now, or leave as-is and let the resolver read both?

Reply with **(1)** audit-first, **(2)** all phases, or **(3)** custom — and your answer on the legacy table.
