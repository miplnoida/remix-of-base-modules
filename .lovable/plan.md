

# Risk Policy & Escalation Integration Document — Generation Plan

## What Will Be Produced

A formal DOCX document (~25-30 pages) titled **"SSB Compliance Risk Policy & Integration Document v2.0"** covering all 12 sections requested, grounded entirely in the current system implementation (post-hardening).

## Data Sources (Already Gathered)

- **5 risk factors** from `ce_risk_config`: Arrears (25%), Violations (25%), Filings (20%), Payment Behavior (20%), Legal History (10%)
- **13 escalation rules** (ER-001 to ER-013) with full metadata including prerequisites, execution modes, approval roles, risk timing modifiers
- **Risk profile distribution**: 1,086 LOW, 45 MEDIUM, 4 HIGH, 0 CRITICAL
- **3 new tables**: `ce_escalation_log`, `ce_escalation_prerequisites`, plus hardened `ce_escalation_rules` schema
- **Edge function**: Full hardened `ce-escalation-review` with prerequisite checks, safeguards, duplicate protection, risk-based timing
- **State machine**: 16 states with defined transitions, prerequisite and approval flags

## Document Structure

1. **Executive Summary** — Purpose, scope, recent improvements summary
2. **Risk Model Overview** — 5-factor weighted scoring, calculation frequency, data sources
3. **Risk Bands & Classification** — LOW/MEDIUM/HIGH/CRITICAL with ranges, profiles, system behavior; CRITICAL reachability analysis (threshold 76, max observed 74)
4. **Risk Integration with Escalation** — Timing modifiers (ER-001/002/003), queue priority (ER-005), review urgency mapping
5. **Escalation Safeguards & Controls** — ER-003 hardening (supervisor approval, 3 prerequisites), arrangement/dispute checks, duplicate prevention via idempotency keys
6. **State Machine & Risk Interaction** — 16-state model, 4 stages, fast-track paths (ER-008), legal gate controls
7. **Data Model & Fields** — risk_profiles columns, escalation_log schema, prerequisites schema, computed vs stored
8. **Auditability & Traceability** — ce_escalation_log (every decision logged), violation_history, job run tracking
9. **Current Implementation Assessment** — Post-hardening strengths, recent changes inventory
10. **Identified Gaps & Risks** — CRITICAL band unreachable, enforcement_risk_score unused, some rules lack risk modifiers
11. **Recommendations** — Threshold tuning, enforcement_risk_score population, risk modifier expansion
12. **Conclusion** — Readiness level, approval recommendations

## Technical Approach

- Generate via Node.js `docx` library
- US Letter format, professional styling with branded header/footer
- Tables for risk bands, escalation rules matrix, state machine, data model
- Output to `/mnt/documents/SSB_Risk_Policy_Integration_v2.docx`
- QA via LibreOffice PDF conversion + image inspection

## Implementation Steps

1. Write generation script to `/tmp/gen_risk_policy.js`
2. Execute to produce DOCX
3. Convert to PDF/images for QA
4. Deliver artifact

