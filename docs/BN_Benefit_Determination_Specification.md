# BN Benefit Determination Screen — Specification

## Business Purpose
Support benefit application review, rule versioning, eligibility validation, calculation execution, explanation, and decision preparation. Approval here does NOT directly issue payment — it marks the claim as APPROVE_READY for downstream award setup.

## How It Fits Into the Existing System
- **Extension, not redesign**: Reads from existing `bn_claim`, `bn_product`, `bn_product_version` tables
- **cl_head compatibility**: Claim facts remain compatible; determination writes to `bn_claim_decision` and `bn_claim_event`
- **Outbound payments**: This screen does NOT touch payment tables. Payments flow through `cl_cheques` via downstream award/payment processes
- **Workflow integration**: Uses `bn_claim_transition_rule` and the existing decision engine
- **Notification integration**: Actions trigger notifications via the enterprise notification adapter

## Existing Tables Used
| Table | Purpose |
|-------|---------|
| `bn_claim` | Claim header context |
| `bn_product` | Benefit product metadata |
| `bn_product_version` | Effective-dated rule version |
| `bn_eligibility_rule` | Eligibility rules for version |
| `bn_calculation_rule` | Calculation rules for version |
| `bn_timeline_rule` | Timeline/duration rules |
| `bn_claim_eligibility` | Eligibility check snapshots |
| `bn_claim_decision` | Decision audit records |
| `bn_claim_event` | Immutable audit trail |
| `bn_claim_evidence` | Evidence/document state |
| `bn_reason_code` | Reason codes for decisions |
| `ip_master` | Contributor identity (via adapter) |
| `er_master` | Employer context (via adapter) |
| `ip_wages` | Contribution/wage data (via RPC) |

## New Tables Introduced
| Table | Purpose |
|-------|---------|
| `bn_claim_calculation` | Calculation snapshots (benefit_calculation) |
| `bn_claim_calculation_line` | Itemized calculation lines (benefit_calculation_line) |

---

## Screen Sections

### 1. Claim Context Banner
| Field | Label | Control | Required | Source | Validation | Editable Roles | Visible Statuses | Workflow Effect |
|-------|-------|---------|----------|--------|------------|----------------|-------------------|-----------------|
| claim_number | Claim # | Read-only text | — | bn_claim.claim_number | — | None (read-only) | ALL | — |
| ssn | SSN | Read-only text | — | bn_claim.ssn | — | None | ALL | — |
| benefit_name | Benefit | Read-only text | — | bn_product.benefit_name | — | None | ALL | — |
| claim_date | Claim Date | Read-only date | — | bn_claim.claim_date | — | None | ALL | — |
| status | Status | Badge | — | bn_claim.status | — | None | ALL | — |
| priority | Priority | Badge | — | bn_claim.priority | — | None | ALL | — |

### 2. Rule Version Banner
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| version_number | Version | Read-only | bn_product_version.version_number | No | — |
| status | Version Status | Badge | bn_product_version.status | No | — |
| effective_from | Effective From | Date | bn_product_version.effective_from | No | — |
| effective_to | Effective To | Date | bn_product_version.effective_to | No | — |
| eligibility_count | Eligibility Rules | Count | bn_eligibility_rule (count) | No | — |
| calculation_count | Calc Rules | Count | bn_calculation_rule (count) | No | — |
| timeline_count | Timeline Rules | Count | bn_timeline_rule (count) | No | — |

### 3. Eligibility Input Panel
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| check_date | Check Date | Read-only | bn_claim_eligibility.check_date | No | Yes |
| overall_result | Result | Badge (PASSED/FAILED) | bn_claim_eligibility.overall_result | No | Yes |
| override_applied | Override | Badge | bn_claim_eligibility.override_applied | No | Yes |
| rule_results[] | Rule Grid | Table | bn_claim_eligibility.rule_results | No | Yes |
| rule.ruleName | Rule Name | Text | rule_results[].ruleName | No | — |
| rule.ruleGroup | Group | Text | rule_results[].ruleGroup | No | — |
| rule.requiredValue | Required | Mono text | rule_results[].requiredValue | No | — |
| rule.actualValue | Actual | Mono text | rule_results[].actualValue | No | — |
| rule.passed | Result | Icon (✓/✗) | rule_results[].passed | No | — |

### 4. Contribution and Wage Panel
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| totalWeeks | Total Weeks | Stat card | bn_get_contribution_summary RPC | No | — |
| totalAmount | Total Contributions | Stat card | RPC | No | — |
| averageWeeklyWage | Avg Weekly Wage | Stat card | RPC | No | — |
| window | Window Period | Stat card | Derived | No | — |

### 5. Calculation Lines Panel
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| weekly_rate | Weekly Rate | Stat card | bn_claim_calculation.weekly_rate | No | Yes |
| lump_sum | Lump Sum | Stat card | bn_claim_calculation.lump_sum | No | Yes |
| total_payable | Total Payable | Stat card | bn_claim_calculation.total_payable | No | Yes |
| duration_weeks | Duration | Stat card | bn_claim_calculation.duration_weeks | No | Yes |
| lines[] | Calc Lines | Table | bn_claim_calculation_line | No | Yes |
| line.line_number | # | Number | line_number | No | — |
| line.line_label | Line | Text | line_label | No | — |
| line.formula_expression | Formula | Mono text | formula_expression | No | — |
| line.output_value | Result | Currency | output_value | No | — |
| line.explanation | Explanation | Text | explanation | No | — |

### 6. Warnings/Exceptions Panel
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| warnings[] | Warnings | Alert list | Derived from eligibility, calc, evidence state | No | — |
| severity | Severity | Icon + color | Generated | No | — |
| message | Message | Text | Generated | No | — |
| suggestedAction | Suggested Action | Text | Generated | No | — |
| source | Source | Tag | Generated | No | — |

### 7. Decision Panel
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| decisions[] | Decision History | Table | bn_claim_decision | No | Yes |
| action_code | Action | Text | bn_claim_decision.action_code | No | — |
| from_status | From | Badge | bn_claim_decision.from_status | No | — |
| to_status | To | Badge | bn_claim_decision.to_status | No | — |
| reason_label | Reason | Text | bn_reason_code.reason_label | No | — |
| narrative | Narrative | Text | bn_claim_decision.narrative | No | — |
| performed_by | By | Text | bn_claim_decision.performed_by | No | — |
| performed_at | Date | Date | bn_claim_decision.performed_at | No | — |

### 8. Related Linked-Claim Context
| Field | Label | Control | Source | Editable | Navigation |
|-------|-------|---------|--------|----------|------------|
| linkedClaims[] | Linked Claims | Card list | bn_claim (same SSN) | No | Link to /bn/claims/:id |
| claim_number | Claim # | Text | bn_claim.claim_number | No | — |
| benefit_type | Benefit | Text | bn_product.benefit_name | No | — |
| status | Status | Badge | bn_claim.status | No | — |
| relationship | Relationship | Tag | Derived (PARENT/SIBLING) | No | — |

### 9. Workflow & Notification Summary
| Field | Label | Control | Source | Editable | Audit |
|-------|-------|---------|--------|----------|-------|
| workflow_state | Current State | Badge + text | Derived from bn_claim.status | No | — |
| evidence_verified | Evidence Verified | Progress | bn_claim_evidence counts | No | — |
| evidence_complete | Evidence Complete | Badge | Derived | No | — |
| notification_indicator | Notification | Alert | Derived from status | No | — |

---

## Actions

### CALCULATE
- **Preconditions**: Eligibility checked
- **Workflow Transition**: None (claim stays in CALCULATION)
- **Notification Trigger**: None
- **Audit Event**: `determination.calculated`
- **Legacy Table Impact**: Creates `bn_claim_calculation` + `bn_claim_calculation_line` records
- **Stores**: Calculation snapshot with full trace

### RECALCULATE
- **Preconditions**: Previous calculation exists
- **Workflow Transition**: None (supersedes previous snapshot)
- **Notification Trigger**: None
- **Audit Event**: `determination.recalculated`
- **Requires**: Narrative (reason for recalculation)

### RECOMMEND
- **Preconditions**: Calculation complete, evidence complete
- **Workflow Transition**: Status → DECISION
- **Notification Trigger**: `claim.recommended` (supervisor notification)
- **Audit Event**: `determination.recommended`
- **Requires**: Narrative

### APPROVE_READY (Mark Approve-Ready)
- **Preconditions**: Calculation complete, evidence complete, eligibility passed
- **Workflow Transition**: Status → APPROVED
- **Notification Trigger**: `claim.approved` (claimant + supervisor)
- **Audit Event**: `determination.approve_ready`
- **Requires**: Narrative
- **CRITICAL**: Does NOT issue payment. Downstream award setup handles payment.

### DISALLOW_READY (Mark Disallow-Ready)
- **Preconditions**: Eligibility check performed
- **Workflow Transition**: Status → DENIED
- **Notification Trigger**: `claim.denied` (claimant notification)
- **Audit Event**: `determination.disallow_ready`
- **Requires**: Narrative + Reason Code

### REQUEST_EVIDENCE
- **Preconditions**: None
- **Workflow Transition**: Status → PENDING_INFO
- **Notification Trigger**: `claim.evidence_requested` (claimant notification)
- **Audit Event**: `determination.evidence_requested`
- **Requires**: Narrative

### OVERRIDE
- **Preconditions**: Supervisor or Admin role
- **Workflow Transition**: Creates override record (requires approval)
- **Notification Trigger**: `claim.override_requested`
- **Audit Event**: `determination.overridden`
- **Requires**: Narrative + Reason Code

---

## Statuses
| Status | Description | Determination Relevance |
|--------|-------------|------------------------|
| ELIGIBILITY_CHECK | Awaiting eligibility validation | Primary entry point |
| EVIDENCE_REVIEW | Awaiting evidence verification | May return here after evidence request |
| CALCULATION | Awaiting benefit calculation | After eligibility pass |
| DECISION | Recommended — awaiting supervisor | After recommendation |
| PENDING_INFO | Awaiting claimant response | After evidence request |
| APPROVED | Determination complete | Terminal for this screen |
| DENIED | Claim disallowed | Terminal for this screen |

## Audit Events
All actions write immutable records to `bn_claim_event` and `bn_claim_decision` with:
- `performed_by`: UserCode of the logged-in user
- `performed_at`: UTC timestamp
- `from_status` / `to_status`: Status transition
- `narrative`: User-provided justification
- `evidence_snapshot`: State of evidence at decision time

## Backward Compatibility
- No changes to `cl_head` or `cl_detail_*` tables
- No changes to `cl_cheques` or payment tables
- All new data stored in `bn_claim_calculation`, `bn_claim_calculation_line`, `bn_claim_decision`, `bn_claim_event`
- Legacy claim number and linked-claim semantics preserved
- Existing workflow transition rules in `bn_claim_transition_rule` remain authoritative

## Route
- **URL**: `/bn/claims/:id/determination`
- **Access**: Authenticated users with `benefits_management` permission
- **Navigation**: Accessible from Claim Workbench via action link
