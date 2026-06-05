# BN: Claimant-Centred Claim & Workflow Architecture

## Goal
Stop treating "forms" as standalone modules. Make **Claimant → Claim → Workflow → Tasks** the spine. Public online, staff-assisted offline, and back-office entry all produce the same `bn_claim` row, the same snapshots, the same workflow instance, and land in the same employee worklist + Claim Workspace.

---

## 1. Database (single migration)

### 1.1 Extend `bn_claim`
- `application_channel` text — `PUBLIC_ONLINE | STAFF_OFFLINE | ASSISTED_COUNTER | BACK_OFFICE_ENTRY | MIGRATED_LEGACY`
- `workflow_instance_id uuid` (nullable) — link to `workflow_instances.id`
- `employer_regno text` (nullable) — for benefits where employer matters
- index on `(status, application_channel)` and `(assigned_to, status)`

### 1.2 New tables (all GRANTed, RLS off per project rule)
- **`bn_claim_application`** — submitted form payload
  - `claim_id`, `product_id`, `product_version_id`, `application_channel`,
    `submitted_by_type` (`PUBLIC_USER|EMPLOYEE|SYSTEM`), `submitted_by_user_id`,
    `submitted_at`, `form_template_id`, `declaration_accepted bool`,
    `raw_application_json jsonb`, `source_ip`, `user_agent`, `entered_by`, `entered_at`
- **`bn_claim_person_snapshot`** — ssn, full_name, dob, gender, person_status, address_json, phone, email, captured_at
- **`bn_claim_employer_snapshot`** — employer_regno, employer_name, employer_status, address_json, captured_at
- **`bn_claim_contribution_snapshot`** — period_from/to, total/paid/credited weeks, total_wages, average_weekly_wage, contribution_json, captured_at
- **`bn_claim_intake_validation`** — claim_id, check_code, status (`PASS|WARN|FAIL`), details_json, checked_at

All tables: `GRANT SELECT,INSERT,UPDATE,DELETE TO authenticated; GRANT ALL TO service_role;` plus `anon SELECT/INSERT` only on `bn_claim_application` for public submission via service layer (we'll route through edge function, so anon grant not needed — keep authenticated only and use service_role from an edge function later).

### 1.3 RPC `bn_submit_claim_application`
Single transactional RPC the UI calls:
- inputs: `p_ssn, p_product_code, p_claim_date, p_channel, p_form_payload jsonb, p_employer_regno, p_submitted_by_user_id, p_source_ip, p_user_agent`
- resolves active `bn_product_version` by `p_claim_date`
- creates `bn_claim` (status `INTAKE`)
- inserts `bn_claim_application` with payload
- captures `bn_claim_person_snapshot` from `ip_master`
- captures `bn_claim_employer_snapshot` from `er_master` (when regno present)
- captures `bn_claim_contribution_snapshot` from `ip_wages` / `bn_get_contribution_summary`
- materialises `bn_evidence_checklist` from `bn_doc_requirement` for that version
- runs lightweight intake validations into `bn_claim_intake_validation`
- if version has `workflow_definition_id` → insert `workflow_instances` (`source_module='bn_claim'`, `source_record_id=claim.id`) and first `workflow_tasks` row; set `bn_claim.workflow_instance_id`
- returns `claim_id, claim_number, workflow_instance_id`

---

## 2. Services (TypeScript)

- `src/services/bn/intake/claimIntakeService.ts`
  - `submitClaimApplication(input)` → calls the RPC
  - `lookupClaimant(ssn)` → reuses `bnPersonAdapter`
  - `lookupEmployer(regno)` → reuses `bnEmployerAdapter`
  - `getContributionSnapshot(ssn, from, to)` → reuses `bnContributionAdapter`
  - `runIntakePreChecks(productCode, ssn, claimDate)` → returns array of `{code,status,message}`
- `src/services/bn/claimWorkspaceService.ts` — fetch snapshots, application payload, intake validations, workflow context for a claim id.

## 3. Hooks
- `useBnClaimIntake()` — mutation wrapping `submitClaimApplication`
- `useBnClaimantLookup(ssn)`, `useBnEmployerLookupRegno(regno)` (thin wrappers around existing adapters)
- `useBnClaimWorkspace(claimId)` — aggregates snapshots + application + workflow

## 4. Staff-assisted intake (`/bn/intake/register`)
Rewrite as a 5-step wizard, not a form:
1. **SSN lookup** — search `ip_master`, show identity card
2. **Confirm claimant** — display masked PII, address, status; block if `deceased`/`suspended` with override note
3. **Benefit selection** — pick product, claim date → resolver loads active version, shows version banner
4. **Smart intake** — renders `ApplicationFormEngine` for channel `ASSISTED_OFFLINE`, with auto-loaded:
   - eligibility pre-check results (read-only panel)
   - required documents checklist
   - contribution snapshot summary
   - only the benefit-specific fields are user-editable
5. **Submit** — calls `bn_submit_claim_application`, shows claim number + "Open in workspace" / "Go to my tasks"

Public route `/public/benefit/:productCode` re-uses steps 1, 3, 4, 5 with `application_channel='PUBLIC_ONLINE'` and `submitted_by_type='PUBLIC_USER'`. Document upload is mandatory unless product version allows pending.

## 5. Employee worklist (`/bn/queue` or new `/bn/my-tasks`)
Columns: `claim_number, claimant_name, ssn (masked), benefit_name, application_channel (badge), current_status, workflow_stage, assigned_to, due_at, priority, document_status, eligibility_status`.

Driven by a view `vw_bn_worklist` joining `bn_claim` + product + workflow_tasks + checklist counts + latest intake validation.

## 6. Claim Workspace (`/bn/claims/:id`)
Tabs / sections, all reading the snapshots:
- Claimant Snapshot (+ link "View live person master")
- Application Details (channel, submitted_by, submitted_at, raw payload viewer)
- Product Version Used (link to read-only version)
- Eligibility Results
- Contribution Snapshot
- Employer Snapshot
- Required Documents (checklist progress + upload)
- Workflow Tasks (uses `useBnWorkflowActions`)
- Notes, Decisions, Audit, Payments (existing components rewired)

## 7. Routing & nav
- `/bn/intake/register` → new staff intake wizard
- `/public/benefit/:productCode` → already exists, switched to call new RPC
- `/bn/claims` → list page reads from `vw_bn_worklist`
- `/bn/claims/:id` → workspace
- Sidebar: add **"Benefit Intake"** under BN module pointing to `/bn/intake/register`

## 8. Linking rules (enforced by RPC + adapters)
- `bn_claim.ssn` → `ip_master.ssn`
- `bn_claim.employer_regno` → `er_master.employer_reg_no`
- `bn_claim.product_version_id` → `bn_product_version.id`
- `bn_claim.workflow_instance_id` → `workflow_instances.id`
- `workflow_instances.source_module = 'bn_claim'`, `source_record_id = bn_claim.id`
- All evidence rows link by `claim_id`

## 9. Audit
RPC writes to `system_audit_trail` for: application submitted, claimant/employer lookup, eligibility pre-check, checklist generated, workflow started, pending verifications.

## 10. Verification checklist
- Submit from staff wizard → row in `bn_claim` + `bn_claim_application` + 3 snapshots + checklist + workflow instance + first task.
- Submit from public route → same.
- Both appear in `/bn/claims` worklist with correct channel badge.
- Opening workspace shows snapshots even if `ip_master` is later edited.
- `tsc` clean.

---

## Technical notes (for engineers)
- Migration is additive only — no destructive changes to existing `bn_claim`.
- Existing `BenefitApplicationFormPage` is repurposed as Step 4 renderer inside the new wizard; not deleted.
- Public submission for now goes through `authenticated`-only RPC via a thin edge function (`public-bn-submit`) to be added in a follow-up; this plan covers staff intake fully and stubs the public path against the same RPC.
- All new components follow existing tokenized design system (no raw colors).
- No RLS added (project rule: role-based only).

## Out of scope (next iterations)
- Public anonymous edge function + captcha
- Migrated legacy backfill tooling
- Worklist saved views / bulk actions
