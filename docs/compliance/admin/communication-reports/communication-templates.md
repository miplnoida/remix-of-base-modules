# Communication Templates (Audit Communication Templates)

> **Module 26** · Section G — Communication & Reports

| Field | Value |
|---|---|
| Route | `/compliance/admin/communication-templates` |
| Page component | `src/pages/compliance/admin/AuditCommunicationTemplatesPage.tsx` (352 lines) |
| Editor route | `/compliance/admin/communication-templates/new` · `/:id` |
| Editor component | `AuditCommunicationTemplateEditorPage.tsx` ([detail doc](./communication-template-editor.md)) |
| Primary table | `ce_audit_communication_templates` |
| Companion table | `ce_audit_communication_schedule_policies` (joined client-side for trigger-mode badge & coverage matrix) |
| Service | `src/services/auditCommunicationTemplateService.ts` |
| Banner | `<AdminAreaBanner area="communication" />` |

---

## 1. Purpose

Catalogue and lifecycle management for every employer-audit communication
template (intimation, follow-up, violation notice, escalation, etc.). The
screen does **not** send messages — it governs what gets sent, through
which channel, in which lifecycle stage, with which approval and
schedule policy. The actual sending is orchestrated at runtime by
`useVisitCommunicationOrchestrator` and the trigger engine
(see `src/components/compliance/communication/README.md`).

This catalogue is the **single source of truth** for both:
- the Audit Visit Workspace composer and intelligence card
- the Field Stage → Template Mapping admin (which pulls active rows here)
- the Report Templates editor's "Used by Communications" cross-ref

---

## 2. Layout

Two-tab Tabs container:

### 2.1 `By Lifecycle` (default)

- **Filter bar** (Card): full-text search + four `Select`s — Lifecycle
  stage / Channel / Send mode / Active.
- **Accordion grouped by `lifecycle_stage`** in the canonical order
  exposed by `COMM_LIFECYCLE_STAGE_ORDER`. Each stage shows count badge,
  hint copy, and the templates as nested `Card`s. An additional
  `Unassigned (legacy)` accordion appears when any row has a null
  `lifecycle_stage`.
- **Template card** displays:
  - Name + `template_code` + `channel` + `send_mode` (translated via
    `SEND_MODE_LABELS`) + trigger-mode badge if a schedule policy exists
  - `comm_type` label + `description`
  - Email subject preview
  - Approval roles (from `approval_rule_json.roles`) and the linked
    report-template-type chip (`linked_report_template_type` →
    `REPORT_TEMPLATE_TYPE_LABELS`)
  - Inline controls: Active switch (`toggle()`), Edit (navigates to
    editor), Clone (prompt for new code/name → service `clone()`)

### 2.2 `Coverage Matrix`

A read-only health table built by `CoverageMatrix` (lines 277-352).
Per lifecycle stage it counts: total templates, active templates,
templates with a non-`NONE` schedule policy, templates with a linked
report. A "Linked report" cell renders `n/a` for stages where reports
are not expected (`pre_audit`, `closure`, `monitoring`, etc.).

---

## 3. Data flow

```text
load() ──▶ Promise.all([
   auditCommunicationTemplateService.list(),
   supabase.from('ce_audit_communication_schedule_policies')
           .select('template_id,trigger_mode')
])
        ──▶ setList(tpls), setPolicies(pol)
```

- `policyByTemplate` (Map) is rebuilt from `policies` via `useMemo`.
- `filtered` applies the four filter facets + free-text match against
  `${template_code} ${template_name} ${description}`.
- `grouped` is a `Map<CeCommLifecycleStage|'unassigned', Template[]>`
  keyed by `COMM_LIFECYCLE_STAGE_ORDER`, plus an `unassigned` bucket.
- All UI mutations call back into `auditCommunicationTemplateService`
  and re-`load()` — no local state patching, so the badge counts
  always reflect the database.

### `auditCommunicationTemplateService` surface

| Method | Notes |
|---|---|
| `list({activeOnly?, commType?, lifecycleStage?})` | Used here without filters; sorts by `sort_order`. |
| `listByStage(stage)` | Thin wrapper used by the visit workspace and stage-mapping fallback. |
| `listLinkedToReport(reportType)` | Cross-ref consumed by the Report Templates "Used by Communications" card. |
| `getById` / `getByCode` | Used by the editor. |
| `create` / `update` | Stamps `created_by` / `updated_by` with the **UserCode** (per *User Identity Tracking* knowledge entry). `update` increments `version_no`. |
| `setActive` | Toggle handler. |
| `clone` | Re-uses `create()` — preserves all configuration except `id`, `created_at`, `updated_at`, and resets `version_no` to 1. |
| `listSections` / `upsertSection` / `deleteSection` | Backing the editor's Sections tab. |

---

## 4. Underlying schema (excerpt)

`ce_audit_communication_templates` (the row shape consumed here is in
`src/types/auditCommunication.ts`) carries — among other fields:

- `template_code`, `template_name`, `description`, `comm_type`,
  `category`, `channel` (`email`/`sms`/`both`)
- `lifecycle_stage` — one of `COMM_LIFECYCLE_STAGE_ORDER`
- `send_mode` — `MANUAL_ONLY` | `MANUAL_OR_SCHEDULED` |
  `AUTO_EVENT_DRIVEN` | `AUTO_TIME_DRIVEN`
- `email_subject`, `email_body`, `sms_body`
- `approval_rule_json` — `{ roles: CeCommApprovalRole[] }`
- `attachment_rule_json`, `recipient_rule_json`, `branding_json`,
  `merge_fields_json`, `preview_sample_json`,
  `cancel_on_status_change_json`
- `requires_approval_before_send`, `reschedule_allowed`, `is_active`,
  `sort_order`, `version_no`
- `linked_report_template_type` — FK-by-value to one of
  `CE_TEMPLATE_TYPES` (see Report Templates doc)
- `created_by`, `updated_by` — **UserCode** strings, not auth UUIDs

Companion: `ce_audit_communication_schedule_policies` has one row per
template (`template_id` PK-style), with `trigger_mode`, `trigger_event`,
`relative_to_field`, `offset_days/hours`, `exact_datetime`,
`recurrence_*` and `recurrence_stop_conditions_json`. See Editor doc § 5.

---

## 5. Workflow / Approval / Notification logic

This screen has **no workflow of its own** — toggles and clones are
direct writes. The fields it manages, however, drive runtime behavior:

- `requires_approval_before_send` + `approval_rule_json.roles` →
  enforced by `auditCommunicationApprovalService` when an officer
  submits a draft from the visit composer.
- `send_mode` + the schedule policy row → consumed by the trigger
  engine (`commTriggerEngine`) and the reminder/escalation cron
  `fn_ce_audit_run_reminder_escalation()`.
- `cancel_on_status_change_json` → causes scheduled instances to be
  cancelled when the matching lifecycle event fires.

---

## 6. Cross-references

| Module | Why it links here |
|---|---|
| Communication Template Editor (Module 27) | Edits one row + its sections + schedule policy. |
| Field Stage Template Mapping (`FieldStageTemplateMappingPage`) | Pulls active rows via `fieldStageTemplateMapService.listAvailableTemplates()` and binds them to the 10 field-execution stages. |
| Report Templates (Module 28) | "Used by Communications" card calls `listLinkedToReport(reportType)`. |
| Audit Visit Workspace | Reads templates per stage at runtime (orchestrator hook). |
| Online Response Config (Module 30) | Consumes templates whose `comm_type` is response-bearing. |

---

## 7. Findings & risks

1. **Coverage matrix uses hard-coded "report-relevant" stage list**
   (lines 340-342). Adding a new lifecycle stage that should expect a
   report requires editing this conditional in addition to the enum.
2. **No bulk operations.** Activating/deactivating a stage's worth of
   templates requires per-row toggles. Acceptable for ~10s of templates,
   not for hundreds.
3. **`clone()` uses `prompt()`/`prompt()` pairs** for code & name. This
   is functional but inconsistent with the rest of Compliance Admin
   which uses `Dialog`-based input. Low priority; flagged for UX
   consistency only.
4. **Coverage matrix counts are independent of filters.** Intentional
   (it's a global health view) but worth knowing — the row counts in
   the accordion will not match the matrix while filters are active.
5. **No audit log entry written.** Activate/clone/edit do not append to
   `system_audit_trail`; only `updated_by` and `version_no` track the
   change. Consistent with the rest of Compliance Admin but flagged for
   the same reasons noted in earlier batches.

---

_Last updated: see git history of this file._
