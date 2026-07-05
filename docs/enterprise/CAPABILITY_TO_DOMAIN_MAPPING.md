# Capability to Domain Mapping (Epic 0.36A.2)

**Status:** Architecture only. No implementation change.

Maps every business capability from `ENTERPRISE_BUSINESS_CAPABILITY_MODEL.md` onto the enterprise domains defined in `ENTERPRISE_DOMAIN_MODEL.md`, the shared masters in `SHARED_MASTER_DATA_MODEL.md`, and the shared services in `DOMAIN_SERVICE_CATALOGUE.md`.

Legend:

- **Consumes** = reads from the domain (must not write).
- **Produces** = writes / owns the entities listed.
- **Shared Svc** = uses a shared enterprise service (workflow, notification, document, audit, integration).
- **Platform Svc** = uses platform-level service (auth, RBAC, secrets, config).
- **Org Data** = uses Organisation-owned data (tenant profile, branding, locations, calendar).
- **SSP Data** = uses SSP-owned data (Country Pack, Legal Reference, Payment Channel, Bank, Address Model, Identity Rules, Participant Types).
- **BN Data** = uses BN-owned data (product versions, bindings, formula library, rule catalogue).

---

## 1. Identity & Access

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Identity Management | — | Identity, Credential events | Audit | Auth, Secrets | Org profile | — | — |
| Authorisation & Role Management | Identity | Role assignments, Permission grants | Audit | RBAC | Org roles | — | — |

## 2. Party & Subject Registration

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Person Registration | Identity, Location, Reference | Person, Identifiers, Contacts, Addresses, Relationships | Document, Notification, Audit | Auth | Locations | Country Pack, Identity Rules, Address Model, Participant Types | — |
| Employer Registration | Identity, Location, Legal, Reference, Person | Employer, Sites, Officers | Document, Notification, Audit, Workflow | Auth | Locations | Country Pack, Legal Reference, Identity Rules | — |
| Organisation Registration | Identity, Location, Legal | Organisation | Document, Audit | Auth | Locations | Country Pack, Legal Reference | — |
| Service Provider Registration | Identity, Person, Location, Payment | Provider, Practitioner bindings | Document, Audit | Auth | Locations | Country Pack, Payment Channel, Bank | — |

## 3. Scheme & Coverage

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Scheme Administration | Legal, Reference | Scheme, Scheme Version | Workflow, Audit | RBAC | — | Legal Reference | — |
| Coverage Administration | Person, Employer, Scheme, Contribution | Coverage, Coverage transitions | Notification, Audit | — | — | — | — |

## 4. Contribution

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Contribution Registration | Person, Employer, Scheme | Contributor record | Notification, Audit | Auth | — | Country Pack | — |
| Wage & Earnings Administration | Employer, Person, Coverage, Reference | Earnings records | Document, Audit | — | — | Country Pack | — |
| Contribution Assessment | Wages, Scheme rules, Coverage | Assessment | Workflow, Audit | — | — | — | — |
| Contribution Collection | Assessment, Payment Channel, Bank | Receipts, Allocations | Notification, Audit, Integration | — | — | Payment Channel, Bank | — |

## 5. Benefit

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Benefit Product Administration | Legal, Reference, Formula, Rule, Document, Workflow, Notification | Product, Version, Bindings | Workflow, Document, Notification, Audit | RBAC | — | Legal Reference | Formula, Rule, Doc, Workflow, Notification bindings |
| Eligibility Determination | Product Version, Coverage, Contribution history, Person, Medical | Eligibility decision | Audit | — | — | — | Product Version, Rules |
| Claim Administration | Person, Product Version, Document Master | Claim, Claim events | Workflow, Document, Notification, Audit | — | — | — | Product Version |
| Medical Assessment | Person, Claim, Provider | Medical decision | Document, Audit, Workflow | — | — | — | Medical Policy |
| Decision Management | Claim, Eligibility, Medical, Rules | Decision | Workflow, Notification, Audit | — | — | Legal Reference | Rules |
| Award Administration | Decision, Product Version | Award, Schedule, Adjustments | Workflow, Audit | — | — | — | Product Version |
| Payment Administration | Award, Payment Channel, Bank | Payment instructions, Confirmations | Integration, Notification, Audit | — | — | Payment Channel, Bank | — |
| Post-Payment Review | Payments, Awards, Decisions | Review outcomes | Workflow, Audit | — | — | — | — |
| Recovery Management | Overpayments, Person, Employer, Legal | Arrangements, Offsets | Workflow, Notification, Audit | — | — | Legal Reference | — |
| Appeals | Decision, Person, Legal | Appeal | Workflow, Document, Notification, Audit | — | — | Legal Reference | — |

## 6. Compliance & Enforcement

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Compliance Monitoring | Employer, Contribution, Reference | Risk signals, Referrals | Audit | — | — | — | — |
| Investigation | Referral, Person, Employer, Document | Investigation record | Workflow, Document, Audit | — | — | — | — |
| Case Management | Investigation, Person, Employer, Legal | Case, Case events | Workflow, Document, Notification, Audit | — | — | Legal Reference | — |
| Enforcement Action | Case, Legal | Notices, Arrangements, Escalations | Workflow, Notification, Document, Audit | — | — | Legal Reference | — |

## 7. Legal

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Legal Referral & Intake | Enforcement Action, Person, Employer | Legal case | Workflow, Document, Audit | — | — | Legal Reference | — |
| Judicial Process Management | Legal case, Court master | Hearings, Orders, Appeals, Enforcement | Workflow, Document, Notification, Audit | — | — | Legal Reference | — |
| Legal Cost Recovery | Orders, Liabilities, Fee master | Cost recoveries | Audit | — | — | — | — |

## 8. Finance

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| General Ledger & Accounting | Contribution, Benefit, Recovery, Legal | Journals, Balances | Audit, Integration | — | Org fiscal calendar | — | — |
| Reconciliation | Bank, Channel, GL | Reconciliation results | Integration, Audit | — | — | Payment Channel, Bank | — |
| Disbursement Execution | Payment instructions | Disbursements | Integration, Notification, Audit | — | — | Payment Channel, Bank | — |
| Receipts & Allocation | Bank feeds, Contribution | Receipts, Allocations | Integration, Audit | — | — | Bank | — |
| Financial Reporting | GL, Recon, Payments | Reports | Audit | — | Org fiscal calendar | — | — |

## 9. Reference & Master Data

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Reference Data Administration | — | Enumerations, code lists | Workflow, Audit | RBAC | — | — | — |
| Legal Reference Administration | — | Acts, Sections, Regs | Workflow, Document, Audit | RBAC | — | Legal Reference | — |
| Location & Geography Administration | — | Country, Region, District, Ward | Audit | RBAC | Locations | Country Pack | — |
| Payment Channel & Bank Administration | — | Channels, Banks, Branches | Audit | RBAC | — | Payment Channel, Bank | — |
| Formula & Rule Library Administration | Reference | Formulas, Rules | Workflow, Audit | RBAC | — | — | Formula, Rule catalogue |
| Document Type Master Administration | — | Document types | Document, Audit | RBAC | Org DMS taxonomy | — | — |

## 10. Workflow & Process Orchestration

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Workflow Management | Reference | Workflow definitions, Instances | Notification, Audit | RBAC | Org calendar | — | — |
| Task & Workbasket Management | Workflow, Identity | Tasks, Assignments | Notification, Audit | RBAC | — | — | — |
| SLA & Escalation Management | Workflow, Reference | SLA breach events | Notification, Audit | — | Org calendar | — | — |

## 11. Communication & Documents

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Notification Management | Templates, Identity, Person, Employer | Notifications, Delivery events | Integration, Audit | Secrets | Org branding | — | — |
| Document Management | Identity, Document Types | Documents, Versions | Audit, Integration | Storage | Org DMS taxonomy | — | — |
| Correspondence & Template Management | Reference, Legal Reference | Templates | Document, Audit | — | Org branding | Legal Reference | — |
| Portal Interaction Management | Identity, Person, Employer | Portal sessions, Submissions | Notification, Document, Audit | Auth | Org branding | — | — |

## 12. Reporting, Analytics & Audit

| Capability | Consumes | Produces | Shared Svc | Platform Svc | Org Data | SSP Data | BN Data |
|---|---|---|---|---|---|---|---|
| Operational Reporting | All operational domains | Reports | Audit | — | — | — | — |
| Regulatory Reporting | Finance, Coverage, Benefit, Compliance | Regulatory returns | Audit, Integration | — | Org profile | Legal Reference | — |
| Analytics & BI | All (read-only) | Insights, Dashboards | Audit | — | — | — | — |
| Audit & Traceability | All (as producer of audit trails) | Audit records | — | — | — | — | — |
| Integration Management | External systems | Integration events | Audit | Secrets | — | — | — |

---

## Ownership rule

For every row above:

- **Produces** columns define the *single write owner* of those entities.
- **Consumes / Org Data / SSP Data / BN Data** columns are strictly read-only for that capability.
- If a future application needs to write to a domain it currently consumes, that is a **capability-boundary violation** and must be resolved by extending the owning capability rather than duplicating writes.
