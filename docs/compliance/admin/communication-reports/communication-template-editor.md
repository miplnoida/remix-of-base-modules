# Communication Template Editor

> **Module 27** · Section G — Communication & Reports

| Field | Value |
|---|---|
| Route | `/compliance/admin/communication-templates/new` · `/compliance/admin/communication-templates/:id` |
| Page component | `src/pages/compliance/admin/AuditCommunicationTemplateEditorPage.tsx` (138 lines) |
| Tab components | `src/components/compliance/admin/comm-template/Template{Content,Sections,Recipients,Approvals,Actions,Scheduling,Preview}Tab.tsx` |
| Primary table | `ce_audit_communication_templates` |
| Related tables | `ce_audit_communication_template_sections`, `ce_audit_communication_template_actions`, `ce_audit_communication_schedule_policies` |
| Services | `auditCommunicationTemplateService`, `auditCommunicationTemplateActionsService`, `auditCommunicationSchedulePolicyService` |

---

## 1. Purpose

The all-in-one editor for one row of `ce_audit_communication_templates`
plus its dependent tables. Splits configuration into seven focused tabs
so officers and admins never see one giant form. Designed so that the
template document **and** its runtime behaviour (recipients, approvals,
scheduling, side-effect actions) are managed in a single place.

---

## 2. Page shell

- Loads the template via `auditCommunicationTemplateService.getById(id)`
  unless `:id` is `new`/missing.
- Header shows name, `template_code`, send-mode badge and active-status
  badge. Save button stamps `updated_by` (UserCode) and increments
  `version_no` server-side via `service.update()`. Create stamps
  `created_by`/`updated_by` and seeds `version_no = 1`.
- After a successful create, navigates to `/:newId` (`replace: true`)
  so the dependent-tab service calls have a real `templateId`.

`EMPTY` template (line 20) prefills sensible defaults:

```ts
{
  comm_type: 'audit_intimation', category: 'pre_audit', channel: 'email',
  send_mode: 'MANUAL_ONLY', is_active: true, sort_order: 0,
  approval_rule_json: { roles: [] },
  recipient_rule_json: { priority: ['visit_contact', 'er_master'], allow_manual_add: true },
  // …
}
```

Validation gate (line 70-76): `template_code` and `template_name` are
required; failing validation switches the user back to the Content tab
and toasts.

---

## 3. Tabs

### 3.1 Content (`TemplateContentTab.tsx`, 145 lines)

Edits the core columns of the template row:

- Identity: `template_code`, `template_name`
- Classification: `comm_type` (15+ values from `COMM_TYPE_LABELS`),
  `category` (pre/during/post/etc), `lifecycle_stage` (10 stages),
  `channel` (email/sms/both)
- `linked_report_template_type` — optional FK-by-value to one of the six
  Report Template types (see Module 28). Helper text clarifies the
  separation: this tab controls *how/when*; the report controls *what
  document* is attached.
- `sort_order`, `description`, `is_active`
- Email/SMS fragments: `email_subject`, `email_body`, `sms_body`. Body
  fields document the merge-field syntax (`{{employer.name}}`,
  `{{inspection.visit_date}}`, etc.) consumed by the Preview tab.

### 3.2 Sections (`TemplateSectionsTab.tsx`, 99 lines)

CRUD over `ce_audit_communication_template_sections` via
`auditCommunicationTemplateService.{listSections,upsertSection,deleteSection}`.

- Add → seeds `section_key = section_${Date.now()}`, label
  `"New section"`, blank body, `is_enabled=true`,
  `sort_order = lastSortOrder + 10`.
- Inline editing: every keystroke calls `upsertSection` (debouncing
  delegated to React batching). The conflict key on upsert is
  `(template_id, section_key)`.
- Reorder via `↑/↓` swaps `sort_order` between adjacent rows in
  parallel.
- Save-first guard: if `templateId` is null (new template not yet
  saved), the tab renders a hint instead of the editor.

### 3.3 Recipients (`TemplateRecipientsTab.tsx`, 76 lines)

Edits `recipient_rule_json` only — no separate table. Manages an
ordered priority list of `CeCommRecipientSource` values
(`visit_contact`, `compliance_contact`, `er_master`, `manual`) with
add/remove + ↑/↓ reordering, and an `allow_manual_add` flag.
Resolution order is "first non-empty wins" at runtime in the visit
composer.

### 3.4 Approvals (`TemplateApprovalsTab.tsx`, 55 lines)

- Toggle `requires_approval_before_send`.
- Multi-select roles into `approval_rule_json.roles` from
  `['inspector','lead_inspector','supervisor','legal']`. The runtime
  rule is "all listed roles must approve, in order" — enforced by
  `auditCommunicationApprovalService` (status flow:
  `draft → pending_approval → approved → sent`).

### 3.5 Actions (`TemplateActionsTab.tsx`, 94 lines)

CRUD over `ce_audit_communication_template_actions` via
`auditCommunicationTemplateActionsService.{listForTemplate,setEnabled,updateConfig}`.

- Action catalogue lives in `src/lib/audit/communicationActions.ts`
  (`COMMUNICATION_ACTIONS` + `ACTION_GROUP_LABELS`), grouped into:
  `attachments`, `recipient_behavior`, `response`, `workflow`.
- Each definition exposes `key`, `label`, `description`, `group`, and
  optional `defaultConfig`.
- Per-action UI: enable switch + (when enabled) a small config form.
  Two examples are wired today:
  - `trigger_followup_reminder` → `offset_days` integer
  - `assign_response_review_workflow` → `workflow_code` string
- Save-first guard same as Sections.

### 3.6 Scheduling (`TemplateSchedulingTab.tsx`, 238 lines)

Two stacked cards:

#### a) Send-mode card — writes to the template row directly

- `send_mode` Select. Determines whether the policy editor below
  appears at all (`automation` boolean = `MANUAL_OR_SCHEDULED |
  AUTO_EVENT_DRIVEN | AUTO_TIME_DRIVEN`).
- `reschedule_allowed` switch.
- `cancel_on_status_change_json` checkbox grid over
  `STOP_CONDITIONS = ['acknowledged','employer_responded','case_closed','report_finalized']`.

#### b) Policy card — writes to `ce_audit_communication_schedule_policies`

Loaded via `auditCommunicationSchedulePolicyService.getForTemplate(templateId)`
and saved via `.upsert(templateId, payload)`. Trigger modes:

| `trigger_mode` | UI shows |
|---|---|
| `NONE` | nothing |
| `EVENT` | `trigger_event` Select from `TRIGGER_EVENTS` |
| `TIME_RELATIVE` | `relative_to_field` (anchor) + `offset_days` (negative=before) + `offset_hours` |
| `EXACT_DATETIME` | `<input type="datetime-local">` (stored as ISO) |

Recurrence sub-section: `recurrence_enabled` + `interval_days` +
`max_occurrences` + multi-select stop conditions. The recurrence is
what `fn_ce_audit_run_reminder_escalation()` (15-min cron) reads.

### 3.7 Preview (`TemplatePreviewTab.tsx`, 52 lines)

- Two-pane layout: editable JSON sample context (seeded from
  `draft.preview_sample_json` if non-empty, otherwise
  `DEFAULT_PREVIEW_SAMPLE` from
  `src/lib/audit/communicationMergePreview.ts`).
- Right pane shows live-rendered email subject (text), email body
  (HTML, `dangerouslySetInnerHTML`) and SMS body using
  `renderMergeFields(template, sample)`.
- Invalid JSON falls back to the sample base and shows an inline error
  — does not crash the page.

> **XSS surface:** the preview uses `dangerouslySetInnerHTML` against
> *user-authored email body* + *user-authored sample JSON*. Acceptable
> because (a) it is admin-only and (b) the runtime sender escapes
> values, but the same care must be taken in any future officer-facing
> preview.

---

## 4. Save semantics

- The tabs split into two write modes:
  - **Direct on draft**: Content, Recipients, Approvals, Scheduling
    (send-mode card), Preview (read-only) → committed only when the
    user clicks **Save template**.
  - **Auto-persisted**: Sections, Actions, Scheduling (policy card)
    → write through to their own tables on each interaction.
- Implication: a brand-new template must be saved (creating the row +
  `:id` route) before Sections / Actions / Schedule Policy tabs are
  usable. Each of those tabs renders an explicit "Save the template
  first…" hint when `templateId` is `null`.

---

## 5. Cross-references

- Lists & coverage view: [Communication Templates](./communication-templates.md)
- Stage-binding consumer: `FieldStageTemplateMappingPage`
- Runtime orchestration: `useVisitCommunicationOrchestrator` and
  `src/components/compliance/communication/README.md`

---

## 6. Findings & risks

1. **Save-first UX surprises.** Five of the seven tabs are usable only
   after the template is saved. The hints are clear, but a new user
   may try to fill the whole form left-to-right before saving.
   Consider blocking those tabs (or auto-saving on first valid touch)
   to remove the surprise.
2. **Sections tab writes on every keystroke.** Pleasant for casual
   edits, but produces churn in `ce_audit_communication_template_sections`
   and the audit `updated_at`. For high-volume editing this could be
   debounced.
3. **`approval_rule_json.roles`** is a flat list interpreted as "all in
   order". The UI does not expose the order explicitly (checkboxes,
   not drag-list), and the runtime sequencing depends on array
   ordering, which is fragile. Consider numbered chips or explicit
   reordering once a workflow needs more than one approver.
4. **Trigger anchors and events are hard-coded** in
   `auditCommunicationSchedulePolicyService` (`TRIGGER_EVENTS`,
   `RELATIVE_ANCHOR_FIELDS`). Adding a new visit lifecycle event
   requires shipping new code.
5. **No diff viewer / version browser.** `version_no` is incremented
   on every update but never surfaced to the admin. Recovering an
   older body requires DB access.

---

_Last updated: see git history of this file._
