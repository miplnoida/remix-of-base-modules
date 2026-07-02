## EPIC-03A — Legal Intake & Qualification Workspace

Build a mandatory Intake & Qualification stage between Referral → Legal Case. No case may be created without passing through Intake.

### Deliverables

**1. Database (migration)**
- Extend `lg_case_intake` with: qualification_status, intake_officer_id, qualification_result, supervisor_required, supervisor_status, supervisor_by, financial_exposure, legal_issue, legal_basis, recovery_type, recommended_path, risk_level, complexity, urgency, estimated_recovery, estimated_recovery_pct, recommended_team, recommended_officer, previous_recoveries, arrangement_exists, settlement_exists, internal_remarks, rejection_reason, returned_reason, mandatory_complete_flag, ageing_days (generated), assessment JSON columns.
- New `lg_intake_checklist_template` (configurable items: code, label, mandatory, sort_order, category, active).
- New `lg_intake_checklist_response` (intake_id, template_item_id, status, remarks, completed_by, completed_at).
- New `lg_intake_info_request` (intake_id, recipient, department, info_requested, reason, due_date, reminder_date, response_received_at, response_text, status).
- New `lg_intake_decision_audit` (intake_id, actor, action, old_value, new_value, remarks, ts).
- Seed default checklist template (13 standard items from spec).
- GRANTs for authenticated + service_role.

**2. Services (`src/services/legal/`)**
- `lgIntakeWorkbenchService.ts` — grid aggregation with 18 columns, KPI counts, filters.
- `lgIntakeQualificationService.ts` — checklist CRUD, assessments save, decision engine.
- `lgIntakeInfoRequestService.ts` — request/receive info, reminders.
- `lgIntakeCaseCreationService.ts` — validates gates then creates `lg_case` linked to referral & intake.
- `lgIntakeStateMachine.ts` — statuses: NEW → UNDER_REVIEW → INFO_REQUESTED → INFO_RECEIVED → ASSESSMENT → SUPERVISOR_REVIEW → APPROVED/REJECTED/RETURNED → CONVERTED_TO_CASE.

**3. Hooks**
- `useIntakeWorkbench.ts`, `useIntakeQualification.ts`, `useIntakeChecklist.ts`, `useIntakeInfoRequests.ts`.

**4. UI**
- `/legal/lg/intake` — `LgIntakeWorkbench.tsx` (8 KPI cards, LgDataGrid with 18 columns, 12 filters, bulk assign).
- `/legal/lg/intake/:id` — `LgIntakeWorkspace.tsx` (9 tabs: Overview, Referral Details, Qualification Checklist, Documents, Financial Assessment, Legal Assessment, Communications, Timeline, Audit).
- Dialogs: `RequestInfoDialog`, `SupervisorApprovalDialog`, `RejectIntakeDialog`, `ConvertToCaseDialog`, `AssignIntakeOfficerDialog`.
- Cross-cutting components: `IntakeChecklistPanel`, `IntakeFinancialAssessment`, `IntakeLegalAssessment`, `IntakeTimeline`.

**5. Permissions**
- Extend `useLgAccess`: `canRunIntake`, `canQualifyIntake`, `canRequestIntakeInfo`, `canApproveIntake`, `canRejectIntake`, `canConvertIntakeToCase`.
- Map to roles: Intake Officer, Legal Officer, Supervisor, Administrator.

**6. Referral integration**
- Modify `referralLifecycleService.acceptAndCreateCase` → route to intake instead; `createCaseFromReferral` disabled with guard until intake `APPROVED`.
- Referral action "Create Intake" (existing) becomes primary conversion path.

**7. Notifications**
- Reuse existing notification queue for: assignment, info request/response, approval request/complete, case created, rejection.

**8. Sidebar/routes**
- Add "Intake & Qualification" entry under Cases section in `app_modules` (via migration).
- Register routes in `LegalRoutes` / router config.

**9. Docs**
- `/docs/legal/EPIC-03A-LEGAL-INTAKE.md` covering process, workflow, rules, permissions, tables, services, gaps, UAT.

### Technical Notes
- Live Supabase data only, no mock.
- Reuse `LgDataGrid`, `useLgAccess`, `logLgActivity` (mirrored to case once created).
- State machine enforced server-side via check functions and client-side via TS module.
- Case creation atomic RPC `lg_create_case_from_intake` that validates all gates before insert.

### Out of scope
- Reworking sidebar order (already done).
- AI recommendations.
- New enforcement flows.

Plan is large; will be delivered in a single batched implementation but split across parallel file writes.
