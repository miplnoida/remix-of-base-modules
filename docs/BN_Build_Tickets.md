# BN Build Tickets — Phased Delivery Plan

## Phase 1: Person 360 and Inquiry

### Epic 1.1: Person 360 Integration
| Item | Detail |
|---|---|
| **Feature** | Unified person view with benefit history |
| **Stories** | 1) As an officer, I can search by SSN and see person details from `ip_master` 2) As an officer, I can see all claims for a person from `bn_claim` and `cl_head` 3) As an officer, I can see contribution summary from `ip_wages` |
| **Acceptance** | Person loads <1s; shows all linked claims; navigates to Claim 360 |
| **Existing Tables** | `ip_master`, `ip_wages`, `cl_head`, `er_master` |
| **New Tables** | None |
| **Workflow** | None |
| **Notifications** | None |
| **Dependencies** | None |

### Epic 1.2: Historical Inquiry
| Item | Detail |
|---|---|
| **Feature** | Read-only search across legacy and modern claims/disbursements |
| **Stories** | 1) Search claims by SSN/number/date/status 2) Search disbursements from `cl_cheques*` 3) View detail with source lineage badge 4) PII masking for bank accounts |
| **Acceptance** | Dual-mode search; results show source table; all fields read-only; inquiry access audited |
| **Existing Tables** | `bn_claim`, `cl_head`, `cl_cheques`, `cl_cheques_holding`, `cl_cheques_survivor` |
| **New Tables** | None |
| **Workflow** | None |
| **Notifications** | None |

---

## Phase 2: Claim Workbench

### Epic 2.1: Claim Registration & Intake
| Item | Detail |
|---|---|
| **Stories** | 1) Register new claim with SSN lookup 2) Select benefit product 3) Capture claim details via dynamic form 4) Upload evidence documents 5) Submit claim |
| **Acceptance** | Claim number generated; `bn_claim` + `cl_head` sync; evidence checklist enforced |
| **Existing Tables** | `ip_master`, `cl_head` |
| **New Tables** | `bn_claim`, `bn_claim_detail`, `bn_claim_evidence` |
| **Workflow** | Starts `bn_claim_processing` on submit |
| **Notifications** | `bn.claim.created`, `bn.claim.submitted` |

### Epic 2.2: Claim Worklist & Queue
| Item | Detail |
|---|---|
| **Stories** | 1) View assigned claims with SLA indicators 2) Filter by status/product/priority 3) Bulk assign claims 4) Claim 360 detail view |
| **Acceptance** | Worklist loads <2s; SLA badges accurate; assignment logged |
| **Existing Tables** | `bn_claim` |
| **New Tables** | `bn_workbasket`, `bn_claim_queue_assignment` |
| **Workflow** | Reuses existing workflow task assignment |
| **Notifications** | None |

---

## Phase 3: Determination and Approval

### Epic 3.1: Benefit Determination
| Item | Detail |
|---|---|
| **Stories** | 1) Run calculation engine 2) View 10-layer trace 3) Compare with legacy 4) Request override 5) Run simulation |
| **Acceptance** | Calc completes in <5s; trace shows all steps; override requires approval |
| **Existing Tables** | `ip_wages`, `ip_master` |
| **New Tables** | `bn_calc_run`, `bn_calc_trace`, `bn_calc_override`, `bn_calc_legacy_snapshot` |
| **Workflow** | Override triggers approval workflow |
| **Notifications** | `bn.calc.completed` |

### Epic 3.2: Approval Console
| Item | Detail |
|---|---|
| **Stories** | 1) View decisions pending approval 2) Approve with narrative 3) Disallow with reason code 4) Send back for revision 5) Request additional evidence 6) Bulk approve |
| **Acceptance** | Maker-checker enforced; `bn_claim_decision` immutable; `cl_head.status` synced |
| **Existing Tables** | `cl_head` |
| **New Tables** | `bn_claim_decision`, `bn_approval_request` |
| **Workflow** | Completes workflow step; maps end-state to BN status |
| **Notifications** | `bn.claim.approved`, `bn.claim.disallowed`, `bn.decision.pending` |

---

## Phase 4: Entitlement and Payables

### Epic 4.1: Entitlement Management
| Item | Detail |
|---|---|
| **Stories** | 1) Auto-create entitlement on approval 2) View entitlement details 3) Suspend/resume/terminate entitlement 4) Track installment progress |
| **Acceptance** | Entitlement created with correct rates; lifecycle actions logged |
| **Existing Tables** | `bn_claim`, `bn_claim_calculation` |
| **New Tables** | `bn_entitlement` |
| **Workflow** | Entitlement creation triggered by approval workflow end-state |
| **Notifications** | `bn.entitlement.created` |

### Epic 4.2: Payables Queue
| Item | Detail |
|---|---|
| **Stories** | 1) Generate payable from entitlement 2) Validate banking info 3) Block/unblock payable 4) View payable queue with filters |
| **Acceptance** | Payable generated with correct amount; blocked payables escalate after 24hrs |
| **Existing Tables** | `ip_master` (banking info) |
| **New Tables** | `bn_payment_instruction` |
| **Workflow** | None (operational queue) |
| **Notifications** | `bn.payable.blocked`, `bn.payable.ready` |

---

## Phase 5: Schedules and Batch Control

### Epic 5.1: Payment Schedules
| Item | Detail |
|---|---|
| **Stories** | 1) Generate schedule from entitlement 2) View installment timeline 3) Modify schedule |
| **Acceptance** | Schedule matches entitlement terms; modifications logged |
| **New Tables** | `bn_payment_schedule` |
| **Notifications** | `bn.schedule.created` |

### Epic 5.2: Batch Operations
| Item | Detail |
|---|---|
| **Stories** | 1) Create batch 2) Add/remove instructions 3) Submit for approval 4) Approve/reject batch 5) View batch summary |
| **Acceptance** | Maker-checker on batch approval; batch totals accurate |
| **New Tables** | `bn_payment_batch` |
| **Workflow** | Batch approval via workflow engine |
| **Notifications** | `bn.batch.created`, `bn.batch.approved` |

---

## Phase 6: Payment Issue and Post-Issue

### Epic 6.1: Payment Issue
| Item | Detail |
|---|---|
| **Stories** | 1) Issue approved batch 2) Write to `cl_cheques` (NOT `cn_payment*`) 3) Handle partial failures 4) Cancel/reissue payments |
| **Acceptance** | Payments written to `cl_cheques*`; exceptions logged; `cn_payment*` never written |
| **Existing Tables** | `cl_cheques`, `cl_cheques_holding`, `cl_cheques_survivor` |
| **New Tables** | `bn_payment_exception` |
| **Notifications** | `bn.issue.started`, `bn.issue.completed`, `bn.issue.failed` |
| **Legacy Compatibility** | `cl_cheque_no` linked back to `bn_payment_instruction` |

### Epic 6.2: Post-Issue Review
| Item | Detail |
|---|---|
| **Stories** | 1) Generate post-issue tasks 2) Execute/skip/defer tasks 3) Update `cl_head`, `cl_wages_credited`, `tb_postal_reg` 4) Retry failed tasks |
| **Acceptance** | All mandatory tasks complete before claim closure; retry up to 3x |
| **Existing Tables** | `cl_head`, `cl_wages_credited`, `tb_postal_reg` |
| **New Tables** | `bn_post_issue_task` |
| **Notifications** | `bn.postissue.completed` |

---

## Phase 7: Historical Inquiry
(Delivered in Phase 1 — Epic 1.2)

---

## Phase 8: Workflow/Notification Integration Hardening

### Epic 8.1: Workflow Integration
| Item | Detail |
|---|---|
| **Stories** | 1) Dual-mode governance check 2) BN-specific workflow templates 3) End-state mapping 4) Exception routing |
| **Acceptance** | All BN status changes flow through workflow when governed; fallback to internal matrix |
| **Existing Tables** | `workflow_definitions`, `workflow_instances`, `workflow_tasks` |
| **Testing** | Verify all 9 module transitions with and without workflow governance |

### Epic 8.2: Notification Integration
| Item | Detail |
|---|---|
| **Stories** | 1) 22 event templates seeded 2) Dual-channel dispatch 3) Retry for email/SMS 4) Notification history per claim |
| **Acceptance** | All events fire correct templates; claimant receives email/SMS; staff gets in-app |
| **Existing Tables** | `notification_templates`, `notification_logs`, `in_app_notifications` |
| **Testing** | Verify all 22 event codes dispatch correctly |

---

## Phase 9: Audit/Reporting and Stabilization

### Epic 9.1: Rules Administration
| Item | Detail |
|---|---|
| **Stories** | 1) Version registry with status lifecycle 2) Clone version as draft 3) Compare versions 4) Submit/approve/reject/publish 5) Simulation from version |
| **Acceptance** | No overlapping ACTIVE versions; maker-checker enforced; all changes audited |
| **New Tables** | None (uses `bn_product_version`) |
| **Workflow** | `bn_rule_approval` workflow template |

### Epic 9.2: Audit Trail & Reporting
| Item | Detail |
|---|---|
| **Stories** | 1) Unified audit trail per claim 2) Decision history view 3) Calculation trace viewer 4) Payment exception report 5) SLA compliance dashboard |
| **Acceptance** | Full traceability from intake to payment; no silent status changes |
| **Existing Tables** | `audit_logs`, `bn_claim_event`, `bn_claim_decision`, `bn_calc_trace` |

### Epic 9.3: Stabilization
| Item | Detail |
|---|---|
| **Stories** | 1) Performance tuning (<2s worklist, <1s SSN lookup) 2) Parallel run validation 3) Legacy data migration verification 4) Role-based access hardening |
| **Testing** | 100+ E2E scenarios from `BN-Test-Scenarios-SKN.md`; ±$1.00 tolerance on calculations |
