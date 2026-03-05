

# Internal Audit Module -- Gap Analysis

After thoroughly reviewing all 23 Internal Audit screens, here is a comprehensive gap analysis organized by category.

---

## 1. DATA & FUNCTIONALITY GAPS

### 1.1 Missing CRUD Operations
- **Action Tracking**: No "Create Action" button or form. Actions can only have their status changed via a dropdown -- no way to create new corrective actions.
- **Management Responses**: No "Create Response" form. Only shows existing responses with Accept/Revise actions. No way for management to submit a new response.
- **Follow-Up Tracker**: No "Create Follow-Up" button. Only shows existing follow-ups with status update, comment, and evidence actions.
- **Activity Calendar**: "Schedule Activity" opens an inline card (not a modal), breaking the StandardModal pattern. No view/edit capability on individual activities.
- **Letter Generation**: "Generate Letter" modal collects template/plan/department/email but does not actually generate or preview the letter content. No letter history or sent tracking.

### 1.2 Placeholder / Stub Logic
- **Audit Reports**: Uses hardcoded in-memory `useState` array with fake report data (`RPT-001`, `RPT-002`). "Generate" just sets a timeout. "PDF" and "Export" buttons only show toasts -- no real file generation.
- **Report Builder**: Report content is stored only in local state (`useState`). No persistence to database. Closing the page loses all work.
- **Evidence Management**: "Upload Evidence" form has no actual file upload capability (no file input, no storage integration). It only saves metadata.
- **Activity Workbench "Add Evidence"**: Shows a placeholder modal that says "You can now continue in Evidence Management" -- doesn't actually attach evidence.
- **Activity Workbench "Add Finding"**: Only captures a comment in a Textarea, then shows a toast. Does not create a real finding record linked to the activity.
- **Communication Center "Send"**: Creates a database record but does not actually send any email.

### 1.3 Missing Cross-Entity Linking
- **Findings**: No link to Activity, Department Audit, or Annual Plan. Created standalone without context.
- **Working Papers**: No link to Activity or Department Audit. Created standalone.
- **Evidence**: Links to Activity via dropdown, but no link to Finding or Working Paper.
- **Management Responses**: Shows finding title but no navigation link to the finding detail.
- **Action Tracking**: Shows finding title but no link to navigate to the finding.

### 1.4 Missing Delete Operations
- **Auditor Profiles**: No delete/deactivate action.
- **Department Master**: No delete action.
- **Function Master**: No delete action.
- **Findings**: No delete action.
- **Working Papers**: No delete action.
- **Evidence**: No delete action.
- **Annual Plans / Department Audits**: No delete action.
- **Leave Requests**: No cancel/withdraw action for the submitter.
- **Activities**: No delete/cancel action.

---

## 2. WORKFLOW & BUSINESS LOGIC GAPS

### 2.1 Status Workflow Enforcement
- **Annual Plans**: Can only be "Submitted" from "Draft" status. No enforcement preventing re-submission after rejection. No "Internally Approved" status with committee minutes upload (per workflow rules).
- **Department Audit Plans**: Same issue -- no guard against submitting already-rejected plans.
- **Findings**: Status changes (Draft -> Under Review -> For Mgmt Response -> Closed) have no UI to transition between states. Only create and view.
- **Working Papers**: Status changes (Draft -> Under Review -> Approved) have no UI to transition. Only create, view, and edit.
- **Plan Closeout**: Allows closing a plan at any status, not just "In Progress" or similar. The completion % calculation is approximate (uses activity count, not weighted).

### 2.2 Missing Approval Workflows
- **Working Papers**: No review/approval workflow (submit for review, approve, reject).
- **Findings**: No workflow to move through CCCE lifecycle stages.
- **Evidence**: No review/verification workflow for evidence quality.
- **Report Builder**: "Submit" just locks the form and shows a toast. No actual approval queue for reports.

### 2.3 Missing Audit Trail
- No `created_by`, `updated_by` tracking on: Findings, Working Papers, Evidence, Activities, Annual Plans, Department Audits, Follow-Ups, Management Responses, Action Tracking, Communications.
- Only Auditor Profiles, Holidays, Departments, and Functions pass `created_by`/`updated_by`.

---

## 3. UI / UX GAPS

### 3.1 Inconsistent Stat Card Layouts
- **Findings, Working Papers, Evidence**: Use centered text stat cards.
- **Leave, Activity Calendar, Management Responses**: Use icon + left-aligned stat cards.
- **Department Master**: Uses CardHeader + CardTitle pattern for stat cards.
- **Action Tracking**: Uses 5-column grid (others use 3 or 4).
- **Holiday Management**: Uses 3-column grid.

### 3.2 Missing Features on Some Screens
- **Department Master**: No FilterBar (only SearchBar).
- **Holiday Management**: No FilterBar (only SearchBar).
- **Communication Center**: No FilterBar on either tab.
- **Letter Generation**: No FilterBar.

### 3.3 Activity Calendar Not a Real Calendar
- Named "Activity Calendar" but displays a DataTable, not a calendar view. The `react-big-calendar` dependency is installed but unused here.

### 3.4 Inconsistent View Modals
- Some view modals show minimal fields (Activity Workbench shows ~5 fields), while forms have many more fields. View modals should show ALL fields that exist on the record.

### 3.5 Edit Functionality Missing
- **Working Papers**: `onEdit` prop is passed to DataTable but no edit modal logic is wired (editItem state exists but no EntityModal for editing).
- **Findings**: No edit capability at all.
- **Evidence**: No edit capability.

---

## 4. CONFIGURATION & SYSTEM GAPS

### 4.1 System Configuration Incomplete
- **Risk Criteria**: Displays but cannot create new criteria (no "Add" button).
- **Activity Types**: Displays but cannot create new types (no "Add" button).
- Missing audit-specific settings: penalty rules, escalation thresholds, report templates config.

### 4.2 Templates Management
- Templates page exists (`/audit/templates`) in sidebar but was not found in the pages reviewed. The Communication Center and Letter Generation reference templates from `useIADocumentTemplates` but there is no CRUD screen for creating/editing templates.

### 4.3 Missing Dashboard
- No Internal Audit Dashboard screen providing an overview (KPIs, plan status summary, overdue items, upcoming activities, finding trends).

---

## 5. DATA INTEGRITY GAPS

### 5.1 Weak Validation
- Most forms only check 1-2 required fields (e.g., Findings only requires title + condition).
- No email format validation on Auditor Profiles or Department forms.
- No date range validation (end date > start date) on Leave Management or Activities.
- No duplicate checking (e.g., same employee number, same holiday date).

### 5.2 No Pagination on Server Side
- All queries fetch entire tables with `.select('*')` and filter client-side. Will not scale beyond 1,000 records (Supabase default limit).
- `useIAActivities` fetches ALL activities, then filters. Same for evidence, follow-ups, etc.

---

## 6. SECURITY & PERMISSION GAPS

### 6.1 Permission Checks Incomplete
- Several pages do not check `hasPermission()` before showing action buttons (Findings, Working Papers, Evidence, Management Responses, etc.).
- `useAuth()` is imported in some pages but `hasPermission` is never called (Activity Workbench uses it but doesn't gate any UI).
- Plan Closeout checks `hasPermission('configure_audit_system')` for Reopen but not for Close.

---

## SUMMARY PRIORITY TABLE

| Priority | Gap | Impact |
|----------|-----|--------|
| Critical | No real file upload in Evidence Management | Core feature non-functional |
| Critical | Reports use in-memory state (no persistence) | Data loss on navigation |
| Critical | Report Builder has no DB persistence | Data loss on navigation |
| Critical | All queries fetch full tables (no server-side filtering) | Will break at scale |
| High | Missing Create for Actions, Responses, Follow-Ups | Incomplete CRUD |
| High | No audit trail (created_by/updated_by) on most entities | Compliance risk |
| High | Findings/WP have no edit or status transition UI | Cannot progress workflow |
| High | No Templates management screen | Cannot create/edit templates |
| High | No Internal Audit Dashboard | No overview/KPIs |
| Medium | Cross-entity linking missing (Finding->Activity->Plan) | Traceability gaps |
| Medium | Stat card layout inconsistency across screens | UI polish |
| Medium | Activity Calendar shows table, not calendar | UX expectation mismatch |
| Medium | Permission checks incomplete on most screens | Security gap |
| Medium | Missing delete operations on most entities | Incomplete CRUD |
| Low | Missing FilterBar on 4 screens | Minor UX gap |
| Low | Weak form validation | Data quality risk |
| Low | Working Papers edit modal not wired | Minor bug |

