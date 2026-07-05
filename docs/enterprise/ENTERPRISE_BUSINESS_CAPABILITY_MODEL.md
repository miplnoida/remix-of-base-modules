# Enterprise Business Capability Model (Epic 0.36A.2)

**Status:** Architecture only. No code, schema, routes, hooks, services, app_modules, menus, permissions, or feature flags are changed by this epic.

**Position in stack:**

```
Platform Foundation
  ↓
Organisation
  ↓
Shared Domains (SSP + Enterprise Shared)
  ↓
──────── BUSINESS CAPABILITY MODEL (this document) ────────
  ↓
Business Applications (BN, C3, Employer, Compliance, Legal, Finance, Portals, …)
```

A **business capability** describes *what* the enterprise must be able to do, in business language, independent of any module, screen, API, table, or team. Modules and screens are *implementations* of one or more capabilities.

---

## 1. Definition and rules

A capability:

- Is a **noun-phrase describing an ability** (e.g. "Person Registration"), never a screen, module, table, hook, or API.
- Has **exactly one business owner** (the organisation role accountable for the outcome).
- Produces or manages a **well-defined business outcome** (registered person, adjudicated claim, posted payment, published legal notice, etc.).
- **Consumes** shared domain data; it does not own foreign domains.
- Is **stable across implementations** — swapping the UI, DB, or vendor must not change the capability list.
- Is **testable** via a business-level acceptance statement, independent of screens.

A capability is NOT:

- A page (`/bn/products/new` is not a capability).
- A module (BN is not a capability; BN *implements* several capabilities).
- A table (`bn_product` is not a capability).
- A permission (`manage_compliance` is not a capability).
- A workflow step (a capability may orchestrate workflows but is not one).

---

## 2. Capability descriptor (template)

Every capability defined in this model is described using the following attributes:

| Attribute | Meaning |
|---|---|
| **Name** | Business noun-phrase. |
| **Purpose** | One sentence describing the business ability. |
| **Business owner** | Role accountable for the outcome (not a system). |
| **Business outcome** | The observable result when the capability executes. |
| **Consumers** | Other capabilities, applications, portals, or actors that depend on it. |
| **Produced entities** | Business entities created / mutated / retired. |
| **Consumed domains** | Shared domains it reads (Location, Identity, Legal, …). |
| **Dependencies** | Other capabilities that must be operational first. |
| **Security requirements** | Authentication, authorisation, data-classification rules. |
| **Audit requirements** | What must be recorded (who/what/when/why/before/after). |
| **Versioning** | Whether the produced entity is versioned, effective-dated, or immutable. |

---

## 3. Enterprise capability catalogue

Capabilities are grouped into 12 capability domains. Each is described with the descriptor above (summarised for brevity; full descriptor is authoritative even where columns are compressed).

### 3.1 Identity & Access

#### 3.1.1 Identity Management
- **Purpose:** Establish and maintain the digital identity of every person or system actor.
- **Business owner:** Platform Security / Organisation IT.
- **Outcome:** A unique, verified digital identity usable across all applications.
- **Consumers:** Every capability that requires an actor.
- **Produces:** Identity record, credential lifecycle events.
- **Consumes:** Platform Foundation, Organisation.
- **Dependencies:** None (foundational).
- **Security:** MFA-capable, credential rotation, session hardening.
- **Audit:** Full L3 (login, credential change, privilege change).
- **Versioning:** Identity immutable; credentials rotated with history.

#### 3.1.2 Authorisation & Role Management
- **Purpose:** Grant and revoke capability-scoped permissions to identities.
- **Owner:** Platform Security.
- **Outcome:** Enforceable authorisation decisions at every capability boundary.
- **Consumes:** Identity Management.
- **Security:** Server-side enforcement, no client-side role checks for privileged actions.
- **Audit:** L3 (grant, revoke, effective-dating).

### 3.2 Party & Subject Registration

#### 3.2.1 Person Registration
- **Purpose:** Register a natural person as a known subject of the platform.
- **Owner:** Registration Office.
- **Outcome:** A canonical Person record usable by all downstream capabilities.
- **Produces:** Person, Person Identifiers, Contact points, Addresses.
- **Consumes:** Identity domain, Location domain, Reference Data.
- **Versioning:** Person is single-record with versioned attribute changes.
- **Audit:** L3.

#### 3.2.2 Employer Registration
- **Purpose:** Register an employer entity and its statutory identifiers.
- **Owner:** Employer Services.
- **Produces:** Employer, Employer Sites, Employer Contacts.
- **Consumes:** Location, Legal (registration statutes), Reference Data.
- **Depends on:** Person Registration (for owners/authorised officers).

#### 3.2.3 Organisation Registration (non-employer)
- **Purpose:** Register other legal entities (schools, NGOs, government units) that interact with the platform without being employers.
- **Owner:** Organisation Registrar.

#### 3.2.4 Service Provider Registration
- **Purpose:** Register medical providers, banks, external counsel, agents.
- **Owner:** Provider Management.
- **Dependencies:** Person Registration (for practitioners).

### 3.3 Scheme & Coverage

#### 3.3.1 Scheme Administration
- **Purpose:** Define statutory schemes (short-term, long-term, medical, employment injury, etc.) governed by legal instruments.
- **Owner:** Scheme Policy Office.
- **Consumes:** Legal Reference Master, Reference Data.
- **Produces:** Scheme, Scheme Version.
- **Versioning:** Effective-dated with legal-reference binding.

#### 3.3.2 Coverage Administration
- **Purpose:** Determine who is covered under which scheme and from when.
- **Owner:** Coverage Office.
- **Consumes:** Scheme, Person, Employer, Contribution history.
- **Produces:** Coverage record, Coverage transitions.

### 3.4 Contribution

#### 3.4.1 Contribution Registration
- **Purpose:** Register a person or employer as a contributor to one or more schemes.
- **Owner:** Contributions Office.

#### 3.4.2 Contribution Assessment
- **Purpose:** Assess contribution liability for a period.
- **Consumes:** Scheme rules, Coverage, Wages.

#### 3.4.3 Contribution Collection
- **Purpose:** Receive, allocate, and reconcile contribution payments.
- **Consumes:** Payment Administration, Reconciliation.

#### 3.4.4 Wage & Earnings Administration
- **Purpose:** Maintain declared earnings used for contribution and benefit calculation.

### 3.5 Benefit

#### 3.5.1 Benefit Product Administration
- **Purpose:** Define and version benefit products (rules, formulas, eligibility, documents, workflow bindings).
- **Owner:** Benefits Policy Office.
- **Consumes:** Legal, Reference Data, Formula Library, Document Master, Workflow, Notification.
- **Produces:** Benefit Product, Benefit Product Version, Benefit Bindings.
- **Versioning:** Effective-dated, immutable-once-published.
- **Audit:** L3, with maker-checker.

#### 3.5.2 Eligibility Determination
- **Purpose:** Determine whether a claimant qualifies for a benefit at a point in time.
- **Consumes:** Benefit Product Version, Coverage, Contribution history, Person, Medical Assessment.

#### 3.5.3 Claim Administration
- **Purpose:** Capture, validate, and progress a benefit claim through its lifecycle.
- **Produces:** Claim, Claim events, Claim documents.

#### 3.5.4 Medical Assessment
- **Purpose:** Capture medical evidence and clinical decisions supporting a claim.
- **Owner:** Medical Board.

#### 3.5.5 Decision Management
- **Purpose:** Record the formal approve/reject/partial decision on a claim.
- **Audit:** L3, reasoned, reversible only via Appeals.

#### 3.5.6 Award Administration
- **Purpose:** Convert a positive decision into a scheduled award (one-off, recurring, or open-ended).
- **Produces:** Award, Award schedule, Award adjustments.

#### 3.5.7 Payment Administration
- **Purpose:** Convert awards into disbursement instructions and execute them via configured payment channels.
- **Consumes:** Payment Channel Master, Bank Master, Award schedule.

#### 3.5.8 Post-Payment Review
- **Purpose:** Detect and act on overpayments, duplicate payments, entitlement changes after payment.

#### 3.5.9 Recovery Management
- **Purpose:** Recover overpaid or fraudulently obtained amounts through arrangements, offsets, or legal action.

#### 3.5.10 Appeals
- **Purpose:** Manage the formal challenge and re-adjudication of decisions.

### 3.6 Compliance & Enforcement

#### 3.6.1 Compliance Monitoring
- **Purpose:** Detect employer / contributor non-compliance through risk models, audits, and referrals.

#### 3.6.2 Investigation
- **Purpose:** Conduct structured field or desk investigation of suspected non-compliance.

#### 3.6.3 Case Management
- **Purpose:** Manage the end-to-end lifecycle of a compliance or legal case.

#### 3.6.4 Enforcement Action
- **Purpose:** Issue notices, arrangements, and escalations up to legal referral.

### 3.7 Legal

#### 3.7.1 Legal Referral & Intake
- **Purpose:** Convert enforcement escalations into qualified legal cases.

#### 3.7.2 Judicial Process Management
- **Purpose:** Manage courts, hearings, orders, appeals, and enforcement of judicial outcomes.

#### 3.7.3 Legal Cost Recovery
- **Purpose:** Recover statutory fees and legal costs against liabilities.

### 3.8 Finance

#### 3.8.1 General Ledger & Accounting
#### 3.8.2 Reconciliation
#### 3.8.3 Disbursement Execution
#### 3.8.4 Receipts & Allocation
#### 3.8.5 Financial Reporting

### 3.9 Reference & Master Data

#### 3.9.1 Reference Data Administration
- **Purpose:** Own the lifecycle of enumerations, code lists, and controlled vocabularies.

#### 3.9.2 Legal Reference Administration
- **Purpose:** Maintain the master of Acts, Sections, Regulations, and their effective dates.

#### 3.9.3 Location & Geography Administration
#### 3.9.4 Payment Channel & Bank Administration
#### 3.9.5 Formula & Rule Library Administration
#### 3.9.6 Document Type Master Administration

### 3.10 Workflow & Process Orchestration

#### 3.10.1 Workflow Management
- **Purpose:** Define, version, and execute stateful business processes including maker-checker.

#### 3.10.2 Task & Workbasket Management
#### 3.10.3 SLA & Escalation Management

### 3.11 Communication & Documents

#### 3.11.1 Notification Management
#### 3.11.2 Document Management
#### 3.11.3 Correspondence & Template Management
#### 3.11.4 Portal Interaction Management

### 3.12 Reporting, Analytics & Audit

#### 3.12.1 Operational Reporting
#### 3.12.2 Regulatory Reporting
#### 3.12.3 Analytics & BI
#### 3.12.4 Audit & Traceability
#### 3.12.5 Integration Management

---

## 4. Cross-cutting expectations

Every capability, regardless of domain, must satisfy:

- **Server-side authorisation** (no client-only gates for privileged actions).
- **Audit** at the level appropriate to its data class (L1 read-only reference, L2 operational, L3 legal/financial).
- **Versioning discipline** where produced entities have legal or financial meaning.
- **Idempotency** for external-facing actions (webhooks, portal submissions, payment instructions).
- **Traceability** from produced entity back to the actor, the source event, and the effective policy version.

---

## 5. Non-goals

- No implementation guidance for specific modules.
- No schema, route, hook, service, or API changes.
- No re-ordering of BN Product Builder (that decision lives in the roadmap in `IMPLEMENTATION_READINESS_MODEL.md`).
- No new menus or `app_modules` rows.

## 6. Downstream artefacts

- `BUSINESS_CAPABILITY_MAP.md` — hierarchical map.
- `CAPABILITY_TO_DOMAIN_MAPPING.md` — capability ↔ domain matrix.
- `CAPABILITY_DEPENDENCY_GRAPH.md` — prerequisite graph.
- `APPLICATION_CAPABILITY_MATRIX.md` — application ↔ capability matrix.
- `IMPLEMENTATION_READINESS_MODEL.md` — readiness scoring, priorities, and roadmap, including Product Builder readiness.
