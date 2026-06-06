
# External Stakeholder Portals — Full SSB Scope

Re-scope the three external portals from "benefit application screens" to full Social Security Board stakeholder portals. Internal LAN remains source of truth; portals only consume APIs.

## What's in scope

### 1. Shared portal infrastructure (`src/portals/_shared/`)
- `ExternalPortalLayout` (sidebar + header + content area + footer)
- `ExternalPortalSidebar` — module list driven by per-portal config array
- `ExternalPortalHeader` — user identity, switch role (employer multi-user), logout
- `ExternalDashboardCard`, `ExternalStatusTimeline`, `ExternalEmptyState`
- `ExternalFormRenderer` — already covered by `ApplicationFormEngine`; thin wrapper
- `ExternalDocumentUploader`, `ExternalMessageCenter`, `ExternalLetterViewer`
- Keep existing `SecureTaskPage`, `ExternalTaskList`, `ExternalTaskForm`

### 2. Shared services (`src/services/external/`)
Extend existing `publicBenefitApiClient.ts` and add:
- `externalProfileService` — `getProfile`, `updateProfile`
- `externalMessageService` — `getMessages`, `markRead`
- `externalDocumentService` — `getDocuments`, `uploadDocument`
- `externalTaskService` — `getTasks`, `submitTask`
- `externalContributionService` — `getContributionHistory`, `getEmploymentHistory`
- `externalClaimService` — `getClaims`, `getClaimDetail`, `getAwards`, `getPayments`
- `externalEmployerService` — `getEmployees`, `submitC3`, `uploadC3`, `validateC3`, `getC3History`, `getBalances`, `getComplianceNotices`, `submitConfirmation`, `submitAccidentReport`
- `externalAuditService` — fire-and-forget audit writes
All call the existing `public-benefits` edge function (extended with new actions) — no business logic in the browser.

### 3. Claimant Portal (`/claimant/*`)
Routes: dashboard, profile, contributions, employment-history, apply, apply/:productCode, claims, claims/:claimNumber, awards, payments, life-certificates, school-certificates, bank-details, documents, messages, appeals, tasks.

Each module is a page that calls the matching shared service and renders read-only tables/cards plus the existing form engine where input is needed.

### 4. Employer Portal (`/employer/*`)
Routes: dashboard, profile, users, employees, employees/add, c3, c3/new, c3/upload, c3/:period, c3/errors, contributions, payments, balances, penalties, compliance, benefit-tasks, confirmations, accident-reports, wage-confirmations, documents, messages.

C3 submission/upload/validation calls API only — internal C3 module performs validation and returns errors for portal display.

### 5. Doctor / Medical Provider Portal (`/doctor/*`)
Routes: dashboard, profile, users, tasks, tasks/:taskId, certificates, sickness-certificates, maternity-certificates, ei-medical-reports, invalidity-reports, disablement-assessments, reviews, documents, messages.

All certificates use the existing screen template engine (`MEDICAL_CERTIFICATE_BLOCK` smart field) — no hardcoded medical forms.

### 6. Edge function extensions (`supabase/functions/public-benefits/index.ts`)
New action handlers (all auth-scoped):
- `profile.get/update`
- `messages.list/markRead`
- `documents.list/upload-url`
- `contributions.history`, `employment.history`
- `claims.list/get`, `awards.list`, `payments.list`
- `employer.employees/c3.submit/c3.upload/c3.validate/c3.history/balances/notices/confirmation/accident-report`
- `doctor.tasks/certificate.submit`

Each writes a `system_audit_trail` row.

### 7. Security
- Claimant: `auth.uid()` → linked `ip_master.ssn`; only own records.
- Employer: portal user → `er_master.regno` link table; role checks via `user_roles` extended with employer-scoped roles (`EMPLOYER_ADMIN`, `PAYROLL_OFFICER`, `HR_OFFICER`, `COMPLIANCE_CONTACT`, `BENEFIT_CONFIRMATION_USER`).
- Doctor: provider link table → only tasks assigned to provider or facility.
- Secure token flow already in place via `bn_external_task.access_token`.

## What is NOT in scope this turn
- Implementing every business-rule API end-to-end. Many internal modules (C3 validation, payments, awards) already have services in the codebase — the edge function will call them. Where an internal service is missing, the API returns a typed "not yet wired" response and the portal shows an "Coming soon — data not yet exposed" empty state so the navigation/shell is complete and verifiable.
- No new RLS (project policy: role-based only).

## Build order
1. Shared layout + sidebar config + services scaffolding.
2. Extend `public-benefits` edge function with new action router + audit.
3. Claimant portal pages (dashboard, profile, contributions, employment, claims, awards, payments, certificates, bank, documents, messages, appeals, tasks).
4. Employer portal pages (dashboard, profile, users, employees, C3 suite, contributions, payments, balances, penalties, compliance, benefit-tasks, confirmations, accident-reports, documents, messages).
5. Doctor portal pages (dashboard, profile, users, tasks, all certificate types, reviews, documents, messages).
6. Route registration in `PublicRoutes`.
7. Verify TypeScript build + walk through each portal.

## Technical notes
- All data fetching via TanStack Query through the new services.
- All forms via existing `ApplicationFormEngine` with `channel="PUBLIC"`; no hardcoded form JSX.
- Audit calls are fire-and-forget per project Error Handling standard.
- Existing memory `mem://architecture/protected-source-table-policy` respected — no write-path mods to core tables; new wiring is API-side.
- Confirmation: this is a large multi-turn build. After approval, I'll deliver in the order above and pause between phases for review.

## Heads-up
This will create ~60+ new files. I'll keep each page lean (table + service hook), reuse shared components, and avoid duplicating any internal business logic.
