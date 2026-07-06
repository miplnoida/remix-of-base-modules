# Administration IA & Platform Configuration Unification — Acceptance

Status: Delivered
Scope: Live left menu, breadcrumbs, three-way distinction (Platform Admin / Configuration Centre / SSB Setup), SSB Setup process-readiness cards.

No new CRUD screens. No route changes. No BN / BEMA / IA / legacy tables changed.
No RLS added (project rule: role-based only).

## 1. Before / After menu structure

### Before (flat under Administration)
```
Administration
├─ Configuration Centre                (/admin/configuration-centre)
├─ SSB Implementation Setup            (/admin/ssb-setup)
├─ Enterprise Service Catalogue        (/admin/platform/enterprise-catalogue)
├─ Organization Management (group)
├─ Identity & Security (group)
├─ Shared Domains (group)
├─ Master Data (group)                 — Reference Framework was misfiled here
├─ Workflow & Automation (group)
├─ Communication & Document Engine (group)
├─ Integrations (group)
└─ System Administration (group)
```

Reference Framework was parented under Master Data. Platform Admin (`/admin/platform`)
had no menu row at all. Configuration Centre and SSB Setup sat at the same level as
technical control groups, making the "guided setup" story invisible.

### After
```
Administration
├─ Setup Centre                        (new parent)
│   ├─ Configuration Centre            (/admin/configuration-centre)
│   └─ SSB Implementation Setup        (/admin/ssb-setup)
├─ Platform                            (new parent)
│   ├─ Platform Admin                  (/admin/platform)            (menu row added)
│   ├─ Enterprise Catalogue            (/admin/platform/enterprise-catalogue)
│   └─ Reference Framework             (/admin/reference-framework)
├─ Organization Management (group)     (unchanged)
├─ Identity & Security (group)         (unchanged — "Security" role)
├─ Shared Domains (group)              (unchanged)
├─ Master Data (group)                 (unchanged; Reference Framework removed from here)
├─ Workflow & Automation (group)       (unchanged — "Operations" role)
├─ Communication & Document Engine (group) (unchanged)
├─ Integrations (group)                (unchanged)
└─ System Administration (group)       (unchanged — "Operations" role)
```

Only the two new parents (Setup Centre, Platform) and a Platform Admin menu row were
added. Existing groups keep their names to avoid renaming churn; the acceptance doc
maps their role to the target taxonomy (see §4).

## 2. app_modules diff

Idempotent inserts / updates (via `insert` tool, not migration):

| Action | Row | id | parent_id | sort_order |
|---|---|---|---|---|
| INSERT | Setup Centre (`admin_setup_centre`) | `e3000000-…-000000000001` | Administration `aab5fcb8-…` | 3 |
| INSERT | Platform (`admin_platform_group`) | `e3000000-…-000000000002` | Administration `aab5fcb8-…` | 4 |
| INSERT | Platform Admin leaf (`admin_platform_admin`, `/admin/platform`) | `e3000000-…-000000000010` | Platform `e3000000-…-000000000002` | 10 |
| UPDATE | Configuration Centre (`enterprise_configuration_centre`) | `2c2c0000-…-000000000210` | → Setup Centre | 10 |
| UPDATE | SSB Implementation Setup (`ssb_implementation_setup`) | `e2b00000-…-000000000001` | → Setup Centre | 20 |
| UPDATE | Enterprise Catalogue (`admin_org_cc_communication`) | `f0110002-…-000000000001` | → Platform | 20 |
| UPDATE | Reference Framework (`admin_reference_framework`) | `693bfd28-…` | → Platform | 30 |

No `DELETE`. No route changes. No permission grants added or removed.

### Rollback
Single reversal query:
```sql
UPDATE app_modules SET parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47', sort_order = 5  WHERE id = '2c2c0000-0000-4000-8000-000000000210';
UPDATE app_modules SET parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47', sort_order = 6  WHERE id = 'e2b00000-0000-4000-8000-000000000001';
UPDATE app_modules SET parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47', sort_order = 10 WHERE id = 'f0110002-0000-4000-8000-000000000001';
UPDATE app_modules SET parent_id = 'e1a00000-0000-4000-8000-000000000003', sort_order = 0  WHERE id = '693bfd28-12d9-4711-9b42-883adb08a89f';
UPDATE app_modules SET show_in_menu = false WHERE id IN
  ('e3000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000010');
```

## 3. Breadcrumb standard

Applied to the three shells owned by this epic:

| Route | Breadcrumb |
|---|---|
| `/admin/platform`               | Home → Administration → Platform → Platform Admin |
| `/admin/configuration-centre`   | Home → Administration → Setup Centre → Configuration Centre |
| `/admin/ssb-setup`              | Home → Administration → Setup Centre → SSB Implementation Setup |

Domain and Master Data pages already render their own breadcrumbs via `PageShell` /
`PageHeader`. The recommended pattern for future admin shells is:

```
Home → Administration → <Group> → <Page Name>
```

where `<Group>` is one of: **Setup Centre, Platform, Organisation, Master Data,
Shared Domains, Security, Operations, Business Module Configuration**.

## 4. Screen ownership — three-way distinction

| Surface | Purpose | What it is NOT | Data it owns |
|---|---|---|---|
| **Platform Admin** (`/admin/platform`) | Technical control dashboard for shared platform capabilities. | Not a guided setup wizard, not SSB-specific. | None — it links out. |
| **Configuration Centre** (`/admin/configuration-centre`) | Guided one-time platform setup + readiness dashboard for the KN implementation. | Not a CRUD screen. Does not edit master data. | None — reads engine counts. |
| **SSB Implementation Setup** (`/admin/ssb-setup`) | St. Kitts SSB policy layer with lifecycle + resolver. | Not a master data screen. Does not duplicate engine CRUD. | `ssb_*_policy` rows only (bindings, not shared data). |

Each of the three now carries a short "vs" callout at the top that cross-links to the
other two, so users landing on any one of them can navigate laterally.

### Target-taxonomy mapping for existing groups
| Target section | Currently represented by (unchanged) |
|---|---|
| Organisation | `admin_organization` group |
| Master Data | `admin_master_data` group |
| Shared Domains | `shared_domains` group |
| Security | `admin_identity_security` group |
| Operations | `admin_workflow_automation` + `admin_system` + `admin_comm_doc_engine` |
| Business Module Configuration | Existing per-module admin groups (C3, BN, Compliance, Legal) |

Renames to the target labels are deliberately deferred to keep this epic
non-destructive; menu depth and grouping are the user-visible improvements.

## 5. SSB Setup — process readiness

A new **Process Readiness** tab on `/admin/ssb-setup` renders one card per business
process, resolved live via `ssbPolicyLifecycleService`:

| Process | Resolver | Behaviour |
|---|---|---|
| Member Registration   | `getMemberRegistrationConfig(asOf)`   | Shows Present / Missing keys → Ready / Partial / Missing badge. |
| Employer Registration | `getEmployerRegistrationConfig(asOf)` | Same as above. |
| Benefit Setup         | `getBenefitSetupConfig(asOf)`         | Same as above; drives BN Product Builder gate. |
| Contribution Setup    | — | Renders **Resolver pending** badge. No hardcoded readiness. |
| Claims Setup          | — | Renders **Resolver pending** badge. No hardcoded readiness. |
| Payments Setup        | — | Renders **Resolver pending** badge. No hardcoded readiness. |

Cards use the same `StatusBadge` component as the existing section cards for visual
consistency. The `asOfDate` defaults to today; the resolver contract is date-aware.

## 6. Permissions — preserved

- No permission rows changed. Existing `is_admin` bypass in `useNavigationMenu`
  ensures Admin / Application Admin see the new parents automatically.
- New parent modules (`admin_setup_centre`, `admin_platform_group`) hold no
  permission grants of their own; visibility is inherited via child accessibility.
- New leaf `admin_platform_admin` points to an existing route already reachable by
  admins; no new permission surface.

### Current user verification (queried, not modified)
- `admin@secureserve.gov` — Admin role → sees all reparented items via `is_admin` bypass.
- `rohit@mishainfotech.com` — Admin role → same.

## 7. No duplicate screens

Verified by inspection:
- `/admin/platform` is served only by `PlatformAdmin.tsx`.
- `/admin/configuration-centre` is served only by `ConfigurationCentre.tsx`.
- `/admin/ssb-setup` is served only by `SsbSetupPage.tsx`.
- `/admin/reference-framework`, `/admin/platform/enterprise-catalogue` — one route each.
No new page components were created.

## 8. Legacy impact

None. No BN / BEMA / IA / legacy tables read or written. All schema changes
introduced by this epic are limited to inserts / updates on `public.app_modules`.

## 9. Files touched

Code:
- `src/pages/admin/PlatformAdmin.tsx` — breadcrumb + "vs" cross-link callout.
- `src/pages/admin/ConfigurationCentre.tsx` — breadcrumb (added Setup Centre node).
- `src/pages/admin/SsbSetupPage.tsx` — breadcrumb, cross-link callout, new
  Process Readiness tab (imports lifecycle resolvers).

Data (app_modules only): see §2.

Docs:
- `docs/enterprise/ADMINISTRATION_IA_UNIFICATION_ACCEPTANCE.md` (this file).
