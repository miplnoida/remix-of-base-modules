
Root cause

This is a system-path issue, not mainly a workflow-step configuration issue.

1. The meeting approval screen does not execute the workflow engine’s configured Approve action.
- In `src/pages/meetings/StartMeetingPage.tsx`, employer approval does:
  - `convertToEmployer(...)`
  - then `useCloseMeetingWithApproval(...)`
- It never uses the generic workflow-action execution path (`useExecuteWorkflowAction`) and never calls a backend endpoint that performs the same engine logic.
- Result: the current workflow does not actually “fire Approve”; it is only manually touched afterward.

2. The manual close logic is broken.
- In `src/hooks/useMeetings.ts`, approval/rejection updates send `updated_at` to:
  - `workflow_instances`
  - `workflow_tasks`
- Those columns do not exist in the current schema.
- Errors are not checked, so the workflow remains open while the meeting itself closes.

3. The next employer workflow is never triggered from the meeting flow.
- `useConvertToEmployerRegistration.ts` only runs `convert_application_to_employer`.
- The auto-trigger logic for employer workflows exists separately in `useEmployerRegistrationSubmit.ts`, but the meeting route never calls it.
- So the new Employer Registration record is created, but no “Employer Registration Approval Workflow” instance is attached.

4. There is also stale workflow log writing code.
- Current `workflow_logs` schema uses `user_id`, `user_name`, `comments`.
- Existing employer trigger code still writes old fields like `performed_by`, `performed_by_name`, `details`.
- That must be corrected in the new backend flow.

Implementation plan

1. Create one backend approval endpoint for the meeting-based employer review flow
- Add a backend endpoint in `supabase/functions/meeting-api-handler/index.ts` (new action such as `approve_employer_application`) or a dedicated backend function.
- This endpoint will become the single orchestration path for:
  - validating the meeting + linked workflow instance
  - converting the online employer application
  - executing the current workflow’s Approve action semantics
  - closing the meeting
  - triggering the next employer workflow
- This removes the fragile multi-step client-only sequence.

2. Execute the current workflow through backend workflow-action logic, not manual status-only updates
- In the new endpoint:
  - fetch the linked `workflow_instance`
  - fetch the active task for that instance
  - fetch the configured step action for Approve on the current step
  - complete the task
  - insert a proper `workflow_logs` record using current columns:
    - `user_id`
    - `user_name`
    - `comments`
    - `old_status`
    - `new_status`
    - `metadata`
  - update `workflow_instances` according to configured action outcome (`end_workflow` / end state)
  - call the existing backend API integration endpoint (`workflow-action-api`) if configured
- Also fail clearly if the step has no Approve action configured, so configuration issues become visible instead of silent.

3. Fix the broken manual workflow-close code in `useMeetings.ts`
- Remove invalid `updated_at` writes from:
  - `workflow_instances`
  - `workflow_tasks`
- Add explicit error handling for all workflow updates.
- Apply the same correction to both approval and rejection paths.
- Even if the meeting screen moves to the new backend endpoint, this hook should still be corrected so other callers do not silently fail.

4. Extract employer workflow-trigger logic into a shared service/backend-safe helper
- Create a reusable employer workflow trigger service from the logic currently inside `src/hooks/useEmployerRegistrationSubmit.ts`.
- Keep the existing module/source convention consistent with the rest of the app:
  - module trigger lookup via employer module id
  - workflow instance `source_module: 'employers'`
  - `source_record_id: regno`
- Update log writes there to the current `workflow_logs` schema.
- Reuse this helper from both:
  - manual employer submission flow
  - meeting approval backend flow

5. Bind the new Employer Registration automatically after successful conversion
- After `convert_application_to_employer` returns the new `regno`, the backend endpoint should immediately:
  - look up the active trigger for employer submit
  - create the next `workflow_instances` row
  - create the first `workflow_tasks` row
  - insert `workflow_logs` with valid columns
  - notify approvers via `workflow-notify-approvers`
- Return the new registration number and next workflow instance id to the client.

6. Simplify the meeting page to call the backend endpoint
- Update `src/pages/meetings/StartMeetingPage.tsx` so the employer Accept path calls the new backend endpoint instead of:
  - convert in one call
  - close meeting in another call
- The page should only:
  - send reviewed data + remarks + meeting id
  - receive success payload
  - show one success toast
  - navigate to `/employer-registration/view/:regno`

Files/modules to change

Frontend
- `src/pages/meetings/StartMeetingPage.tsx`
- `src/hooks/useMeetings.ts`
- `src/hooks/useEmployerRegistrationSubmit.ts`
- new shared service, e.g. `src/services/employerWorkflowTriggerService.ts`

Backend
- `supabase/functions/meeting-api-handler/index.ts` or a new dedicated backend function
- possibly one helper module for backend workflow execution if needed

Technical details

```text
Current broken path:
Accept in /meetings/start
-> convert_application_to_employer
-> manual meeting close
-> invalid workflow update payloads
-> no actual Approve action execution
-> no next workflow binding

Target path:
Accept in /meetings/start
-> backend endpoint
-> convert employer application
-> execute configured Approve workflow action
-> close current workflow + log action
-> create next employer workflow instance + first task
-> notify approvers
-> close meeting
-> return regno + workflow ids
```

Expected result

- Accepting an online employer application from `/meetings/start/:id` will:
  1. convert it to Employer Registration
  2. execute the current review workflow’s Approve action
  3. close the current workflow instance correctly
  4. write proper workflow logs
  5. auto-bind “Employer Registration Approval Workflow” to the new registration
  6. create the first approval task and notify approvers

Important conclusion

The main failure is not that the workflow step was wrongly configured. The real issue is that the meeting approval route bypasses the workflow engine and its fallback manual close logic is also broken.
