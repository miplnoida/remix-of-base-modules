## Administration IA & Platform Configuration Unification

Goal: make everything under Administration feel like one coherent platform-configuration area — consistent parents, consistent breadcrumbs, no duplicate screens, and clear separation between Platform Admin, Configuration Centre, and SSB Implementation Setup. No new CRUD screens, no legacy table changes.

### 1. Audit (read-only)
- Enumerate every `/admin/*` route in `AppRoutes.tsx` and every admin page in `src/pages/admin/*`.
- Enumerate all current `app_modules` rows whose route starts with `/admin` (parent_id, sort_order, display_name, show_in_menu).
- Classify each into: Setup Centre, Platform, Organisation, Master Data, Shared Domains, Security, Operations, Business Module Configuration.
- Output goes into the acceptance doc, no code change.

### 2. Live menu regroup (app_modules only)
Single additive migration `admin_ia_unification`:

- Ensure parent modules exist (insert only if missing, deterministic UUIDs):
  - `admin_setup_centre` — "Setup Centre"
  - `admin_platform` — "Platform"
  - `admin_organisation` — "Organisation"
  - `admin_master_data` — "Master Data" (reuse existing if present)
  - `admin_shared_domains` — "Shared Domains" (reuse existing)
  - `admin_security` — "Security"
  - `admin_operations` — "Operations"
- Re-parent existing leaf modules by `name` (never by route) to the correct parent and set `sort_order`. No route changes, no display_name churn on child rows unless clearly wrong.
- Move Configuration Centre + SSB Implementation Setup under Setup Centre.
- Move Platform Admin, Enterprise Catalogue, Reference Framework, Master Data Platform under Platform.
- Move Geography / Identity / Financial Reference / Legal Reference / Participant / Communication / Documents under Shared Domains.
- Move Users, Roles & Permissions, Delegations, MFA/Password/IP under Security.
- Move Workflow, Scheduler, Notifications, Numbering, Audit Logs, System Logs, Session Health under Operations.
- No `DELETE`. If a row is stale we set `show_in_menu = false` at most (and only when duplicate confirmed in audit).

### 3. Breadcrumb standard
- Add `src/lib/admin/adminBreadcrumbs.ts` — one map: `route → [Home, Administration, Group, Page]`.
- Add `<AdminBreadcrumbs />` component that reads the map by current pathname (fallback to a computed label).
- Retrofit the top of these shells only (no layout rewrite): `PlatformAdmin`, `ConfigurationCentre`, `SsbSetupPage`, `EnterpriseServiceCatalogue`, `ReferenceFramework`, `GeographyDomainPage`, `IdentityDomainPage`, `FinancialReferenceDomainPage`, `LegalReferenceDomainPage`, `ParticipantDomainPage`, `CommunicationDomainPage`, `DocumentConfigurationPage`. Existing pages that already render their own breadcrumbs are left alone.

### 4. Platform Admin vs Configuration Centre vs SSB Setup
- Update the intro block on each of the three pages with a one-paragraph "What this is / What it is not" and a cross-link to the other two. No card duplication.
  - Platform Admin = technical control dashboard for platform capabilities.
  - Configuration Centre = guided one-time setup / readiness dashboard.
  - SSB Implementation Setup = St. Kitts SSB policy layer with lifecycle + resolver.

### 5. SSB Setup — process readiness cards
- Extend `SsbSetupPage` with a new "Process Readiness" tab (kept alongside existing lifecycle tabs).
- One card per process: Member Registration, Employer Registration, Benefit Setup, Contribution Setup, Claims Setup, Payments Setup.
- Each card calls the existing resolver via `ssbPolicyLifecycleService` (`getMemberRegistrationConfig`, `getEmployerRegistrationConfig`, `getBenefitSetupConfig`).
- If a resolver isn't implemented yet (Contribution / Claims / Payments), render a "Resolver pending" state — no hardcoded config, no fake readiness.
- Card shows: resolved policy versions, missing bindings, "Open canonical CRUD" link (reused from existing sections).

### 6. Permissions
- No permission grants removed. New parent modules inherit visibility via existing Admin / Application Admin role checks (already satisfied by `is_admin` bypass in `useNavigationMenu`).
- Verification step in acceptance doc for `admin@secureserve.gov` and `rohit@mishainfotech.com` (query only, no writes).

### 7. Documentation
- `docs/enterprise/ADMINISTRATION_IA_UNIFICATION_ACCEPTANCE.md` — before/after menu, app_modules diff, breadcrumb standard, screen ownership table, three-way distinction, permission + user verification, rollback (single `UPDATE` to revert `parent_id` / `sort_order`), duplicate-screen check, legacy impact = none.

### Technical notes
- Migration is `UPDATE ... WHERE name IN (...)` for reparenting and `INSERT ... ON CONFLICT DO NOTHING` for parents — idempotent.
- No changes to `AppRoutes.tsx` route definitions, no changes to `src/integrations/supabase/client.ts` or `types.ts` (parent rows use the same `app_modules` shape already typed).
- No BN/BEMA/IA/legacy tables touched. No RLS added (project rule: role-based only).
- Rollback = re-run the previous parent_id/sort_order values captured in the acceptance doc.

### Out of scope
- Building missing resolvers (Contribution / Claims / Payments) — only surfaced as "pending".
- Benefits work (explicitly deferred).
- Any new CRUD screen or route.

### Deliverables
- 1 migration (app_modules reparent + parent inserts).
- `src/lib/admin/adminBreadcrumbs.ts` + `AdminBreadcrumbs` component.
- Small header edits on ~12 admin shells to render the breadcrumb + cross-links (3 pages).
- New Process Readiness tab in `SsbSetupPage`.
- Acceptance doc.
