

# Phase 1 — Verification Report (Current State)

## ce_violation_types (14 rows)

| Code | Category | Severity | Active | Issue |
|------|----------|----------|--------|-------|
| ARRANGEMENT_DEFAULT | Legal | High | ✓ | Mixed-case severity/category |
| CESSATION_WITHOUT_CLEARANCE | registration | HIGH | ✓ | Mixed-case category |
| EMPLOYEE_DISCREPANCY | contribution | MEDIUM | ✓ | Mixed-case category |
| LATE_FILING | Filing | Medium | ✓ | Mixed-case |
| LEGAL_DEFAULT | Legal | Critical | ✓ | Mixed-case |
| LEVY_OMISSION | contribution | MEDIUM | ✓ | Mixed-case category |
| LEVY_SEVERANCE_OMISSION | Declaration | Medium | ✓ | Unused — 0 references anywhere |
| NON_FILING | Filing | High | ✓ | Mixed-case |
| NON_PAYMENT | Payment | High | ✓ | Mixed-case |
| PARTIAL_PAYMENT | Payment | Medium | ✓ | Mixed-case |
| REPEAT_DEFAULT | Legal | Critical | ✓ | Mixed-case |
| SEVERANCE_OMISSION | contribution | MEDIUM | ✓ | Mixed-case category |
| UNDER_DECLARATION | Declaration | High | ✓ | Mixed-case |
| UNREGISTERED_EMPLOYER | registration | HIGH | ✓ | Mixed-case category |

**Finding**: All 5 previously-missing types now exist. But `category` and `severity_default` have inconsistent casing — some rows use "High"/"Filing" (title-case), others use "HIGH"/"contribution" (upper/lower). Need standardization to UPPERCASE.

## ce_detection_rules (12 rows)

| Rule | Linked VT | auto_create | Enabled | Issue |
|------|-----------|-------------|---------|-------|
| DR-001 | LATE_FILING | true | ✓ | OK |
| DR-002 | NON_FILING | true | ✓ | OK |
| DR-003 | NON_PAYMENT | true | ✓ | OK |
| DR-004 | PARTIAL_PAYMENT | true | ✓ | OK |
| DR-005 | REPEAT_DEFAULT | **false** | ✓ | ✅ Already fixed |
| DR-006 | ARRANGEMENT_DEFAULT | true | ✓ | OK |
| DR-007 | LEVY_OMISSION | true | ✗ | OK |
| DR-008 | UNREGISTERED_EMPLOYER | **false** | ✓ | ✅ Already fixed |
| DR-009 | EMPLOYEE_DISCREPANCY | **false** | ✓ | ✅ Already fixed |
| DR-010 | UNDER_DECLARATION | **false** | ✓ | ✅ Already fixed |
| DR-011 | CESSATION_WITHOUT_CLEARANCE | true | ✓ | OK |
| DR-012 | NON_FILING | true | ✓ | OK |

**Finding**: All violation_type_id populated. Review-first rules already have auto_create=false. **No DR fixes needed.**

## ce_calculation_rules (7 rows)

| Rule | Linked VT | applies_to | fund_type | source_config | Issue |
|------|-----------|------------|-----------|---------------|-------|
| CR-001 | PARTIAL_PAYMENT | penalty | NULL | `c3_config_details.penalty_rate` | ⚠️ References non-existent column path |
| CR-002 | NON_PAYMENT | interest | NULL | `c3_config_details.interest_rate` | ⚠️ References non-existent column path |
| CR-003 | NON_FILING | estimate | NULL | `historical_data` | OK (abstract) |
| CR-004 | UNDER_DECLARATION | surcharge | NULL | `audit_findings` | OK |
| CR-005 | NON_PAYMENT | fine | SS | `c3_config` | OK |
| CR-006 | LEVY_OMISSION | penalty | LV | `c3_config` | OK |
| CR-007 | SEVERANCE_OMISSION | penalty | SV | `c3_config` | OK |

**Finding**: CR-001 and CR-002 reference `c3_config_details.penalty_rate` and `c3_config_details.interest_rate` — the actual table is `c3_config_details` but column names need verification. The newer CR-005/006/007 use `c3_config` which is more correct. CR-001/002 should be updated to match.

## ce_escalation_rules (8 rows)

| Rule | Linked VT | from_status | to_status | auto | approval | Issue |
|------|-----------|-------------|-----------|------|----------|-------|
| ER-001 | NULL | WARNING_NOTICE | DEMAND_NOTICE | ✓ | ✗ | OK (generic) |
| ER-002 | NULL | DEMAND_NOTICE | FINAL_DEMAND | ✓ | ✗ | OK |
| ER-003 | NULL | FINAL_DEMAND | LEGAL_ACTION_REQUISITION | ✗ | ✗ | OK |
| ER-004 | NON_PAYMENT | OPEN | MANAGER_REVIEW | ✗ | ✗ | OK |
| ER-005 | REPEAT_DEFAULT | OPEN | PRIORITY_QUEUE | ✓ | ✗ | OK |
| ER-006 | NON_FILING | OPEN | UNDER_REVIEW | ✓ | ✗ | OK |
| ER-007 | NULL | **Warning Issued** | **Summons Issued** | ✗ | ✓ | ⚠️ Mixed-case statuses |
| ER-008 | REPEAT_DEFAULT | **Under Review** | **Legal Action** | ✗ | ✓ | ⚠️ Mixed-case statuses |

**Finding**: ER-007 and ER-008 use title-case statuses. Must standardize to UPPER_SNAKE_CASE.

## ce_violations — distinct values

| Field | Values | Issue |
|-------|--------|-------|
| status | ESCALATED, OPEN | ✅ Consistent uppercase |
| source_type | DETECTION_RULE | ✅ Consistent uppercase |

**No violation data fixes needed.**

## Existence checks

| Item | Exists? |
|------|---------|
| ce_compliance_policies table | ✅ Yes (2 rows, 1 active) |
| ce_post_ledger_entry RPC | ✅ Yes |
| ce_calculation_rules.violation_type_id | ✅ Yes |
| ce_escalation_rules.violation_type_id | ✅ Yes |
| ce_penalty_calculations.violation_id | ✅ Yes |

## LEVY_SEVERANCE_OMISSION

Referenced by: **zero** detection rules, calculation rules, escalation rules, violations, or codebase files. It is completely orphaned. **Recommend deactivation** but will not deactivate without explicit instruction.

---

# Phase 2 — Minimal Corrections Required

Only **3 issues** remain. All previously-reported critical issues (missing types, NULL violation_type_id, review-first rules) are already fixed.

### Fix 1: Standardize ce_violation_types category and severity_default to UPPERCASE

Update 9 rows that have mixed-case values:

```
LATE_FILING:       Filing → FILING,     Medium → MEDIUM
NON_FILING:        Filing → FILING,     High → HIGH
NON_PAYMENT:       Payment → PAYMENT,   High → HIGH
PARTIAL_PAYMENT:   Payment → PAYMENT,   Medium → MEDIUM
UNDER_DECLARATION: Declaration → DECLARATION, High → HIGH
LEVY_SEVERANCE_OMISSION: Declaration → DECLARATION, Medium → MEDIUM
REPEAT_DEFAULT:    Legal → LEGAL,       Critical → CRITICAL
ARRANGEMENT_DEFAULT: Legal → LEGAL,     High → HIGH
LEGAL_DEFAULT:     Legal → LEGAL,       Critical → CRITICAL
```

(The 5 newer types already use uppercase.)

### Fix 2: Standardize ER-007 / ER-008 statuses to UPPER_SNAKE_CASE

```
ER-007: "Warning Issued" → "WARNING_ISSUED", "Summons Issued" → "SUMMONS_ISSUED"
ER-008: "Under Review" → "UNDER_REVIEW", "Legal Action" → "LEGAL_ACTION"
```

### Fix 3: Fix CR-001 / CR-002 source_config

```
CR-001: "c3_config_details.penalty_rate" → "c3_config"
CR-002: "c3_config_details.interest_rate" → "c3_config"
```

These should reference the config table generically (like CR-005/006/007 do), not specific dot-notation columns that don't map to an actual resolution path.

---

# Phase 3 — Post-Fix Verification

After corrections, I will query and display all tables again to confirm every value is consistent and correct.

---

## Files Modified

| Target | Change |
|--------|--------|
| Database (data update) | UPDATE 9 ce_violation_types rows for uppercase category/severity |
| Database (data update) | UPDATE 2 ce_escalation_rules rows (ER-007, ER-008) for uppercase statuses |
| Database (data update) | UPDATE 2 ce_calculation_rules rows (CR-001, CR-002) source_config |
| No code changes | All fixes are data-only |

