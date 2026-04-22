# Violation Types

## 1. Screen Overview
- **Screen name**: Violation Types
- **Route/path**: `/compliance/admin/settings/violation-types`
- **Page component**: `src/pages/compliance/settings/ViolationTypes.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_violation_types'`, sort_order 2)
- **Screen type**: Settings / List with inline expand + dialog editor

## 2. Business Function
The master catalogue of every kind of compliance breach the system can recognise (Late Filing, Underpayment, Unregistered Employer, etc.). Every detection / calculation / escalation rule is anchored to a violation type, and every raised violation, case and notice carries this code. The screen is the single place to:
- introduce a new violation type when policy or law changes
- adjust default severity, grace period, or applicable funds
- retire (deactivate) a type that is no longer used.

It is **pure configuration**, used by **Compliance Administrators / Policy Owners** at set-up and during periodic policy reviews.

## 3. Primary User Roles
- **Access / Edit**: Compliance Admin, Policy Owner.
- **View only**: Compliance Manager, Supervisor (read-only role grants).
- **No approval role** — changes are live on save.

## 4. UI Responsibilities
- Header: title, description, `Add Violation Type` button.
- **Category filter chips** (FILING, PAYMENT, REGISTRATION, CONTRIBUTION, DECLARATION, LEGAL, AUDIT, FRAUD, OTHER), with live counts.
- **Drag-and-drop list** (`@hello-pangea/dnd`) — drag handle reorders rows; `sort_order` is rewritten in batch.
- Each row: code badge, name, category badge, "Auto-Detect" badge, "N rules" badge (count of linked detection + calculation + escalation rules), applicable-fund chips, severity badge, **toggle switch** (`is_active`), expand / edit / deactivate buttons.
- **Expand panel** shows category, grace period, auto-detect flag, severity, applicable funds, plus the actual list of linked rules (from `ce_detection_rules`, `ce_calculation_rules`, `ce_escalation_rules`).
- **Add/Edit dialog**: code (auto-generated `VT-NNN`), name, description, category, default severity, auto-detect flag, grace period (days), applicable funds (multi-select: SS, LV, EI, SV, PE), `is_active`, sort order.
- **Deactivate confirmation** alert dialog (soft-delete only).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Downstream |
|---|---|---|---|
| **Add** | Inserts new type after duplicate-name and duplicate-code checks. | INSERT `ce_violation_types` | Becomes selectable in Rule Engine, raised violations can carry it. |
| **Edit** | Updates fields; same duplicate checks. | UPDATE | Existing violations keep their snapshot; new ones use the updated config. |
| **Toggle Active** | `is_active` switch. | UPDATE | Detection rules tied to an inactive type continue to fire (no cascade); the type just hides from new selectors. (See §12.) |
| **Reorder (drag)** | Recalculates `sort_order` for the visible (filtered) set. | UPDATE per row | Display ordering across compliance screens. |
| **Deactivate** | `softDeactivateViolationType` — `is_active=false`. | UPDATE | Same as Toggle Active off. |

No hard delete.

## 6. Data Model / Tables Used
| Table | R/W | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_violation_types` | RW | Master catalogue | `code`, `name`, `description`, `category`, `severity_default` (LOW/MEDIUM/HIGH/CRITICAL), `auto_detect`, `grace_period_days`, `applicable_funds[]`, `is_active`, `sort_order` | Rule Engine, Assignment Routing Rules (lookup), Workbench, Cases, Violations grids, Reports |
| `ce_detection_rules` | R | Count + names of linked detection rules | `rule_code`, `name`, `violation_type_id` | Rule Engine |
| `ce_calculation_rules` | R | Count + names of linked calc rules | same shape | Rule Engine |
| `ce_escalation_rules` | R | Count + names of linked escalation rules | same shape | Rule Engine |

## 7. Services / Hooks / Queries Used
- `complianceSettingsService.ts` — `withAuditFields`, `checkDuplicateViolationType`, `softDeactivateViolationType`, `validationToastConfig`, `formatAuditTimestamp`.
- `useUserCode` — supplies UserCode for audit fields.
- `@tanstack/react-query` — `ce_violation_types` query, `ce_linked_rules_map` query (parallel `Promise.all` against the three rule tables), mutations for save/toggle/deactivate/reorder.
- `@hello-pangea/dnd` — drag-and-drop list reorder.
- `@/integrations/supabase/client` — direct CRUD.

## 8. Validation Rules
| Rule | Where |
|---|---|
| `code` required, unique (case-insensitive) | UI + service `checkDuplicateViolationType('code', …)` |
| `name` required, unique (case-insensitive) | UI + service `checkDuplicateViolationType('name', …)` |
| `category` ∈ enum (FILING/PAYMENT/…) | UI Select |
| `severity_default` ∈ enum (LOW/MEDIUM/HIGH/CRITICAL) | UI Select |
| `grace_period_days` numeric (default 0) | UI Input type=number |
| `applicable_funds` subset of {SS, LV, EI, SV, PE} | UI multi-select; nullable when empty |
| Soft-delete only — no hard delete | Service / UI (button calls `softDeactivate…`) |

No DB-level CHECK or trigger validations identified. UPPERCASE enum values are convention-enforced by UI dropdowns (per inline comment).

## 9. Workflow / Approval / Notification Logic
- None: changes go live on save.
- No notification engine integration.
- No history table beyond `updated_by` / `updated_at`.

## 10. Linkages to Other Screens
- **Rule Engine** — every rule selects a `violation_type_id` from this table.
- **Assignment Routing Rules** — `violation_type_id` is one of the routing dimensions.
- **Compliance Workbench / Cases / Violations / Reports** — display violation type code & name.
- **Detection job** — uses `auto_detect` and `grace_period_days` to decide whether to raise.
- **Reference Numbering Schemes** — `applies_to='Violation'` schemes generate the violation reference number used downstream.

## 11. Audit Trail / Logging
- Inline columns `created_by`, `updated_by`, `updated_at` only.
- No separate audit table; no access logging.

## 12. Technical Risks / Gaps / Assumptions
- **Deactivating a type does not warn about linked rules**. The `linkedRulesMap` is computed and shown, but the deactivate dialog does not block / warn if rules or open violations exist.
- **Reorder writes one row at a time** in a loop (no atomic batch); a network failure mid-reorder leaves an inconsistent `sort_order`.
- **No DB-level enum** for `category` or `severity_default` — relies on UI to enforce. Direct INSERTs bypassing the UI could store anything.
- **`applicable_funds` stored as `text[]`** with no constraint — values not in {SS, LV, EI, SV, PE} are silently accepted.
- **Auto-Detect flag** is informational only on this screen; the actual auto-creation behaviour lives on the detection rule (`auto_create_violation`). Possible duplication of intent.

## 13. Recommended Improvements
1. Block deactivation when active detection/calculation/escalation rules or open violations reference the type — or require an explicit "force" toggle.
2. Replace per-row reorder loop with a single RPC that takes `(id, sort_order)[]` in one transaction.
3. Add DB CHECK constraints (or PostgreSQL ENUMs) for `category`, `severity_default`, `applicable_funds`.
4. Consolidate auto-detect semantics: one flag at the type level OR explicit override per rule, not both.
5. Add a change-history table if violation typology is regulated.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1078)
- Page: `src/pages/compliance/settings/ViolationTypes.tsx`
- Service: `src/services/complianceSettingsService.ts`
- Hook: `src/hooks/useUserCode.ts`
- Migrations: `supabase/migrations/*ce_violation_types*`
- Types: `src/integrations/supabase/types.ts`
