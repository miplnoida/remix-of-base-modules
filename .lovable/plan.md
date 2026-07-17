## BN-AWARD360-B5 — Final Integration, Performance & Certification

Scope: certification pass over the Award 360 workspace. No mutation logic, no migrations, no RLS changes, no new capabilities. Correct only verified gaps, add certifying tests, and produce the evidence bundle.

### Verified gap analysis (from current code)

Reviewing `Award360Page.tsx`, `useAward360Queries.ts`, and `award360Service.ts`:

1. **Eager full-domain loading** — `useAward360Overview` runs on every mount as soon as `overview` tab access is granted (regardless of active tab). Its aggregator (`getAward360OverviewCounts`) fetches full row collections for up to 8 domains via `listAwardBeneficiaries`, `listAwardSchedules`, `listAwardPayments`, `listAwardLifeCertificates`, `listAwardMedicalReviews`, `listAwardSuspensions`, `listAwardOverpayments`, `listAwardCommunications` — even when the user opens Medical, Audit, etc. Sensitive medical rows enter the shell cache under the shared `['award360', id, 'overview', opts]` key.
2. **`Award360SummaryCards`** consumes `overview.payments/schedules/lifeCertificates/medicalReviews/suspensions/overpayments` — currently the same full arrays.
3. **Overview `activityQ`** is bound to `activeTab === 'overview'` correctly, but uses the non-paged `listAwardAudit`.
4. **Warnings** collapse a failed section into an empty array — indistinguishable from confirmed zero, contrary to §7.
5. Sensitive-medical and can-view-content flags are NOT part of overview query keys.
6. No integration tests today prove "opening tab X does not call service Y".

Existing green: no `select('*')` in service (line 3 comment enforced); actions already routed through `useAward360Actions` evaluator; tab access already gated centrally; 232 tests passing.

### Changes (narrowly focused)

#### A. Lightweight summary service — replaces overview aggregator for shell

New file `src/services/bn/awards/award360SummaryService.ts` exporting `getAward360Summary(awardId, opts)`:

- Uses Supabase `select('id', { count: 'exact', head: true })` and narrow explicit-column queries only.
- Sections gated by `include*` flags derived from `tabAccess.*.queryEnabled`.
- Returns a typed `Award360Summary` per section with three states: `{ status: 'ok', value }`, `{ status: 'restricted' }`, `{ status: 'unavailable', reason }` — satisfies §7 tri-state.
- Fields (each per its own include flag):
  - `beneficiaries`: count (head).
  - `schedule`: total count + `nextDue` (single row: `id,dueDate,status` order by dueDate asc, limit 1) + `overdueUnpaidCount` (head, filtered).
  - `payments`: total count + `recentExceptionCount` (head, status in FAILED/RETURNED, last 60d).
  - `lifeCertificates`: `overdueCount` (head, dueDate < today AND status != VERIFIED) + `nextDue`.
  - `medical`: `dueOrOverdueCount` (head, scheduled_date <= today AND status not COMPLETED). No provider/outcome/remarks fields ever loaded here.
  - `suspensions`: `pendingCount` (head, displayStatus PENDING*).
  - `overpayments`: `outstandingTotal` (narrow select of `id,outstandingAmount`, sum in JS — cannot use SQL sum without RPC; still bounded).
  - `communications`: `failedCount` (head, status=FAILED). No body/rendered content.
  - Also thin arrays needed by `computeAwardAlerts` (e.g., minimum life-cert/medical/suspension/overpayment fields).
- Emits `warnings` for source failures; never collapses failure to zero.
- Hook: replace `useAward360Overview` with `useAward360Summary(id, enabled, opts)` (same call site). Query key includes `awardId` + `opts` + `canViewSensitiveMedical: false` + `canViewCommunicationContent: false` (fixed literals here since summary never touches sensitive fields — but included for future-proofing).

Delete no code from `getAward360OverviewCounts` — it stays for existing tab-scoped uses/tests, but the shell no longer calls it.

`Award360SummaryCards` updated to consume the new summary shape (still gets `header` + summary aggregates).

`computeAwardAlerts` adapted to accept the summary shape (thin rows) rather than full collections. Existing alert semantics preserved.

`counts` for tab navigation derived directly from summary tri-state, showing "warn" only for `ok` state with count>0. Restricted sections omit the badge.

#### B. Active-tab query certification

Overview aggregator use is removed for non-overview tabs (already the case per-tab via `canView` flags — verify). Add explicit integration tests:

- `activeTabQueryScopes.test.tsx` (new): mounts `Award360Page` with mocked `supabase` client; asserts on `from()` table names per tab load. States tested: initial `overview`, switch to `medical`, `audit`, `pensioner`, `claim`. Assert that inactive tab tables are not queried, and summary uses count/head only for `beneficiaries/schedule/etc`.

#### C. Permission matrix certification

New `permissionMatrixCertification.test.tsx`: parameterised over user profiles (award-only, medical, communications, audit, no-access). Uses actual `useAward360Permissions` mock granularity to prove per-tab query gating and sensitive-column gating. Admin bypass is asserted NOT to fabricate missing module/action registrations.

#### D. Deep-link + URL-state certification

New `deepLinkUrlState.test.tsx`: `?tab=medical` when authorised opens medical; when unauthorised redirects to first permitted; invalid tab falls back; filter/selected-row params preserved across navigation; changing tab clears the previous tab's `selectedId`. Some already covered by shell.test + auditTabFilters — new file adds gap cases and cross-tab isolation.

#### E. Action certification

New `actionCertificationMatrix.test.ts`: parameterised matrix over every Award 360 action (Person 360, Claim, Product, Beneficiary ops, Payment, Life-cert, Medical, Suspension, Overpayment, Communication, Audit export). For each: asserts `availability` fields align with capability/module/route/business inputs. Mutation actions without server command remain `DISABLED` with resolver reason. Extends existing `sharedActionResolver.test` coverage without duplicating.

#### F. Cache/sensitive-data audit test

New `queryKeyIsolation.test.ts`: constructs QueryClient, primes a privileged sensitive-medical result under one key, mounts as restricted user, asserts fetcher runs a NEW query (privileged cache entry not reused) — proven by asserting the key set includes the sensitive-flag discriminator.

Add `canViewSensitive`/`canViewContent` to keys where missing (medical/comms already have these — audit; verify overview summary key). Only additive.

#### G. Accessibility spot-fixes

Small, focused corrections only where a gap is observed during test authoring: aria-label on any unlabeled filter, `aria-current` on pagination if missing. No layout rework.

### Files touched

New:
- `src/services/bn/awards/award360SummaryService.ts`
- `src/__tests__/bn/award360/activeTabQueryScopes.test.tsx`
- `src/__tests__/bn/award360/permissionMatrixCertification.test.tsx`
- `src/__tests__/bn/award360/deepLinkUrlState.test.tsx`
- `src/__tests__/bn/award360/actionCertificationMatrix.test.ts`
- `src/__tests__/bn/award360/queryKeyIsolation.test.ts`
- `src/__tests__/bn/award360/finalIntegration.test.tsx` (13-tab registration + no-mutation + no-`select('*')` static check)

Edited:
- `src/pages/bn/awards/award-360/Award360Page.tsx` — swap overview aggregator for summary; feed alerts from summary; keep SummaryCards path.
- `src/pages/bn/awards/award-360/useAward360Queries.ts` — add `useAward360Summary`; keep `useAward360Overview` for tab-scoped callers if any (or remove if unused after switch).
- `src/pages/bn/awards/award-360/Award360Alerts.ts` — accept summary-shaped input.
- `src/pages/bn/awards/award-360/Award360SummaryCards.tsx` — consume summary aggregates.
- `src/pages/bn/awards/award-360/viewModels.ts` — add `Award360Summary` and `SectionResult<T>` tri-state types.
- Minor a11y fixes where identified.

### Preserved

All 13 tab implementations, existing 232 tests, permission registry, action evaluator, specialist workspace links, RLS/DB state, `awardActionAvailability` contract.

### Deliverables (completion evidence)

Final tab/capability/source matrix (13 rows); before/after query diagram; lightweight summary design; list of queries removed from shell path; permission-matrix and deep-link test results; cache review; action certification results; final Award 360 test count; typecheck result; any known limitations (e.g., overpayment sum in JS pending an RPC).

Suggested commit: `Certify Award 360 integration and performance`
