

# Enterprise Benefit Management Module -- Architecture and Build Plan

## 1. Current State Assessment

The existing system has **three overlapping benefit code paths**, none fully production-ready:

| Path | Location | State |
|------|----------|-------|
| **Legacy Benefits** | `src/pages/benefits/` | Static forms (AgeBenefitForm, SicknessBenefitForm, etc.) with hardcoded fields. No database tables, no workflow. |
| **NBenefit** | `src/pages/nbenefit/` | Config-driven rule editor with `BenefitRuleSet` types, mock data service (`benefitRulesConfigService`), eligibility/calculation engine stubs. No DB tables. |
| **NewBenefit** | `src/pages/newBenefit/` | Claim 360, Intake Console, Medical Board Hub, Payments Module. All mock-data-driven (`newBenefitService.ts` uses `MockDataStore`). Separate auth context (`NewBenefitAuthContext`) with hardcoded users. |

**Existing infrastructure that the module must integrate with:**
- `ip_master` / `tmp_ip_master` -- Insured Person registry (SSN-based)
- `er_master` -- Employer registry
- `ip_wages` / `c3_*` tables -- Contribution and wage data
- `workflow_definitions` / `workflow_instances` / `workflow_steps` -- Generic workflow engine with maker-checker
- `system_audit_trail` with `fn_audit_row_change` triggers
- `notification_templates` -- Claim notification templates already seeded
- `cn_receipt` / `cn_batch` -- Cash/payment infrastructure
- Entity resolution RPCs (`resolve_entity_type`, `validate_entity`)
- Document Configuration system (`module_doc_config`, `module_doc_child_docs`)
- Role-based permissions via `user_roles` table and `PermissionWrapper`

**Key finding**: No benefit/claim database tables exist yet. Everything is mock data.

---

## 2. Target Module Architecture

```text
+-----------------------------------------------------------------------+
|                     BENEFIT MANAGEMENT MODULE                          |
|-----------------------------------------------------------------------|
|  CONFIGURATION LAYER (Admin-managed, effective-dated)                  |
|  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  |
|  │ Benefit      │ │ Eligibility  │ │ Calculation  │ │ Document     │  |
|  │ Products     │ │ Rules        │ │ Rules        │ │ Rules        │  |
|  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  |
|  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   |
|  │ Workflow     │ │ Timeline     │ │ Country      │                   |
|  │ Bindings     │ │ Rules        │ │ Packs        │                   |
|  └──────────────┘ └──────────────┘ └──────────────┘                   |
|-----------------------------------------------------------------------|
|  OPERATIONAL LAYER                                                     |
|  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  |
|  │ Intake &     │ │ Claim        │ │ Eligibility  │ │ Calculation  │  |
|  │ Registration │ │ Processing   │ │ Engine       │ │ Engine       │  |
|  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  |
|  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  |
|  │ Award        │ │ Payment      │ │ Post-Award   │ │ Medical      │  |
|  │ Management   │ │ Processing   │ │ Servicing    │ │ Board        │  |
|  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  |
|-----------------------------------------------------------------------|
|  INTEGRATION LAYER                                                     |
|  ip_master ←→ Claims | er_master ←→ Verification | Workflows ←→ Steps|
|  cn_receipt ←→ Payments | Audit Trail | Notifications | Documents     |
+-----------------------------------------------------------------------+
```

---

## 3. Bounded Contexts / Submodules

| # | Submodule | Responsibility |
|---|-----------|---------------|
| 1 | **Benefit Product Catalog** | Define benefit types, versions, country packs. Config-driven master for all downstream logic. |
| 2 | **Eligibility Engine** | Evaluate rules from catalog against contributor data (`ip_master`, `ip_wages`, `c3_*`). Produce explainable pass/fail results. |
| 3 | **Claim Lifecycle** | Intake (paper/walk-in/online), claim registration, status tracking, document collection, workflow progression. |
| 4 | **Calculation Engine** | Compute benefit amounts using formula/tier/table rules from catalog. Produce audit-traceable calculation sheets. |
| 5 | **Award Management** | Create awards from approved claims. Manage start/end dates, suspensions, cessations, reviews, COLA adjustments. |
| 6 | **Payment Processing** | Generate payment instructions from active awards. Batch processing, bank file export, reconciliation. Integrates with existing `cn_*` tables. |
| 7 | **Post-Award Servicing** | Life certificates, medical reviews, proof-of-life, student certifications, overpayment recovery. |
| 8 | **Medical Board** | Referrals, scheduling, assessments, disability ratings. Links to claim workflow. |
| 9 | **Service Cases** | Cross-benefit inquiries, complaints, change requests, appeals. |

---

## 4. Database Schema (Table Prefix: `bn_`)

### Core Tables

```sql
-- Benefit Product Catalog (config-driven, effective-dated)
bn_product                -- Benefit type definitions (versioned)
bn_product_version        -- Version history with effective dates
bn_eligibility_rule       -- Rules per product version (JSON rule definition)
bn_calculation_rule       -- Formulas, tiers, rate tables per version
bn_timeline_rule          -- Waiting periods, durations, deadlines per version
bn_document_rule          -- Required docs per product (links to module_doc_config)
bn_country_pack           -- Country-specific parameter overrides

-- Claim Lifecycle
bn_claim                  -- Main claim record (SSN, product_id, status, dates)
bn_claim_detail           -- Benefit-specific data as JSONB (not per-type tables)
bn_claim_document         -- Documents attached to claim
bn_claim_event            -- Status transitions, actions, audit trail
bn_claim_eligibility      -- Eligibility check snapshots (explainable)
bn_claim_calculation      -- Calculation snapshots (explainable)
bn_claim_note             -- Officer notes, correspondence log

-- Award & Payment
bn_award                  -- Approved benefit awards (amount, period, status)
bn_award_beneficiary      -- Beneficiaries on an award (survivors, dependents)
bn_award_review           -- Scheduled reviews (medical, proof-of-life)
bn_payment_instruction    -- Individual payment records from awards
bn_payment_batch          -- Batch grouping for payment runs
bn_overpayment            -- Overpayment tracking and recovery

-- Medical Board
bn_medical_referral       -- Referral from claim to medical board
bn_medical_assessment     -- Assessment results, disability ratings

-- Service Cases
bn_service_case           -- Cross-cutting inquiries, appeals, complaints
bn_service_case_event     -- Case progression history
```

### Key Design Decisions

- **`bn_claim_detail`** uses a single table with `detail_json JSONB` rather than per-benefit-type child tables. The schema for `detail_json` is driven by the `bn_product` configuration. This makes it country-extensible.
- **Effective dating**: `bn_product_version` has `effective_from` / `effective_to`. When processing a claim, the system resolves the version active at `claim_date`.
- **All audit fields**: `entered_by VARCHAR(50)` (user_code), `modified_by`, `entered_at`, `modified_at` on every table.
- **No RLS** per project standards. Role-based security via `PermissionWrapper` and `useActionPermissions`.
- **Workflow integration**: `bn_claim` references `workflow_instances` via `source_module = 'bn_claim'` and `source_record_id = claim_id`. No custom workflow tables -- reuse existing engine.

### Legacy Compatibility

- `bn_claim.ssn` joins to `ip_master.ssn` for contributor data
- `bn_claim.employer_regno` joins to `er_master.regno` for employer verification
- Contribution lookups query `ip_wages` for wage history and `c3_*` for contribution records
- Existing `cn_receipt` / `cn_batch` tables used for actual payment settlement
- Legacy claims (if any exist in external systems) can be imported into `bn_claim` with `source = 'LEGACY'` and `legacy_ref` fields

---

## 5. Folder / Module Structure

```text
src/
├── pages/
│   └── bn/                              -- All benefit screens
│       ├── config/                      -- Admin configuration
│       │   ├── ProductCatalog.tsx        -- List/manage benefit products
│       │   ├── ProductEditor.tsx         -- Edit product with tabbed config
│       │   ├── CountryPacks.tsx          -- Country parameter packs
│       │   └── CalculationSimulator.tsx  -- Test calculations
│       ├── intake/                      -- Claim intake
│       │   ├── IntakeConsole.tsx         -- Paper/walk-in intake
│       │   ├── ClaimRegistration.tsx     -- Register new claim
│       │   └── OnlineApplications.tsx   -- Online submissions queue
│       ├── claims/                      -- Claim processing
│       │   ├── ClaimWorklist.tsx         -- Officer worklist
│       │   ├── Claim360.tsx             -- Full claim view
│       │   ├── EligibilityReview.tsx    -- Eligibility check screen
│       │   └── CalculationReview.tsx    -- Calculation review screen
│       ├── awards/                      -- Award management
│       │   ├── AwardRegistry.tsx        -- Active awards list
│       │   ├── AwardDetail.tsx          -- Single award detail
│       │   ├── PensionAdmin.tsx         -- Long-term pension management
│       │   └── ReviewSchedule.tsx       -- Upcoming reviews
│       ├── payments/                    -- Benefit payments
│       │   ├── PaymentBatch.tsx         -- Batch creation and processing
│       │   ├── PaymentHistory.tsx       -- Payment history search
│       │   └── Overpayments.tsx         -- Overpayment recovery
│       ├── medical/                     -- Medical board
│       │   ├── ReferralQueue.tsx
│       │   └── AssessmentForm.tsx
│       └── service/                     -- Service cases
│           ├── CaseList.tsx
│           └── CaseDetail.tsx
├── components/
│   └── bn/                              -- Reusable benefit components
│       ├── config/                      -- Config tab components
│       │   ├── EligibilityRuleBuilder.tsx
│       │   ├── CalculationRuleBuilder.tsx
│       │   ├── FormulaEditor.tsx
│       │   └── TimelineRuleEditor.tsx
│       ├── claim/                       -- Claim UI components
│       │   ├── ClaimHeader.tsx
│       │   ├── ClaimTimeline.tsx
│       │   ├── EligibilityResultCard.tsx
│       │   ├── CalculationSheet.tsx
│       │   └── DynamicClaimForm.tsx      -- Form generated from product config
│       ├── award/
│       │   ├── AwardSummaryCard.tsx
│       │   └── BeneficiaryTable.tsx
│       └── shared/
│           ├── BenefitBadge.tsx
│           ├── ContributorLookup.tsx     -- SSN lookup using ip_master
│           └── ContributionSummary.tsx   -- Contribution history from ip_wages
├── services/
│   └── bn/
│       ├── claimService.ts              -- CRUD for bn_claim via Supabase
│       ├── productService.ts            -- CRUD for bn_product catalog
│       ├── eligibilityEngine.ts         -- Client-side eligibility evaluation
│       ├── calculationEngine.ts         -- Client-side calculation evaluation
│       ├── awardService.ts              -- Award CRUD
│       └── paymentService.ts            -- Payment batch operations
├── hooks/
│   └── bn/
│       ├── useBnClaim.ts                -- React Query hooks for claims
│       ├── useBnProduct.ts              -- Product catalog hooks
│       ├── useBnEligibility.ts          -- Eligibility check hook
│       ├── useBnCalculation.ts          -- Calculation hook
│       └── useBnAward.ts               -- Award hooks
└── types/
    └── bn.ts                            -- All benefit module types
```

### Cleanup Plan for Existing Code

| Existing Path | Action |
|---|---|
| `src/pages/benefits/` | Keep temporarily. Add redirect banners to new module. Deprecate in Phase 3. |
| `src/pages/nbenefit/` | Migrate config editor patterns into `src/pages/bn/config/`. Types from `benefitRulesConfig.ts` become the basis for `bn_product` schema. |
| `src/pages/newBenefit/` | Migrate Claim360, IntakeConsole, MedicalBoardHub patterns. Replace mock services with Supabase queries. Remove `NewBenefitAuthContext` -- use main auth. |
| `src/services/newBenefitService.ts` | Delete after migration. Replace with `src/services/bn/claimService.ts`. |
| `src/types/newBenefit.ts` | Consolidate into `src/types/bn.ts`. |
| `src/types/benefitRulesConfig.ts` | Merge into `src/types/bn.ts` under product config types. |
| `src/types/benefitsWorkflow.ts` | Delete. Use generic workflow engine types. |

---

## 6. Main Screens and Capabilities

### Configuration (Admin)

| Screen | Capability |
|--------|-----------|
| Product Catalog | List all benefit products with status, category, version. Add/clone/archive. |
| Product Editor | 7-tab editor: Definition, Eligibility Rules, Calculation Rules, Timelines, Documents, Workflow, Test/Preview. Evolved from existing `BenefitRuleEditor`. |
| Country Packs | Manage country-specific parameter sets (rates, thresholds, currencies). SKN as first pack. |
| Calculation Simulator | Test calculation formulas against sample data before activation. |

### Operations (Staff)

| Screen | Capability |
|--------|-----------|
| Intake Console | Receive paper/walk-in/online applications. Scan, index, create claim record. |
| Claim Registration | SSN lookup, product selection, dynamic form based on product config, document checklist. |
| Claim Worklist | Role-filtered queue of claims requiring action. Sort by SLA, priority, benefit type. |
| Claim 360 | Complete claim view: contributor profile, contribution history, eligibility result, calculation sheet, documents, workflow timeline, notes. |
| Eligibility Review | Detailed pass/fail breakdown with explainable rule evaluation. Override capability with maker-checker. |
| Calculation Review | Step-by-step calculation breakdown. Variables, formula, result. Officer can adjust with justification. |
| Award Registry | All active awards. Filter by benefit type, status, payment method. |
| Award Detail | Award lifecycle: activation, suspension, cessation, COLA adjustment, beneficiary management. |
| Payment Batch | Create payment runs, generate bank files, mark as paid. Links to existing `cn_*` tables. |
| Medical Board | Referral queue, assessment forms, disability rating entry. |
| Service Cases | Cross-benefit inquiries, appeals, change requests. |

### Self-Service (Contributor Portal -- future)

| Screen | Capability |
|--------|-----------|
| Apply for Benefit | Online application with product-driven dynamic form. |
| My Claims | Track claim status, upload documents. |
| My Payments | View payment history. |

---

## 7. Technical Approach for Legacy Integration

### Contributor Data
- All claims reference `ip_master.ssn`. No duplication of person data.
- `ContributorLookup` component queries `ip_master` for SSN search.
- `ContributionSummary` component queries `ip_wages` grouped by period for eligibility checks.

### Contribution Verification
- Eligibility engine queries `ip_wages` directly:
  - Total weeks: `SELECT COUNT(*) FROM ip_wages WHERE ssn = ?`
  - Recent weeks: `SELECT COUNT(*) FROM ip_wages WHERE ssn = ? AND week_ending >= ?`
  - Average earnings: `SELECT AVG(wages) FROM ip_wages WHERE ssn = ? AND week_ending BETWEEN ? AND ?`
- These become RPCs: `bn_get_contribution_summary(p_ssn, p_from_date, p_to_date)`

### Employer Verification
- `bn_claim.employer_regno` links to `er_master.regno`
- Employment verification requests create workflow tasks for employer liaison role

### Payment Settlement
- `bn_payment_instruction` generates records that feed into existing `cn_receipt` / `cn_batch` for actual disbursement
- Alternatively, benefit payments use their own `bn_payment_batch` with bank file export, reconciled separately

### Legacy Data Import
- `bn_claim` includes `source VARCHAR DEFAULT 'NEW'` and `legacy_claim_ref TEXT`
- Import script can populate historical claims with `source = 'LEGACY'` for continuity reporting

---

## 8. Phased Build Plan

### Phase 1: Foundation (Database + Product Catalog + Claim Registration)
**Tables**: `bn_product`, `bn_product_version`, `bn_eligibility_rule`, `bn_calculation_rule`, `bn_timeline_rule`, `bn_document_rule`, `bn_claim`, `bn_claim_detail`, `bn_claim_document`, `bn_claim_event`, `bn_claim_eligibility`, `bn_claim_calculation`, `bn_claim_note`

**Screens**: Product Catalog, Product Editor (migrate from `BenefitRuleEditor`), Claim Registration, Claim Worklist, Claim 360 (migrate from `Claim360View`)

**Engines**: Eligibility Engine (client-side evaluation against rules from `bn_eligibility_rule`), Calculation Engine (formula/tier evaluation)

**Integration**: `ip_master` lookup, `ip_wages` contribution queries, workflow binding for claim approval, audit triggers on all `bn_*` tables

### Phase 2: Awards + Payments + Medical Board
**Tables**: `bn_award`, `bn_award_beneficiary`, `bn_award_review`, `bn_payment_instruction`, `bn_payment_batch`, `bn_medical_referral`, `bn_medical_assessment`

**Screens**: Award Registry, Award Detail, Payment Batch, Medical Board Queue, Assessment Form

**Integration**: Payment batch to `cn_*` tables, notification triggers for award activation/suspension

### Phase 3: Post-Award Servicing + Service Cases + Cleanup
**Tables**: `bn_overpayment`, `bn_service_case`, `bn_service_case_event`, `bn_country_pack`

**Screens**: Post-Award Review Schedule, Overpayment Recovery, Service Cases, Country Pack Manager

**Cleanup**: Deprecate `src/pages/benefits/`, `src/pages/nbenefit/`, `src/pages/newBenefit/`. Remove `NewBenefitAuthContext`, `newBenefitService.ts`, mock data files.

### Phase 4: Self-Service Portal + Analytics
**Screens**: Online application portal, contributor claim tracking, payment history dashboard, benefit analytics/reporting

---

## 9. Assumptions and Open Questions

### Assumptions
1. No existing benefit/claim data in the database -- all current screens use mock data. We are building the persistence layer from scratch.
2. The existing workflow engine (`workflow_definitions`, `workflow_steps`, `workflow_instances`) is mature enough to handle benefit claim workflows via workflow bindings.
3. `ip_wages` contains accurate contribution history sufficient for eligibility checks. No secondary contribution source.
4. The `cn_*` (cashier/payment) tables can be used for benefit disbursement, or benefit payments will be tracked separately with bank file export.
5. SKN Social Security Act rules as defined in existing `benefitRulesConfig.ts` types are the correct rule model for Phase 1.
6. All benefit rules are stored as configuration data -- no hardcoded business rules in screens.
7. `user_code` (VARCHAR 50) is used for all audit fields per existing standards.

### Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | **Are there legacy claim records in an external system (MS-SQL) that need to be imported?** If yes, we need an import script and `legacy_claim_ref` mapping. |
| 2 | **Should benefit payments go through the existing `cn_receipt`/`cn_batch` cashier flow, or have a separate payment channel?** This affects whether we create `bn_payment_batch` or integrate with `cn_batch`. |
| 3 | **Is the Medical Board module a standalone bounded context or embedded within benefits?** Current `MedicalBoardHub` is under `newBenefit` -- should it be its own top-level module? |
| 4 | **What is the intended claim numbering scheme?** e.g., `BN-SICK-2026-00001` or a flat sequence? |
| 5 | **Are there specific SKN legislative amendments that require versioned rules retroactively?** This determines whether the version-resolution logic needs backdating support. |
| 6 | **Should the online application portal be public (unauthenticated) or require contributor login?** Affects route placement and security model. |
| 7 | **What is the expected volume?** (claims/month, active awards) -- affects pagination strategy and whether we need materialized views for dashboards. |

