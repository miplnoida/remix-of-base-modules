# Implementation Readiness Model (Epic 0.36A.2)

**Status:** Architecture and planning only. No code, schema, routes, hooks, services, APIs, app_modules, menus, feature flags, or permissions are changed by this epic.

Combines the capability model, dependency graph, and application matrix into a readiness scorecard and roadmap. Anchors the decision to keep the **Benefit Product Builder on hold** until specific prerequisites are met.

Readiness scale for every column: **✅ Ready** · **🟡 Partial** · **🔴 Not started** · **N/A**.

---

## 1. Capability readiness scorecard

| Capability | Architecture | Shared Domain | Shared Service | Organisation | Platform | Impl. Ready | Dependency Status | Priority | Suggested Epic | Suggested Sprint |
|---|---|---|---|---|---|---|---|---|---|---|
| Identity Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear | P0 | Done | — |
| Authorisation & Role Management | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | Cap-model refactor pending | P0 | 0.37 | S1 |
| Reference Data Administration | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | SSP extraction pending | P0 | 0.36D | S1 |
| Legal Reference Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | SSP extraction pending | P0 | 0.36C/D | S1–S2 |
| Location & Geography Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | SSP extraction pending | P0 | 0.36C/D | S1–S2 |
| Payment Channel & Bank Administration | ✅ | 🟡 | 🔴 | 🟡 | ✅ | 🔴 | SSP extraction pending | P0 | 0.36C/D | S2 |
| Document Type Master Administration | ✅ | 🟡 | 🟡 | 🔴 | ✅ | 🔴 | Org master pending | P0 | 0.38 | S2 |
| Workflow Management | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | Consolidation pending | P0 | 0.37 | S1–S2 |
| Notification Management | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | Consolidation pending | P0 | 0.37 | S1–S2 |
| Document Management | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | Org taxonomy pending | P1 | 0.38 | S2 |
| Audit & Traceability | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear | P0 | Done | — |
| Person Registration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on SSP masters | P0 | 0.39 | S3 |
| Employer Registration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on SSP masters | P0 | 0.39 | S3 |
| Organisation Registration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on SSP masters | P1 | 0.39 | S3 |
| Service Provider Registration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on SSP masters | P1 | 0.39 | S3 |
| Scheme Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Legal Ref | P0 | 0.39 | S3 |
| Coverage Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Scheme + Person | P0 | 0.39 | S3–S4 |
| Contribution Registration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Coverage | P0 | 0.39 | S4 |
| Wage & Earnings Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Contribution | P1 | 0.39 | S4 |
| Contribution Assessment | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Wages | P1 | 0.39 | S4 |
| Contribution Collection | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Payment Channel | P1 | 0.39 | S4 |
| **Benefit Product Administration** | ✅ | 🟡 | 🔴 | 🟡 | ✅ | 🔴 | See §3 | **On Hold** | **0.40** | **S5** |
| Eligibility Determination | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Product | P0 (after 0.40) | 0.40+ | S5 |
| Claim Administration | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Product | P0 (after 0.40) | 0.40+ | S5–S6 |
| Medical Assessment | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Claim | P1 | 0.40+ | S6 |
| Decision Management | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Claim + Medical | P0 | 0.40+ | S6 |
| Award Administration | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Decision | P0 | 0.40+ | S6 |
| Payment Administration | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Depends on Award + Channel | P0 | 0.40+ | S6–S7 |
| Post-Payment Review | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Payment | P1 | 0.40+ | S7 |
| Recovery Management | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Payment + Legal | P1 | 0.40+ | S7 |
| Appeals | ✅ | 🔴 | 🔴 | ✅ | ✅ | 🔴 | Depends on Decision | P1 | 0.40+ | S7 |
| Compliance Monitoring | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | Partial (CE live) | P1 | 0.40+ | Ongoing |
| Investigation | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | Partial | P1 | 0.40+ | Ongoing |
| Case Management | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | Partial | P1 | 0.40+ | Ongoing |
| Enforcement Action | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | Partial | P1 | 0.40+ | Ongoing |
| Legal Referral & Intake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear (Legal V1) | P0 | Done | — |
| Judicial Process Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear (Legal V1) | P0 | Done | — |
| Legal Cost Recovery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear (Legal V1) | P0 | Done | — |
| General Ledger & Accounting | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance app pending | P1 | Finance | Later |
| Reconciliation | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance app pending | P1 | Finance | Later |
| Disbursement Execution | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance + Payment | P1 | Finance | Later |
| Receipts & Allocation | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance + Contribution | P1 | Finance | Later |
| Financial Reporting | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance app pending | P2 | Finance | Later |
| Operational Reporting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Clear per module | P1 | Ongoing | — |
| Regulatory Reporting | ✅ | 🟡 | 🔴 | ✅ | ✅ | 🔴 | Finance + Legal Ref | P2 | Later | — |
| Analytics & BI | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | Partial | P2 | Later | — |
| Integration Management | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | Partial | P1 | Ongoing | — |
| Portal Interaction Management | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | Partial | P1 | Ongoing | — |

Priorities: **P0** = blocks BN Product Builder resumption. **P1** = required for operational go-live. **P2** = enhancement / non-blocking.

---

## 2. Cross-cutting readiness gates

Before BN Product Builder resumes, the following gates must be **Ready** (all P0 rows above):

1. **SSP Foundation** (0.36C/D): Legal Reference, Location, Payment Channel, Bank, Identity Rules, Address Model, Participant Types extracted from BN and exposed as read-only shared services.
2. **Organisation Foundation** (0.37): Org profile, calendar, branding, DMS taxonomy, roles.
3. **Workflow & Notification consolidation** (0.37): single engine per capability, no BN-local duplication.
4. **Reference Data Administration** (0.36D): governed masters with maker-checker.
5. **BN Consumption Refactor** (0.39): BN hooks / services switched from `bn_*` masters to the shared service layer, without behavioural change.

---

## 3. Benefit Product Builder — readiness analysis

### 3.1 Prerequisite capabilities

| Prerequisite | Class | Current status | Blocking? |
|---|---|---|---|
| Legal Reference Administration | Must Have | 🔴 | Yes |
| Formula & Rule Library Administration | Must Have | 🟡 | Yes |
| Document Type Master (Org-owned) | Must Have | 🔴 | Yes |
| Workflow Management (consolidated) | Must Have | 🟡 | Yes |
| Notification Management (consolidated) | Must Have | 🟡 | Yes |
| Reference Data Administration | Must Have | 🟡 | Yes |
| Payment Channel & Bank Administration | Must Have | 🔴 | Yes |
| Scheme Administration | Must Have | 🔴 | Yes |
| Coverage Administration | Must Have | 🔴 | Yes |
| Person Registration (shared) | Must Have | 🔴 | Yes |
| Employer Registration (shared) | Must Have | 🔴 | Yes |
| Contribution history (read) | Must Have | 🔴 | Yes |
| Medical Policy master | Should Have | 🟡 | Deferrable to Medical Assessment epic |
| Service Provider Registration | Should Have | 🔴 | Deferrable |
| Analytics & BI | Can Wait | 🟡 | No |
| Regulatory Reporting | Can Wait | 🔴 | No |

### 3.2 Classification

- **Must Have (before 0.40 resumes):** all rows marked Yes above.
- **Should Have (before Claim Administration goes live):** Medical Policy master, Service Provider Registration.
- **Can Wait (post-launch):** Analytics & BI enhancements, Regulatory Reporting, Post-Payment Review automation, Recovery analytics.

### 3.3 Decision

BN Product Builder **remains on hold** until every Must Have prerequisite reaches ✅ via epics 0.36C, 0.36D, 0.37, 0.38, and 0.39. This is the same gate reaffirmed in `EPIC_0_36A_SOCIAL_SECURITY_SHARED_SERVICES_ARCHITECTURE.md` and `EPIC_0_36A.1` (Enterprise Domain Model).

---

## 4. Roadmap

```text
Epic 0.36B  Enterprise Domain Inventory
     │  (audit current bn_* masters; classify own / share / retire)
     ▼
Epic 0.36C  Migration Planning
     │  (extraction plan for Country Pack, Legal Ref, Payment, Bank, ID Rules, Address, Participant Types)
     ▼
Epic 0.36D  Shared Service Layer (read-only)
     │  (SSP hooks/services expose masters; BN keeps writing to bn_* until 0.39)
     ▼
Epic 0.37   Organisation Foundation
     │  (Org profile, calendar, branding, workflow + notification consolidation, role model refactor)
     ▼
Epic 0.38   SSP Foundation / Org Document Master
     │  (Org DMS taxonomy; SSP masters become authoritative write path)
     ▼
Epic 0.39   BN Consumption Refactor
     │  (swap bn_* master reads for SSP/Org shared services; keep legacy shims for one release)
     ▼
Epic 0.40   BN Product Builder (resumes)
     │  (only after gates in §2 are Ready)
     ▼
Epic 0.41+  Downstream Benefit capabilities (Eligibility, Claim, Medical, Decision, Award, Payment, Review, Recovery, Appeals)
```

Parallel tracks (do not block Product Builder resumption):

- Finance application build (GL, Reconciliation, Disbursement, Receipts, Financial Reporting) can proceed once 0.37 and 0.38 land.
- Compliance and Legal continue as owned capabilities; they contribute events but do not gate 0.40.

## 5. Acceptance for Epic 0.36A.2

- Every capability has a readiness row.
- Product Builder prerequisites are enumerated and classified Must / Should / Can Wait.
- Roadmap explicitly sequences 0.36B → 0.36C → 0.36D → 0.37 → 0.38 → 0.39 → 0.40.
- No implementation, code, schema, route, hook, service, API, `app_modules`, menu, permission, or feature-flag change has been made.
