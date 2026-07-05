# Capability Dependency Graph (Epic 0.36A.2)

**Status:** Architecture only.

This document expresses **prerequisite** relationships between capabilities. `A → B` means "B cannot be delivered to production usefully until A is operational."

Cross-cutting capabilities (Workflow, Notification, Document, Audit, Reference Data, Identity, Authorisation) are prerequisites of nearly everything and are shown once as the foundation layer.

## 1. Foundation layer

```text
Platform Foundation
  → Identity Management
  → Authorisation & Role Management
  → Reference Data Administration
  → Legal Reference Administration
  → Location & Geography Administration
  → Payment Channel & Bank Administration
  → Document Type Master Administration
  → Workflow Management
  → Notification Management
  → Document Management
  → Audit & Traceability
```

Every capability below implicitly depends on all of the above.

## 2. Registration and party layer

```text
Identity Management
  → Person Registration
  → Employer Registration
  → Organisation Registration
  → Service Provider Registration

Person Registration
  → Employer Registration (authorised officers)
  → Service Provider Registration (practitioners)
```

## 3. Scheme, coverage, contribution layer

```text
Legal Reference Administration
  → Scheme Administration
Person Registration + Employer Registration + Scheme Administration
  → Coverage Administration
Coverage Administration
  → Contribution Registration
Contribution Registration
  → Wage & Earnings Administration
  → Contribution Assessment
Contribution Assessment + Payment Channel & Bank Administration
  → Contribution Collection
```

## 4. Benefit layer

```text
Formula & Rule Library Administration
Document Type Master Administration
Workflow Management
Notification Management
Legal Reference Administration
Scheme Administration
  → Benefit Product Administration

Benefit Product Administration + Coverage Administration + Contribution Collection
  → Eligibility Determination

Eligibility Determination + Person Registration
  → Claim Administration

Claim Administration + Service Provider Registration
  → Medical Assessment

Claim Administration + Medical Assessment + Eligibility Determination
  → Decision Management

Decision Management + Benefit Product Administration
  → Award Administration

Award Administration + Payment Channel & Bank Administration
  → Payment Administration

Payment Administration
  → Post-Payment Review
  → Recovery Management

Decision Management
  → Appeals
```

## 5. Compliance and legal layer

```text
Employer Registration + Contribution Collection
  → Compliance Monitoring
Compliance Monitoring
  → Investigation
Investigation
  → Case Management
Case Management
  → Enforcement Action
Enforcement Action
  → Legal Referral & Intake
Legal Referral & Intake
  → Judicial Process Management
Judicial Process Management
  → Legal Cost Recovery
Judicial Process Management
  → Recovery Management (legal recovery track)
```

## 6. Finance layer

```text
Contribution Collection + Payment Administration + Recovery Management
  → General Ledger & Accounting
General Ledger & Accounting + Payment Channel & Bank Administration
  → Reconciliation
Award Administration
  → Disbursement Execution
Contribution Collection
  → Receipts & Allocation
General Ledger & Accounting
  → Financial Reporting
```

## 7. Reporting and analytics layer

```text
(All operational capabilities)
  → Operational Reporting
  → Regulatory Reporting
  → Analytics & BI
```

## 8. End-to-end business flow (illustrative)

```text
Register Person
  ↓
Register Employer
  ↓
Register Scheme + Coverage
  ↓
Register Contribution + Wages
  ↓
Assess + Collect Contribution
  ↓
Publish Benefit Product (Version)
  ↓
Determine Eligibility
  ↓
Administer Claim
  ↓
Medical Assessment (if applicable)
  ↓
Decision
  ↓
Award
  ↓
Payment
  ↓
Post-Payment Review
  ↓
Recovery (if overpayment)  ─── or ───  Appeals (if disputed)
```

## 9. Mandatory prerequisites (hard gates)

The following prerequisites are **hard**; skipping them creates data-integrity or legal risk:

| Downstream capability | Hard prerequisites |
|---|---|
| Benefit Product Administration | Legal Reference, Formula & Rule Library, Document Type Master, Workflow, Notification, Scheme |
| Eligibility Determination | Benefit Product Version, Coverage, Contribution history |
| Award Administration | Decision Management, Benefit Product Version |
| Payment Administration | Award, Payment Channel, Bank |
| Judicial Process Management | Legal Referral & Intake, Court master (Legal Reference), Document |
| Reconciliation | GL, Payment Channel, Bank |

## 10. Cyclic-dependency risks

Potential cycles that must be avoided by convention:

1. **Recovery ↔ Payment** — Recovery must consume Payment history and produce recovery instructions that are re-executed via Payment Administration. Resolution: Recovery does not write to Payment tables; it emits new payment instructions that Payment Administration owns.
2. **Appeals ↔ Decision** — Appeals must not mutate the original Decision. Resolution: Appeals produces a new Decision version; the original remains immutable.
3. **Compliance ↔ Legal** — Legal outcomes must feed back into Compliance risk. Resolution: Legal emits events; Compliance consumes them read-only.
4. **Benefit Product ↔ Rule/Formula Library** — Products bind to rules; rules must not embed product IDs. Resolution: rules and formulas are product-agnostic; binding is one-way from Product to Rule/Formula.
5. **Workflow ↔ Any business capability** — Workflow must not encode business logic; business capabilities call the workflow engine. Resolution: engine is state-only.

## 11. Change discipline

Any change that appears to require a business capability to write to a domain it currently consumes indicates a missing capability. Add or extend a capability rather than introducing a back-write.
