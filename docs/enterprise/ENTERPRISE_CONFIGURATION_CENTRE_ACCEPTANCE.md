# Enterprise Configuration Centre — Acceptance

Status: Delivered
Route: `/admin/configuration-centre`
Menu: Administration → Configuration Centre (`app_modules.name = enterprise_configuration_centre`)
Related architecture: `docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md`
Related consumption map: `docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md`

---

## 1. Purpose

Provide a single readiness/setup centre for the St. Kitts & Nevis
implementation that:

- Shows what has been configured across every shared domain and enterprise
  policy area.
- Explains how the three configuration layers consume each other.
- Reports whether **BN Product Builder** prerequisites are satisfied.
- Links out to the existing canonical admin screens — it never re-implements them.

## 2. Non-duplication guarantees

| Rule | Status |
| --- | --- |
| No new shared-domain tables | Confirmed — page reads existing `ssp_*`, `core_*`, `notification_templates`, `system_settings` only. |
| No new admin screens created | Confirmed — each card links to an already-registered `/admin/*` route. |
| No legacy tables changed (BEMA, IA, BN, legacy `ip_*`/`er_*`/`cl_*`/`cn_*`) | Confirmed — zero DML, zero DDL. |
| BN Product Builder not duplicated | Confirmed — Section 3 shows readiness only; no product configuration UI. |
| Existing template designer intact | Confirmed — Notification Templates link points to `/admin/notification-templates`. |

## 3. Page layout

### Section 1 — Shared Domain Configuration

| Card | Reads | Existing screen |
| --- | --- | --- |
| Geography | `ssp_geo_country` count | `/admin/geography` |
| Identity | `ssp_identity_type` count | `/admin/identity` |
| Financial Reference | `ssp_bank` count | `/admin/financial-reference` |
| Legal Reference | `ssp_legal_reference` count | `/admin/legal-reference` |
| Participant / Party | `ssp_relationship_type` count | `/admin/participant` |
| Documents | `core_dms_document_type` count | `/admin/dms` |
| Communication | `notification_templates` count | `/admin/communication-domain` |

Each card displays **Configured / Partially configured / Missing / Unknown**
plus row count, purpose text, and a link to the canonical admin screen.

### Section 2 — Enterprise Implementation Configuration

| Card | Reads | Existing screen |
| --- | --- | --- |
| Default Country (KN) | `system_settings.default_country` | `/admin/global-settings` |
| Organisation | `core_office` count | `/admin/offices` |
| Currency | `ssp_currency_ref` count | `/admin/financial-reference` |
| Timezone | `system_settings.default_timezone` | `/admin/global-settings` |
| Calendar & Holidays | `core_holiday` count | `/admin/calendar-holidays` |
| Numbering | `numbering_rules` count | `/admin/numbering` |
| Workflow | `workflow_definitions` count | `/admin/workflow-management` |
| Notification Templates | `notification_templates` count | `/admin/notification-templates` |
| Document Policy | `core_document_profile` count | `/admin/document-configuration` |

Cards degrade gracefully to **Unknown** if a probe table is not present.

### Section 3 — Benefit Product Configuration (readiness only)

BN Product Builder is marked **READY** only when ALL of the following hold:

1. Default country is set.
2. Member / participant types exist (`ssp_relationship_type` or `ssp_identity_type` > 0).
3. Payment channels / banks exist (`ssp_bank` > 0).
4. At least one legal reference exists (`ssp_legal_reference` > 0).
5. Document types exist (`core_dms_document_type` > 0).
6. Communication templates exist — **optional** (does not block).
7. Workflow templates exist — **optional** (does not block).

Section 3 is read-only. **BN Product Builder remains ON HOLD** pending sign-off
of the Shared-Domain Consumption Map.

### Section 4 — Consumption explanation

Plain-English description of the three layers:

- **Shared Domains** — common libraries reused by every module.
- **Enterprise Configuration** — implementation-wide policy.
- **Benefit Configuration** — product-specific rules that consume the above.

## 4. Menu wiring

- New `app_modules` row `enterprise_configuration_centre`
  (id `2c2c0000-0000-4000-8000-000000000210`).
- Route `/admin/configuration-centre`, icon `PackageCheck`, `rollout_state = public`.
- Placed under the same Administration parent as `shared_domains`
  (id `2c2c0000-0000-4000-8000-000000000200`) via an idempotent `UPDATE`.
- `PlatformAdmin.tsx` now shows a dedicated **Enterprise Configuration** card at
  the top of the platform admin landing that links to the Centre.

## 5. Permissions & current-user access

- No new `permissions` codes introduced.
- Any user who already reaches an Administration `/admin/*` route (Admin,
  Application Admin) can reach `/admin/configuration-centre` — the route is
  registered under the same `ProtectedLayout` used by other admin pages.
- Existing Admin/Application Admin users verified: they retain access to every
  linked screen because those screens' permissions were not changed.

## 6. Legacy impact

- No legacy tables touched.
- No BN, Compliance, IA, Legal, BEMA schema change.
- No legacy route removed.
- No structural change to `notification_templates` or `comm_*` assets.
- Existing template designer, DMS and configuration screens untouched.

## 7. Rollback

1. Remove the menu row:
   ```sql
   DELETE FROM public.app_modules
   WHERE id = '2c2c0000-0000-4000-8000-000000000210';
   ```
2. Remove route registration in `src/components/routing/AppRoutes.tsx`
   (lazy import + `<Route path="/admin/configuration-centre" ... />`).
3. Delete `src/pages/admin/ConfigurationCentre.tsx`.
4. Remove the "Enterprise Configuration" group from
   `src/pages/admin/PlatformAdmin.tsx`.

No data migration required — the page is read-only.

## 8. Next recommendations

1. Wire cards to a persistent `enterprise_setup_state` snapshot if per-country
   readiness needs to be audited historically.
2. Add owner-level assignment on each card once role-based configuration
   ownership is introduced.
3. Once the BN Product Builder Consumption Map is signed off, unlock the BN
   Product Builder from Section 3 by linking it to `/bn/config`.
