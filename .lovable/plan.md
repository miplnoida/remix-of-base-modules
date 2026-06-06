
# Three External BN Portals on a Shared Integration Framework

Internal BN stays the source of truth for eligibility, calculation, workflow, decisions, payments and letters. The three external portals (Claimant, Employer, Doctor) are separate UI sections that consume Internal BN through a single shared API client and never re-implement business rules.

## 1. Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                Internal BN (LAN, source of truth)        │
│  Product Catalog · Screen & Field Library · Workflow ·   │
│  Document Rules · Calculation · Decision · Payments      │
└──────────────────────────────────────────────────────────┘
                   ▲                ▲
                   │  public API    │  edge functions
                   │                │
┌──────────────────┴────────────────┴──────────────────────┐
│        Shared external framework (one codebase)          │
│  externalAuthService · publicBenefitApiClient ·          │
│  externalTaskService · externalDocumentUploadService ·   │
│  externalMessageService · ExternalPortalShell            │
└──────────────────────────────────────────────────────────┘
       ▲                   ▲                    ▲
┌──────┴──────┐    ┌───────┴──────┐    ┌────────┴────────┐
│  Claimant   │    │   Employer   │    │ Doctor/Medical  │
│   Portal    │    │    Portal    │    │     Portal      │
└─────────────┘    └──────────────┘    └─────────────────┘
```

Portals do not call any internal services directly. They only call the shared services, which call the public API. The same `ApplicationFormEngine` and `formDefinitionService` already used by Internal BN are reused — the API returns the *same* form definition with a `portalRole` filter applied server-side.

## 2. Database (additions only, no destructive changes)

New tables, all `public.` with role-based grants (RLS off, per project memory):

- **`bn_claim_participant`** — links a claim to a participant identity (`claimant` / `employer` / `doctor`) with contact ref, invite token, status.
- **`bn_external_task`** — one row per task issued to an external participant; columns include `claim_id`, `participant_id`, `task_type` (`SICKNESS_CERT`, `EMP_CONFIRMATION`, `INJURY_REPORT`, …), `due_at`, `status` (`PENDING` / `SUBMITTED` / `ACCEPTED` / `REJECTED` / `EXPIRED`), `secure_token_hash`, `payload jsonb`, `screen_template_id`.
- **`bn_external_task_document`** — uploads tied to a task (storage path, mime, sha256, uploaded_by).
- **`bn_external_task_audit`** — append-only event log per task (mirrors to `system_audit_trail` + `bn_claim_event`).

Existing `bn_claim_application`, `bn_claim_document`, `bn_claim_event`, `system_audit_trail` are reused for cross-cutting audit.

## 3. Public API surface (edge functions under `public-benefits/`)

All endpoints accept either a portal session JWT or a one-time secure task token.

| Verb | Path | Purpose |
|------|------|---------|
| GET  | `/api/public/benefits/products` | List products with `public_channel_enabled = true` |
| GET  | `/api/public/benefits/products/:productCode/form-definition?portalRole=CLAIMANT\|EMPLOYER\|DOCTOR` | Reuses `formDefinitionService.getApplicationFormDefinition` and filters fields/sections by participant role |
| POST | `/api/public/benefits/applications` | Create a `bn_claim_application` draft/submit |
| GET  | `/api/public/claims/:claimNumber/status` | Status + decision/payment summary |
| GET  | `/api/public/tasks` | Tasks visible to caller (role-scoped) |
| GET  | `/api/public/tasks/:taskId` | Task detail with assigned screen template |
| POST | `/api/public/tasks/:taskId/submit` | Submit response → updates `bn_external_task`, fires `bn_claim_event`, clears workflow blocker when accepted |
| POST | `/api/public/documents/upload` | Signed upload, writes to `bn_claim_document` or `bn_external_task_document` |
| GET  | `/api/public/messages` | Letters/messages visible to caller |

Server-side guards:
- Employer caller only sees tasks where `participant.kind = 'EMPLOYER'` and employer match.
- Doctor caller only sees `participant.kind = 'DOCTOR'`.
- Claimant only sees own claims (`ssn` match).
- Secure token tasks bypass session but are single-use + expiring.

## 4. Shared framework (`src/portals/_shared/`)

- `externalAuthService.ts` — session, secure token exchange, role detection.
- `publicBenefitApiClient.ts` — thin fetch wrapper; one entry per endpoint above; never imports internal BN services.
- `externalTaskService.ts` — list/fetch/submit tasks; emits optimistic updates.
- `externalDocumentUploadService.ts` — chunked upload + signed URL refresh.
- `externalMessageService.ts` — fetch/mark-read.
- `ExternalPortalShell.tsx` — top bar, role badge, sign-out, locale, brand.
- `usePublicFormDefinition.ts` — wraps `useQuery` over `/form-definition`; feeds the existing `ApplicationFormEngine` unchanged.

## 5. Portal UIs (separate route trees, one app)

**Claimant** `/claimant/*`:
`dashboard`, `apply`, `apply/:productCode`, `claims`, `claims/:claimNumber`, `tasks`, `documents`, `messages`, `payments`, `profile`.

**Employer** `/employer/*`:
`dashboard`, `tasks`, `tasks/:taskId`, `employee-claims`, `accident-reports`, `confirmations`, `messages`.

**Doctor** `/doctor/*`:
`dashboard`, `tasks`, `tasks/:taskId`, `certificates`, `medical-reports`, `disablement-assessments`, `messages`.

Each portal mounts `ExternalPortalShell` with its role and a left nav. All "form" screens render `ApplicationFormEngine` with the definition returned by `/form-definition` — no portal owns field lists, validation, eligibility or calc.

## 6. Internal BN integration (Claim Workbench)

Add a **Participants tab** to the existing Claim Workbench:
- Lists claimant, employer(s), doctor(s) from `bn_claim_participant`.
- Per participant: task status, submitted payload (read-only render of the same screen template), documents, accept / reject / reopen, resend invite (re-mints secure token).
- Accepting a task fires the existing workflow advance; rejecting reopens the task with a reason.

## 7. Audit & events

Every external action writes to `system_audit_trail` (user_code = participant identity) and inserts a `bn_claim_event` so the existing timeline shows it. `bn_external_task_audit` keeps a per-task ledger for evidence.

## 8. Build order

1. Migration: `bn_claim_participant`, `bn_external_task`, `bn_external_task_document`, `bn_external_task_audit` + grants.
2. Edge function `public-benefits` implementing all endpoints, role-scoped, reusing `formDefinitionService`.
3. Shared framework under `src/portals/_shared/`.
4. Three portal route trees + nav shells + skeleton pages wired to the shared services.
5. Claim Workbench → Participants tab.
6. Verification pass: claimant submit, employer confirm, doctor certificate; confirm workflow blocker clears only after officer accepts.

## 9. Non-goals (explicit)

- No business rules in portals.
- No new product/eligibility/calc tables.
- No changes to existing intake; portals reuse `ApplicationFormEngine` and the same form definitions.
- No RLS additions (project policy); access enforced in the edge function.

Approve and I'll start with the migration + edge function, then the shared framework, then the three portal shells, then the Workbench Participants tab.
