## Refine Legal module for small + large departments

Scope: foundation for role-type based, configurable Legal that ships St. Kitts–ready (SMALL mode) and scales without redesign.

### 1. Database (one migration)

`**lg_department_profile**` (single-row config)

- `department_size_mode` (SMALL|MEDIUM|LARGE), `auto_assign_mode`, `approvals_mode` (LIGHT|STANDARD|STRICT)
- `assistant_review_required` bool, `manager_role_required` bool
- Seed: SMALL / SELF_ASSIGN / LIGHT / true / false

`**lg_role_type_mapping**`

- `role_type` (LG_CASE_HANDLER, LG_LEGAL_ASSISTANT, LG_REVIEWER, LG_APPROVER, LG_ADMIN, LG_READ_ONLY)
- `system_role` (free text — matches `user_roles.role`)
- Seed: maps existing `LEGAL_OFFICER` → CASE_HANDLER+REVIEWER+APPROVER, `LEGAL_MANAGER` → all, etc.  
  


`**lg_workflow_policy**`

- `action_code` (NOTICE_DEMAND, NOTICE_COURT_FILING, HEARING_BUNDLE, HEARING_OUTCOME, FEE_POST, FEE_WAIVER, SETTLEMENT_APPROVE, CASE_CLOSE, …)
- `approval_required`, `preparer_role_type`, `approver_role_type`, `min_approvers` (default 1)
- `allow_self_approval`, `assistant_can_prepare`, `lawyer_must_review`
- `effective_from`, `effective_to`
- Seed St. Kitts defaults: assistant prepares notices/bundles/draft fees; lawyer approves waiver/settlement/closure/final-fee.

`**lg_action_audit**` (records prepare/approve events) — extend existing `lg_case_activity` via an `event_type` column instead of new table to keep simple.

GRANTs for authenticated + service_role; NO-RLS per project policy.

### 2. Access layer

`useLgAccess` extended:

- New role types: `LG_CASE_HANDLER | LG_LEGAL_ASSISTANT | LG_REVIEWER | LG_APPROVER | LG_ADMIN | LG_READ_ONLY`
- Mapping: read from `lg_role_type_mapping` (fallback to built-in defaults for existing LEGAL_* roles)
- Capability matrix split prepare vs approve:
  - prepareNotice / approveNotice / sendNotice
  - prepareHearingBundle / confirmHearingOutcome
  - draftFee / approveFee / postFee
  - draftSettlement / approveSettlement
  - requestWaiver / approveWaiver
  - draftCaseClosure / approveCaseClosure
  - draftTask / assignTask
- Keep existing capabilities working (backward compatible).

New hook `useLgPolicy(actionCode)` → returns `{ approvalRequired, preparerRoleType, approverRoleType, assistantCanPrepare, lawyerMustReview }`.

Helper `useLgCan(actionCode, mode: 'prepare'|'approve')` combines access + policy.

### 3. UI

**Case Detail (`LgCaseDetail.tsx`)** — actions panel becomes role-aware:

- Assistant sees: Prepare Notice / Upload Document / Prepare Hearing Bundle / Add Draft Fee / Add Note / Update Parties
- Lawyer sees additionally: Approve & Send Notice / Record Hearing Outcome / Approve Fee / Approve Settlement / Approve Waiver / Close Case
- Drafts show a "Pending lawyer approval" badge when `assistant_review_required` is true.

**New admin page `/legal/admin/policy` (`LgPolicyConfig.tsx`)**:

- Tab 1 — Department Profile (single form)
- Tab 2 — Role Type Mapping (system role ↔ role type)
- Tab 3 — Workflow Policies (table editor per action_code)
- Linked from `LgDashboard` admin tile, gated to LG_ADMIN.

**Workbasket / dashboard**: queue cards driven by `department_size_mode`. SMALL renders only: Unassigned, My Cases, Assistant Drafts, Lawyer Review, Upcoming Hearings, Overdue Actions. LARGE adds the extended queues.

### 4. Wiring to existing services

- `lgFeeEngineService.postFeeCharge` already creates draft; gate the "Post" button behind `approveFee` policy. Drafts created by assistants stay in `DRAFT` until lawyer approval.
- `lgSettlementService` / `lgWorkflowService` close-case path gated behind `approveCaseClosure`.
- `lgFeeWaiverService.approveWaiver` already lawyer-only — wire UI to use `useLgCan('FEE_WAIVER', 'approve')`.  
  
Do not create a separate Legal user/role system.
  Use existing Security module users, roles, and permissions.
  Create Legal role mapping only if needed:
  - security_role_id
  - legal_role_type
  - can_prepare
  - can_review
  - can_approve
  - can_post_fee
  - can_close_case
  Legal role types:
  - LG_CASE_HANDLER
  - LG_LEGAL_ASSISTANT
  - LG_REVIEWER
  - LG_APPROVER
  - LG_ADMIN
  - LG_READ_ONLY
  Example:
  Existing Security Role: Legal Officer
  → LG_CASE_HANDLER, LG_REVIEWER, LG_APPROVER
  Existing Security Role: Legal Assistant
  → LG_LEGAL_ASSISTANT
  Existing Security Role: Finance Officer
  → can_post_fee if configured
  Workflow and workbaskets must use these mappings, not hardcoded role names.
  Acceptance:
  - users remain managed in Security module
  - permissions remain assigned through common role-permission screen
  - Legal does not create duplicate roles/users
  - small department can assign multiple legal capabilities to one person
  - large department can split capabilities across roles

### 5. Out of scope this round

- No new case lifecycle states beyond the existing 6.
- No new fee tables (use existing engine from previous round).
- No notification-engine changes.

### Acceptance check

- Build passes; existing LEGAL_OFFICER/MANAGER users keep current power via mapping seed.
- A user with only LG_LEGAL_ASSISTANT system role sees prepare actions but not approve actions.
- Toggling `approvals_mode = LIGHT` removes mandatory approval rows; STRICT enforces them.
- `/legal/admin/policy` lets admin reconfigure without code changes.  
  
