
# Plan: Intake → Routing → Assignment Integration

This is a large piece of work. I want to confirm scope before I touch anything, because some pieces overlap with code that already exists, and some pieces are net-new.

## What already exists (verified)
- Routing rules + source config: `lg_routing_*`, `lg_case_source_config`, `lg_case_source_case_type`, `lg_case_source_stage`, `RoutingRulesList`, `RoutingSourceSetup`, `RoutingSimulator`, `lgRoutingService.ts`.
- Teams + workbaskets: `lg_team`, `lg_team_member`, `lg_team_workbasket`, `lgTeamService.ts`, `useLegalTeams.ts`.
- Case intake: `LgCaseCreateWizard.tsx`, `useLgCaseCreate.ts`, `lgCaseCreateService.ts`.
- Case assignment table: `lg_case_assignment` (exists, basic).
- Audit: `legal_admin_audit`, `legal_audit_log`, `system_audit_trail`.

## What I will build

### A. Backend (one migration)
1. `lg_staff` — staff registry tied to `profiles.user_code`, with `team_id`, `role`, `office`, `is_active`, `max_active_cases`, `max_high_priority_cases`, skills array (text[]), availability enum (`available|leave|inactive`).
2. `lg_staff_workload` — view (or materialized counts via function) returning per-staff `active_cases`, `high_priority_cases`, `capacity_pct`.
3. Extend `lg_routing_source_map` / `lg_routing_policy` with: `assignment_strategy` (`ROUND_ROBIN|LEAST_ACTIVE|SKILL_BASED|PRIORITY_BASED|MANUAL`), `escalation_team_id`, `backup_team_id`, `required_skill`.
4. `lg_case_assignment_history` — case_id, assigned_from, assigned_to, assigned_by (user_code), reason enum, notes, created_at.
5. RPC `lg_resolve_route(p_source, p_case_type, p_stage, p_priority, p_office, p_jurisdiction)` → returns `{route_id, team_id, workbasket_id, strategy, escalation_team_id, validation_status, reasons[]}`.
6. RPC `lg_pick_assignee(p_team_id, p_strategy, p_priority, p_required_skill)` → returns `{staff_user_code, reason}` honoring capacity; falls back to team queue and emits escalation reason when none eligible.
7. RPC `lg_assign_case(p_case_id, p_actor_user_code, p_reason, p_target_user_code?)` — wraps resolve+pick+history+notification; supports manual override path.

### B. Intake integration (frontend)
- `LgCaseCreateWizard` calls `lg_resolve_route` after validation, shows the resolved Team / Workbasket / Strategy in a final "Routing & Assignment" preview step (read-only with override toggle for managers).
- On submit, `useLgCaseCreate` calls `lg_assign_case`; failure (no eligible staff) routes case to team queue + raises in-app notification (`in_app_notifications`) to team manager.

### C. New Team & Staff admin screens
- `src/pages/legal/admin/LegalAdminTeams.tsx` — list teams, members, workbaskets, capacity rollup.
- `src/pages/legal/admin/LegalAdminStaff.tsx` — CRUD on `lg_staff` (skills, capacity, availability), reassignment, manual override.
- Add tab entries to existing `LegalAdminRouting` / `AdminConfig` shell.

### D. Dashboards
- `TeamDashboardCard` (open, assigned, unassigned, high-priority, avg age, util% with green/amber/red bands).
- `StaffDashboardCard` (assigned, overdue, high-priority, capacity %).
- Embedded under `LgDashboard` for relevant role; standalone routes `/legal/teams` and `/legal/staff/:userCode`.

### E. Assignment history & audit
- Every assign/reassign/escalate/override writes `lg_case_assignment_history` + `system_audit_trail`.
- `CaseDetailView` gets an "Assignment History" timeline panel.

### F. Reporting
- Add `LegalReports.tsx` sections: Cases by Team, Cases by Staff, Assignment Volume, Capacity Utilization, Escalation Rate, Routing Accuracy (matched vs manual-override), SLA performance hook (uses existing `legal_sla_rules`).

### G. Notifications
- Use existing `in_app_notifications` + `notification_templates`. Triggers: new assignment, reassignment, escalation, capacity exceeded, SLA risk.

## Out of scope (call out explicitly)
- SLA computation engine itself (already partly in `legal_sla_rules`) — I will only consume it, not rebuild.
- Skills taxonomy UI beyond a free-form chip editor seeded with the 6 listed skills.
- Cross-module integration with Compliance / BN beyond what already exists in source config.

## Approach
Because this is ~10 new files + 1 migration + edits to 4-5 existing files, I want to land it in two PRs:
1. **PR1 — Backend + Intake wiring**: migration, 3 RPCs, intake wizard preview step, assignment on submit, history table.
2. **PR2 — Admin UI + Dashboards + Reports**: Teams/Staff admin pages, dashboards, reports, notification triggers.

## Question before I start
Confirm one of:
- **(a)** Proceed with PR1 first (backend + intake), then PR2 after you verify.
- **(b)** Do everything in one large change.
- **(c)** Trim scope — e.g. skip reports/dashboards for now.

Once you confirm, I'll start with the migration.
