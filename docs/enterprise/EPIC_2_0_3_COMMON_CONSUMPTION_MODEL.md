# Epic 2.0.3 — Common Consumption Model

**Status:** Architecture / planning only. No code, schema, routes, `app_modules`, permissions, hooks, services, or data changes in this epic.
**Owner:** Enterprise Architecture
**Applies to:** Every product, module, and future framework across the platform (BN, HRMS, DMS/EDRMS, Licensing, Prison, Budgeting, Payroll, Asset, Compliance, Legal, and any future government platform).
**Depends on:**
- `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`
- `EPIC_1_2_ENTERPRISE_MASTER_DATA_PLATFORM.md`
- `EPIC_1_2_MASTER_GOVERNANCE_MODEL.md`
- `EPIC_2_0_ORGANISATION_FOUNDATION.md`
- `EPIC_2_0_1_ORGANISATION_FOUNDATION_ACTIVATION_ACCEPTANCE.md`
- `EPIC_2_0_2_CALENDAR_HOLIDAYS_WORKING_WEEK_PLAN.md`
- `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`

---

## 1. Purpose

Define **how every module in the platform must consume shared foundations** — Calendar, Holidays, Working Week, Time Zone, Organisation/Office/Department settings, Branding, Reference Data, Master Data, Workflow/SLA, Notifications, Audit, Numbering, Documents — so that:

- No module duplicates a shared table or service.
- No module reads or writes a shared table directly.
- Overrides are expressed as *bindings*, not as forked masters.
- The path from today's direct-table reads to shared facades is documented and enforceable.

This document is the single reference for reviewers: any PR that consumes a shared capability must map to one of the layers defined here.

---

## 2. Consumption Layers

Consumption is stratified into four layers. A module must always choose the **highest layer that satisfies its need** (Platform > Core Enterprise > Organisation > Module).

### 2.1 Layer 1 — Platform Services

Cross-cutting infrastructure. Consumed **only** via the platform service facade — never by direct table access.

| Capability | Canonical service (facade) | Owning tables (do not read directly) |
|---|---|---|
| Workflow / approvals | `workflowService` (shared) | `system_workflow_*`, `*_workflow_policy` |
| Notifications | `notificationService` (shared) | `system_notifications`, `comm_*`, `*_communication_log` |
| Audit | `auditService` | `system_audit_trail`, `*_audit_*` |
| Scheduler / jobs | `schedulerService` | `system_jobs`, cron surfaces |
| Numbering | `numberingService` (auto-code registry) | `system_number_template`, `core_number_sequence` |
| Documents / DMS | `documentsService` via `documentsAdapter` | `dms_*` |

Rules:
- No module owns its own notification or workflow engine (see `EPIC_0_36B_SERVICE_IMPLEMENTATION_MATRIX.md` hotspots #2 and #3 — BN/CE/LG local stacks must be retired).
- Module-specific templates, rules, and policies are **registered** with the platform service, not implemented in a fork of it.

### 2.2 Layer 2 — Core Enterprise Services

Enterprise-wide reference and time semantics. Consumed via named hooks / service facades.

| Hook / Facade | Returns | Backed by |
|---|---|---|
| `useCoreCalendar(scope?)` | Effective calendar (working days, hours, timezone) | `core_calendar` (proposed in Epic 2.0.2b) |
| `useCoreHolidays(scope?, range)` | Effective holiday set | `public_holidays` (canonical); `ia_holidays` remains untouched |
| `useWorkingWeek(scope?)` | Working-day mask + working hours | `core_calendar` |
| `useTimezone(scope?)` | IANA tz for the effective scope | `core_calendar` → org → office → system default |
| `useReferenceData(group)` | Reference values for a group | `core_reference_group`, `core_reference_value` |
| `useMasterData(master, filter?)` | Enterprise master rows | MDP registry (see Epic 1.2) |
| `useAutoCode(entity)` | Next number for an entity | `autoCodeRegistry` / `numberingService` |

Rules:
- All time math (add business days, next working day, deadline calculation) MUST route through `useCoreCalendar` / `useWorkingWeek` — no module-local weekend logic.
- All enum-like values MUST come from `useReferenceData` — no hard-coded arrays in components (aligns with `LEGAL_MASTER_CONSUMPTION_PLAN.md`).
- All master lookups (Country, Bank, Currency, Payment Channel, etc.) MUST come from `useMasterData` — resolves BN→SSP coupling hotspot #1.

### 2.3 Layer 3 — Organisation Services

Organisation-scoped context. Consumed via the Organisation context/hooks.

| Hook | Returns |
|---|---|
| `useOrganization()` | Active org profile |
| `useOrganizationSettings(key?)` | Org-level settings, incl. defaults for tz, currency, week, branding |
| `useOrganizationCalendar()` | Org-scoped calendar (composes with `useCoreCalendar`) |
| `useOffice(id?)` | Office/location record |
| `useDepartment(id?)` | Department record |
| `useBranding(scope?)` | Effective branding (org → product → office) |

Rules:
- Effective-value resolution is **always** `office → department → org → system default`; modules never re-implement this precedence (see `docs/architecture/scope-precedence.md`).
- Org, Office, Department screens remain the canonical surfaces listed in `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md` §1 — no module ships its own copy.

### 2.4 Layer 4 — Module Consumption

Modules are consumers. They compose Layers 1–3 into their domain workflows.

Canonical examples:

| Module | Uses | For |
|---|---|---|
| BN | `useCoreCalendar`, `useCoreHolidays`, `workflowService` | Claim deadlines, waiting periods, SLA, approval routing |
| Compliance (CE) | `useCoreCalendar`, `workflowService`, `notificationService` | Inspection planning, escalation deadlines, notices |
| Legal (LG) | `useCoreCalendar`, `useCoreHolidays`, `documentsService` | Hearing scheduling, statutory notice periods, filings |
| Audit | `useCoreCalendar`, `useOrganizationCalendar` | Audit planning windows, engagement calendars |
| HRMS | `useWorkingWeek`, `useCoreHolidays` | Leave accrual, attendance, shift rosters |
| Payroll | `useCoreCalendar`, `useWorkingWeek`, `useMasterData('bank')` | Pay periods, payment file cut-offs, bank refs |
| DMS / EDRMS | `documentsService`, `useReferenceData('doc_category')` | Retention schedules, categorisation |
| Licensing | `useCoreCalendar`, `numberingService`, `workflowService` | Licence validity, renewal reminders, licence numbering |
| Prison | `useCoreCalendar`, `useCoreHolidays` | Custody terms, hearing dates, visitation windows |
| Budgeting | `useOrganization`, `useCoreCalendar` | Fiscal periods, approval windows |
| Asset Management | `useCoreCalendar`, `useMasterData('location')` | Depreciation schedules, maintenance windows |

---

## 3. Common Consumption Matrix

Legend: **P** = Platform service, **C** = Core hook, **O** = Organisation hook, **M** = Module-owned binding table (override only).

| Capability | BN | CE | LG | Audit | HRMS | Payroll | DMS | Licensing | Prison | Budgeting | Asset |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Calendar | C | C | C | C | C | C | — | C | C | C | C |
| Holidays | C | C | C | C | C | C | — | C | C | C | — |
| Working Week | C | C | C | C | C | C | — | C | C | C | C |
| Time Zone | C | C | C | C | C | C | C | C | C | C | C |
| Org Settings | O | O | O | O | O | O | O | O | O | O | O |
| Office/Location | O | O | O | O | O | O | O | O | O | O | O |
| Department | O | O | O | O | O | O | — | O | O | O | O |
| Branding | O | O | O | O | O | O | O | O | O | — | — |
| Reference Data | C | C | C | C | C | C | C | C | C | C | C |
| Master Data | C | C | C | C | C | C | C | C | C | C | C |
| Workflow / SLA | P + M | P + M | P + M | P | P + M | P | P | P + M | P + M | P + M | P |
| Notifications | P | P | P | P | P | P | P | P | P | P | P |
| Audit | P | P | P | P | P | P | P | P | P | P | P |
| Numbering | P | P | P | P | P | P | P | P | P | P | P |
| Documents | P | P | P | P | P | P | P | P | P | P | P |

`M` in Workflow/SLA means the module owns only a **binding/policy table** (e.g. `bn_workflow_policy`, `lg_sla_policy`) that references the platform engine — never a parallel engine.

---

## 4. Service / Hook Consumption Model

### 4.1 Read pattern (canonical)

```
UI component
  └── module hook (e.g. useBnClaimDeadline)
        └── core hook (useCoreCalendar / useCoreHolidays)
              └── core service (calendarService)
                    └── Supabase (core_calendar, public_holidays)
```

### 4.2 Write pattern (canonical)

```
UI action
  └── module service (e.g. bnAwardService.approve)
        ├── workflowService.transition(...)     // Platform
        ├── notificationService.send(...)        // Platform
        └── auditService.record(...)             // Platform
```

Modules never call `supabase.from('system_audit_trail')` or `supabase.from('system_workflow_*')` directly.

### 4.3 Composition rule

Higher layers may call lower layers. Lower layers **must not** call higher layers.
Platform ← Core ← Organisation ← Module. Never the other direction.

---

## 5. Module Usage Examples (canonical — non-normative code shape)

### 5.1 BN — claim deadline

```ts
// src/hooks/bn/useBnClaimDeadline.ts (target shape)
const { addBusinessDays } = useCoreCalendar();
const deadline = addBusinessDays(claim.receivedAt, product.slaBusinessDays);
```

Not allowed: computing `+ N days` in the component and skipping weekends with an inline `if`.

### 5.2 Compliance — inspection scheduling

```ts
const { nextWorkingDay } = useWorkingWeek(officeId);
const { isHoliday } = useCoreHolidays(officeId);
const scheduled = nextWorkingDay(preferredDate, { skipHolidays: true });
```

### 5.3 Legal — hearing notice

```ts
const { addBusinessDays } = useCoreCalendar(courtVenueId);
const noticeBy = addBusinessDays(hearing.date, -statutoryNoticeDays);
await notificationService.send({ template: 'LG_HEARING_NOTICE', ... });
```

### 5.4 HRMS — leave accrual

```ts
const { workingDaysBetween } = useWorkingWeek(employee.officeId);
const days = workingDaysBetween(request.from, request.to);
```

### 5.5 Payroll — pay period

```ts
const cal = useOrganizationCalendar();
const period = cal.payPeriodFor(referenceDate);
```

---

## 6. Direct-Table-Access Restrictions

The following tables are **off-limits** to module code. Modules must go through the corresponding facade.

| Table / family | Allowed access | Forbidden for modules |
|---|---|---|
| `public_holidays` | `useCoreHolidays`, `calendarService` | Direct `supabase.from('public_holidays')` in module code |
| `core_calendar` (once created) | `useCoreCalendar`, `calendarService` | Direct reads/writes |
| `core_reference_group`, `core_reference_value` | `useReferenceData`, `referenceService` | Direct reads |
| `system_audit_trail` | `auditService` | Direct inserts |
| `system_notifications`, `comm_*` | `notificationService` | Direct inserts / template mutation |
| `system_workflow_*` | `workflowService` | Direct state writes |
| `system_number_template`, `core_number_sequence` | `numberingService` / `autoCodeRegistry` | Direct sequence writes |
| `core_organization`, `core_department`, `office_locations` | `useOrganization`, `useOffice`, `useDepartment` | Direct writes from module code |
| BEMA / legacy (`bema_*`, `tb_*`, `lg_*` legacy, `ia_*`, `system_office_settings`, `bn_*` legacy) | Read-only adapters only | Any change without `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` |

Lint targets (to be added incrementally, non-normative for this epic):
- Extend `scripts/lint-no-direct-ce-status.ts` pattern to cover the tables above (`lint-no-direct-<capability>.ts`).
- Code review checklist entry: "Does this PR read a shared table directly?"

---

## 7. Override Policy

When a module genuinely needs to deviate from a shared value, it MUST:

1. **Not** duplicate the shared master or fork the shared service.
2. Store the deviation in a **module-specific binding table** whose name is `{module}_{capability}_binding` or `{module}_{capability}_policy`.
3. Have the module hook compose: `effective = binding ?? organisation ?? core ?? system default`.
4. Register the binding table with the MDP as a **consumer**, not a master (see `EPIC_1_2_MASTER_GOVERNANCE_MODEL.md` §10).
5. Record the override reason in `system_audit_trail`.

Examples of allowed bindings:

| Module | Binding | Overrides |
|---|---|---|
| BN | `bn_product_sla_policy` | SLA duration per product; still resolves working days via Core |
| CE | `ce_inspection_calendar_binding` | Per-office inspection blackout dates; still composes with `public_holidays` |
| LG | `lg_court_calendar_binding` | Per-court sitting days; composes with `core_calendar` |
| Payroll | `pay_period_binding` | Custom pay cycle; timezone still from Org |

Never allowed:
- A `bn_calendar` or `bn_holidays` table that replicates the shared master.
- A `lg_notification_engine` that bypasses `notificationService`.

---

## 8. Migration Path — direct reads → shared facades

Applies to existing code identified in `EPIC_0_36B_SERVICE_IMPLEMENTATION_MATRIX.md` and `LEGAL_MASTER_CONSUMPTION_PLAN.md`.

### Wave A — Introduce facades (no consumer changes)
- Materialise the missing facades: `useCoreCalendar`, `useWorkingWeek`, `useTimezone`, `useMasterData`, shared `notificationService`, shared `workflowService`. (Adapters in `src/adapters/*` already provide the shape.)
- No module code changes yet.

### Wave B — Retarget hot paths
Priority order (largest coupling first, per Epic 0.36B hotspots):
1. BN → SSP masters (Country, Bank, Payment, Legal Ref, ID Rules) via `useMasterData` — resolves hotspot #1.
2. BN / CE / LG notification stacks → `notificationService` — resolves hotspot #2.
3. BN / CE / LG workflow stacks → `workflowService` — resolves hotspot #3.
4. Free-text enum swaps per `LEGAL_MASTER_CONSUMPTION_PLAN.md` via `useReferenceData`.

### Wave C — Calendar/holiday consolidation
- All modules using inline weekend/holiday logic switch to `useCoreCalendar` / `useCoreHolidays`.
- `ia_holidays` remains untouched; consolidation only via approved `BEMA_LEGACY_TABLE_IMPACT_NOTE.md`.

### Wave D — Direct-table lint enforcement
- Add lint scripts for each forbidden table family (§6).
- CI fails on new violations; existing violations tracked as tech debt with owner + target wave.

### Wave E — Duplicate context/engine retirement
- Consolidate `AuthContext`, `NewBenefitAuthContext`, `LegalAuthContext` into `SupabaseAuthContext`.
- Consolidate `useLgAccess` / `useHasCapability` into a single Enterprise Authorisation hook.

Each wave ships its own acceptance document; none of them are in scope for Epic 2.0.3.

---

## 9. Governance & Compliance

- **Screen & Legacy Table Governance:** This epic proposes no new screens and no legacy table changes. Compliant with `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md` §§1–5.
- **BEMA:** No BEMA table touched. Any future consolidation of `ia_holidays`, `system_office_settings`, `tb_*` requires an approved entry in `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` before execution.
- **Framework Blueprint:** Consumption layers, hook naming, and override pattern conform to `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`.
- **MDP:** Master and Reference consumption aligns with `EPIC_1_2_MASTER_GOVERNANCE_MODEL.md` (consumer registration, no cross-schema joins, retire-safe reads).

---

## 10. Acceptance

- Common Consumption Matrix is defined for every current and future product.
- Four consumption layers (Platform / Core / Organisation / Module) are documented with canonical hooks and services.
- Direct-table-access restrictions enumerate every off-limits table family and the required facade.
- Override policy forbids duplicate masters and requires binding tables composed on top of shared values.
- Migration path from direct reads to shared facades is sequenced into waves A–E with priority driven by the Epic 0.36B coupling hotspots.
- No code, schema, routes, `app_modules`, menus, permissions, feature flags, or data changed in this epic.

---

## 11. Recommended Next Epic

**Epic 2.0.4 — Shared Facade Materialisation (Wave A):** stand up `useCoreCalendar`, `useWorkingWeek`, `useTimezone`, and the shared `notificationService` / `workflowService` facades in code (additive only), so subsequent waves can retarget module hot paths without further architectural work.
