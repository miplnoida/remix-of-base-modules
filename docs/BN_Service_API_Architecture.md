# BN Service / API Architecture

## Overview
15 services orchestrate the Benefits module. Each reuses existing tables and extends via `bn_*` orchestration tables.

---

## 1. Claim Service
- **Responsibility**: Claim intake, registration, validation, assignment
- **Commands**: `createClaim`, `updateClaim`, `submitClaim`, `assignClaim`, `withdrawClaim`
- **Queries**: `getClaimById`, `getClaimsBySSN`, `getClaimWorklist`, `getClaimQueue`
- **Validations**: SSN exists in `ip_master`, product active, no duplicate active claim for same benefit type
- **Workflow Hooks**: Starts `bn_claim_processing` workflow on submit
- **Notification Hooks**: `bn.claim.created`, `bn.claim.submitted`
- **Existing Tables Read**: `ip_master`, `er_master`, `cl_head`
- **Legacy Tables Updated**: `cl_head` (status sync)
- **New Tables Written**: `bn_claim`, `bn_claim_detail`, `bn_claim_event`
- **Idempotency**: Claim number generation is sequential; duplicate submit returns existing claim
- **Failure Handling**: Validation errors returned as field-level array; DB errors logged to `bn_claim_event`
- **Audit**: All status changes via `bn_claim_decision`; field changes via DB trigger to `audit_logs`

## 2. Evidence Service
- **Responsibility**: Document upload, verification, evidence tracking for claims
- **Commands**: `uploadEvidence`, `verifyEvidence`, `requestEvidence`, `rejectEvidence`
- **Queries**: `getEvidenceByClaim`, `getPendingEvidence`, `getEvidenceChecklist`
- **Validations**: File type/size limits, required evidence per product config
- **Workflow Hooks**: Evidence completion can unblock workflow step
- **Notification Hooks**: `bn.evidence.requested`
- **Existing Tables Read**: `bn_product_version` (required doc list)
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_claim_evidence`, `bn_claim_event`
- **Idempotency**: Upload keyed by `claim_id + doc_type + checksum`
- **Failure Handling**: Storage upload retry (3x); failed uploads logged
- **Audit**: Upload, verify, reject actions logged to `bn_claim_event`

## 3. Benefit Service
- **Responsibility**: Orchestrates determination lifecycle (eligibility + calculation + decision)
- **Commands**: `startDetermination`, `completeDetermination`, `overrideDetermination`
- **Queries**: `getDeterminationStatus`, `getDeterminationHistory`
- **Validations**: Claim must be VERIFIED; evidence checklist complete
- **Workflow Hooks**: Triggers `bn.decision.pending` on completion
- **Notification Hooks**: `bn.calc.completed`
- **Existing Tables Read**: `ip_wages`, `ip_master`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_claim_calculation`, `bn_calc_run`, `bn_calc_trace`
- **Idempotency**: One active calc run per claim; re-run creates new version
- **Failure Handling**: Calc errors stored in `bn_calc_run.errors`; status set to `FAILED`
- **Audit**: Full trace in `bn_calc_trace`; override requests in `bn_calc_override`

## 4. Calculation Service
- **Responsibility**: Execute the 10-layer calculation engine pipeline
- **Commands**: `runCalculation`, `runSimulation`, `compareWithLegacy`
- **Queries**: `getCalcRun`, `getCalcTrace`, `getCalcComparison`
- **Validations**: Product version must be ACTIVE; SSN contribution data available
- **Workflow Hooks**: None (called by Benefit Service)
- **Notification Hooks**: None (Benefit Service handles)
- **Existing Tables Read**: `ip_wages`, `ip_master`, `bn_eligibility_rule`, `bn_calculation_rule`, `bn_timeline_rule`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_calc_run`, `bn_calc_trace`, `bn_calc_legacy_snapshot`
- **Idempotency**: Each run gets unique ID; simulation runs tagged `mode=SIMULATION`
- **Failure Handling**: Layer-by-layer error capture; partial results preserved
- **Audit**: Every step traced in `bn_calc_trace`

## 5. Decision Service
- **Responsibility**: Record approval/disallowance decisions with maker-checker
- **Commands**: `approve`, `disallow`, `sendBack`, `requestEvidence`, `override`
- **Queries**: `getPendingDecisions`, `getDecisionHistory`
- **Validations**: Maker-checker (approver ≠ author); role authorization; evidence completeness
- **Workflow Hooks**: Completes workflow step; maps to BN status
- **Notification Hooks**: `bn.claim.approved`, `bn.claim.disallowed`, `bn.decision.pending`
- **Existing Tables Read**: `bn_claim`, `bn_claim_calculation`
- **Legacy Tables Updated**: `cl_head.status`
- **New Tables Written**: `bn_claim_decision`, `bn_claim_event`, `bn_approval_request`
- **Idempotency**: Decision keyed by `claim_id + action_code + timestamp`
- **Failure Handling**: Decision rollback on downstream failure
- **Audit**: Immutable `bn_claim_decision` record with reason, narrative, snapshots

## 6. Entitlement Service
- **Responsibility**: Create and manage benefit entitlement rights after approval
- **Commands**: `createEntitlement`, `suspendEntitlement`, `resumeEntitlement`, `terminateEntitlement`
- **Queries**: `getEntitlementByClaim`, `getActiveEntitlements`, `getEntitlementHistory`
- **Validations**: Claim must be APPROVED; no duplicate active entitlement
- **Workflow Hooks**: Entitlement creation triggered by approval workflow end-state
- **Notification Hooks**: `bn.entitlement.created`
- **Existing Tables Read**: `bn_claim`, `bn_claim_calculation`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_entitlement`, `bn_claim_event`
- **Idempotency**: One active entitlement per claim
- **Failure Handling**: Failed creation logged; claim remains APPROVED for retry
- **Audit**: Status changes logged to `bn_claim_event`

## 7. Payable Orchestration Service
- **Responsibility**: Generate and manage payment instructions from entitlements
- **Commands**: `generatePayable`, `blockPayable`, `unblockPayable`, `cancelPayable`
- **Queries**: `getPayableQueue`, `getPayableById`, `getBlockedPayables`
- **Validations**: Entitlement active; no duplicate instruction for same period; banking info present
- **Workflow Hooks**: None (operational queue)
- **Notification Hooks**: `bn.payable.blocked`, `bn.payable.ready`
- **Existing Tables Read**: `bn_entitlement`, `ip_master`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_payment_instruction`, `bn_claim_event`
- **Idempotency**: Keyed by `entitlement_id + period_start + period_end`
- **Failure Handling**: Block on validation failure; supervisor escalation after 24hrs
- **Audit**: All status transitions logged

## 8. Payment Schedule Service
- **Responsibility**: Plan one-time and recurring disbursement schedules
- **Commands**: `createSchedule`, `modifySchedule`, `cancelSchedule`
- **Queries**: `getScheduleByEntitlement`, `getUpcomingPayments`
- **Validations**: Entitlement active; dates within entitlement period
- **Workflow Hooks**: None
- **Notification Hooks**: `bn.schedule.created`
- **Existing Tables Read**: `bn_entitlement`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_payment_schedule`, `bn_claim_event`
- **Idempotency**: One schedule per entitlement
- **Failure Handling**: Schedule generation errors logged
- **Audit**: Schedule creation and modifications logged

## 9. Batch Control Service
- **Responsibility**: Group payable instructions into controlled payment batches
- **Commands**: `createBatch`, `addToBatch`, `removefromBatch`, `submitBatch`, `approveBatch`, `rejectBatch`
- **Queries**: `getOpenBatches`, `getBatchById`, `getBatchInstructions`
- **Validations**: Batch total limits; instruction compatibility; maker-checker for approval
- **Workflow Hooks**: Batch approval via workflow engine
- **Notification Hooks**: `bn.batch.created`, `bn.batch.approved`
- **Existing Tables Read**: `bn_payment_instruction`
- **Legacy Tables Updated**: None
- **New Tables Written**: `bn_payment_batch`, `bn_claim_event`
- **Idempotency**: Batch number sequential; duplicate add returns existing assignment
- **Failure Handling**: Partial batch failures isolate failed instructions
- **Audit**: Batch lifecycle logged; approval is immutable

## 10. Payment Issue Service
- **Responsibility**: Issue outbound payments into `cl_cheques*` tables
- **Commands**: `issueBatch`, `issueInstruction`, `cancelPayment`, `reissuePayment`
- **Queries**: `getIssuedPayments`, `getPaymentByInstruction`
- **Validations**: Batch must be APPROVED; instruction must be READY
- **Workflow Hooks**: Issue completion triggers post-issue workflow
- **Notification Hooks**: `bn.issue.started`, `bn.issue.completed`, `bn.issue.failed`
- **Existing Tables Read**: `bn_payment_batch`, `bn_payment_instruction`
- **Legacy Tables Updated**: `cl_cheques` (primary), `cl_cheques_holding`, `cl_cheques_survivor`
- **New Tables Written**: `bn_payment_exception`, `bn_claim_event`
- **Idempotency**: Instruction ID + batch ID prevents duplicate issue
- **Failure Handling**: Failed instructions logged to `bn_payment_exception`; batch continues
- **Audit**: Every issued payment creates immutable audit trail
- **CRITICAL**: Outbound payments written ONLY to `cl_cheques*`. NEVER to `cn_payment*`.

## 11. Post-Issue Service
- **Responsibility**: Orchestrate claim-side and support-table updates after payment issue
- **Commands**: `generatePostIssueTasks`, `executeTask`, `skipTask`, `deferTask`, `retryTask`
- **Queries**: `getPostIssueTasks`, `getPostIssueStatus`
- **Validations**: Payment must be issued; task type applicable to claim
- **Workflow Hooks**: Completion triggers claim closure workflow
- **Notification Hooks**: `bn.postissue.completed`
- **Existing Tables Read**: `bn_payment_instruction`, `cl_cheques`
- **Legacy Tables Updated**: `cl_head`, `cl_wages_credited`, `tb_postal_reg`
- **New Tables Written**: `bn_post_issue_task`, `bn_claim_event`
- **Idempotency**: Task keyed by `instruction_id + task_type`
- **Failure Handling**: Retry up to 3x; terminal failure creates `bn_payment_exception`
- **Audit**: All task transitions logged

## 12. Inquiry Service
- **Responsibility**: Read-only search across modern and legacy claim/payment history
- **Commands**: None (read-only)
- **Queries**: `searchClaims`, `searchDisbursements`, `getClaimDetail`, `getDisbursementDetail`
- **Validations**: PII masking for bank accounts
- **Workflow Hooks**: None
- **Notification Hooks**: None
- **Existing Tables Read**: `bn_claim`, `cl_head`, `cl_cheques`, `cl_cheques_holding`, `cl_cheques_survivor`
- **Legacy Tables Updated**: None
- **New Tables Written**: None (audit log for inquiry access)
- **Idempotency**: N/A (read-only)
- **Failure Handling**: Graceful degradation if legacy tables unavailable
- **Audit**: `INQUIRY_ACCESS` events logged to `bn_claim_event`

## 13. Workflow Integration Service
- **Responsibility**: Bridge BN events to the existing enterprise workflow engine
- **Commands**: `triggerBnWorkflow`, `syncWorkflowEndState`, `routeBnException`
- **Queries**: `checkWorkflowGovernance`, `getWorkflowStatus`
- **Validations**: Workflow definition must exist and be active
- **Existing Tables Read**: `workflow_definitions`, `workflow_instances`, `workflow_tasks`
- **Legacy Tables Updated**: None
- **New Tables Written**: `workflow_instances`, `workflow_tasks` (existing platform tables)
- **Idempotency**: One active workflow per entity
- **Failure Handling**: Fallback to internal transition matrix if workflow unavailable
- **Audit**: Workflow delegation logged to `audit_logs`

## 14. Notification Integration Service
- **Responsibility**: Dispatch BN lifecycle notifications via existing platform notification system
- **Commands**: `dispatchBnNotification`, `retryFailedNotification`
- **Queries**: `getClaimNotificationHistory`, `getBatchNotificationStats`
- **Validations**: Template existence; recipient contact resolution
- **Existing Tables Read**: `notification_templates`, `ip_master`, `profiles`
- **Legacy Tables Updated**: None
- **New Tables Written**: `notification_logs`, `in_app_notifications` (existing platform tables)
- **Idempotency**: Keyed by `event_code:entity_id:minute_bucket`
- **Failure Handling**: 3 retries for email/SMS; in-app always succeeds
- **Audit**: Dispatch events logged to `audit_logs`

## 15. Audit Service
- **Responsibility**: Provide unified audit trail for all BN operations
- **Commands**: None (writes handled by DB triggers and service-level logging)
- **Queries**: `getAuditTrail`, `getClaimEventHistory`, `getDecisionHistory`
- **Validations**: N/A
- **Existing Tables Read**: `audit_logs`, `bn_claim_event`, `bn_claim_decision`
- **Legacy Tables Updated**: None
- **New Tables Written**: None (reads existing audit infrastructure)
- **Idempotency**: N/A (read-only)
- **Failure Handling**: N/A
- **Audit**: Self-referential — audit queries themselves are logged
