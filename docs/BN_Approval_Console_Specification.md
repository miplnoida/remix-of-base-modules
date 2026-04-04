# BN Approval Console — Specification

## Business Purpose
Support supervisor and approver review of benefit decisions before entitlement creation and payment orchestration. Approval does NOT directly create issued payments in `cl_cheques*` — it creates/activates `bn_entitlement` and `bn_payment_instruction` with status `PENDING`.

## How It Fits Into the Existing System
- **Workflow integration**: Reads `bn_claim.status = DECISION` as the entry queue; uses the existing decision engine for status transitions
- **Maker-checker**: Enforced via `bn_claim.entered_by` vs current user; admins exempt per workflow standard
- **Notification integration**: Each action triggers notifications through the enterprise notification adapter
- **Outbound payments**: Approval activates entitlement → creates payable instruction → payment batch process (separate) writes to `cl_cheques`

## Existing Tables Used
| Table | Purpose |
|-------|---------|
| `bn_claim` | Queue source (status=DECISION) |
| `bn_claim_decision` | Decision audit records |
| `bn_claim_event` | Immutable audit trail |
| `bn_claim_evidence` | Evidence completeness check |
| `bn_claim_eligibility` | Eligibility check verification |
| `bn_claim_calculation` | Calculation existence verification |
| `bn_product` | Benefit type display |
| `bn_reason_code` | Reason codes for disallow/override |
| `bn_workbasket` | Queue/workbasket context |
| `user_roles` | Admin role exemption for maker-checker |

## New Orchestration (on approval)
| Table | Impact |
|-------|--------|
| `bn_entitlement` | Created/activated with weekly_rate, lump_sum, total_entitlement |
| `bn_payment_instruction` | Created with status PENDING (not yet batched) |

---

## Queue Layout

### Metric Cards
| Metric | Source | Description |
|--------|--------|-------------|
| Awaiting Decision | bn_claim WHERE status=DECISION | Primary work count |
| Total in Queue | All filtered results | Overall queue size |
| Urgent | bn_claim WHERE priority=URGENT | Priority cases needing immediate attention |
| Overdue (>14d) | Derived from claim_date | SLA-breached cases |

### Queue Table Columns
| Column | Source | Control | Sortable |
|--------|--------|---------|----------|
| ☐ (Checkbox) | — | Checkbox (bulk select) | No |
| Claim # | bn_claim.claim_number | Read-only mono text | Yes |
| SSN | bn_claim.ssn | Read-only mono text | Yes |
| Benefit | bn_product.benefit_name | Read-only text | Yes |
| Status | bn_claim.status | BnStatusBadge | Yes |
| Priority | bn_claim.priority | Colored badge | Yes |
| Age | Derived (days since claim_date) | Text (red if >14d) | Yes |
| Readiness | Derived (3 icons) | Eligibility ✓/✗, Calc ✓/✗, Evidence ✓/⚠ | No |
| Assigned | bn_claim.assigned_to | Text | Yes |
| Actions | — | Eye button → drawer | No |

---

## Filters
| Filter | Control | Source | Default |
|--------|---------|--------|---------|
| Search | Text input | claim_number, ssn (ilike) | Empty |
| Status | Select | DECISION, APPROVED, PENDING_INFO | DECISION |
| Priority | Select | URGENT, HIGH, NORMAL, LOW | All |
| Benefit Type | Select | BN_CATEGORY_LABELS | All |

---

## Case Drawer Fields
| Field | Source | Control |
|-------|--------|---------|
| Claim Number | bn_claim.claim_number | Read-only |
| SSN | bn_claim.ssn | Read-only |
| Benefit Name | bn_product.benefit_name | Read-only |
| Claim Date | bn_claim.claim_date | Read-only date |
| Priority | bn_claim.priority | Badge |
| Submitted By | bn_claim.entered_by | Read-only (maker-checker indicator) |
| Eligibility Result | bn_claim_eligibility.overall_result | PASSED/FAILED badge |
| Eligibility Override | bn_claim_eligibility.override_applied | Badge |
| Weekly Rate | bn_claim_calculation.weekly_rate | Currency |
| Lump Sum | bn_claim_calculation.lump_sum | Currency |
| Total Payable | bn_claim_calculation.total_payable | Currency |
| Evidence Summary | bn_claim_evidence counts | Progress indicators |
| Latest Decision | bn_claim_decision (latest) | Action + status + date |

---

## Role Matrix
| Role | View Queue | Perform Actions | Available Actions |
|------|-----------|-----------------|-------------------|
| CLAIMS_OFFICER | ✓ | ✓ (limited) | REQUEST_EVIDENCE |
| SUPERVISOR | ✓ | ✓ | APPROVE, DISALLOW, REQUEST_EVIDENCE, SEND_BACK |
| MANAGER | ✓ | ✓ | APPROVE, DISALLOW, REQUEST_EVIDENCE, OVERRIDE, SEND_BACK |
| DIRECTOR | ✓ | ✓ | APPROVE, DISALLOW, REQUEST_EVIDENCE, OVERRIDE, SEND_BACK |
| ADMIN | ✓ | ✓ (exempt from maker-checker) | ALL |
| AUDITOR | ✓ | ✗ | None (view only) |

---

## Actions

### APPROVE
- **Preconditions**: has_calculation, has_eligibility_pass, evidence_complete, maker_checker
- **Supports Bulk**: Yes
- **Workflow**: DECISION → APPROVED
- **Notification**: `claim.approved` (claimant + supervisor)
- **Audit Event**: `approval.approved`
- **Entitlement Impact**: Creates/activates `bn_entitlement`; creates `bn_payment_instruction` (status=PENDING)
- **Validation**: Narrative required; maker-checker enforced

### DISALLOW
- **Preconditions**: maker_checker
- **Supports Bulk**: No
- **Workflow**: DECISION → DENIED
- **Notification**: `claim.denied` (claimant)
- **Audit Event**: `approval.disallowed`
- **Entitlement Impact**: Cancels draft entitlement
- **Validation**: Narrative + reason code required

### REQUEST_EVIDENCE
- **Preconditions**: None
- **Supports Bulk**: No
- **Workflow**: DECISION → PENDING_INFO
- **Notification**: `claim.evidence_requested` (claimant)
- **Audit Event**: `approval.evidence_requested`
- **Entitlement Impact**: None
- **Validation**: Narrative required

### OVERRIDE
- **Preconditions**: maker_checker
- **Supports Bulk**: No
- **Workflow**: DECISION → APPROVED (with override flag)
- **Notification**: `claim.override_approved`
- **Audit Event**: `approval.overridden`
- **Entitlement Impact**: Creates entitlement with `override_applied=true`
- **Validation**: Narrative + reason code required; MANAGER+ role

### SEND_BACK
- **Preconditions**: None
- **Supports Bulk**: No
- **Workflow**: DECISION → CALCULATION
- **Notification**: `claim.sent_back` (claims officer)
- **Audit Event**: `approval.sent_back`
- **Entitlement Impact**: None; claim returns for recalculation
- **Validation**: Narrative required

---

## Maker-Checker Controls
- **Detection**: `bn_claim.entered_by` compared to current user's `user_code`
- **Enforcement**: UI disables action buttons + backend validates before execution
- **Admin Exemption**: Users with `admin` role in `user_roles` bypass maker-checker
- **Blocked Logging**: Failed maker-checker attempts logged to `bn_claim_event` with `MAKER_CHECKER_BLOCKED` event type
- **Visual Indicator**: Amber badge "Maker-checker: your submission" shown in action bar

---

## Audit Events
| Event | Trigger | Logged To |
|-------|---------|-----------|
| `approval.approved` | APPROVE action | bn_claim_decision + bn_claim_event |
| `approval.disallowed` | DISALLOW action | bn_claim_decision + bn_claim_event |
| `approval.evidence_requested` | REQUEST_EVIDENCE action | bn_claim_decision + bn_claim_event |
| `approval.overridden` | OVERRIDE action | bn_claim_decision + bn_claim_event |
| `approval.sent_back` | SEND_BACK action | bn_claim_decision + bn_claim_event |
| `MAKER_CHECKER_BLOCKED` | Maker-checker violation | bn_claim_event |

All events include: `performed_by` (UserCode), `performed_at` (UTC), `from_status`, `to_status`, `narrative`, `reason_code_id`.

---

## Backward Compatibility
- No changes to `cl_head`, `cl_detail_*`, or `cl_cheques*` tables
- Downstream payment batch process (separate) reads `bn_payment_instruction` and writes to `cl_cheques`
- Existing claim number and linked-claim semantics preserved
- Existing workflow transition rules in `bn_claim_transition_rule` remain authoritative

## Route
- **URL**: `/bn/approval`
- **Access**: Authenticated users with `benefits_management` permission
- **Menu**: Added under "Benefit Management" as "Approval Console"
- **Auto-refresh**: Queue refreshes every 30 seconds
