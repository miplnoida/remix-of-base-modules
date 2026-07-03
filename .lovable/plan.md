
# EPIC-07 – Post-Judgment Legal Recovery Management

This is a very large EPIC (20 parts). To keep quality high and avoid a single monolithic drop that risks breaking earlier epics, I will deliver it in **6 sequenced phases**. Each phase is independently shippable, typecheck-clean, and builds on the EPIC-06 foundation (`lg_recoverable_liability`, `lg_recovery_assignment`, `lg_order`, `lg_enforcement_action`, `lg_settlement`, DMS, Liability360Drawer, `useLgAccess`).

**Non-negotiables (apply to every phase):**
- Reuse existing services/tables — no duplicates of EPIC-06 domains.
- No AI, no mock data, no admin collections logic.
- All new public tables get GRANTs + audit triggers, no RLS (per project policy).
- Every new capability added to `useLgAccess.ts` and permission matrix doc.
- Deep-link every KPI. Use `Liability360Drawer` everywhere liabilities appear.

---

## Phase 1 — Data Foundation (Parts 2, 3, 7, 8, 9, 15, 18)

**DB migration** (single migration, non-destructive, additive):
- `lg_judgment_compliance` — one row per judgment (extends `lg_order` where `order_type='JUDGMENT'`), tracks ordered/interest/costs, compliance_status, due_date, evidence, officer, partial_compliance_amount.
- `lg_consent_order` + `lg_consent_installment` + `lg_consent_variation` — schedule, installments, missed count, variation requests.
- `lg_external_counsel` (law firm), `lg_external_counsel_engagement` (per matter), `lg_external_counsel_invoice`.
- `lg_court_filing` (application/affidavit/motion/appeal/variation/execution) with status lifecycle: DRAFT → FILED → SERVED → ACCEPTED/REJECTED.
- `lg_legal_cost` (court fees, attorney fees, execution, service, interest awarded) with `liability_id` link + `recovered_amount`.
- Junction: `lg_settlement_liability` already exists; add `lg_consent_liability`, `lg_filing_liability`, `lg_cost_liability`.
- Audit trigger reuse: extend `lg_case_activity` types, add `lg_judgment_compliance_audit`, `lg_consent_order_audit`, `lg_court_filing_audit`, `lg_legal_cost_audit`.
- GRANTs to `authenticated` + `service_role`.

**Capabilities added to `useLgAccess.ts`:**
`viewLegalRecoveryDashboard`, `viewJudgmentCompliance`, `manageJudgmentCompliance`, `overrideComplianceClosure`, `manageConsentOrder`, `approveConsentOrder`, `manageLegalSettlement`, `approveLegalSettlement`, `manageEnforcementMonitoring`, `manageCourtFiling`, `manageExternalCounsel`, `manageLegalCost`.

**Types:** `src/types/legal/postJudgment.ts` (unified).

## Phase 2 — Core Services (Parts 2-9, 13)

- `lgJudgmentComplianceService.ts` — CRUD + close-guard rule (all liabilities resolved OR override capability).
- `lgConsentOrderService.ts` + `lgConsentBreachDetector.ts` — schedule generation, missed-installment detection, breach recommendations (Enforcement / Variation / Court Application) — deterministic rules only.
- `lgLegalSettlementService.ts` — extends existing `lgSettlementService` state machine with new states (Negotiation, Board Review, Court Approval Required, Court Approved, Executed).
- `lgEnforcementMonitoringService.ts` — wraps `lgEnforcementService`, adds lifecycle telemetry + agency tracking.
- `lgCourtFilingService.ts`, `lgExternalCounselService.ts`, `lgLegalCostService.ts`.
- `lgRecoveryHealthEngine.ts` (new statuses): Healthy, ComplianceDue, ComplianceOverdue, ConsentBreached, SettlementBreached, EnforcementDelayed, AwaitingCourt, AwaitingCounsel, HighRisk, Completed. Deterministic next-action resolver.
- `lgLegalRecoveryDashboardService.ts` — aggregates 20 KPIs from real tables (no mocks). Deep-link params returned per KPI.

## Phase 3 — Post-Judgment Recovery Workspace (Parts 10, 14, 17)

- New page `LgPostJudgmentWorkspace.tsx` at `/legal/lg/post-judgment/:caseId` with tabs:
  Overview · Judgment Compliance · Consent Orders · Settlements · Enforcement · Court Filings · External Counsel · Legal Costs · Documents · Timeline · Audit.
- Tab components under `src/components/legal/post-judgment/`:
  `JudgmentComplianceTab`, `ConsentOrdersTab`, `LegalSettlementsTab`, `EnforcementMonitoringTab`, `CourtFilingsTab`, `ExternalCounselTab`, `LegalCostsTab`, `PostJudgmentTimelineTab`, `PostJudgmentAuditTab`.
- Timeline events wired via existing `lgUnifiedTimelineService` — add new event types (Part 14 list).
- Documents tab renders existing DMS list filtered by post-judgment doc types (no duplication).
- All liability chips use `Liability360Drawer`.

## Phase 4 — Legal Recovery Dashboard (Parts 1, 16)

- `LgLegalRecoveryDashboard.tsx` at `/legal/lg/legal-recovery-dashboard`.
- 20 KPI cards (Part 1). Deep-link each to filtered workbench.
- Executive dashboard section (Part 16): Recovery by Fund/Matter/Territory/Court/Judge/Officer/Counsel; Settlement Success %, Enforcement Success %, Compliance Rate, Avg Recovery Time, Outstanding.
- Charts use existing `recharts` primitives.
- Sidebar entry inserted into `app_modules` (Legal Recovery section) via migration.

## Phase 5 — Cross-Module Integration (Parts 11, 12)

- **Matter Workspace (`LgCaseDetail`):** add `PostJudgmentSnapshotStrip` showing Active Judgment, Compliance %, Settlement Status, Consent Status, Enforcement Status, Legal Costs, Counsel, Filings, Recovery Progress.
- **Recovery Assignment Workspace (`LgRecoveryAssignmentWorkspace`):** add `LegalRecoveryContextPanel` — Current Judgment / Consent / Settlement / Enforcement / Filing, Next Court Action, Next Compliance Review, Next Legal Action, Legal Recovery Health.
- New service `lgAssignmentLegalContextService.ts` to resolve "current" instruments (deterministic priority order).

## Phase 6 — Documentation, Permissions Doc, UAT (Parts 15, 19, 20)

- Create `docs/legal/EPIC-07-POST-JUDGMENT-LEGAL-RECOVERY.md`.
- Update `docs/legal/LEGAL_PERMISSION_MATRIX.md` with 12 new capabilities.
- Append `docs/legal/EPIC-06-UAT-SCENARIOS.md` with EPIC-07 UAT flows.
- Update `docs/legal/EPIC-06D-RECOVERY-ASSIGNMENT.md` with legal-context panel note.
- Update architecture note (`docs/legal/LEGAL_ENTERPRISE_READINESS_REPORT.md`) — bump post-judgment maturity to 10.0.
- Run `bunx tsgo --noEmit` at end of every phase; final closure returns file inventory, DB changes, integrations, remaining future enhancements (e.g. counsel performance analytics, AI settlement scoring — deferred).

---

## Delivery model

Because of the size, I will **execute Phase 1 (DB + types + capabilities) now** as one migration + one code batch, then proceed phase-by-phase in subsequent turns. Each phase ends with a typecheck and short delivery note. This keeps every credit-turn reviewable and every migration approvable in isolation.

**Approve this plan and I'll start with Phase 1 (database migration + capability/type foundation).**
