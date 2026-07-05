# Central Settings + Configuration Centre — Acceptance

Status: Delivered
Route: `/admin/configuration-centre`
Menu: Administration → Configuration Centre (`app_modules.name = enterprise_configuration_centre`, id `2c2c0000-0000-4000-8000-000000000210`)

Related:
- `docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md`
- `docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md`
- `docs/enterprise/ENTERPRISE_CONFIGURATION_CENTRE_ACCEPTANCE.md` (superseded by this upgrade)
- `docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md`

---

## 1. What was delivered

1. **Settings Source Map** (`CENTRAL_SETTINGS_SOURCE_MAP.md`) inventorying every
   settings area in the repo across five layers: Platform, Enterprise Core,
   Organisation, Shared Domains, Business Modules (Benefits).
   For each entry: route, page/component, CRUD availability, tables, service/hook,
   canonical owner, duplicates, action (KEEP / LINK / EXTEND / TAB / REDIRECT /
   CREATE / DEFER), migration approach, BN Product Builder consumption.
2. **Configuration Centre upgraded** (`src/pages/admin/ConfigurationCentre.tsx`)
   from a two-section readiness dashboard to a five-section setup centre:
   - Section 1 — Platform Setup
   - Section 2 — Enterprise Core Setup
   - Section 3 — Organisation Setup
   - Section 4 — Shared Domain Setup
   - Section 5 — Benefits Readiness
3. **CRUD ownership drawer** on every card exposes the Source-Map facts inline:
   `CRUD happens at`, `Tables used`, `Service/hook used`, `Consumed by`,
   `Migration status`, `Impact if missing`, and the standing rule
   *"Do not duplicate this screen — link only."*

## 2. Non-duplication guarantees

| Rule | Status |
| --- | --- |
| No new shared-domain tables | Confirmed — page reads existing `ssp_*` / `core_*` / `notification_templates` / `system_settings` only. |
| No new admin screens created | Confirmed — every "Configure" button links to an existing `/admin/*` route. |
| No duplicate CRUD path | Confirmed — Source Map lists all duplicate/legacy routes; Configuration Centre links to canonical only. |
| No legacy tables changed (BEMA, IA, BN, `ip_*`, `er_*`, `cl_*`, `cn_*`) | Confirmed — zero DDL, zero DML. |
| Existing template designer intact | Confirmed — Notification Templates card links to `/admin/notification-templates`; communication card explicitly notes the designer remains there. |
| BN Product Builder not duplicated | Confirmed — Section 5 is readiness-only. |

## 3. Decision-rule application

For each setting the Source Map applies:

- Existing CRUD screen good → **KEEP / LINK** (all shared domains, users, roles, workflow, numbering, notification templates, calendar, offices, departments, designations, branding, DMS, document configuration, reference framework, enterprise catalogue, global settings, security).
- Existing screen good but missing fields → **EXTEND** in place (master-data legacy screens flagged for adapter-based extension, not clone).
- Duplicate route exists → **REDIRECT** (already implemented via `<Navigate replace>` for master-data/designations, numbering-rules, notifications/templates, comm/templates/*, org overview shells, audit-log(s)).
- No screen exists → **CREATE** (none required this cycle).
- Legacy table too old → **adapter / facade** only; no destructive migration.

## 4. Permissions & menu

- `app_modules` row `enterprise_configuration_centre` already registered under the
  Administration parent (see `ENTERPRISE_CONFIGURATION_CENTRE_ACCEPTANCE.md` §4).
- Route registered in `AppRoutes.tsx` under `ProtectedLayout`. Actions available
  are `view / manage / admin` inherited from the Administration node.
- Admin and Application Admin users retain access — no permission code changed,
  no `role_permissions` row modified.
- Verified: Configuration Centre continues to appear in the live left menu
  because `app_modules` still resolves `show_in_menu = true` for this row.

## 5. Legacy impact

- **Zero** structural changes to BEMA, IA, BN, Legal, Compliance, or legacy
  `ip_*` / `er_*` / `cl_*` / `cn_*` schemas.
- **Zero** removed routes. Legacy master-data / notification / comm-template
  routes remain reachable via existing redirects.
- Template designer (`notification_templates`) untouched.
- DMS storage and `core_document_profile` untouched.

## 6. Acceptance checks

- [x] Settings Source Map created (`CENTRAL_SETTINGS_SOURCE_MAP.md`).
- [x] Configuration Centre links to existing canonical CRUD screens only.
- [x] Every setting card shows where CRUD actually happens.
- [x] Every setting card shows table/service ownership.
- [x] No duplicate CRUD screen created.
- [x] No legacy table changed.
- [x] BN Product Builder readiness visible in Section 5.
- [x] Current Admin / Application Admin users can access the Centre.

## 7. Rollback

1. Revert `src/pages/admin/ConfigurationCentre.tsx` to the previous version
   (pre-upgrade file preserved in git history).
2. Delete `docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md` and this acceptance doc.

No data changes to revert — the upgrade is presentation-only.

## 8. Next recommendation

1. Sign off the **Central Settings Source Map** with Enterprise Architecture.
2. Once signed off, unblock **BN Product Builder** using the Consumption Map.
3. Optional follow-up: promote the CRUD ownership drawer content into a
   `enterprise_setup_state` snapshot so setup progress is auditable across
   countries / rollouts.
