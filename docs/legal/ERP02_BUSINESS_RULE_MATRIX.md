# ERP-02 · Business Rules Matrix

Central catalogue of deterministic business rules enforced by the Legal
module. Each rule has a **single owning service** — no duplicate or
conflicting implementation across the codebase.

| # | Rule | Business purpose | Owning service | Trigger | Validation | Screens affected | Duplicate? | Conflict? |
|---|---|---|---|---|---|---|---|---|
| BR-01 | Legal case status transitions | Enforce case lifecycle | `services/legal/legalCaseStateMachine.ts` | Any status/stage write | `assertLegalCaseTransition` throws on invalid | LgCaseDetail, LgCaseEdit | No | No |
| BR-02 | Referral state transitions | Enforce referral lifecycle | `services/legal/lgReferralStateMachine.ts` | Referral action | `assertTransition` | Referrals Workbench, Case source-link | No | No |
| BR-03 | Order state transitions | Judicial order lifecycle | `services/legal/lgOrderStateMachine.ts` | Order action | State check + permission | Case Detail Orders | No | No |
| BR-04 | Hearing state transitions | Hearing lifecycle | `services/legal/lgHearingStateMachine.ts` | Hearing action | State check | Hearings screens | No | No |
| BR-05 | Settlement state transitions | Settlement lifecycle | `services/legal/lgSettlementStateMachine.ts` | Settlement action | State check + approver | Case Detail Settlements | No | No |
| BR-06 | Capability gate — all mutations | Role-based authorisation | `hooks/legal/useLegalCapability.ts` + `useLgAccess.ts` | Every UI action | `access.can(...)` + service re-check | All Legal screens | No | No |
| BR-07 | Route gating | Screen-level access control | `config/legalRouteCapabilities.ts` + `LegalRouteGuard` | Route navigation | Cap lookup | All /legal/* routes | No | No |
| BR-08 | Recoverable liability arithmetic | Single financial source of truth | `lg_recoverable_liability` + `v_lg_case_financials` (view) | Any liability write | DB constraint + view aggregation | Case Recovery, Analytics | No | No |
| BR-09 | Fee master resolution | Statutory fee amounts | `services/legal/lgFeeMaster.ts` per `LEGAL_FEE_MASTER_POLICY.md` | Cost line creation | Master lookup + effective date | Fees admin, Order/Cost lines | No | No |
| BR-10 | SLA due-date computation | SLA tracking & escalation | `services/legal/lgSlaService.ts` | Referral/case create + stage change | Rule table + business calendar | Dashboards, Workbench | No | No |
| BR-11 | Assignment routing | Fair caseload distribution | RPC `lg_assign_case` + `services/legal/assignmentEngine` | Assign / reassign | Team/skill/caseload | Assignment console, Case detail | No | No |
| BR-12 | Notice template resolution | Correct statutory letter | `services/legal/lgNoticeService.ts` + `stage_template_mapping` | Draft notice | Template active + party type | Notices tab | No | No |
| BR-13 | Confidentiality gate | Restrict privileged docs | `LegalCaseDocumentsTab` + `useLgAccess.can('viewConfidentialDocuments')` | Document render/download | Level ≥ RESTRICTED requires cap | Documents tab, DocumentCenter | No | No |
| BR-14 | Referral escalation | SLA breach → priority raise | `services/legal/referralLifecycleService.escalateReferral` | Manual or SLA rule | Non-terminal state | Referrals Workbench | No | No |
| BR-15 | Case closure requires clearance | No open notices/hearings/orders | `legalCaseStateMachine` closure guard | `closeCase` | Sub-state check | Case Detail | No | No |
| BR-16 | Payment arrangement link | Recovery via PA plan | `services/legal/lgPaymentArrangementService` | Link PA | PA active + not linked elsewhere | Case Recovery | No | No |
| BR-17 | Cost recovery write-off approval | Manager approval for write-offs | Approval workflow + capability `approveCostWriteOff` | Officer requests write-off | Approver role + reason | Cost lines, Approvals | No | No |
| BR-18 | Matter workspace aggregation | Unified banner across screens | `hooks/legal/useLegalMatterWorkspace.ts` | Screen mount | Service-driven, capability-aware | All matter screens | No | No |
| BR-19 | Audit mirroring | Referral↔Case event mirroring | `mirrorReferralEventToCase` | Referral mutation | Referral has case link | Case timeline | No | No |
| BR-20 | Integrity checks | Cross-table consistency | `services/legal/integrity/*` | Manual or scheduled | Orphan / cycle / duplicate detection | Admin integrity screens | No | No |

## Ownership discipline

- Every mutating action goes through a state-machine helper **and** a
  capability check. No component performs raw `supabase.from(...).update()`
  on `status_code`, `current_stage_code`, `assigned_officer_id`, or
  `legal_status` fields without routing through the owning service.
- Financial aggregation is single-source (BR-08): the `v_lg_case_financials`
  view added by ERP-01 is the only cross-liability aggregation surface.
  No component re-implements totals.
- Fee arithmetic is single-source (BR-09): all cost lines read from
  `lg_fee_master` via `lgFeeMaster.ts`.

## Conflicts found

None. Prior audits (`LEGAL_RELATIONSHIP_AUDIT.md`,
`LEGAL_FINANCIAL_ARCHITECTURE_VALIDATION.md`) confirm zero duplicate
junctions, zero orphaned business rules, and single-source financial logic.

## Reviewer rule

Any PR that writes to a state column or a financial column **without** going
through the owning service must be rejected. This rule is enforced in the
Legal state-machine docs and reiterated here as the certification standard.
