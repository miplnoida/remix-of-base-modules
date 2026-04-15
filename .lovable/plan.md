

# Risk & Escalation Hardening — Implementation Plan

## Current State Analysis

### What Exists
- **8 escalation rules** (ER-001 to ER-008) in `ce_escalation_rules` table with columns: `from_status`, `to_status`, `days_threshold`, `amount_threshold`, `auto_escalate`, `requires_approval`, `condition_expression`, `is_enabled`
- **State machine** defined in `escalationConstants.ts` with 16 states and allowed transitions — but this is UI-only, not enforced in backend
- **Prerequisites UI** exists in `EscalationRuleDialog.tsx` (Section 5) with 9 prerequisite options — but they are **never saved to the database** (not included in `handleSave`)
- **Execution mode** (AUTO/RECOMMEND/MANUAL) exists in UI — also **never persisted** (mapped back to just `auto_escalate`/`requires_approval` booleans)
- **Risk scoring** works: 5-factor weighted model in `ce_risk_config`, profiles in `ce_risk_profiles` (1,135 employers: 1,086 LOW, 45 MEDIUM, 4 HIGH, 0 CRITICAL)
- **Edge function** `ce-escalation-review` only checks `auto_escalate=true` rules, uses age-based matching, no prerequisite checks, no risk integration, no duplicate protection

### Critical Gaps Confirmed

| # | Gap | Severity |
|---|-----|----------|
| G1 | ER-003 (Final Demand → Legal) has `requires_approval: false` | CRITICAL |
| G2 | Prerequisites selected in UI are never saved to DB | CRITICAL |
| G3 | Execution mode / family not persisted | HIGH |
| G4 | Edge function ignores prerequisites, risk, arrangements, disputes | CRITICAL |
| G5 | MANAGER_REVIEW, PRIORITY_QUEUE, ESCALATED, SUMMONS_ISSUED, LEGAL_ACTION_REQUISITION, LEGAL_ACTION have no outbound escalation rules | HIGH |
| G6 | UNDER_REVIEW only exits via ER-008 (repeat offender) — no normal path | HIGH |
| G7 | Risk band CRITICAL (76+) is never reached (max observed: 74) | MEDIUM |
| G8 | `enforcement_risk_score` column exists but is never populated | LOW |
| G9 | No duplicate escalation protection in edge function | HIGH |
| G10 | State machine transitions only enforced in UI dropdown, not in backend | CRITICAL |

---

## Implementation Plan

### Phase 1: Database Schema Changes (Migration)

**Add missing columns to `ce_escalation_rules`:**
- `prerequisites JSONB DEFAULT '[]'` — stores array of prerequisite keys
- `execution_mode VARCHAR DEFAULT 'RECOMMEND'` — AUTO / RECOMMEND / MANUAL  
- `family VARCHAR DEFAULT 'case_progression'` — escalation family category
- `approval_role VARCHAR` — role required for approval (e.g., 'supervisor', 'manager', 'legal_head')
- `risk_band_filter VARCHAR` — optional risk band that triggers this rule
- `risk_timing_modifier JSONB` — maps risk bands to day adjustments (e.g., `{"HIGH": -5, "CRITICAL": -10}`)
- `priority_order INTEGER DEFAULT 100` — controls rule evaluation order for duplicate prevention

**Create `ce_escalation_prerequisites` table:**
- `id UUID PRIMARY KEY`
- `violation_id UUID` / `case_id UUID` — the record being escalated
- `prerequisite_key VARCHAR NOT NULL` — e.g., 'proof_of_service_complete'
- `is_satisfied BOOLEAN DEFAULT false`
- `satisfied_at TIMESTAMPTZ`
- `satisfied_by VARCHAR`
- `evidence_reference TEXT` — link to proof document/record
- `created_at / updated_at` — standard audit

**Create `ce_escalation_log` table** (duplicate protection + audit):
- `id UUID PRIMARY KEY`
- `violation_id UUID` / `case_id UUID`
- `rule_id UUID REFERENCES ce_escalation_rules`
- `rule_code VARCHAR`
- `from_status VARCHAR`, `to_status VARCHAR`
- `execution_mode VARCHAR`
- `risk_band VARCHAR`, `risk_score NUMERIC`
- `prerequisites_checked JSONB`
- `prerequisites_met BOOLEAN`
- `approval_required BOOLEAN`
- `approved_by VARCHAR`, `approved_at TIMESTAMPTZ`
- `blocked_reason TEXT` — why escalation was blocked (if applicable)
- `status VARCHAR` — EXECUTED / PENDING_APPROVAL / BLOCKED / DUPLICATE_SUPPRESSED
- `idempotency_key VARCHAR UNIQUE` — prevents duplicate firings
- `created_at TIMESTAMPTZ`

**Update ER-003 data:**
- Set `requires_approval = true`, `execution_mode = 'MANUAL'`, `approval_role = 'supervisor'`
- Set `prerequisites = '["proof_of_service","waiting_period_elapsed","no_active_arrangement"]'`

### Phase 2: Fix EscalationRuleDialog (Frontend)

**File: `src/components/compliance/detection/EscalationRuleDialog.tsx`**
- Fix `handleSave` to include `prerequisites`, `execution_mode`, `family`, `approval_role` in the payload sent to DB
- Load saved prerequisites from rule data on edit (currently always initializes to `[]`)
- Add `approval_role` dropdown (visible when execution_mode is MANUAL or RECOMMEND)
- Add risk-timing modifier section: for each risk band, allow configuring day reduction

**File: `src/components/compliance/detection/escalationConstants.ts`**
- Add `WARNING_NOTICE` to UNDER_REVIEW's `allowedNextStates` (normal progression path)
- Add outbound transitions for dead-end states:
  - ESCALATED → `['MANAGER_REVIEW', 'WARNING_NOTICE', 'LEGAL_ACTION_REQUISITION']`
  - PRIORITY_QUEUE → `['UNDER_REVIEW', 'WARNING_NOTICE', 'CASE_OPEN', 'MANAGER_REVIEW']`
  - MANAGER_REVIEW → already has exits (CASE_OPEN, LEGAL_ACTION_REQUISITION, RESOLVED, CLOSED) ✓
  - SUMMONS_ISSUED → already has exit (LEGAL_ACTION) ✓
  - LEGAL_ACTION_REQUISITION → already has exits (LEGAL_ACTION, MANAGER_REVIEW) ✓
  - LEGAL_ACTION → already has exits (RESOLVED, CLOSED) ✓
- Add `no_open_dispute` to PREREQUISITES list
- Set `approvalRequired: true` on LEGAL_ACTION_REQUISITION state (already done ✓)

### Phase 3: Harden Edge Function (`ce-escalation-review`)

**File: `supabase/functions/ce-escalation-review/index.ts`**

Rewrite the escalation loop to:

1. **Load risk profiles** alongside violations (join `ce_risk_profiles` by `employer_id`)
2. **Check prerequisites** before executing any rule:
   - Query `ce_escalation_prerequisites` for the violation/case
   - If rule has prerequisites and they're not all satisfied → log as BLOCKED, skip
3. **Apply risk-based timing**: Adjust `days_threshold` using `risk_timing_modifier` from rule config
4. **Check safeguards** before legal transitions:
   - Query for active payment arrangements (`ce_arrangements` where status = 'ACTIVE')
   - Query for open disputes/appeals (violations with status containing 'APPEAL')
   - If safeguard blocks → log as BLOCKED
5. **Duplicate protection**: Generate idempotency key = `{violation_id}:{rule_code}:{date}`, check `ce_escalation_log` before executing
6. **Handle execution modes**:
   - AUTO → execute immediately
   - RECOMMEND → create log entry with status `PENDING_APPROVAL`, do not change violation status
   - MANUAL → skip (only triggered by user action)
7. **Audit every decision** in `ce_escalation_log` regardless of outcome

### Phase 4: Add New Escalation Rules (Data Insert)

Add rules for currently dead-end stages:

| Code | Name | From | To | Days | Mode | Approval |
|------|------|------|----|------|------|----------|
| ER-009 | Under Review → Warning Notice | UNDER_REVIEW | WARNING_NOTICE | 7 | RECOMMEND | No |
| ER-010 | Escalated → Manager Review | ESCALATED | MANAGER_REVIEW | 3 | AUTO | No |
| ER-011 | Priority Queue → Under Review | PRIORITY_QUEUE | UNDER_REVIEW | 1 | AUTO | No |
| ER-012 | Legal Requisition → Legal Action | LEGAL_ACTION_REQUISITION | LEGAL_ACTION | 0 | MANUAL | Yes (legal_head) |
| ER-013 | Legal Action → Judgment Pending | LEGAL_ACTION | RESOLVED | 0 | MANUAL | Yes (legal_head) |

### Phase 5: Risk Integration Enhancements

**Update existing rules with risk modifiers:**
- ER-001 (Warning → Demand): `risk_timing_modifier: {"HIGH": -4, "CRITICAL": -7}` (14 days → 10/7 days)
- ER-002 (Demand → Final): `risk_timing_modifier: {"HIGH": -4, "CRITICAL": -7}`
- ER-003 (Final → Legal): `risk_timing_modifier: {"HIGH": -2, "CRITICAL": -4}`

**Update risk band thresholds in `ce_risk_config`:**
- Lower CRITICAL threshold from 76 to 65 (current max observed is 74, so CRITICAL is reachable)
- Or adjust factor weights to sum to 100% (currently 25+25+20+20+10 = 100% ✓ — weights are correct, scoring just produces low values)

**Populate `enforcement_risk_score`:** Add logic in the risk calculation job to compute this as a secondary score focused on enforcement urgency.

### Phase 6: Service Layer Updates

**File: `src/services/legalEscalationService.ts`**
- Add prerequisite check before `updateRecommendationStatus` (ensure proof_of_service, no_active_arrangement)
- Add duplicate recommendation check in `generateRecommendations`

**New file: `src/services/compliance/escalationPrerequisiteService.ts`**
- `getPrerequisites(violationId)` — fetch current prerequisite state
- `satisfyPrerequisite(violationId, key, satisfiedBy, evidence)` — mark as satisfied
- `checkAllMet(violationId, requiredKeys)` — boolean check

### Phase 7: UI for Prerequisite Management

**Add prerequisite checklist panel** to violation/case detail views:
- Show required prerequisites for the next escalation step
- Allow officers to mark prerequisites as satisfied (with evidence link)
- Block manual escalation button if prerequisites not met

---

## Implementation Sequence

1. DB migration (Phase 1) — schema + ER-003 data fix
2. Frontend dialog fix (Phase 2) — persist prerequisites/mode
3. State machine updates (Phase 2) — add UNDER_REVIEW normal path
4. New escalation rules (Phase 4) — fill dead-end gaps
5. Prerequisite service (Phase 6) — new service file
6. Edge function hardening (Phase 3) — full rewrite with safeguards
7. Risk integration (Phase 5) — timing modifiers + threshold adjustment
8. Prerequisite UI (Phase 7) — checklist in violation detail

## Safety Notes
- All changes are additive (new columns, new tables, new rules)
- No existing data is modified except ER-003 approval flag
- Edge function changes are backward-compatible (new columns have defaults)
- Rollback: disable new rules via `is_enabled = false`, revert edge function

