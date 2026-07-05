# Domain Service Catalogue

> **Status:** Architecture only. **Do NOT implement.** No code, hooks, services, routes, or schema are created by this document.
> Companion to `ENTERPRISE_DOMAIN_MODEL.md`, `DOMAIN_BOUNDARIES.md`, `SHARED_MASTER_DATA_MODEL.md`.

Defines the **future** service and hook surface each domain will expose. Every entry lists: Purpose · Consumers · Read APIs · Validation APIs · Caching · Example hooks.

Notation: `useXxx()` = client hook (React Query), `XxxService.method()` = server-side/BFF surface. Names are intentional targets, not current code.

---

## 1. Location Service
- **Purpose:** Serve country/geo/address truth to every module.
- **Consumers:** ALL.
- **Read APIs:** `listCountries()`, `getCountry(code)`, `listRegions(countryCode)`, `listDistricts(regionCode)`, `getAddressModel(countryCode)`, `listPostalCodes(regionCode)`, `getCurrency(countryCode)`.
- **Validation APIs:** `validateAddress(countryCode, address)`, `validatePostalCode(countryCode, code)`.
- **Caching:** Long TTL (24h) with per-country invalidation on admin write.
- **Example hooks:** `useCountries()`, `useCountry(code)`, `useAddressModel(code)`, `useRegions(code)`, `usePostalCodes(regionCode)`.

## 2. Identity Service
- **Purpose:** Serve ID types and rules; validate identifiers.
- **Consumers:** Person, Employer, Benefits, Contribution, Compliance, Legal, Portals.
- **Read APIs:** `listIdentityTypes()`, `getIdRules(countryCode)`, `getPrimaryIdRule(countryCode)`.
- **Validation APIs:** `validateIdByCountry(countryCode, value, typeCode?)`, `formatId(countryCode, value)`.
- **Caching:** Long TTL per country.
- **Example hooks:** `useIdentityRules(countryCode)`, `useIdentityTypes()`, `useIdValidator(countryCode)`.

## 3. Validation Service
- **Purpose:** Reusable format, cross-field, and business-rule validators.
- **Consumers:** ALL input surfaces (web, portals, back-office).
- **Read APIs:** `listValidationRules(scope)`, `getRule(code)`.
- **Validation APIs:** `runRule(code, payload)`, `runRuleSet(scope, payload)`.
- **Caching:** In-memory per session; server-side symmetric with client.
- **Example hooks:** `useValidationRule(code)`, `useValidationRunner(scope)`.

## 4. Legal Reference Service
- **Purpose:** Serve legal acts, sections, and country-level linkages.
- **Consumers:** Benefits, Compliance, Legal, Portals.
- **Read APIs:** `listLegalActs(countryCode)`, `listSections(actCode)`, `getLegalReference(id)`, `listCountryLegalRefs(countryCode, {productId?})`.
- **Validation APIs:** `validateCitation(id, effectiveDate)`.
- **Caching:** Medium TTL with version key.
- **Example hooks:** `useLegalReferences(countryCode, opts)`, `useLegalAct(code)`.

## 5. Lookup Service
- **Purpose:** Serve any registered lookup by name via a single surface.
- **Consumers:** UI/BFF everywhere.
- **Read APIs:** `getLookup(name, {countryCode?, scope?})`, `listLookups()`.
- **Validation APIs:** `isMemberOf(lookupName, value)`.
- **Caching:** Per-lookup TTL declared in registry.
- **Example hooks:** `useLookup(name, opts)`, `useLookupList()`.

## 6. Bank Service
- **Purpose:** Serve bank & branch master.
- **Consumers:** Benefits, Contribution, Finance, Employer, Portals.
- **Read APIs:** `listBanks(countryCode?)`, `getBank(code)`, `listBranches(bankCode)`, `getBranch(bankCode, branchCode)`.
- **Validation APIs:** `validateAccount(countryCode, bankCode, branchCode, account)`.
- **Caching:** Medium TTL per country/bank.
- **Example hooks:** `useBanks(countryCode)`, `useBankBranches(bankCode)`, `useBank(code)`.

## 7. Payment Channel Service
- **Purpose:** Serve enabled payment channels per country and profile lifecycle.
- **Consumers:** Benefits, Contribution, Finance, Portals.
- **Read APIs:** `listPaymentChannels(countryCode)`, `getPaymentChannel(code)`, `listEftFormats(countryCode, bankCode?)`.
- **Validation APIs:** `validatePaymentProfile(profile, policy)`.
- **Caching:** Long TTL per country.
- **Example hooks:** `usePaymentChannels(countryCode)`, `usePaymentMethods()`, `useEftFormats(bankCode)`.

## 8. Participant Service
- **Purpose:** Serve country-level participant type catalogue and lifecycle.
- **Consumers:** Benefits, Legal, Compliance, Portals.
- **Read APIs:** `listParticipantTypes(countryCode)`, `listActiveParticipantTypes(countryCode)`, `getParticipantTypeUsage(countryCode)`.
- **Validation APIs:** `validateRequiredRoles(productId, participants)`.
- **Caching:** Medium TTL, invalidate on lifecycle change.
- **Example hooks:** `useParticipantTypes(countryCode)`, `useActiveParticipantTypes(countryCode)`.

## 9. Employer Classification Service
- **Purpose:** Serve employer type/industry classification and rules.
- **Consumers:** Employer, Compliance, Contribution.
- **Read APIs:** `listEmployerTypes()`, `listIndustries()`, `getClassification(employerId)`.
- **Validation APIs:** `validateClassification(employerId, classification)`.
- **Caching:** Long TTL.
- **Example hooks:** `useEmployerTypes()`, `useIndustries()`, `useEmployerClassification(id)`.

## 10. Reference Data Service
- **Purpose:** Serve generic reference groups and values.
- **Consumers:** ALL.
- **Read APIs:** `listGroups()`, `listValues(groupCode, {countryCode?, at?})`, `getValue(groupCode, code)`.
- **Validation APIs:** `isValidValue(groupCode, code, at?)`.
- **Caching:** Long TTL per group + version key.
- **Example hooks:** `useReferenceData(groupCode, opts)`, `useReferenceGroup(code)`.

## 11. Calendar Service
- **Purpose:** Serve working calendars, holidays, and business-day math.
- **Consumers:** Case Mgmt, Contribution, Benefits, Legal.
- **Read APIs:** `listCalendars(orgId)`, `listHolidays(countryCode, year)`, `addBusinessDays(calendarId, from, days)`.
- **Validation APIs:** `isBusinessDay(calendarId, date)`.
- **Caching:** Long TTL per calendar/year.
- **Example hooks:** `useCalendars()`, `useHolidays(countryCode, year)`, `useBusinessDayMath(calendarId)`.

## 12. Coverage Service
- **Purpose:** Serve point-in-time coverage state.
- **Consumers:** Benefits, Contribution, Compliance, Reporting.
- **Read APIs:** `getCoverage(personId, at)`, `listCoverageHistory(personId)`.
- **Validation APIs:** `assertCoveredAt(personId, at, schemeCode)`.
- **Caching:** Short TTL; event-driven invalidation.
- **Example hooks:** `useCoverage(personId, at)`, `useCoverageHistory(personId)`.

## 13. Case Service
- **Purpose:** Generic case/workbasket API for verticals.
- **Consumers:** Compliance, Legal, Benefits, Contribution.
- **Read APIs:** `listCases(filter)`, `getCase(id)`, `listMyWorkbasket(userId)`.
- **Validation APIs:** `assertAssignable(caseId, userId)`.
- **Caching:** Short TTL.
- **Example hooks:** `useCases(filter)`, `useCase(id)`, `useMyWorkbasket()`.

## 14. Document Service
- **Purpose:** Document type catalogue + document instances.
- **Consumers:** Benefits, Compliance, Legal, Person, Employer, Portals.
- **Read APIs:** `listDocumentTypes(scope)`, `getDocument(id)`, `listDocumentsFor(entityType, entityId)`.
- **Validation APIs:** `validateDocument(typeCode, meta)`.
- **Caching:** Long TTL for types; short for instances.
- **Example hooks:** `useDocumentTypes(scope)`, `useDocument(id)`, `useDocumentsFor(entity)`.

## 15. Notification Service (Platform)
- **Purpose:** Serve templates and dispatch.
- **Consumers:** ALL.
- **Read APIs:** `listTemplates(scope)`, `getTemplate(code)`.
- **Validation APIs:** `renderTemplate(code, payload)`.
- **Caching:** Long TTL.
- **Example hooks:** `useNotificationTemplates(scope)`, `useTemplate(code)`.

## 16. Workflow Service (Platform)
- **Purpose:** Serve workflow definitions and drive instances.
- **Consumers:** Verticals via Case Management.
- **Read APIs:** `listWorkflows(scope)`, `getWorkflow(code)`.
- **Validation APIs:** `canTransition(instanceId, action, userId)`.
- **Caching:** Long TTL for definitions.
- **Example hooks:** `useWorkflow(code)`, `useWorkflowInstance(id)`.

## 17. Numbering Service (Platform)
- **Purpose:** Allocate business numbers safely.
- **Consumers:** ALL.
- **Read APIs:** `preview(seriesCode)`.
- **Write APIs (future):** `allocate(seriesCode)`.
- **Caching:** None (allocations must be authoritative).
- **Example hooks:** `useNumberPreview(seriesCode)`.

## 18. Auth / RBAC Service (Platform)
- **Purpose:** Session + permission checks.
- **Consumers:** ALL.
- **Read APIs:** `me()`, `hasPermission(perm)`, `listMyRoles()`.
- **Caching:** In-session.
- **Example hooks:** `useAuth()`, `usePermission(perm)`, `useMyRoles()`.

## 19. Integration Gateway Service
- **Purpose:** Mediate external calls (banks, tax, courts, national ID).
- **Consumers:** Any domain making external calls.
- **Read APIs:** `listEndpoints(scope)`, `getContract(code)`.
- **Validation APIs:** `validateContract(code, payload)`.
- **Caching:** None on call path; long TTL on definitions.
- **Example hooks:** `useIntegrationEndpoint(code)`.

## 20. Reporting Service
- **Purpose:** Serve report definitions and runs.
- **Consumers:** All modules.
- **Read APIs:** `listReports(scope)`, `getReport(code)`, `listRuns(reportCode)`.
- **Caching:** Long TTL for definitions.
- **Example hooks:** `useReports(scope)`, `useReport(code)`, `useReportRuns(code)`.

---

## 21. Global Service Conventions (targets)

- All read hooks return React Query results; keys are `[domain, entity, ...args]`.
- All services expose a `capabilities()` endpoint declaring version and features (for the Lookup Registry).
- All services are **stateless per call**; state lives in owning domain stores.
- All services log via Platform Audit; L3-audited masters attach reason codes on writes.
- All services surface `effective_from` / `effective_to` awareness where the underlying master is effective-dated.

---

## 22. Non-Goals

- No implementation now. This document is a target contract catalogue used by Epics 0.36B–0.36D.
