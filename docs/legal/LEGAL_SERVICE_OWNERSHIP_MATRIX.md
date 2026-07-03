# Legal Platform — Service Ownership Matrix

**Version:** 1.0

| Service | Purpose | Business Rules Owned | Tables Used | Consumers | Duplicate Logic? | Performance Notes |
|---------|---------|----------------------|-------------|-----------|------------------|-------------------|
| `lgIntakeService` | Intake CRUD + qualification | BR-01 lifecycle, BR-03 checklist gate | `lg_case_intake`, `lg_intake_*` | Intake screen, Referral | None | Paginated 1k chunks |
| `lgReferralService` | Compliance → Legal handoff | BR-02 referral eligibility | `ce_legal_referrals`, `lg_case_intake` | Intake, Compliance | None | Uses index on `ce_legal_referrals.status` |
| `lgCaseService` | Case CRUD + stage transitions | BR-04 stage transition, BR-05 assignment | `lg_case`, `lg_case_*` | All Legal screens | None | Reads via case-scoped hooks |
| `lgLiabilityService` | Liability CRUD + rollup (single source) | BR-08 financial single source | `lg_recoverable_liability`, `lg_*_liability`, `v_lg_case_financials` | Matter, Orders, Recovery, Dashboard | **No — enforced** | View-backed rollups |
| `lgAllocationService` | Payment allocation to liabilities | BR-09 allocation precedence | `lg_payment_allocation`, `lg_payment_arrangement_link` | Recovery, Finance | None | Deterministic order |
| `lgCourtService` | Court/Officer/Venue registry | BR-11 court hierarchy | `lg_court`, `lg_court_*` | Hearings, Filings | None | Cached |
| `lgHearingService` | Hearing lifecycle + prep | BR-12 hearing state machine | `lg_hearing`, `lg_hearing_*` | Court Ops | None | — |
| `lgOrderService` | Order publish + compliance events | BR-13 order lifecycle | `lg_order`, `lg_order_*`, `lg_judgment_compliance` | Enforcement, Recovery | None | Idempotent publish |
| `lgAppealService` | Appeal tracking + liability freeze | BR-14 appeal freeze | `lg_appeal`, `lg_appeal_liability` | Liability | None | — |
| `lgEnforcementService` | Enforcement actions & notices | BR-15 enforcement rules | `lg_enforcement_action`, `lg_notice` | Recovery | None | — |
| `lgRecoveryService` | Post-judgment recovery assignment | BR-16 workload rules | `lg_recovery_*` | Dashboard | None | Officer-index optimized |
| `lgSettlementService` | Settlement + consent orders | BR-17 settlement liability | `lg_settlement`, `lg_consent_*` | Matter, Liability | None | — |
| `lgFeeService` | Fee rules, bundles, waivers, charges | BR-18 fee calc, BR-19 waiver | `lg_fee_*` | Cost, Liability | None | — |
| `lgLegalCostService` | Court/legal cost capture | BR-20 cost recovery | `lg_legal_cost`, `lg_cost_liability` | Liability | None | — |
| `lgExternalCounselService` | Counsel engagement + invoices | — | `lg_external_counsel*` | Cost | None | — |
| `lgDocumentService` | Document link + generation | — | `lg_document_link`, `core_generated_document` | All | None | Proxies via DMS edge fn |
| `lgWorkflowService` | Stage transitions + guards | BR-04, BR-06 doc gates | `lg_workflow_policy`, `lg_stage_*` | Case | None | Policy cached |
| `lgRoutingService` | Intake routing decisions | BR-07 routing precedence | `lg_routing_*` | Intake | None | — |
| `lgSlaService` | SLA breach detection | BR-10 SLA | `lg_sla_policy` | Dashboard | None | — |
| `lgAuditService` | Domain audit writes | — | `lg_*_audit`, `legal_audit_log` | All | None | Fire-and-forget |
