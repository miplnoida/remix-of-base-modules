# Domain Boundaries

> **Status:** Architecture only. No code, schema, routes, `app_modules`, menus, hooks, services, or feature-flag changes.
> Companion to `ENTERPRISE_DOMAIN_MODEL.md`.

For each domain: **Owns · Consumes · Extends · Overrides · Cannot Own · Cannot Modify · Cross-domain contracts**.

Conventions:
- **Owns** = single write authority.
- **Consumes** = read-only via service contract.
- **Extends** = may add domain-specific attributes attached by reference (never in the owning table).
- **Overrides** = may narrow (not widen) an owner's value for the domain's own scope (e.g. Benefits can restrict allowed payment channels for a product, but cannot invent a new channel).
- **Cannot Own / Cannot Modify** = hard rules that prevent silent duplication.

---

## 1. Platform Foundation
- **Owns:** Users, roles, permissions, workflow definitions, notification templates, feature flags, audit log, number series, API keys, DMS engine.
- **Consumes:** —
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Business masters (country, bank, benefit product, employer…).
- **Cannot Modify:** Any domain's business data.
- **Contracts:** `AuthContract`, `RbacContract`, `AuditContract`, `WorkflowContract`, `NotificationContract`, `NumberingContract`, `DmsContract`, `FeatureFlagContract`.

## 2. Organisation
- **Owns:** Tenant profile, offices/branches, org units, calendars, org roles, org document types.
- **Consumes:** Platform Foundation (RBAC, Audit).
- **Extends:** Location (offices reference addresses).
- **Overrides:** —
- **Cannot Own:** Country, ID rules, scheme, benefit product.
- **Cannot Modify:** Any SSP or vertical master.
- **Contracts:** `OrganisationContract`, `OfficeContract`, `CalendarContract`.

## 3. Identity
- **Owns:** Identity type catalogue, per-country ID rules, primary ID selection, verification policy.
- **Consumes:** Location (country), Reference Data (status codes), Validation.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Person records, Employer records.
- **Cannot Modify:** Person/Employer/Portal data.
- **Contracts:** `IdentityContract`, `IdValidationContract`.

## 4. Location & Jurisdiction
- **Owns:** Country, currency link, locale, region/state/parish/district, postal code, address model per country, timezone.
- **Consumes:** Platform Foundation.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Person/Employer/Bank/Benefit product.
- **Cannot Modify:** Any consumer's data.
- **Contracts:** `LocationContract`, `AddressContract`, `JurisdictionContract`.
- **Hard rules:** *Benefits, Employer, Finance, Payment MUST consume Location. Benefits must NOT own Country.*

## 5. Reference Data
- **Owns:** Reference groups & values (relationship, marital status, occupation, industry, education, nationality, generic statuses).
- **Consumes:** Location (country scoping), Platform Foundation.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Anything domain-specific (bank, ID rule, legal act…).
- **Cannot Modify:** Consumer data.
- **Contracts:** `ReferenceDataContract`.

## 6. Lookup Registry
- **Owns:** Registry of lookups (name → source domain/service).
- **Consumes:** All domains that expose lookups.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** The underlying lookup values themselves.
- **Cannot Modify:** Source data.
- **Contracts:** `LookupRegistryContract`.

## 7. Validation
- **Owns:** Validation rule catalogue, format specs, reusable validators.
- **Consumes:** Identity, Location, Reference Data.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Business entities.
- **Cannot Modify:** Consumer data.
- **Contracts:** `ValidationContract`.

## 8. Person
- **Owns:** Person, Person-Identity link, Person-Address link, Person-Contact, Person-Relationship, dependants.
- **Consumes:** Identity, Location, Reference Data, Validation, Document.
- **Extends:** Adds domain attributes via Person-Extension tables per module (never mutates Person core).
- **Overrides:** —
- **Cannot Own:** ID rule, address model, relationship code list.
- **Cannot Modify:** Identity/Location/Reference-Data masters.
- **Contracts:** `PersonContract`, `RelationshipContract`.

## 9. Employer
- **Owns:** Employer master, Employer-Site, Employer-Classification, Employer-Contact.
- **Consumes:** Identity, Location, Reference Data (industry/NACE), Validation, Document.
- **Extends:** Employer-Extension per vertical (Contribution profile, Compliance profile).
- **Overrides:** —
- **Cannot Own:** Industry code list, ID rules, address model.
- **Cannot Modify:** Reference Data/Identity/Location masters.
- **Contracts:** `EmployerContract`, `EmployerClassificationContract`.

## 10. Coverage
- **Owns:** Coverage record, coverage transitions, exceptions.
- **Consumes:** Person, Employer, Scheme, Location, Reference Data.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Person/Employer/Scheme master.
- **Cannot Modify:** Source masters.
- **Contracts:** `CoverageContract`.

## 11. Scheme
- **Owns:** Scheme, Branch, Scheme-Branch mapping, versioning.
- **Consumes:** Location, Reference Data.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Benefit product, contribution rate, coverage record.
- **Cannot Modify:** Downstream data.
- **Contracts:** `SchemeContract`, `BranchContract`.

## 12. Contribution
- **Owns:** Contribution schedule, rate table, penalty rules, filing periods.
- **Consumes:** Employer, Person, Scheme, Location, Reference Data, Payment.
- **Extends:** Employer-Contribution profile.
- **Overrides:** May restrict allowed payment channels within its own filings, cannot invent new channels.
- **Cannot Own:** Employer, Person, Scheme, Payment channel.
- **Cannot Modify:** Upstream masters.
- **Contracts:** `ContributionContract`, `FilingContract`, `RateContract`.

## 13. Benefits
- **Owns:** Benefit product, product version, product bindings (docs/formulas/eligibility/participant/allowed channels), application, claim, entitlement.
- **Consumes:** Person, Employer, Coverage, Scheme, Identity, Location, Legal (refs), Document, Reference Data, Validation, Payment.
- **Extends:** Product-specific participant/document/formula bindings.
- **Overrides:** May restrict which SSP participant types, documents, or payment channels apply to a product; cannot invent new ones.
- **Cannot Own:** Country, ID rule, address model, participant type, legal act, bank, payment channel, document type, occupation.
- **Cannot Modify:** Any SSP or shared master.
- **Contracts:** `BenefitProductContract`, `ClaimContract`, `EntitlementContract`.

## 14. Finance
- **Owns:** GL account, journal, posting rule, reconciliation.
- **Consumes:** Contribution (revenue), Benefits (expense), Payment (settlement), Organisation, Location (currency).
- **Extends:** Sub-ledgers per scheme.
- **Overrides:** —
- **Cannot Own:** Payment channel, bank, benefit product, contribution rate.
- **Cannot Modify:** Payment/Benefits/Contribution masters.
- **Contracts:** `LedgerContract`, `PostingContract`, `ReconciliationContract`.

## 15. Payment
- **Owns:** Payment channel, bank, bank branch, EFT format, payment profile, payment run.
- **Consumes:** Location, Person, Employer, Organisation, Platform Foundation.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Person/Employer master, benefit product, contribution filing.
- **Cannot Modify:** Consumer masters.
- **Contracts:** `PaymentChannelContract`, `BankContract`, `PaymentProfileContract`, `PaymentRunContract`.

## 16. Case Management
- **Owns:** Case type registry, workbasket, assignment, escalation, SLA, task.
- **Consumes:** Platform Foundation, Organisation, Person, Employer.
- **Extends:** Case-Extension per vertical (Compliance/Legal/Benefits/Contribution case types).
- **Overrides:** —
- **Cannot Own:** Domain business data (violation, matter, claim).
- **Cannot Modify:** Vertical data.
- **Contracts:** `CaseContract`, `WorkbasketContract`, `SlaContract`.

## 17. Legal
- **Owns:** Matter, hearing, order, appeal, settlement, legal fee.
- **Consumes:** Case Management, Reference Data (legal refs), Person, Employer, Document, Payment.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Person/Employer master, payment channel, document type.
- **Cannot Modify:** Shared masters.
- **Contracts:** `MatterContract`, `OrderContract`, `HearingContract`.

## 18. Compliance
- **Owns:** Risk model, sampling config, audit case, violation catalogue.
- **Consumes:** Case Management, Employer, Contribution, Legal, Document, Reference Data.
- **Extends:** Employer-Compliance profile.
- **Overrides:** —
- **Cannot Own:** Employer, Contribution, Legal master.
- **Cannot Modify:** Upstream masters.
- **Contracts:** `RiskScoringContract`, `AuditCaseContract`.

## 19. Document
- **Owns:** Document type catalogue, document instance, versioning, retention.
- **Consumes:** Platform Foundation (DMS engine), Organisation, Reference Data.
- **Extends:** —
- **Overrides:** Organisation may add tenant-specific document types under governance rules.
- **Cannot Own:** Benefit product bindings.
- **Cannot Modify:** Vertical data.
- **Contracts:** `DocumentTypeContract`, `DocumentInstanceContract`.

## 20. Reporting
- **Owns:** Report definition, report run, distribution list.
- **Consumes:** All source domains.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Source master data.
- **Cannot Modify:** Source data.
- **Contracts:** `ReportCatalogueContract`, `ReportRunContract`.

## 21. Analytics
- **Owns:** Event schema, metric definitions, dashboard definitions.
- **Consumes:** All producing domains, Platform Foundation.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Business masters.
- **Cannot Modify:** Source data.
- **Contracts:** `AnalyticsContract`, `MetricsContract`.

## 22. Integration
- **Owns:** Integration endpoint, credential ref, contract mapping.
- **Consumes:** Platform Foundation, all consuming domains.
- **Extends:** —
- **Overrides:** —
- **Cannot Own:** Business masters.
- **Cannot Modify:** Domain data (only mediates).
- **Contracts:** `IntegrationGatewayContract`, `ContractRegistryContract`.

---

## 23. Canonical Cross-Domain Contracts (Illustrative)

- **Location Domain** owns Countries, States, Regions, Districts, Postal Codes, Geo hierarchy, Address formats, Locales.
  - Benefits, Employer, Finance, Payment, Person MUST consume Location.
  - Benefits, Employer, Finance MUST NOT own Country.
- **Identity Domain** owns ID types and rules.
  - Person, Employer, Portals MUST consume Identity.
  - Benefits MUST NOT own ID rules.
- **Payment Domain** owns payment channels, banks, branches, EFT formats.
  - Benefits, Contribution, Finance MUST consume Payment.
  - Benefits and Contribution MAY restrict channels per product/filing; MUST NOT invent a channel.
- **Reference Data Domain** owns cross-cutting code sets (relationship, occupation, industry).
  - All modules MUST consume Reference Data.
  - Modules MUST NOT create parallel code lists.
- **Document Domain** owns document types.
  - Benefits, Compliance, Legal MUST consume Document.
  - Benefits MAY bind documents to products; MUST NOT create new global document types (only bindings).
- **Legal Reference (owned within Legal + Reference Data)** owned centrally.
  - Compliance and Benefits MUST consume; MUST NOT own.

---

## 24. Non-Goals

- No implementation, no code, no schema, no routes, no menus, no `app_modules`, no flags.
- No rename or migration of any table today.
