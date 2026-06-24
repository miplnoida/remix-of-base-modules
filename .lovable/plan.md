# Benefits Module — DB-Driven Rebuild

## Audit findings

**Pages under `src/pages/benefits/` (the screens you flagged):**
| Page | Current state |
|---|---|
| `OnlineBenefitApplications.tsx` | Local `mockApplications` array, no DB |
| `AllBenefitsTabs.tsx` | Hardcoded `benefitForms` array |
| `MaternityBenefits.tsx` | `console.log` submit; hardcoded recent claims |
| `WorkInjuryBenefits.tsx` | `console.log` submit |
| `DeathBenefits.tsx` | `console.log` submit |
| `EducationalBenefits.tsx` | `console.log` submit |
| `UnemploymentBenefits.tsx` | `console.log` submit |

**Database state (key tables):**
- `bn_claim` = 19 rows, `bn_claim_application` = 17, `bn_claim_participant` = 2
- 100+ `bn_*` tables already exist (claim, claimant, decision, document, event, eligibility, payment, etc.)
- **No `bn_application` table** (your spec lists it, but the existing schema uses `bn_claim_application` + `bn_claim`)
- `bn_product` (benefit types) exists — that is what tabs should be driven from
- A **separate, richer Benefits module already lives at `src/pages/bn/`** (intake, workbench, claims, awards, payables, etc.) and *is* DB-driven against the same `bn_*` tables

## Important scoping question

The `src/pages/benefits/` folder is a **legacy/demo set of 7 simple forms**. The real benefits product is `src/pages/bn/*` (intake console, claim workbench, awards, payables, schedule, servicing, etc.) which already reads from `bn_*`. Rebuilding `/benefits/*` to duplicate `/bn/*` would create two parallel modules.

**Recommended approach (Option A — what this plan executes):**
1. Treat `/benefits/*` as the **citizen/officer quick-entry surface** that writes into the same `bn_*` tables `/bn/*` reads from. No new parallel schema.
2. Reuse existing tables — do not create `bn_application`, `bn_benefit_type`, `bn_claimant`, etc. (already covered by `bn_claim_application`, `bn_product`, `bn_claim_participant`).
3. Drop every mock array and `console.log` submit; wire each form to insert real rows.

If you'd rather **delete `/benefits/*` and redirect to `/bn/*`** (Option B), say so and I'll do that instead — it's a much smaller change.

## Scope of this delivery (Option A)

### 1. Shared services & hooks (new)
- `src/services/benefits/bnApplicationService.ts` — create/list/get against `bn_claim_application`
- `src/services/benefits/bnClaimService.ts` — create/list/get against `bn_claim` (+ `bn_claim_participant`, `bn_claim_detail`)
- `src/services/benefits/bnReferenceService.ts` — `bn_product` (benefit types), `bn_claim_status_def`, `bn_reason_code`
- `src/services/benefits/bnDocumentService.ts` — links into `bn_claim_document` via existing DMS proxy
- `src/services/benefits/bnLegalReferralService.ts` — inserts `bn_legal_referral` + calls Legal Intake
- `src/hooks/benefits/useBnApplications.ts`, `useBnClaims.ts`, `useBnBenefitTypes.ts`, `useBnClaimDetail.ts`
- Numbering via existing `coreNumberingService` keys: `BENEFITS/APPLICATION`, `BENEFITS/CLAIM`, `BENEFITS/PAYMENT`, `BENEFITS/LEGAL_REFERRAL`

### 2. Page rewrites (`src/pages/benefits/*`)
- **OnlineBenefitApplications** → `useBnApplications()` list with view/approve/reject/request-info/convert-to-claim actions writing to DB
- **AllBenefitsTabs** → tabs from `useBnBenefitTypes()` (active `bn_product`), each tab renders a generic benefit form mounted with that product's code
- **Maternity / WorkInjury / Death / Educational / Unemployment** → all submits call `bnApplicationService.create()` or `bnClaimService.create()` with benefit-specific fields stored in `bn_claim_detail` (JSON column) and recent-claims panel reads from `bn_claim` filtered by `benefit_type_code`
- Remove all mock arrays and `console.log` submits
- Toast + ValidationSummary per project standards; `createdBy = current user_code`

### 3. Seed data (idempotent, tagged `SEED-BN-`)
Insert via `supabase--insert` into the existing tables:
- 1 maternity claim (pending docs)
- 1 sickness claim (approved, paid)
- 1 age pension claim (active award)
- 1 funeral grant (paid)
- 1 invalidity/survivor case
- 1 overpayment row (`bn_overpayment`)
- 1 appeal row (`bn_claim_event` + decision)
- 1 claim referred to Legal (`bn_legal_referral` + linked `lg_case_intake`)

### 4. Legal integration
On appeal/overpayment/fraud actions: insert `bn_legal_referral`, generate `BENEFITS/LEGAL_REFERRAL` number, push to `lg_case_intake` with claim/person/document links.

### 5. Validation
- TypeScript build passes
- `rg "mock|console\.log\(\"" src/pages/benefits` returns zero hits
- Playwright sweep of each `/benefits/*` route loads without console errors

## Out of scope
- No new `bn_*` tables (existing schema is sufficient)
- No changes to `/bn/*` workbench module
- No RLS (per project rule)

## Confirm

Reply **"go option A"** to execute as planned, or **"option B"** to instead delete `/benefits/*` and redirect those routes into the richer `/bn/*` module.
