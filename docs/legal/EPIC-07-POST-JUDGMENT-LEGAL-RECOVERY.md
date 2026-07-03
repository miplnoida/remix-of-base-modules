# EPIC-07 — Post-Judgment Legal Recovery Management

Delivers the end-to-end lifecycle for monitoring, managing and concluding
recoveries after a court judgment or consent order has been obtained.
Extends (never duplicates) the EPIC-06 foundation
(`lg_recoverable_liability`, `lg_recovery_assignment`, `lg_order`,
`lg_enforcement_action`, `lg_settlement`, DMS, `Liability360Drawer`,
`useLgAccess`).

Deterministic rules only — **no AI, no mock data, no admin collections
logic**.

---

## 1. Scope

| Area | Delivered |
|------|-----------|
| Judgment Compliance monitoring | ✅ `lg_judgment_compliance` + engine + tab |
| Consent Orders + installments + variations | ✅ `lg_consent_order*` + breach detector |
| Legal Settlements (extended state machine) | ✅ `settlementEngine.ts` |
| External Counsel (firms, engagements, invoices) | ✅ `lg_external_counsel*` + tab |
| Court Filings lifecycle | ✅ `lg_court_filing` + engine + tab |
| Legal Costs (fees, execution, service) | ✅ `lg_legal_cost` + engine + tab |
| Post-Judgment Recovery Workspace | ✅ `/legal/lg/post-judgment/:caseId` |
| Legal Recovery Dashboard (20 KPIs) | ✅ `/legal/lg/legal-recovery-dashboard` |
| Matter Workspace integration | ✅ `PostJudgmentSnapshotStrip` |
| Recovery Assignment integration | ✅ `LegalRecoveryContextPanel` |
| Permissions + audit + timeline | ✅ 12 new capabilities; `lg_case_activity` |

---

## 2. Data model (Phase 1 migration)

New public tables (all with GRANTs + audit + `updated_at` trigger):

- `lg_judgment_compliance` — one row per JUDGMENT-type `lg_order`.
- `lg_consent_order`, `lg_consent_installment`, `lg_consent_variation`.
- `lg_external_counsel`, `lg_external_counsel_engagement`,
  `lg_external_counsel_invoice`.
- `lg_court_filing` (DRAFT → FILED → SERVED → ACCEPTED/REJECTED).
- `lg_legal_cost` (recoverable + recovered per liability).
- Junctions: `lg_consent_liability`, `lg_filing_liability`,
  `lg_cost_liability`.
- Audit: `lg_judgment_compliance_audit`, `lg_consent_order_audit`,
  `lg_court_filing_audit`, `lg_legal_cost_audit`. New
  `lg_case_activity` event types.

---

## 3. Services (Phase 2)

Located in [`src/services/legal/postJudgment/`](../../src/services/legal/postJudgment):

| File | Responsibility |
|------|----------------|
| `judgmentComplianceEngine.ts` | CRUD + close-guard rule |
| `consentOrderEngine.ts` | Schedule generation + missed-installment detection |
| `settlementEngine.ts` | Extends `lgSettlementService` states |
| `courtFilingEngine.ts` | Filing lifecycle |
| `externalCounselEngine.ts` | Engagements & invoices |
| `legalCostEngine.ts` | Cost aggregation + recovery |
| `legalRecoveryHealthEngine.ts` | 10 health statuses |
| `nextLegalActionEngine.ts` | Deterministic next-action resolver |
| `statutoryDeadlineEngine.ts` | Appeal / limitation deadlines |
| `legalWorkflowEngine.ts` | Sequences filings & counsel actions |
| `postJudgmentSnapshotService.ts` | Composite per-case snapshot |
| `legalRecoveryDashboardService.ts` | 20 portfolio KPIs |
| `lgAssignmentLegalContextService.ts` | Assignment → primary case resolver |

---

## 4. UI (Phases 3-5)

- **Workspace** `LgPostJudgmentWorkspace.tsx` — 7 tabs (Overview,
  Judgment Compliance, Consent Orders, Settlements, Court Filings,
  External Counsel, Legal Costs). All liability chips open
  `Liability360Drawer`.
- **Dashboard** `LgLegalRecoveryDashboard.tsx` — 20 KPI cards with
  deep-links.
- **Matter Workspace** — `PostJudgmentSnapshotStrip` inserted below the
  financial header in `LgCaseDetail`.
- **Recovery Assignment Workspace** — `LegalRecoveryContextPanel`
  surfaces current judgment / consent / settlement / enforcement /
  filing + next legal action.

Hook: `usePostJudgmentSnapshot(caseId)` — React Query wrapper.
Route registered in `AppRoutes.tsx`; sidebar entry added via
`app_modules` migration under **Legal Recovery**.

---

## 5. Permissions

Twelve capabilities added to `useLgAccess.ts` (see
[LEGAL_PERMISSION_MATRIX.md](./LEGAL_PERMISSION_MATRIX.md#epic-07--post-judgment-legal-recovery)):

`viewLegalRecoveryDashboard`, `viewJudgmentCompliance`,
`manageJudgmentCompliance`, `overrideComplianceClosure`,
`manageConsentOrder`, `approveConsentOrder`, `manageLegalSettlement`,
`approveLegalSettlement`, `manageEnforcementMonitoring`,
`manageCourtFiling`, `manageExternalCounsel`, `manageLegalCost`.

---

## 6. Future enhancements (deferred)

- External counsel performance analytics (win-rate, avg cost per matter).
- AI-assisted settlement scoring (out of scope — no AI in EPIC-07).
- Court-fee-schedule sync from an authoritative registry.
- Automated statutory-deadline calendar sync (ICS).
