# Application Capability Matrix (Epic 0.36A.2)

**Status:** Architecture only.

Maps each planned application to the business capabilities it **provides** (implements as the primary owner of the user experience for that capability) and **consumes** (uses through shared services, not re-implements).

Applications listed:

- **BN** — Benefits
- **C3** — Contributions
- **ER** — Employer
- **CE** — Compliance & Enforcement
- **LG** — Legal
- **FN** — Finance
- **PT** — Portals (Claimant / Employer / Doctor / Agent)
- **AD** — Administration (Platform + Organisation + SSP admin surfaces)

Legend: **P** = Provides · **C** = Consumes · blank = not involved.

---

## 1. Capability × Application matrix

| Capability | BN | C3 | ER | CE | LG | FN | PT | AD |
|---|---|---|---|---|---|---|---|---|
| Identity Management | C | C | C | C | C | C | C | P |
| Authorisation & Role Management | C | C | C | C | C | C | C | P |
| Person Registration | C | C | C | C | C | C | C (self) | P |
| Employer Registration | C | C | P | C | C | C | C (self) | C |
| Organisation Registration | C | C | C | C | C | C | | P |
| Service Provider Registration | C | | | C | C | | C (self) | P |
| Scheme Administration | C | C | | | | | | P |
| Coverage Administration | C | P | C | C | | | C | |
| Contribution Registration | | P | C | C | C | C | C | |
| Wage & Earnings Administration | | P | C | C | | | C | |
| Contribution Assessment | | P | C | C | | C | | |
| Contribution Collection | | P | C | C | | C | C | |
| Benefit Product Administration | P | | | | | | | C |
| Eligibility Determination | P | C | | | | | C | |
| Claim Administration | P | | | | | | C | |
| Medical Assessment | P | | | | | | C (doctor) | |
| Decision Management | P | | | | C | | C | |
| Award Administration | P | | | | | C | C | |
| Payment Administration | P | C | | | C | C | C | |
| Post-Payment Review | P | | | | | C | | |
| Recovery Management | C | C | | C | P (legal) | C | | |
| Appeals | P | | | | C | | C | |
| Compliance Monitoring | | C | C | P | C | | | |
| Investigation | | | C | P | C | | | |
| Case Management | | | | P | P (legal) | | | |
| Enforcement Action | | | | P | C | | | |
| Legal Referral & Intake | | | | C | P | | | |
| Judicial Process Management | | | | C | P | | | |
| Legal Cost Recovery | | | | | P | C | | |
| General Ledger & Accounting | C | C | C | C | C | P | | |
| Reconciliation | | C | | | | P | | |
| Disbursement Execution | C | | | | | P | | |
| Receipts & Allocation | | C | | | | P | | |
| Financial Reporting | | | | | | P | | |
| Reference Data Administration | C | C | C | C | C | C | | P |
| Legal Reference Administration | C | | | C | C | | | P |
| Location & Geography Administration | C | C | C | C | C | C | C | P |
| Payment Channel & Bank Administration | C | C | | | | C | C | P |
| Formula & Rule Library Administration | C | C | | | | | | P |
| Document Type Master Administration | C | C | C | C | C | C | C | P |
| Workflow Management | C | C | C | C | C | C | C | P |
| Task & Workbasket Management | C | C | C | C | C | C | C | P |
| SLA & Escalation Management | C | C | C | C | C | C | | P |
| Notification Management | C | C | C | C | C | C | C | P |
| Document Management | C | C | C | C | C | C | C | P |
| Correspondence & Template Management | C | C | C | C | C | C | | P |
| Portal Interaction Management | C | C | C | C | C | | P | C |
| Operational Reporting | C | C | C | C | C | C | | C |
| Regulatory Reporting | C | C | C | C | C | P | | |
| Analytics & BI | C | C | C | C | C | C | | P |
| Audit & Traceability | C | C | C | C | C | C | C | P |
| Integration Management | C | C | C | C | C | C | C | P |

---

## 2. Per-application summary

### 2.1 BN — Benefits
- **Provides:** Benefit Product Administration, Eligibility Determination, Claim Administration, Medical Assessment, Decision Management, Award Administration, Payment Administration (benefit side), Post-Payment Review, Appeals.
- **Consumes:** Identity, Person, Employer, Coverage, Contribution history, all Reference/Master domains, Workflow, Notification, Document, Payment Channel, Bank, Legal Reference, GL, Audit.
- **Never owns:** Person, Employer, Coverage, Contribution, Scheme, Payment Channel, Bank, Legal Reference, Location, Formula/Rule master (only bindings to it).

### 2.2 C3 — Contributions
- **Provides:** Coverage Administration, Contribution Registration, Wage & Earnings, Assessment, Collection.
- **Consumes:** Identity, Person, Employer, Scheme, Payment Channel, Bank, GL, Workflow, Notification, Document, Audit.

### 2.3 ER — Employer
- **Provides:** Employer Registration.
- **Consumes:** Identity, Person, Location, Legal Reference, Coverage, Contribution, Compliance, Notification, Document.

### 2.4 CE — Compliance & Enforcement
- **Provides:** Compliance Monitoring, Investigation, Case Management, Enforcement Action.
- **Consumes:** Employer, Person, Contribution, Coverage, Legal Reference, Workflow, Notification, Document, Audit; escalates to Legal.

### 2.5 LG — Legal
- **Provides:** Legal Referral & Intake, Judicial Process Management, Legal Cost Recovery, Case Management (legal side), Recovery Management (legal track), Appeals (legal representation).
- **Consumes:** Person, Employer, Enforcement Action, Legal Reference, Document, Workflow, Notification, GL, Audit.

### 2.6 FN — Finance
- **Provides:** GL & Accounting, Reconciliation, Disbursement Execution, Receipts & Allocation, Financial Reporting, Regulatory Reporting.
- **Consumes:** All operational capabilities that produce financial events.

### 2.7 PT — Portals
- **Provides:** Portal Interaction Management (Claimant, Employer, Doctor, Agent surfaces).
- **Consumes:** Identity, Person, Employer, Claim, Award, Payment, Document, Notification.
- **Never owns:** any operational data; portals are experience layers over other capabilities.

### 2.8 AD — Administration
- **Provides:** Identity, Authorisation, all Reference & Master Data administration, Workflow, Notification, Document master, Audit administration, Analytics admin, Integration admin.
- **Consumes:** — (root layer for masters and platform services).

---

## 3. Boundary rules

1. An application is **the only implementer** of the capabilities it provides. Other applications integrate through the shared service layer, never by duplicating the capability.
2. An application never writes to a capability it only consumes.
3. Portals never own operational data.
4. AD (Administration) owns masters and platform services; it never implements operational domain capabilities.
5. Any request to add "provides" to more than one application for the same capability must first go through capability re-partitioning, not parallel implementation.
