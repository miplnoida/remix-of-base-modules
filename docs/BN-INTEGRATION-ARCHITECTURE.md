# Benefit Module — Enterprise Integration Architecture

**Version:** 1.0  
**Date:** 2026-04-04  
**Status:** Approved for incremental implementation

---

## 1. Module Boundaries

The BN module owns **benefit lifecycle** only. It does NOT own users, employers, contributions, payments, documents, workflows, or notifications.

### BN Module Owns (Exclusive Write)
| Domain | Tables | Scope |
|--------|--------|-------|
| Product Configuration | `bn_product`, `bn_product_version`, `bn_rule_group`, `bn_formula_template`, `bn_eligibility_rule`, `bn_calculation_rule`, `bn_timeline_rule` | Define what benefits exist and how they're calculated |
| Country Packs | `bn_country`, `bn_country_*` | Multi-country configuration |
| Claims | `bn_claim`, `bn_claim_detail`, `bn_claim_note`, `bn_claim_event` | Claim intake through decision |
| Decisions | `bn_claim_decision`, `bn_claim_transition_rule`, `bn_reason_code` | Status transitions and decision audit |
| Awards | `bn_award` | Approved benefit records |
| Calculation | `bn_calc_run`, `bn_calc_trace`, `bn_calc_override`, `bn_calc_simulation_preset`, `bn_calc_legacy_snapshot` | Calculation execution and audit |
| Evidence | `bn_claim_evidence`, `bn_evidence_audit` | Claim-specific document tracking |
| Workbaskets | `bn_workbasket`, `bn_workbasket_assignment` | Claim routing and queues |
| Interactions | `bn_interaction_rule`, `bn_override_policy` | Cross-benefit rules |

### BN Module Reads (Never Writes)
| Domain | Tables/APIs | Purpose |
|--------|-------------|---------|
| Insured Persons | `ip_master`, `ip_application_documents` | Claimant identity, DOB, SSN |
| Contributions | `ip_wages`, `bn_get_contribution_summary` RPC | Eligibility & wage calculation |
| Employers | `er_master` | Employer verification |
| Users/Roles | `profiles`, `user_roles`, `role_permissions`, `app_modules` | Permission checks |
| Legacy Claims | `cn_payment`, `cn_receipt` | Historical comparison |
| Master Data | `tb_*` lookup tables | Shared codes and categories |

### BN Module Delegates To (Via Events/APIs)
| Domain | Owner | What BN Requests |
|--------|-------|------------------|
| Payments | Finance/Cashier Module | Payment instruction execution |
| Notifications | Notification Module | Email/SMS to claimants |
| Workflows | Workflow Engine | Step tracking and approvals |
| Document Storage | Document Module | File upload/retrieval |
| Audit Trail | Audit Module | System-wide change logging |

---

## 2. Integration Points Map

```
┌─────────────────────────────────────────────────────────┐
│                    PLATFORM LAYER                       │
│  Auth │ Roles │ Audit │ Notifications │ Workflows │ DMS │
└───┬───┴───┬───┴───┬───┴───────┬───────┴─────┬─────┴──┬─┘
    │       │       │           │             │        │
┌───▼───────▼───────▼───────────▼─────────────▼────────▼──┐
│              BN INTEGRATION LAYER                       │
│  bnAuthAdapter │ bnAuditAdapter │ bnNotifyAdapter │ ... │
└───┬─────────────────────────────────────────────────┬───┘
    │                                                 │
┌───▼─────────────────────────────────────────────────▼───┐
│                  BN MODULE CORE                         │
│  Claims │ Products │ Calc Engine │ Decisions │ Awards   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. APIs the BN Module Exposes

### 3.1 Claim Lifecycle API
| Operation | Consumer | Description |
|-----------|----------|-------------|
| `registerClaim(ssn, productCode, details)` | Intake UI, Self-Service Portal | Create new claim |
| `getClaimBySsn(ssn)` | IP Module, Contact Center | List claims for a person |
| `getClaimsByEmployer(regNo)` | Employer Module | Employer-related claims |
| `getClaimStatus(claimId)` | Portal, APIs | Current status + timeline |
| `getClaimDecisionHistory(claimId)` | Audit, Legal | Full decision trail |

### 3.2 Calculation API
| Operation | Consumer | Description |
|-----------|----------|-------------|
| `simulateBenefit(ssn, productCode, params)` | Self-Service Portal, What-If | Non-persisted estimate |
| `getCalcTrace(calcRunId)` | Audit, Appeals | Step-by-step breakdown |

### 3.3 Award/Payment API
| Operation | Consumer | Description |
|-----------|----------|-------------|
| `getActiveAwards(ssn)` | Finance, Reporting | Current entitlements |
| `getPaymentInstructions(awardId)` | Payment Module | What to pay, when |
| `suspendAward(awardId, reason)` | Compliance, Life Cert | Suspend payments |

### 3.4 Configuration API
| Operation | Consumer | Description |
|-----------|----------|-------------|
| `getProductCatalog(countryCode)` | Self-Service, Reports | Available benefit types |
| `getEligibilitySummary(ssn, productCode)` | Contact Center | Quick eligibility check |

---

## 4. APIs/Services the BN Module Consumes

### 4.1 Person Registry (ip_master)
```typescript
// BN needs — implemented via bnPersonAdapter
lookupPerson(ssn: string): PersonSummary
getPersonDOB(ssn: string): string
getPersonStatus(ssn: string): 'active' | 'deceased' | 'suspended'
getPersonAddress(ssn: string): AddressRecord
getDependants(ssn: string): Dependant[]
```

### 4.2 Contribution History (ip_wages + RPC)
```typescript
// BN needs — implemented via bnContributionAdapter
getContributionSummary(ssn, windowStart, windowEnd): ContributionSummary
getWeeklyWages(ssn, period): WageRecord[]
getTotalContributions(ssn): { weeks: number; amount: number }
```

### 4.3 Employer Registry (er_master)
```typescript
// BN needs — implemented via bnEmployerAdapter
lookupEmployer(regNo: string): EmployerSummary
getEmployerStatus(regNo: string): string
verifyEmployment(ssn, regNo, asOfDate): EmploymentVerification
```

### 4.4 Payment Services
```typescript
// BN needs — implemented via bnPaymentAdapter
submitPaymentInstruction(instruction: PaymentInstruction): PaymentResult
getPaymentStatus(instructionId: string): PaymentStatus
cancelPayment(instructionId: string, reason: string): void
```

### 4.5 Notification Services
```typescript
// BN needs — implemented via bnNotificationAdapter
sendClaimNotification(type, recipientSsn, claimId, templateData): void
// Types: CLAIM_RECEIVED, DOCS_REQUIRED, CLAIM_APPROVED, CLAIM_DENIED, 
//        PAYMENT_SCHEDULED, REVIEW_DUE, AWARD_SUSPENDED
```

### 4.6 Document Management
```typescript
// BN needs — implemented via bnDocumentAdapter
uploadEvidence(claimId, file, metadata): DocumentRef
getDocument(docRefId): DocumentContent
listDocuments(entityType, entityId): DocumentRef[]
```

### 4.7 Workflow Engine
```typescript
// BN needs — implemented via bnWorkflowAdapter
startWorkflow(templateKey, entityId, context): WorkflowInstance
completeStep(instanceId, stepId, outcome, data): void
getWorkflowStatus(instanceId): WorkflowState
```

### 4.8 Audit Trail
```typescript
// BN needs — uses existing platform audit
// Already integrated via fn_audit_row_change triggers on bn_* tables
// No adapter needed — direct DB trigger integration
```

---

## 5. Events the BN Module Publishes

Events are published to `bn_module_events` for platform consumption.

| Event | Payload | Consumers |
|-------|---------|-----------|
| `bn.claim.registered` | `{ claimId, ssn, productCode, channel }` | Workflow, Notifications, Audit |
| `bn.claim.status_changed` | `{ claimId, from, to, reason, decidedBy }` | Notifications, Dashboard, Reporting |
| `bn.claim.docs_requested` | `{ claimId, ssn, documents[] }` | Notifications, Portal |
| `bn.claim.approved` | `{ claimId, awardId, ssn, amount }` | Payments, Notifications, Reporting |
| `bn.claim.denied` | `{ claimId, ssn, reasonCode }` | Notifications, Appeals |
| `bn.award.created` | `{ awardId, ssn, productCode, amount, startDate }` | Payments, Finance |
| `bn.award.suspended` | `{ awardId, ssn, reason }` | Payments, Notifications |
| `bn.award.resumed` | `{ awardId, ssn }` | Payments, Notifications |
| `bn.award.terminated` | `{ awardId, ssn, reason, endDate }` | Payments, Finance |
| `bn.payment.instruction_created` | `{ instructionId, awardId, amount, dueDate }` | Payment Module |
| `bn.calc.completed` | `{ calcRunId, claimId, result }` | Audit, Reporting |
| `bn.evidence.status_changed` | `{ evidenceId, claimId, status }` | Workflow, Decision Engine |
| `bn.product.version_activated` | `{ productId, versionId, effectiveDate }` | Reporting, Config |

---

## 6. Security / Permission Integration

### 6.1 Module Registration
BN registers in `app_modules` with this hierarchy:
```
Benefit Management (benefits_management)
├── Claims (bn_claims) — view, create, edit
├── Claim Queue (bn_queue) — view, assign
├── Decisions (bn_decisions) — view, approve, deny, escalate
├── Awards (bn_awards) — view, suspend, terminate
├── Calculation (bn_calculation) — view, run, override
├── Configuration (bn_configuration) — view, edit
└── Country Packs (bn_country_packs) — view, edit
```

### 6.2 Action Permissions Used
| Action | Context |
|--------|---------|
| `view` | See claims, awards, config |
| `create` | Register claims, create products |
| `edit` | Update claim details, config |
| `approve` | Approve claims, overrides, versions |
| `deny` | Deny claims |
| `assign` | Route claims to workbaskets |
| `escalate` | Escalate claims |
| `override` | Override calculation results |
| `suspend` | Suspend awards |
| `terminate` | Terminate awards |

### 6.3 Integration Pattern
```typescript
// All BN pages use existing platform security
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useActionPermissions } from '@/hooks/useActionPermission';

// Route-level
<PermissionProtectedRoute moduleName="bn_claims">
  <ClaimWorklist />
</PermissionProtectedRoute>

// Component-level
const { canApprove, canEdit } = useActionPermissions('bn_decisions');
```

---

## 7. Navigation & Menu Placement

BN sits as a top-level sidebar group alongside existing modules:

```
Dashboard
├── User Management        ← existing
├── Master Data            ← existing  
├── Insured Persons        ← existing (BN reads from)
├── Employers              ← existing (BN reads from)
├── Contributions (C3)     ← existing (BN reads from)
├── ★ Benefit Management   ← BN MODULE
│   ├── Claim Worklist
│   ├── Claim Queue  
│   ├── Register New Claim
│   ├── Configuration
│   │   ├── Product Catalog
│   │   ├── Calculation Engine
│   │   ├── Transition Matrix
│   │   ├── Reason Codes
│   │   ├── Workbaskets
│   │   ├── Escalation Policies
│   │   └── Service Document Types
│   └── Country Packs
├── Cashier                ← existing (consumes BN payment instructions)
├── Audit                  ← existing (receives BN audit events)
├── System Admin           ← existing
└── Reports                ← existing (includes BN reports)
```

BN is gated by `benefits_management` permission — invisible to users without it.

---

## 8. Non-Breaking Rollout Strategy

### Phase 1: Foundation (Week 1-2) — NO user-visible changes
- [ ] Deploy `bn_*` schema (already done)
- [ ] Register `app_modules` entries for BN
- [ ] Create integration adapter interfaces (no implementation yet)
- [ ] Add menu items (hidden behind permission — no roles assigned yet)

### Phase 2: Configuration (Week 3-4) — Admin only
- [ ] Seed SKN country pack and product catalog
- [ ] Enable Configuration pages for admin role only
- [ ] Validate product rules with business team
- [ ] Connect audit triggers to `bn_*` tables

### Phase 3: Read-Only Integration (Week 5-6)
- [ ] Implement `bnPersonAdapter` → read from `ip_master`
- [ ] Implement `bnContributionAdapter` → read from `ip_wages`
- [ ] Implement `bnEmployerAdapter` → read from `er_master`
- [ ] Wire calculation engine to real contribution data
- [ ] Run parallel simulations against legacy system

### Phase 4: Claim Intake (Week 7-8) — Pilot users
- [ ] Enable claim registration for 1-2 pilot users
- [ ] Implement `bnDocumentAdapter` → reuse existing DMS
- [ ] Implement `bnNotificationAdapter` → use existing notification system
- [ ] Wire evidence checklist to document storage

### Phase 5: Full Processing (Week 9-12)
- [ ] Enable decision engine + workbaskets
- [ ] Implement `bnPaymentAdapter` → connect to cashier module
- [ ] Implement `bnWorkflowAdapter` → connect to existing workflow engine
- [ ] Enable event publishing
- [ ] Gradual role assignment to expand user base

### Phase 6: Legacy Cutover (Week 13+)
- [ ] Run dual-mode (old + new) for 4-8 weeks
- [ ] Compare results via `bn_calc_legacy_snapshot`
- [ ] Disable legacy claim entry (read-only)
- [ ] Full switchover

### Rollback Safeguards
- Feature flag: `FEATURE_BN_ENABLED` controls all BN visibility
- No existing tables are modified — BN uses soft joins (SSN/RegNo)
- Legacy claim tables remain untouched throughout
- `bn_legacy_claim_map` provides cross-reference without data migration
