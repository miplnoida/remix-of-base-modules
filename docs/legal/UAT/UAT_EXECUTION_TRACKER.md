# Legal V1 — UAT Execution Tracker

**Version:** 1.0  
**Instruction:** Fill Actual / Pass-Fail / Severity / Evidence / Owner / Date per row during execution. Link defects to `UAT_DEFECT_LOG_TEMPLATE.md`.

Legend: PASS · FAIL · BLOCKED · N/A

---

## Progress summary (update daily)

| Metric | Value |
|---|---|
| Total cases | 112 |
| Executed | 0 |
| PASS | 0 |
| FAIL | 0 |
| BLOCKED | 0 |
| % Complete | 0% |

---

## Module A — Compliance → Legal Referral

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-A-001 | Forward multi-component compliance case |  |  |  |  |  |  |
| UAT-A-002 | Selected-only forwarding |  |  |  |  |  |  |
| UAT-A-003 | Multiple contribution periods preserved |  |  |  |  |  |  |
| UAT-A-004 | Referral appears in Legal Intake queue |  |  |  |  |  |  |
| UAT-A-005 | Referral item acceptance flips status |  |  |  |  |  |  |
| UAT-A-006 | Liability creation from accepted items |  |  |  |  |  |  |
| UAT-A-007 | Financial rollup after enrichment |  |  |  |  |  |  |
| UAT-A-008 | Idempotent enrichment |  |  |  |  |  |  |
| UAT-A-009 | Party auto-population |  |  |  |  |  |  |
| UAT-A-010 | CE stamping |  |  |  |  |  |  |
| UAT-A-011 | Referral cancellation |  |  |  |  |  |  |
| UAT-A-012 | Benefit overpayment component |  |  |  |  |  |  |

## Module B — Legal Intake

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-B-001 | View intake detail |  |  |  |  |  |  |
| UAT-B-002 | Qualification checklist appears |  |  |  |  |  |  |
| UAT-B-003 | Save partial checklist |  |  |  |  |  |  |
| UAT-B-004 | Request information |  |  |  |  |  |  |
| UAT-B-005 | Reject intake |  |  |  |  |  |  |
| UAT-B-006 | Reject blocks case creation |  |  |  |  |  |  |
| UAT-B-007 | Approve intake creates matter |  |  |  |  |  |  |
| UAT-B-008 | Matter number format |  |  |  |  |  |  |
| UAT-B-009 | Intake gate blocks non-APPROVED |  |  |  |  |  |  |
| UAT-B-010 | Assistant cannot approve intake |  |  |  |  |  |  |

## Module C — Matter Workspace

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-C-001 | Open matter |  |  |  |  |  |  |
| UAT-C-002 | Parties tab |  |  |  |  |  |  |
| UAT-C-003 | Liabilities tab (5 rows) |  |  |  |  |  |  |
| UAT-C-004 | Financials tab reconciles |  |  |  |  |  |  |
| UAT-C-005 | Timeline shows events |  |  |  |  |  |  |
| UAT-C-006 | Documents tab |  |  |  |  |  |  |
| UAT-C-007 | Add manual note |  |  |  |  |  |  |
| UAT-C-008 | Assign officer |  |  |  |  |  |  |
| UAT-C-009 | Reassign case |  |  |  |  |  |  |
| UAT-C-010 | Case Completeness pass |  |  |  |  |  |  |
| UAT-C-011 | Case Completeness missing item |  |  |  |  |  |  |
| UAT-C-012 | Governance panel |  |  |  |  |  |  |
| UAT-C-013 | Stage transition |  |  |  |  |  |  |
| UAT-C-014 | Close matter |  |  |  |  |  |  |

## Module D — Recoverable Liabilities

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-D-001 | SS liability visible |  |  |  |  |  |  |
| UAT-D-002 | Housing Levy fund code |  |  |  |  |  |  |
| UAT-D-003 | Severance amount |  |  |  |  |  |  |
| UAT-D-004 | Interest linked to period |  |  |  |  |  |  |
| UAT-D-005 | Penalty policy reference |  |  |  |  |  |  |
| UAT-D-006 | Benefit overpayment liability |  |  |  |  |  |  |
| UAT-D-007 | Partial payment allocation |  |  |  |  |  |  |
| UAT-D-008 | Outstanding = assessed − paid |  |  |  |  |  |  |
| UAT-D-009 | Allocations sum = paid |  |  |  |  |  |  |
| UAT-D-010 | Retrofit tool loads amounts |  |  |  |  |  |  |
| UAT-D-011 | Write-off updates total |  |  |  |  |  |  |
| UAT-D-012 | Liability audit trail |  |  |  |  |  |  |

## Module E — Court Operations

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-E-001 | Create hearing |  |  |  |  |  |  |
| UAT-E-002 | Assign court/division/officer |  |  |  |  |  |  |
| UAT-E-003 | Outcome ADJOURNED |  |  |  |  |  |  |
| UAT-E-004 | Outcome JUDGMENT |  |  |  |  |  |  |
| UAT-E-005 | Consent Order + installments |  |  |  |  |  |  |
| UAT-E-006 | Mark installment PAID |  |  |  |  |  |  |
| UAT-E-007 | Consent order BREACH flag |  |  |  |  |  |  |
| UAT-E-008 | Enforcement from breach |  |  |  |  |  |  |
| UAT-E-009 | Hearing calendar |  |  |  |  |  |  |
| UAT-E-010 | Hearings list filter by court |  |  |  |  |  |  |

## Module F — Appeals

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-F-001 | File appeal |  |  |  |  |  |  |
| UAT-F-002 | Link appeal to liabilities |  |  |  |  |  |  |
| UAT-F-003 | Appeal freeze |  |  |  |  |  |  |
| UAT-F-004 | Outcome PARTIALLY_ALLOWED |  |  |  |  |  |  |
| UAT-F-005 | Recovery impact recorded |  |  |  |  |  |  |
| UAT-F-006 | Appeal timeline updates |  |  |  |  |  |  |

## Module G — Post-Judgment Recovery

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-G-001 | Judgment compliance dashboard |  |  |  |  |  |  |
| UAT-G-002 | Create recovery assignment |  |  |  |  |  |  |
| UAT-G-003 | Assignment ↔ liabilities |  |  |  |  |  |  |
| UAT-G-004 | Consent order breach escalation |  |  |  |  |  |  |
| UAT-G-005 | Enforcement GARNISHMENT |  |  |  |  |  |  |
| UAT-G-006 | External counsel engagement |  |  |  |  |  |  |
| UAT-G-007 | Court filing with fee |  |  |  |  |  |  |
| UAT-G-008 | Legal cost linked to filing |  |  |  |  |  |  |
| UAT-G-009 | Legal cost pending-award |  |  |  |  |  |  |
| UAT-G-010 | Recovery workbench children |  |  |  |  |  |  |

## Module H — Dashboards & Reports

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-H-001 | Dashboard loads |  |  |  |  |  |  |
| UAT-H-002 | Case count matches DB |  |  |  |  |  |  |
| UAT-H-003 | Recovery Workbench totals |  |  |  |  |  |  |
| UAT-H-004 | Matter vs view reconcile |  |  |  |  |  |  |
| UAT-H-005 | Export CSV |  |  |  |  |  |  |
| UAT-H-006 | Export PDF |  |  |  |  |  |  |
| UAT-H-007 | Filters |  |  |  |  |  |  |
| UAT-H-008 | Empty state |  |  |  |  |  |  |

## Module I — Security & Permissions

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-I-001 | Read-only view |  |  |  |  |  |  |
| UAT-I-002 | Read-only blocked from approval |  |  |  |  |  |  |
| UAT-I-003 | Assistant draft only |  |  |  |  |  |  |
| UAT-I-004 | Handler court actions |  |  |  |  |  |  |
| UAT-I-005 | Reviewer approve notice |  |  |  |  |  |  |
| UAT-I-006 | Approver close/publish |  |  |  |  |  |  |
| UAT-I-007 | Admin manage templates |  |  |  |  |  |  |
| UAT-I-008 | SystemAdmin all-access |  |  |  |  |  |  |
| UAT-I-009 | Route guard admin |  |  |  |  |  |  |
| UAT-I-010 | Confidential doc redacted |  |  |  |  |  |  |
| UAT-I-011 | PII unlock logged |  |  |  |  |  |  |
| UAT-I-012 | Server rejects direct API |  |  |  |  |  |  |

## Negative tests

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| UAT-N-001 | Duplicate referral |  |  |  |  |  |  |
| UAT-N-002 | Missing contribution period |  |  |  |  |  |  |
| UAT-N-003 | Invalid liability amount |  |  |  |  |  |  |
| UAT-N-004 | Unauthorized approval |  |  |  |  |  |  |
| UAT-N-005 | Update on CLOSED matter |  |  |  |  |  |  |
| UAT-N-006 | Duplicate liability |  |  |  |  |  |  |
| UAT-N-007 | Payment > outstanding |  |  |  |  |  |  |
| UAT-N-008 | Missing respondent address |  |  |  |  |  |  |
| UAT-N-009 | Inactive master value |  |  |  |  |  |  |
| UAT-N-010 | Broken consent order |  |  |  |  |  |  |
| UAT-N-011 | Referral no components |  |  |  |  |  |  |
| UAT-N-012 | Reject without reason |  |  |  |  |  |  |
| UAT-N-013 | Close with outstanding |  |  |  |  |  |  |
| UAT-N-014 | Appeal on non-judgment |  |  |  |  |  |  |
| UAT-N-015 | Enforcement without order |  |  |  |  |  |  |
| UAT-N-016 | Expired counsel engagement |  |  |  |  |  |  |
| UAT-N-017 | Legal cost without fee master |  |  |  |  |  |  |
| UAT-N-018 | Concurrent enrichment |  |  |  |  |  |  |

## Financial validation (from `UAT_FINANCIAL_VALIDATION.md`)

| ID | Test title | Executor | Date | Result | Severity | Defect ID | Evidence |
|---|---|---|---|---|---|---|---|
| FIN-001..015 | See financial validation doc |  |  |  |  |  |  |
