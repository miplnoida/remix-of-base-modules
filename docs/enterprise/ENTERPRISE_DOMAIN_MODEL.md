# Enterprise Domain Model

> **Status:** Architecture only. No code, schema, routes, `app_modules`, menus, hooks, services, or feature-flag changes.
> **Scope:** Defines the business domains that make up the entire Enterprise Platform. Applies to Benefits, Contributions, Employer, Compliance, Finance, Legal, Licensing, Prison Management, HRMS, DMS, and any future enterprise solution.

**Companion documents**
- `DOMAIN_BOUNDARIES.md`
- `DOMAIN_DEPENDENCY_GRAPH.md`
- `SHARED_MASTER_DATA_MODEL.md`
- `DOMAIN_SERVICE_CATALOGUE.md`
- `ENTERPRISE_REFERENCE_ARCHITECTURE.md`

---

## 0. What a "Domain" Means Here

A **domain** is a unit of **business ownership**, not a module, not a page, not a table. A domain:

- Has a single accountable owner.
- Owns a defined set of **master data**.
- Exposes a stable **service contract** (future).
- Is **consumed** by one or more modules.
- Has explicit **cannot-own / cannot-modify** rules.

Modules (BN, C3, Employer, Compliance, Legal, Finance, Portals, future HRMS/Licensing/Prison/DMS) are **consumers** of domains, plus owners of their own product-/transaction-specific data.

---

## 1. Domain Catalogue

For every domain: Purpose · Business responsibility · Owned master data · Consumers · Dependencies · Future scalability · Shared services · Route namespace proposal (future only, not implemented).

### 1.1 Platform Foundation
- **Purpose:** Provide the technical substrate every other domain depends on.
- **Responsibility:** Auth, RBAC, Audit, Numbering, Workflow engine, Notification engine, DMS engine, Scheduler, Feature Flags, API Gateway, Observability.
- **Owned master data:** Users, roles, permissions, audit log schema, number series, workflow definitions, notification templates, feature flags, API keys.
- **Consumers:** All domains and modules.
- **Dependencies:** None (root).
- **Future scalability:** Multi-region, multi-tenant, event bus, service mesh.
- **Shared services:** AuthService, RbacService, AuditService, NumberingService, WorkflowService, NotificationService, DmsService, SchedulerService, FeatureFlagService.
- **Route namespace (future):** `/platform/*`

### 1.2 Organisation
- **Purpose:** Represent the tenant (the Social Security agency) and its internal structure.
- **Responsibility:** Tenant profile, branding, offices/branches, org units, calendars, org roles, org document master.
- **Owned master data:** Organisation profile, office/branch list, org unit hierarchy, working calendars, org document types.
- **Consumers:** All domains and modules.
- **Dependencies:** Platform Foundation.
- **Future scalability:** Multiple sub-tenants, franchise offices, seasonal calendars.
- **Shared services:** OrganisationService, OfficeService, CalendarService, OrgDocumentService.
- **Route namespace (future):** `/org/*`

### 1.3 Identity
- **Purpose:** Define how people and organisations are identified in a country.
- **Responsibility:** ID types, formats, checksums, primary ID selection, verification workflow.
- **Owned master data:** Identity type catalogue, per-country ID rules, verification policies.
- **Consumers:** Person, Employer, Benefits, Contributions, Compliance, Legal, Portals.
- **Dependencies:** Platform Foundation, Location & Jurisdiction.
- **Future scalability:** Biometric IDs, national ID API integration, cross-border ID recognition.
- **Shared services:** IdentityService, IdValidationService.
- **Route namespace (future):** `/ssp/identity-rules`

### 1.4 Location & Jurisdiction
- **Purpose:** Own the geographic and jurisdictional truth for the platform.
- **Responsibility:** Countries, states/regions, districts/parishes, postal codes, geo hierarchy, address formats, locales, currencies (linkage), timezones, holiday framework.
- **Owned master data:** Country, currency (link), locale, region/state/parish/district, postal code, address model per country, timezone.
- **Consumers:** Every domain and module.
- **Dependencies:** Platform Foundation.
- **Future scalability:** Multi-country deployment, jurisdictional overlays, gazetteer integration.
- **Shared services:** LocationService, AddressService, JurisdictionService.
- **Route namespace (future):** `/ssp/country-pack`, `/ssp/address-model`, `/ssp/geography`

### 1.5 Reference Data
- **Purpose:** Own cross-module code sets that are not themselves a domain.
- **Responsibility:** Relationship, marital status, occupation, industry (NACE/ISCO), education, nationality lists, generic status enums.
- **Owned master data:** Reference groups, reference values, effective-dated code sets.
- **Consumers:** Person, Employer, Benefits, Contributions, Compliance, Legal, HRMS, Licensing.
- **Dependencies:** Platform Foundation, Location.
- **Future scalability:** Country-scoped codes, multilingual labels, external standard mapping (ISO/ILO/UN).
- **Shared services:** ReferenceDataService.
- **Route namespace (future):** `/ssp/reference-data`

### 1.6 Lookup Registry
- **Purpose:** Meta-registry: "which lookup lives where."
- **Responsibility:** Catalogue of every lookup exposed to the UI, with its source (Reference Data, Identity, Location, Legal, etc.) and version.
- **Owned master data:** Lookup registry entries (name, source domain, source table/service, cache policy).
- **Consumers:** All UI/BFF layers, developer tooling.
- **Dependencies:** All domains that expose lookups.
- **Future scalability:** Auto-generated TypeScript enums, contract testing.
- **Shared services:** LookupRegistryService.
- **Route namespace (future):** `/ssp/lookup-registry`

### 1.7 Validation
- **Purpose:** Provide reusable validation primitives across the platform.
- **Responsibility:** ID validation, address validation, phone/email format, cross-field business validation, formula-safe validators.
- **Owned master data:** Validation rule catalogue, format specs.
- **Consumers:** All input-taking modules and portals.
- **Dependencies:** Identity, Location, Reference Data.
- **Future scalability:** Server-side + client-side symmetric validators, WASM/edge validators.
- **Shared services:** ValidationService.
- **Route namespace (future):** `/ssp/validation`

### 1.8 Person
- **Purpose:** Own the "who is this human" record.
- **Responsibility:** Person master, dependants, relationships, contact points, addresses, IDs held.
- **Owned master data:** Person, Person-Identity, Person-Address, Person-Contact, Person-Relationship.
- **Consumers:** Benefits, Contributions, Compliance, Legal, Portals, HRMS.
- **Dependencies:** Identity, Location, Reference Data, Validation.
- **Future scalability:** Golden-record dedup, biometric linkage, MDM.
- **Shared services:** PersonService, RelationshipService.
- **Route namespace (future):** `/person/*`

### 1.9 Employer
- **Purpose:** Own the "who is this organisation" record for social-security purposes.
- **Responsibility:** Employer master, classification, registration, sites, contacts, ownership structure.
- **Owned master data:** Employer, Employer-Site, Employer-Classification, Employer-Contact.
- **Consumers:** Contributions, Benefits (employer-linked claims), Compliance, Legal, Portals.
- **Dependencies:** Identity, Location, Reference Data, Validation.
- **Future scalability:** Group/parent structures, foreign employers, gig-platform employers.
- **Shared services:** EmployerService, EmployerClassificationService.
- **Route namespace (future):** `/employer/*`

### 1.10 Coverage
- **Purpose:** Model who is covered under which scheme/branch and when.
- **Responsibility:** Insurance coverage periods, insured/uninsured status, branch enrolment, coverage transitions.
- **Owned master data:** Coverage record, coverage transitions, coverage exceptions.
- **Consumers:** Benefits (eligibility), Contributions (accrual), Compliance, Reporting.
- **Dependencies:** Person, Employer, Scheme, Location.
- **Future scalability:** Voluntary contributor coverage, cross-scheme coverage, portability treaties.
- **Shared services:** CoverageService.
- **Route namespace (future):** `/coverage/*`

### 1.11 Scheme
- **Purpose:** Own the definition of insurance schemes/branches themselves.
- **Responsibility:** Scheme catalogue, branch catalogue (STB, LTB, EI, IP, Med, Fun, …), scheme rules metadata.
- **Owned master data:** Scheme, Branch, Scheme-Branch mapping, versioning.
- **Consumers:** Coverage, Contributions, Benefits, Finance, Compliance.
- **Dependencies:** Platform Foundation, Location, Reference Data.
- **Future scalability:** New schemes (unemployment, parental, health), scheme sunset workflow.
- **Shared services:** SchemeService, BranchService.
- **Route namespace (future):** `/scheme/*`

### 1.12 Contribution
- **Purpose:** Own the collection of contributions.
- **Responsibility:** Contribution schedules, wage bases, ceilings, rates, filings, penalties, interest, employer filings, self-employed filings.
- **Owned master data:** Contribution schedule, rate table, penalty rules, filing periods.
- **Consumers:** Coverage (accrual), Benefits (eligibility), Finance (posting), Compliance.
- **Dependencies:** Employer, Person, Scheme, Location, Reference Data, Payment.
- **Future scalability:** Real-time filings, API-driven employer integrations.
- **Shared services:** ContributionService, FilingService, RateService.
- **Route namespace (future):** `/c3/*` (existing)

### 1.13 Benefits
- **Purpose:** Own the definition and delivery of benefit products.
- **Responsibility:** Benefit product master, product versions, product-specific bindings (documents, formulas, eligibility, participant roles, allowed channels), applications, claims, entitlements.
- **Owned master data:** Benefit product, product version, product bindings, application, claim, entitlement.
- **Consumers:** Payment, Finance, Case Management, Reporting.
- **Dependencies:** Person, Employer, Coverage, Scheme, Identity, Location, Legal, Document, Reference Data, Validation, Payment.
- **Future scalability:** New benefit families, portability, cross-border claims.
- **Shared services:** BenefitProductService, ClaimService, EntitlementService.
- **Route namespace (future):** `/bn/*` (existing)

### 1.14 Finance
- **Purpose:** Own the general ledger and the money truth.
- **Responsibility:** Chart of accounts, postings, journals, reconciliation, receivables/payables, budget interface.
- **Owned master data:** GL account, journal, posting rule.
- **Consumers:** Contribution (revenue), Benefits (expense), Payment (settlement), Reporting.
- **Dependencies:** Platform Foundation, Organisation, Location (currency), Payment.
- **Future scalability:** IFRS/actuarial ledger, sub-ledgers per scheme.
- **Shared services:** LedgerService, PostingService, ReconciliationService.
- **Route namespace (future):** `/finance/*`

### 1.15 Payment
- **Purpose:** Own the "how money moves in and out."
- **Responsibility:** Payment channels (EFT/cheque/cash/internal), bank & branch master, EFT format specs, payment profile, payment runs, receipts.
- **Owned master data:** Payment channel, bank, bank branch, EFT format, payment profile, payment run.
- **Consumers:** Benefits (disbursement), Contribution (collection), Finance (settlement), Portals.
- **Dependencies:** Location, Person, Employer, Organisation, Platform Foundation.
- **Future scalability:** Real-time payment rails, mobile wallets, cross-border remittance.
- **Shared services:** PaymentChannelService, BankService, PaymentProfileService, PaymentRunService.
- **Route namespace (future):** `/ssp/payment-channels`, `/ssp/banks`, `/payment/*`

### 1.16 Case Management
- **Purpose:** Provide a generic case/workbasket/SLA engine used by verticals.
- **Responsibility:** Case, workbasket, assignment, escalation, SLA, task, comment thread.
- **Owned master data:** Case type registry, workbasket, escalation policy, SLA policy.
- **Consumers:** Compliance, Legal, Benefits, Contribution, Portals.
- **Dependencies:** Platform Foundation, Organisation, Person, Employer.
- **Future scalability:** Cross-domain case linkage, ML routing, citizen-360 case view.
- **Shared services:** CaseService, WorkbasketService, SlaService.
- **Route namespace (future):** `/case/*`

### 1.17 Legal
- **Purpose:** Own legal matters, hearings, orders, settlements, and legal recovery.
- **Responsibility:** Matter, hearing, order, appeal, settlement, legal fee, judicial calendar linkage.
- **Owned master data:** Matter, order, hearing, settlement, fee master.
- **Consumers:** Compliance, Finance, Reporting, Portals.
- **Dependencies:** Case Management, Reference Data (legal refs), Person, Employer, Document, Payment.
- **Future scalability:** Court system integrations, e-filing.
- **Shared services:** MatterService, HearingService, OrderService, SettlementService.
- **Route namespace (future):** `/legal/*`

### 1.18 Compliance
- **Purpose:** Own compliance monitoring, audits, and enforcement referrals.
- **Responsibility:** Risk scoring, sampling, audits, violations, referrals to Legal.
- **Owned master data:** Risk model, sampling config, audit case, violation catalogue.
- **Consumers:** Legal, Finance, Reporting, Portals.
- **Dependencies:** Case Management, Employer, Contribution, Legal, Document, Reference Data.
- **Future scalability:** ML risk models, real-time anomaly detection.
- **Shared services:** RiskScoringService, AuditCaseService.
- **Route namespace (future):** `/compliance/*`

### 1.19 Document
- **Purpose:** Own the document type master and document lifecycle.
- **Responsibility:** Document type catalogue, document instance metadata, versioning, retention, links to owning entity.
- **Owned master data:** Document type, document instance, document version, retention policy.
- **Consumers:** Benefits, Compliance, Legal, Person, Employer, Portals.
- **Dependencies:** Platform Foundation (DMS engine), Organisation, Reference Data.
- **Future scalability:** OCR, e-signature, watermarking, legal-hold.
- **Shared services:** DocumentTypeService, DocumentInstanceService.
- **Route namespace (future):** `/document/*`

### 1.20 Reporting
- **Purpose:** Provide governed, versioned reports across all domains.
- **Responsibility:** Report catalogue, report definitions, scheduled runs, distribution.
- **Owned master data:** Report definition, report run, distribution list.
- **Consumers:** All modules, executives, external stakeholders.
- **Dependencies:** All source domains.
- **Future scalability:** Self-service BI, embedded reports.
- **Shared services:** ReportCatalogueService, ReportRunService.
- **Route namespace (future):** `/reporting/*`

### 1.21 Analytics
- **Purpose:** Provide event-driven and aggregate analytics.
- **Responsibility:** Event stream schema, metrics store, dashboards.
- **Owned master data:** Event schema, metric definitions, dashboard definitions.
- **Consumers:** Reporting, Executives, Product owners.
- **Dependencies:** All producing domains, Platform Foundation.
- **Future scalability:** Streaming pipeline, warehouse export.
- **Shared services:** AnalyticsService, MetricsService.
- **Route namespace (future):** `/analytics/*`

### 1.22 Integration
- **Purpose:** Own external system contracts (banks, tax, courts, national ID, other government agencies).
- **Responsibility:** Integration endpoints, credentials scope, contract versions, mapping, retry/DLQ.
- **Owned master data:** Integration endpoint, credential ref, contract mapping.
- **Consumers:** Any domain making an external call.
- **Dependencies:** Platform Foundation (API Gateway, Secrets), all consuming domains.
- **Future scalability:** Event-driven integrations, iPaaS, government service bus.
- **Shared services:** IntegrationGatewayService, ContractRegistryService.
- **Route namespace (future):** `/integration/*`

---

## 2. Domain Classes

| Class | Domains |
|---|---|
| Foundational | Platform Foundation, Organisation |
| Shared Enterprise | Identity, Location & Jurisdiction, Reference Data, Lookup Registry, Validation, Document, Payment |
| Social Security Core | Person, Employer, Coverage, Scheme, Contribution |
| Business Verticals | Benefits, Compliance, Legal, Finance |
| Cross-cutting Operations | Case Management, Reporting, Analytics, Integration |

---

## 3. Non-Goals

- No implementation, tables, routes, hooks, services, menus, `app_modules`, feature flags, or permissions.
- No renames, migrations, or BN Product Builder work.

## 4. Acceptance

- Every domain documents: Purpose, Responsibility, Owned Data, Consumers, Dependencies, Scalability, Shared Services, Future Route Namespace.
- Catalogue is exhaustive for current known scope and extensible to future modules (HRMS, Licensing, Prison, DMS, etc.).
