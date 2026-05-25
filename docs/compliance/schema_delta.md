# Compliance Schema Delta

Date: 2026-05-25
Author: Compliance hardening pass

## Summary

After inspecting the current `public` schema (209 `ce_*` / `compliance_*` objects) and the
~30 historical migrations under `supabase/migrations/`, **no new tables or columns are
required** to satisfy the Compliance module's runtime needs (feature toggles, setup
activation, rule history & simulation, workflow mappings, case families, duplicate
detection, employer responses, legal handoff, payment allocations, help topics, audit
timeline).

Two small additive columns were already added in the prior audit-timeline pass
(`ce_audit_log.workflow_task_id`, `ce_audit_log.reason`) — those are recorded here for
completeness. No further DDL is shipped with this delta.

## Existing tables reused (by capability)

| Capability | Table(s) reused |
|---|---|
| Feature toggles | `public.feature_flags` (keyed by `flag_key`, scoped to `app_modules`) |
| Setup activation state | `public.ce_settings` (key/value, audited via `fn_ce_log_settings_change`) |
| Rule history | `ce_rule_history`, `ce_rule_change_requests` |
| Rule simulation runs | `ce_rule_simulation_runs` |
| Workflow mappings | `ce_workflow_mappings` (+ project-wide `workflow_*` tables) |
| Case families | `ce_case_families`, `ce_case_merge_rules`, `ce_case_merge_history` |
| Duplicate detection | `ce_detection_rules`, `ce_violation_grouping_decisions` |
| Employer responses | `ce_audit_employer_responses`, `ce_audit_finding_response_submissions`, `ce_notice_responses`, `ce_online_response_*` |
| Legal handoff packets | `ce_legal_referrals`, `ce_legal_referral_lines`, `ce_legal_recommendations`, `ce_legal_returns`, `ce_legal_handoff_rules` |
| Payment allocations | `ce_payment_allocations`, `ce_arrangement_breaches`, `ce_payment_arrangements` |
| Help topics | `kb_articles` (filtered by `module_key='compliance'` + `screen_key`) |
| Audit timeline | `ce_audit_log` (+ derived `ce_v_employer_timeline`) |
| Access control | `app_modules`, `module_actions`, `role_permissions`, `user_roles` (RBAC chain — already seeded for `ce_*` modules in `20260525195616_*.sql`) |

## New tables added

None.

## Columns added in this iteration

None. (Carry-over from audit-timeline pass, already migrated:)

- `ce_audit_log.workflow_task_id uuid` — links audit entries to workflow tasks
- `ce_audit_log.reason text` — free-text justification for the action

## Indexes added

None in this delta. Existing indexes on `ce_audit_log(entity_type, entity_id, performed_at DESC)`
and `ce_audit_log(workflow_task_id)` already support timeline queries.

## Tables intentionally NOT created (already exist)

The following were considered and **skipped** because an equivalent table already exists
and is wired to its services:

- `ce_feature_toggles` → use `public.feature_flags`
- `ce_setup_state` / `ce_activation_state` → use `public.ce_settings` (`setup.*` keys)
- `ce_help_topics` → use `kb_articles` with `module_key='compliance'`
- `ce_legal_packets` → use `ce_legal_referrals` + `ce_legal_referral_lines`
- `ce_audit_timeline` → derived from `ce_audit_log` (no materialisation needed)
- `ce_rule_simulations` → use `ce_rule_simulation_runs`
- `ce_duplicate_detections` → use `ce_detection_rules` + `ce_violation_grouping_decisions`

## Assumptions

1. RBAC is enforced through the existing `app_modules` / `module_actions` /
   `role_permissions` chain (per project standing rule "no RLS — role-based security only").
2. `kb_articles.module_key` and `kb_articles.screen_key` are the canonical keys for
   contextual help lookup; no Compliance-specific help table is needed.
3. `feature_flags.flag_key` follows the `compliance.<feature>` namespace for any new
   Compliance toggles; flags can be seeded via the existing admin Feature Toggles screen
   rather than DDL.
4. Setup activation flags live under `ce_settings` with `category='setup'` and keys like
   `setup.activated`, `setup.completed_steps`, etc.
5. All audit writes funnel through `complianceAuditService.logAudit()` which targets
   `ce_audit_log` exclusively.

## Rollback notes

Because this delta ships **no DDL**, there is nothing to roll back. Earlier additive
changes that are still part of the current schema can be reverted individually:

- `ALTER TABLE public.ce_audit_log DROP COLUMN IF EXISTS workflow_task_id;`
- `ALTER TABLE public.ce_audit_log DROP COLUMN IF EXISTS reason;`

Both columns are nullable with no defaults — dropping them is safe and does not affect
existing rows beyond losing the metadata in those two columns.

## App type updates

`src/integrations/supabase/types.ts` is auto-regenerated from the live schema by the
Supabase integration; no manual edits are required. No new client-side type files are
introduced by this delta.

## Verification

```sql
-- Confirms all required tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (
  'ce_audit_employer_responses','ce_audit_log','ce_case_families','ce_case_merge_rules',
  'ce_legal_handoff_rules','ce_legal_referrals','ce_payment_allocations',
  'ce_rule_history','ce_rule_simulation_runs','ce_workflow_mappings','kb_articles',
  'feature_flags','ce_settings'
);
-- 13 rows returned, 2026-05-25
```
