
# Enterprise Communication Framework — Finalization Plan

This completes the framework already in place. No renames, no route removals, no duplicate engines. Everything reuses the existing `core_template`, `core_template_layout`, `core_text_block`, `comm_*` brand assets, `core_configuration_assignment`, and the enterprise resolver stack.

---

## 1. Navigation — Notification Templates stays the entry point

`/admin/notification-templates` (existing `NotificationTemplatesAdmin.tsx`) becomes the enterprise hub with 4 tabs:

- **Business Templates** — filtered `CoreTemplateManagement` (excludes `BASE_*` layouts; only business templates)
- **Core Catalogue** — the reusable base layouts (`core_template_layout` where `is_base_layout = true`) + shared `core_template` shells
- **Organization Overrides** — communication defaults (existing `OrgNotificationTemplatesPage` extended)
- **Legacy** — read-only view of `notification_templates` with mapping status to `core_template`

All existing module deep links (Legal, Benefits, etc.) that already route to `CoreTemplateAdmin` continue to work — they just render the Business Templates tab pre-filtered.

## 2. Data — Business vs Base separation

Add columns to `core_template` (only if missing):
- `is_base_layout boolean default false` — marks Core Catalogue shells
- `business_category text` — password_reset, welcome, claim_approved, etc.

Add to `core_template_layout`:
- `is_base_layout boolean default true` (the 12 BASE_* are the catalogue)

Add to `notification_templates`:
- `mapped_core_template_id uuid` — bridge to `core_template`
- `migration_status text` — pending / mapped / deprecated

## 3. Seed data

**Base layouts (Core Catalogue)** — ensure all 12 exist: `BASE_EMAIL, BASE_LETTER, BASE_NOTICE, BASE_DOCUMENT, BASE_CERTIFICATE, BASE_STATEMENT, BASE_RECEIPT, BASE_REPORT, BASE_SMS, BASE_WHATSAPP, BASE_PUSH, BASE_IN_APP`. Missing ones get seeded.

**Business templates** — seed the production catalogue named in section 21 (Welcome, OTP, Password Reset, Claim Approved/Rejected, Legal Hearing/Decision/Referral, Employer Registration, Payment Receipt, etc.) as `core_template` rows with:
- body containing ONLY business content + tokens + `{{SIGNATURE_BLOCK}}` / `{{FOOTER_BLOCK}}` / `{{DISCLAIMER_BLOCK}}` / `{{LETTERHEAD}}` refs
- `default_layout_id` → matching BASE_*
- `business_category` set
- idempotent (skip if code exists)

**Bridge legacy** — for each `notification_templates` row, upsert a mapped `core_template` (using existing `coreTemplateBridgeService` pattern) and set `mapped_core_template_id` + `migration_status='mapped'`. Legacy runtime keeps reading `notification_templates`.

## 4. Rendering pipeline — single path

Confirm & lock the pipeline in `resolveCommunication()`:

```
Business Template → Base Layout → Brand Assets → Config Center →
Org → Dept → Module → Workflow → Business Event → Language →
Text Blocks → Tokens → Final HTML/PDF/SMS
```

Runtime validation added in `coreTemplateResolverService.validate()`:
- missing layout, signature, footer, disclaimer, language
- broken/inactive assets
- inline branding / inline footer / inline signature detection (scans body for `<img src=…logo`, hex colors, "Sincerely," etc. → warns)

Exposed as a "Runtime Validation" panel on the Business Templates tab.

## 5. Organization Overrides tab

Extend `OrgNotificationTemplatesPage` (or add a `CommunicationDefaultsPage` mounted inside the tab) to manage defaults, all persisted to `core_communication_profile` / `core_organization` (already exists):

Default Email Header, Footer, Signature, Disclaimer, Language, Theme, Reply-To, Sender Name, CC, BCC, Logo, Email Banner, Letterhead, Watermark, PDF Footer.

Everything read at render time via existing resolvers — nothing copied.

## 6. Categories / Languages / Text Blocks

- **Categories** (`core_template_category`) — full CRUD screen, domain filter (Assets/Templates/TextBlocks/Tokens/Letterheads/Media/Documents/Reports/Email/SMS/WhatsApp)
- **Languages** (`core_language`) — full CRUD with culture, RTL, default, fallback, date/currency/timezone formatting
- **Text Blocks** — already source of truth for disclaimers (previous phase); ensure filter chips for FOOTER/DISCLAIMER/GREETING/CLOSING/ADDRESS categories

## 7. Preview improvements

Email + Letter preview panels call `resolveCommunication()` with the current org context, so header/logo/banner/body/signature/footer/disclaimer/letterhead all render from live config — no mock data.

## 8. Legacy compatibility

- `notification_templates` untouched structurally beyond added bridge columns
- Old `AdminNotificationTemplates`, `NotificationTemplateManager` continue to work
- Legacy tab surfaces migration status + "Open mapped Core Template" action

## 9. Deliverables (in-app report page)

New `/admin/notification-templates?tab=report` shows:
- architecture diagram (mermaid)
- rendering pipeline
- menu mapping
- legacy → core mapping table with counts
- template inheritance report
- base layouts list
- seeded template list
- resolver flow
- config hierarchy
- services reused
- migration summary
- runtime validation results
- typecheck status

---

## Technical Details

**Files to create**
- `supabase/migrations/<ts>_ecf_finalization.sql` — column adds + seeds guard
- Seed data via `supabase--insert` for base layouts + business templates + legacy bridge
- `src/pages/admin/notifications/tabs/BusinessTemplatesTab.tsx`
- `src/pages/admin/notifications/tabs/CoreCatalogueTab.tsx`
- `src/pages/admin/notifications/tabs/LegacyBridgeTab.tsx`
- `src/pages/admin/notifications/tabs/CommunicationDefaultsTab.tsx`
- `src/pages/admin/notifications/tabs/ArchitectureReportTab.tsx`
- `src/lib/enterprise/runtimeValidation.ts` — inline-branding scanner + missing-piece checks
- `src/pages/admin/organization/CategoriesPage.tsx` (CRUD) & `LanguagesPage.tsx` (CRUD) if not already full CRUD

**Files to edit**
- `src/pages/admin/NotificationTemplatesAdmin.tsx` — 4-tab structure (Business/Core/Overrides/Legacy) + Report
- `src/services/coreTemplateResolverService.ts` — add `validate()` returning findings
- `src/components/templates/CoreTemplateManagement.tsx` — accept `excludeBase` / `onlyBase` filter props
- `src/components/sidebar/menuItems/systemAdminMenuItems.ts` — ensure Notification Templates menu shows the 4 sub-links

**Non-goals (unchanged)**
- All module deep links (`/admin/core-templates?module=LEGAL&type=EMAIL` etc.) continue rendering `CoreTemplateAdmin`
- No route renamed or removed
- `notification_templates` table + edge functions untouched at runtime
- No new template engine, no new resolver — only extends existing

**Verification**
- `tsgo` typecheck
- Playwright: open `/admin/notification-templates`, verify 4 tabs load; open a business template, verify preview resolves header/signature/footer from org config; open Legacy tab, verify mapping table renders
- SQL sanity: count of `is_base_layout=true` layouts = 12; every seeded business template has `default_layout_id` set; every legacy row has a `mapped_core_template_id`

**Estimated scope**: ~1 migration, ~8 new files, ~6 edits, ~40 seeded rows.
