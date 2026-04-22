# Rule Engine

## 1. Screen Overview
- **Screen name**: Rule Engine (Detection / Calculation / Escalation)
- **Route/path**: `/compliance/admin/settings/rule-engine`
- **Page component**: `src/pages/compliance/settings/RuleEngine.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'compliance_templates'`, sort_order 1)
- **Screen type**: Settings (multi-tab CRUD with rule builders)

## 2. Business Function
Central configuration surface for the **4-engine compliance pipeline** (mem://features/compliance/automation-and-rule-engine). It lets administrators define:
- **Detection rules** — *when* a violation should be raised (trigger event + condition expression).
- **Calculation rules** — *how much* the violation costs (formula expression, fund type, applies-to scope).
- **Escalation rules** — *what happens next* (status transitions, day/amount thresholds, auto vs. approval).

Used by **Compliance Administrators / Policy Owners**, typically during initial set-up of a country instance and subsequently when statute or operational policy changes (e.g. a new C3 deadline rule, a fine-rate change, a new escalation track to Legal). It is **configuration**, not execution — rules persisted here are consumed by the detection job, the calculation engine and the escalation cron downstream.

## 3. Primary User Roles
- **Access**: Compliance Admin, Policy Owner, Super Admin (gated by sidebar permissions on `app_modules.id`)
- **Edit / Create / Toggle**: Compliance Admin, Policy Owner
- **Approve**: No in-screen approval; changes are live on save (see §12)
- **View only**: Compliance Manager, Supervisor (when granted read-only role permission)

## 4. UI Responsibilities
- **Three tabs** (`Tabs` from shadcn): Detection · Calculation · Escalation.
- **Per-tab list** of rules with rule code, name, status (`is_enabled`), trigger/formula/transition summary, edit / disable buttons.
- **Rule dialogs** (`EnhancedDetectionRuleDialog`, `EnhancedCalculationRuleDialog`, `EnhancedEscalationRuleDialog` in `src/components/compliance/detection/`):
  - Auto-generated rule codes (`DR-NNN`, `CR-NNN`, `ER-NNN`) via `generateNextCode`.
  - Visual **Condition Builder** (variable / operator / value rows joined by AND/OR) and **Formula Builder** (operand × operator chains) — both stored as plain expression strings in `condition_expression` / `formula_expression`.
  - Variable dropdowns sourced from `ce_rule_variable_mappings` (filtered by `variable_category`), with fallbacks if the table is empty.
  - Violation-type linkage (`violation_type_id`) to tie each rule to a specific `ce_violation_types` row.
- **Help integration**: `HelpProvider` + `HelpToolbar` + `HelpSidebar` + `ConnectedHelpSearch` from `@/components/help/*`.
- No filters, no bulk operations, no preview/test (rule testing lives in the **Rule Simulator** screen, see linkages).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Workflow / Downstream |
|---|---|---|---|
| **Add Detection Rule** | Inserts a row in `ce_detection_rules` with auto code, audit fields. | INSERT `ce_detection_rules` | Picked up by detection job (queries `is_enabled=true`); will start raising violations on next run. |
| **Add Calculation Rule** | Inserts row in `ce_calculation_rules`. | INSERT `ce_calculation_rules` | Calculation engine resolves the formula at violation creation/update. |
| **Add Escalation Rule** | Inserts row in `ce_escalation_rules`. | INSERT `ce_escalation_rules` | Consumed by escalation cron and case lifecycle for status transitions. |
| **Edit rule** | UPDATE row, refresh `updated_by` / `updated_at`. | UPDATE | Live immediately for next engine pass. |
| **Toggle `is_enabled`** | Disables a rule without deleting. | UPDATE `is_enabled=false` | Engine skips it. |
| **Soft-delete** | `softDeactivateRule(table, id, userCode)` — sets `is_enabled=false`. | UPDATE | Rule retained for audit. |

There is **no hard delete** in this screen. Rule history is preserved.

## 6. Data Model / Tables Used
| Table | Read/Write | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_detection_rules` | RW | Detection definitions | `rule_code`, `trigger_event`, `condition_expression`, `frequency`, `priority`, `auto_create_violation`, `is_enabled`, `violation_type_id`, `parameters` | Compliance detection job, rule simulator, workbench (auto-raised violations) |
| `ce_calculation_rules` | RW | Penalty/interest formulas | `rule_code`, `applies_to`, `formula_expression`, `fund_type`, `source_config`, `is_enabled`, `violation_type_id` | Calculation engine, violations module, financial dashboards |
| `ce_escalation_rules` | RW | Status transitions | `rule_code`, `from_status`, `to_status`, `condition_expression`, `days_threshold`, `amount_threshold`, `auto_escalate`, `requires_approval`, `is_enabled`, `violation_type_id` | Escalation cron, cases module, legal-referral pipeline |
| `ce_violation_types` | R | Lookup to associate rules with violation types | `id`, `code`, `name` | Violation Types screen (master), workbench filters, detection results |
| `ce_rule_variable_mappings` | R | Drives variable dropdowns in builders (data dictionary) | `variable_key`, `display_name`, `data_type`, `variable_category` (`condition` / `formula` / `both`), `source_table`, `source_column`, `c3_config_key`, `applies_to_rule_type` | Rule simulator |

Audit storage: relies on `created_by/updated_by/updated_at` columns on each table; no separate audit log table is written from this screen.

## 7. Services / Hooks / Queries Used
- **`src/services/complianceSettingsService.ts`** — `withAuditFields`, `checkDuplicateRuleCode`, `softDeactivateRule`, `validationToastConfig`. Used for every save/toggle/deactivate.
- **`src/hooks/useUserCode.ts`** — supplies the UserCode for `created_by` / `updated_by`.
- **`@tanstack/react-query`** — `useQuery` for each rule list, `useMutation` for create/update/toggle.
- **`@/integrations/supabase/client`** — direct CRUD on the three rule tables (no RPC).
- **Help system** — `HelpProvider`, `HelpToolbar`, `HelpSidebar`, `ConnectedHelpSearch` (per mem://features/global-help-and-knowledge-base).
- **Rule dialog components**: `EnhancedDetectionRuleDialog.tsx`, `EnhancedCalculationRuleDialog.tsx`, `EnhancedEscalationRuleDialog.tsx`.
- **Constant tables**: `calculationConstants.ts`, `escalationConstants.ts` for `CALCULATION_FAMILIES`, `STATE_MACHINE`, etc.

## 8. Validation Rules
| Validation | Where enforced |
|---|---|
| `rule_code` unique per rule type | `checkDuplicateRuleCode` (service) — UI check before INSERT |
| `name` required | UI (toast via `validationToastConfig`) |
| `trigger_event` required for detection | UI dropdown + non-empty check |
| `formula_expression` non-empty for calculation | UI |
| `from_status` ≠ `to_status` for escalation | UI (state machine constraint) |
| Numeric `days_threshold`, `amount_threshold` | UI (number inputs) |
| Variable references valid | Builder restricts to `ce_rule_variable_mappings` items |

**No** DB-level CHECK constraints, triggers, or RLS gates verified for these tables in current code (per project Knowledge Repository entry: RLS is intentionally not used; role-based gating is at the menu/route level).

## 9. Workflow / Approval / Notification Logic
- **No draft/submit workflow** — rules become active the moment they are saved with `is_enabled=true`.
- **No approval matrix** in-screen. The `requires_approval` field on escalation rules is a *runtime* flag consumed by the case engine (not by this screen).
- **No notifications fired** on rule changes.
- **No history view** in this screen — `updated_at` / `updated_by` are the only audit signal.

## 10. Linkages to Other Screens
- **Violation Types** (`/compliance/admin/settings/violation-types`) — provides the `violation_type_id` lookup; that screen displays linked rules per type.
- **Rule Simulator** (`/compliance/admin/tools/rule-simulator`) — executes detection/calculation/escalation rules against sample employer data.
- **Risk Simulator** (`/compliance/admin/tools/risk-simulator`) — adjacent simulator for risk scoring.
- **Compliance Workbench / Cases / Violations** — *consumes* these rules at runtime via the detection job.
- **Reference Numbering** — auto-generated violation/case numbers use schemes from `ce_number_templates` once rules raise records.

## 11. Audit Trail / Logging
- Inline only: `created_by`, `updated_by`, `updated_at` columns on each rule table, populated via `withAuditFields` with the live UserCode.
- No append-only history table for rule changes (gap — see §12).
- No access logging on read.

## 12. Technical Risks / Gaps / Assumptions
- **No change history**: a rule can be edited many times; only the latest state is retained. Reverting requires a manual restore. **Recommend** adding a `ce_rule_change_log` (entity_type, entity_id, before, after, changed_by, changed_at).
- **No approval gate** for production rules: any user with menu access can toggle a rule on/off, immediately changing engine behaviour and downstream financial calculations. **Recommend** wrapping toggle/save in the planner-style approval workflow for `is_enabled` changes on production-tagged rules.
- **Expression strings are free text** (e.g. `days_overdue > 30 AND amount > 5000`). The builder helps, but a hand-edited expression that doesn't reference a known variable will fail silently in the engine. No server-side parser/validator currently exists.
- **Fallback variable lists** (`FALLBACK_CONDITION_VARIABLES`, `FALLBACK_FORMULA_OPERANDS`) hardcode 5–7 variables — a fresh database with empty `ce_rule_variable_mappings` will quietly fall back to legacy names that may not match production data.
- **No bulk import/export** for rules — promotion from Test → Live is per-row through the migration tool.
- **Help integration assumes** the help system is provisioned for this page; if not seeded, the sidebar is empty.

## 13. Recommended Improvements
1. Add `ce_rule_change_log` and surface a History tab in this screen.
2. Add an Approval gate (re-use planner approval workflow) for *enabling* rules in Live or for changes that affect already-open violations.
3. Server-side parse-and-validate expressions before INSERT (edge function or DB trigger) so malformed rules fail fast.
4. Provide JSON export/import for rule bundles to support Test → Live promotion.
5. Show a "linked violations / cases impacted" warning when disabling a rule.
6. Standardize on hard-delete *never*; the toggle button label should explicitly say "Disable" rather than the trash icon used in some dialogs.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1077)
- Page: `src/pages/compliance/settings/RuleEngine.tsx`
- Dialogs: `src/components/compliance/detection/DetectionRuleDialog.tsx`, `CalculationRuleDialog.tsx`, `EscalationRuleDialog.tsx`
- Constants: `src/components/compliance/detection/calculationConstants.ts`, `escalationConstants.ts`
- Service: `src/services/complianceSettingsService.ts`
- Hook: `src/hooks/useUserCode.ts`
- Migrations: `supabase/migrations/*ce_detection_rules*`, `*ce_calculation_rules*`, `*ce_escalation_rules*`, `*ce_rule_variable_mappings*` (schema seeds & rule-engine migrations)
- Types: `src/integrations/supabase/types.ts` (auto-generated)
