# Audit Management System — Unified Business Logic Framework

> Version: 1.0  
> Owner: Compliance & Enforcement  
> Status: Reference architecture for the Audit Planning, Team Assignment, and Escalation modules

---

## 1. Purpose of the Framework

The Audit Management Framework provides a **single, deterministic decision model** that
links employer profile data, historical outcomes, and operational capacity into one
end-to-end flow — from **selecting which employer to audit** through to **assigning
the right team, approving the plan, and escalating when needed**.

Goals:

1. Make every audit decision **explainable** (each value has a traceable reason).
2. Replace ad-hoc planning with **risk- and complexity-weighted prioritization**.
3. Ensure **team strength matches case difficulty** (skill, seniority, workload).
4. Standardize **approval thresholds** and **escalation triggers** so enforcement
   sensitivity is handled consistently.
5. Reuse the existing risk model (`ce_risk_*`), planning model (`ce_weekly_plan_*`),
   and case lifecycle (`ce_compliance_cases`) — no parallel system.

---

## 2. Key Entities & Definitions

| Entity | Source Table / Module | Definition |
|--------|----------------------|------------|
| **Employer Risk Profile** | `ce_risk_profiles` | Per-employer risk record holding `inherent_risk_score`, `audit_priority_score`, `risk_band`, audit cycle metadata |
| **Risk Band** | `ce_risk_bands` | Tier (LOW / MEDIUM / HIGH / CRITICAL) driving audit frequency, mandatory review, and escalation defaults |
| **Audit History** | `ce_inspections` + `ce_inspection_findings` + `ce_compliance_cases` | All prior inspection visits, findings, violations, cases, and outcomes for the employer |
| **Audit Complexity Score** | Derived (new) | Composite score 0–100 estimating effort, skill, and time required |
| **Audit Candidate** | `fn_ce_score_candidates_v3` | Scored row representing an employer eligible for the next planning cycle |
| **Weekly Plan Item** | `ce_weekly_plan_items` | A scheduled audit visit with assigned date, lead, support, zone |
| **Auditor Profile** | `ce_inspector_profiles` | Skills, certifications, seniority, current workload, zone coverage |
| **Audit Team** | Derived assignment | Lead Auditor + Support Member(s) + (optional) Supervisor |
| **Approval Tier** | `ce_workflow_routes` | Required approver level (Team Lead → Manager → Compliance Head → Director) |
| **Escalation Channel** | `ce_communication_templates` + `ce_escalation_rules` | Notification path, recipients, and triggers (SMS, email, dashboard alert) |

---

## 3. Decision Flow (End-to-End)

```
┌────────────────────┐
│ 1. Risk Rating     │  ce_risk_profiles
│  (Inherent + Audit │  → Risk Band, Audit Priority Score
│   Priority)        │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 2. Audit History   │  Past inspections, findings,
│   Lookup           │  violations, dispute outcomes
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 3. Complexity      │  size × scope × history
│   Assessment       │  → Complexity Tier (S/M/L/XL)
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 4. Member          │  skill_match × workload ×
│   Selection        │  seniority × zone coverage
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 5. Team Assembly   │  Lead + Support + Supervisor
│                    │  (size driven by complexity)
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 6. Approval        │  Tier from Risk × Complexity
│   Routing          │  × Enforcement Sensitivity
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ 7. Communication   │  Stage-aware notifications +
│   & Escalation     │  severity-based escalation
└────────────────────┘
```

Each stage **writes its decision and rationale** into the planning record so that
downstream stages (and audit reviewers) can see *why* the choice was made.

---

## 4. Business Rules

### 4.1 Risk → Priority & Team Strength

| Risk Band | Audit Frequency | Mandatory Review | Default Team Strength |
|-----------|-----------------|------------------|----------------------|
| LOW       | 36 months       | No               | 1 auditor |
| MEDIUM    | 18 months       | No               | 1 auditor + 1 support (optional) |
| HIGH      | 12 months       | Yes              | 1 lead + 1 support |
| CRITICAL  | 6 months        | Yes (with supervisor) | 1 lead + 1–2 support + supervisor sign-off |

### 4.2 History → Experience & Review Intensity

| History Signal | Effect |
|---------------|--------|
| ≥ 2 prior violations in last 24 months | Assign **Senior** lead; mandatory peer review |
| Open enforcement case / legal stage active | Lead must hold **Enforcement** certification |
| Prior dispute or appeal upheld against department | Add **Supervisor** to team; legal pre-brief required |
| No prior audit in 3+ years | Treat as “cold” — assign experienced lead, add 25% time buffer |
| Last audit closed clean (no findings) | Eligible for **lighter** team unless risk band escalated |

### 4.3 Complexity Tier (S / M / L / XL)

```
complexity_score =
    0.30 × employer_size_factor       -- employee count, payroll volume
  + 0.20 × scope_factor               -- # of obligation types in scope
  + 0.20 × history_factor             -- prior findings + open cases
  + 0.15 × data_quality_factor        -- filing gaps, mismatch rate
  + 0.15 × enforcement_sensitivity    -- legal exposure, public profile
```

| Tier | Score | Recommended Team | Estimated Duration |
|------|-------|------------------|--------------------|
| S    | 0–25  | 1 auditor        | ½ day |
| M    | 26–50 | 1 lead + 1 support | 1 day |
| L    | 51–75 | 1 lead + 2 support | 2–3 days |
| XL   | 76–100 | 1 lead + 2 support + supervisor | 3–5 days, phased |

### 4.4 Member Selection

For each candidate auditor, compute a **suitability score**:

```
suitability =
    0.35 × skill_match                -- obligations vs. auditor skill matrix
  + 0.20 × experience_weight          -- years + completed audits
  + 0.15 × zone_coverage              -- same territory as employer
  + 0.15 × workload_inverse           -- 1 - (current_load / capacity)
  + 0.10 × language/sector_fit
  + 0.05 × recency_with_employer_inverse  -- avoid same auditor repeatedly
```

Top score → Lead, next eligible → Support. Workload guard: never exceed
`capacity_pct ≥ 95%`.

### 4.5 Team Assembly

| Risk × Complexity | Team Composition | Supervisor Involvement |
|-------------------|------------------|------------------------|
| LOW × S/M | 1 auditor | None |
| MEDIUM × S/M | 1 lead | Sign-off only |
| MEDIUM × L | 1 lead + 1 support | Sign-off |
| HIGH × any | 1 lead + 1–2 support | Active review at midpoint |
| CRITICAL × any | 1 lead + 2 support | Co-leads / on-site for kickoff & closure |

### 4.6 Approval Routing

```
approval_tier = max(
   tier_by_risk_band,
   tier_by_complexity,
   tier_by_enforcement_sensitivity
)
```

| Combined Signal | Approver |
|-----------------|----------|
| LOW risk, S complexity | Team Lead |
| MEDIUM risk OR M complexity | Compliance Manager |
| HIGH risk OR L complexity OR open case | Compliance Head |
| CRITICAL risk OR XL complexity OR active legal stage | Director / Board sub-committee |

### 4.7 Communication & Escalation Triggers

| Stage | Trigger | Channel | Recipients |
|-------|---------|---------|-----------|
| Plan published | Always | Email + in-app | Lead, support, supervisor |
| Visit T-2 days | Always | Email + SMS | Auditors + employer (notice) |
| Visit overdue > 1 day | Auto | Dashboard alert | Lead + manager |
| Major finding logged | severity ≥ HIGH | Email | Manager + Compliance Head |
| Dispute raised | Always | Email + case note | Compliance Head + Legal |
| Enforcement recommended | Always | Email + case escalation | Compliance Head + Director |
| Sustained CRITICAL band > 90 days | Auto | Monthly briefing | Director |

---

## 5. Recommended Scoring Dimensions (Summary)

| Dimension | Range | Drives |
|-----------|-------|--------|
| Inherent Risk Score | 0–100 | Risk band, audit frequency |
| Audit Priority Score | 0–100 | Weekly planning order |
| Complexity Score | 0–100 | Team size, duration, approval |
| Auditor Suitability | 0–100 | Lead/support selection |
| Enforcement Sensitivity | 0–100 | Approval tier, escalation channels |
| Workload Index | 0–100% | Hard cap on assignment |

All scores stored alongside their **policy version** and **calculated_at** timestamp
for full auditability (`ce_risk_score_history` pattern reused).

---

## 6. Sample Decision Table

| Employer | Risk Band | History | Complexity | Team | Approver | Escalation |
|----------|-----------|---------|-----------|------|----------|-----------|
| Acme Co. (50 emp) | LOW | Clean, last audit 2y | S (18) | 1 auditor | Team Lead | Standard |
| Brightline Ltd (180 emp) | MEDIUM | 1 minor finding | M (42) | 1 lead + 1 support | Manager | Standard |
| Coastal Group (600 emp) | HIGH | 2 violations + arrangement | L (66) | 1 senior lead + 2 support | Compliance Head | Mid-audit review + finding alerts |
| MegaCorp Plc (3 200 emp) | CRITICAL | Active legal case, dispute history | XL (88) | 1 enforcement-certified lead + 2 support + supervisor | Director | Pre-audit legal brief, daily status, board briefing on closure |

---

## 7. Sample End-to-End Example

**Employer:** *Coastal Group Ltd* — 600 employees, sector: Hospitality, Zone: North.

1. **Risk Rating** —  
   `inherent_risk_score = 72`, `audit_priority_score = 81`, band = **HIGH**.  
   Reason: 2 violations in last 18 months, 1 active arrangement with 1 missed payment,
   audit overdue by 47 days.

2. **History Lookup** —  
   3 prior inspections; last finding 9 months ago (penalty paid); 1 open compliance
   case (no legal stage yet); no disputes.

3. **Complexity Assessment** —  
   `complexity_score = 66` → **Tier L**.  
   Driven by: large employee count (size 0.30), 4 obligation types in scope (scope 0.20),
   prior findings (history 0.20), data-quality OK (0.15), moderate enforcement
   sensitivity (0.15).

4. **Member Selection** —  
   Top suitability:  
   - **Lead:** *J. Daniels* — 8 yrs, North zone, hospitality skill, 62% load.  
   - **Support 1:** *R. Mensah* — 4 yrs, North zone, payroll skill, 70% load.  
   - **Support 2:** *S. Patel* — 3 yrs, contributions skill, 55% load.  
   *Last audit lead* (M. Owens) deliberately deprioritized via recency penalty.

5. **Team Assembly** —  
   1 senior lead + 2 support; **Supervisor** *L. Hart* assigned for midpoint review
   (HIGH × L cell).

6. **Approval Routing** —  
   `tier = max(HIGH→Compliance Head, L→Compliance Head, sensitivity MED→Manager)`  
   → **Compliance Head approves the plan** before publication.

7. **Communication & Escalation** —  
   - Plan published → email to team + supervisor.  
   - T-2 days reminder → SMS to auditors + statutory notice email to employer.  
   - Day-2 finding logged at severity HIGH → automatic alert to Compliance Head.  
   - Closure report flagged for Legal review (pre-emptive, due to open case).

Every decision above is written to `ce_weekly_plan_items.decision_trace` (jsonb)
so reviewers see the full reasoning chain.

---

## 8. Implementation Recommendations

### 8.1 Reuse, don’t replace
- **Risk:** `ce_risk_config`, `ce_risk_policies`, `ce_risk_policy_factors`,
  `ce_risk_bands`, `ce_risk_profiles`, `ce_risk_score_history`.
- **Planning:** `ce_v_plan_candidates_v2`, `fn_ce_score_candidates_v3`,
  `ce_weekly_plans`, `ce_weekly_plan_items`, `ce_audit_priority_weights`.
- **Workflow & comms:** existing workflow router and notification engine.

### 8.2 Minimal additive schema (no breaking changes)
- `ce_audit_complexity_scores` — per-employer per-cycle complexity record.
- `ce_inspector_profiles` — skills, certifications, seniority, capacity.
- `ce_inspector_workload` — rolling load (view, not table).
- `ce_weekly_plan_items.decision_trace jsonb` — explainability for each item.
- `ce_audit_team_assignments` — lead, support[], supervisor, suitability scores.
- `ce_approval_matrix` — risk × complexity × sensitivity → approver tier.
- `ce_escalation_rules` — stage × severity → channel + recipient role.

### 8.3 Functions / RPCs
- `fn_ce_calc_complexity(employer_id)` → returns score + breakdown.
- `fn_ce_recommend_team(plan_item_id)` → returns ranked auditors with reasons.
- `fn_ce_resolve_approver(plan_item_id)` → returns required approval tier.
- `fn_ce_emit_escalation(event_code, plan_item_id)` → fans out via existing
  notification engine.

### 8.4 Governance
- All weights/thresholds editable in **Risk & Escalation Policy** screen
  (already exists) — no code changes for tuning.
- Every score row carries `policy_version`, `calculated_at`, `calculated_by`.
- Manual overrides (`override_band`, `override_team`, `override_approver`) are
  permitted but require a recorded `override_reason` and are audited in
  `ce_decision_overrides`.

### 8.5 UI surfaces
- **Risk Profile screen:** show Inherent Risk + Audit Priority + Complexity tier.
- **Weekly Planner cards:** show priority, band, complexity, recommended team,
  approver, and a “why selected / why this team” popover.
- **Admin → Risk Operations:** manual recalc (risk, priority, complexity);
  scheduled jobs for each score type already in `ce_automation_jobs`.

### 8.6 Phasing
1. Adopt complexity scoring (additive table + function).  
2. Wire team recommendation into existing planner.  
3. Activate approval matrix routing.  
4. Switch escalation rules into the live notification engine.  
5. Decommission legacy ad-hoc assignment paths after one full audit cycle.

---

## 9. Verification Checklist

- [ ] Every weekly plan item has a `decision_trace` with all 7 stage outputs.
- [ ] No team violates workload cap (≤ 95%).
- [ ] No approval below the matrix-required tier.
- [ ] Every CRITICAL employer has at least one supervisor-involved audit per cycle.
- [ ] Every escalation event logged in `ce_communication_log` with template
      version and recipient list.
- [ ] Override reasons recorded for 100% of manual deviations.

---

*Document end. This framework is implementation-ready against the existing
compliance schema — all extensions are additive and policy-tunable without code
changes.*
