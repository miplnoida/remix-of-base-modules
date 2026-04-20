# Audit Communication Templates — Full Editable Templates + Scheduling Engine

> Plan-only document. No code changes will be made until each phase below is explicitly approved.

## 1. Architecture Summary

Three concerns, kept strictly separate:

| Layer | Purpose | Tables / Functions |
|---|---|---|
| **A. Template configuration** (Admin) | Authoring of message content, sections, rules, actions, scheduling policy | `ce_audit_communication_templates` (extended), `ce_audit_communication_template_sections`, **new** `ce_audit_communication_template_actions`, **new** `ce_audit_communication_schedule_policies` |
| **B. Communication instance / draft workflow** (Officer) | Per-employer/per-inspection drafts: edit, recipients, schedule, recurrence, approve, send, cancel, reschedule | `ce_audit_communications` (extended with `recurrence_*`, `parent_communication_id`, `dispatch_attempts`, `last_dispatch_error`, `dispatch_locked_at`), recipients/approvals/deliveries/events tables |
| **C. Automatic dispatch & materialization** (System) | Time-relative materialization (cron) + event-driven materialization (hooks) + queue dispatcher | Edge fns: `ce-audit-communication-dispatch` (extend), **new** `ce-audit-communication-materialize`; pg_cron every 15 min; app-side hooks on inspection/report/case lifecycle |

**Key principle**: templates are *config*; communications are *instances*. Schedules live on templates as **policies**; instances carry a *snapshot* + their own `scheduled_at` / recurrence state, so editing a template never mutates in-flight items.

---

## 2. Current Gap Analysis (verified against DB + code)

✅ Already exists:
- `ce_audit_communication_templates` with subject/body, sections, rules JSON, online-response mode
- `ce_audit_communication_template_sections` with sort + enable
- `ce_audit_communications` with `scheduled_at`, status lifecycle, approvals, deliveries, events
- Edge fn `ce-audit-communication-dispatch` (basic time-due dispatcher)
- `auditCommunicationTemplateService` (CRUD), `auditCommunicationService` (instance ops, 373 LOC)
- Admin page exists but **read-only** (`AuditCommunicationTemplatesPage.tsx` — list + active toggle only)

❌ Gaps:
- No template **editor** (cannot create/edit/clone from UI)
- No section management UI
- No structured **actions** model — only free-form `attachment_rule_json`
- No **scheduling policy** — `scheduled_at` is per-instance only; no template-driven trigger model
- No **recurrence** support on instances
- No **event-driven materialization** (e.g. "create draft when inspection visit is scheduled")
- Dispatcher missing: retries with backoff, recurrence rollover, double-send guard via dispatch lock, cancel-on-status checks
- No live **preview** with merge fields
- Instance workflow lacks: schedule picker, reschedule, cancel-scheduled, recurrence setup

---

## 3. Schema / Migration Changes

### 3.1 Extend `ce_audit_communication_templates`
```sql
ALTER TABLE ce_audit_communication_templates
  ADD COLUMN send_mode text NOT NULL DEFAULT 'MANUAL_ONLY'
    CHECK (send_mode IN ('MANUAL_ONLY','MANUAL_OR_SCHEDULED','AUTO_EVENT_DRIVEN','AUTO_TIME_DRIVEN')),
  ADD COLUMN merge_fields_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN preview_sample_json jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN requires_approval_before_send boolean NOT NULL DEFAULT true,
  ADD COLUMN reschedule_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN cancel_on_status_change_json jsonb NOT NULL DEFAULT '[]';
```

### 3.2 New `ce_audit_communication_template_actions`
```sql
CREATE TABLE ce_audit_communication_template_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES ce_audit_communication_templates(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (template_id, action_key)
);
```
Canonical `action_key` values:
`include_report_pdf, include_evidence, include_violations, include_findings_memo, include_books_annexure, include_payment_summary, use_secure_link, require_acknowledgment, allow_online_response, allow_document_upload, allow_clarification, allow_dispute, assign_response_review_workflow, trigger_followup_reminder`

### 3.3 New `ce_audit_communication_schedule_policies`
```sql
CREATE TABLE ce_audit_communication_schedule_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL UNIQUE REFERENCES ce_audit_communication_templates(id) ON DELETE CASCADE,
  trigger_mode text NOT NULL DEFAULT 'NONE'
    CHECK (trigger_mode IN ('NONE','EVENT','TIME_RELATIVE','EXACT_DATETIME')),
  trigger_event text,
  relative_to_field text,
  offset_days int,
  offset_hours int,
  exact_datetime timestamptz,
  recurrence_enabled boolean NOT NULL DEFAULT false,
  recurrence_interval_days int,
  recurrence_max_occurrences int,
  recurrence_stop_conditions_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 3.4 Extend `ce_audit_communications` (instances)
```sql
ALTER TABLE ce_audit_communications
  ADD COLUMN parent_communication_id uuid REFERENCES ce_audit_communications(id) ON DELETE SET NULL,
  ADD COLUMN occurrence_no int NOT NULL DEFAULT 1,
  ADD COLUMN recurrence_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN recurrence_interval_days int,
  ADD COLUMN recurrence_max_occurrences int,
  ADD COLUMN recurrence_stop_conditions_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN dispatch_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN last_dispatch_error text,
  ADD COLUMN dispatch_locked_at timestamptz,
  ADD COLUMN materialized_by_policy_id uuid REFERENCES ce_audit_communication_schedule_policies(id) ON DELETE SET NULL;

CREATE INDEX idx_ce_audit_comm_due ON ce_audit_communications(scheduled_at)
  WHERE status='approved' AND sent_at IS NULL AND cancelled_at IS NULL;
```

### 3.5 Data migration — auto-classify by `comm_type`
All existing templates get `send_mode='MANUAL_OR_SCHEDULED'` plus a `schedule_policies` row:

| comm_type | trigger_mode | anchor / event | offset | recurrence |
|---|---|---|---|---|
| `audit_intimation` | TIME_RELATIVE | `inspection.visit_date` | -7 d | — |
| `books_required` | TIME_RELATIVE | `inspection.visit_date` | -5 d | — |
| `visit_reminder` | TIME_RELATIVE | `inspection.visit_date` | -1 d | — |
| `due_date_reminder` | TIME_RELATIVE | `case.due_date` | 0 d | every 3d, max 5, stop on `acknowledged` |
| `escalation_notice` | EVENT | `communication.no_response` | +7 d | — |
| `final_report`, `violation_notice`, `corrective_action` | NONE (MANUAL_ONLY) | — | — | — |
| all others | NONE (MANUAL_OR_SCHEDULED) | — | — | — |

Also seed `ce_audit_communication_template_actions` from each template's existing `attachment_rule_json`.

---

## 4. Template Editor Design

Route: `/compliance/admin/communication-templates/:id` (and `/new`)

**Tabs:**
1. **Content** — code, name, comm_type, category, channel, description, sort_order, active, version_no (read-only). Email subject/body, SMS body. Merge-field chip palette.
2. **Sections** — reorderable list. Add/edit/delete/enable toggle. Section preview pane.
3. **Recipients** — recipient_rule_json builder: source priority drag list, allow_manual_add toggle.
4. **Approvals** — roles multi-select (`inspector, lead_inspector, supervisor, legal`), `requires_approval_before_send` toggle.
5. **Actions** — checklist of all 14 canonical action keys with optional config. Writes to `ce_audit_communication_template_actions`.
6. **Scheduling** — `send_mode` select; conditional fields per mode; recurrence sub-form; stop conditions; reschedule_allowed; cancel_on_status_change. Writes to `ce_audit_communication_schedule_policies`.
7. **Preview** — Renders subject/body/sections with `preview_sample_json` substituted; channel toggle; "what gets attached" derived from actions; "what would auto-schedule" summary derived from policy.

Top bar: Save / Save & Activate / Clone / Cancel.

---

## 5. Actions / Rules Design

- Stored relationally in `ce_audit_communication_template_actions` (one row per `action_key`).
- Typed registry `src/lib/audit/communicationActions.ts` lists each action with: key, label, description, applicable comm_types, default config schema, `getEffect()` used by the dispatcher and instance composer to assemble attachments + permission flags.
- Backward compatibility: `attachment_rule_json` remains writable; service-side merge produces the effective action set (table ⊕ legacy JSON, table wins).

---

## 6. Scheduling Model

**Send modes** (per template): `MANUAL_ONLY | MANUAL_OR_SCHEDULED | AUTO_EVENT_DRIVEN | AUTO_TIME_DRIVEN`.

**Materialization** — **hybrid** per your choice:
- **Hooks** (synchronous): `inspection.scheduled`, `inspection.rescheduled`, `inspection.cancelled`, `report.finalized`, `case.opened`, `case.closed`, `communication.no_response`, `communication.acknowledged`. Implemented in `src/lib/audit/scheduleHooks.ts`, called from existing inspection/report/case services. Hooks handle EVENT triggers + create the *first* time-relative item when an anchor date is set/changed.
- **Cron** (every 15 min): edge fn `ce-audit-communication-materialize` scans active TIME_RELATIVE policies whose anchor field is now within `offset` and ensures a draft exists; rolls over recurrence after a previous occurrence is sent.

**Idempotency**: unique partial index on `(template_id, employer_id, inspection_id, occurrence_no, materialized_by_policy_id)` prevents duplicates.

**Approval gating**: if `requires_approval_before_send`, materialized drafts → `pending_approval`; else `approved` directly.

**Recurrence** (simple, per your choice): `interval_days` + `max_occurrences` + `stop_conditions[]`. Next occurrence created when prior one is `sent` AND no stop condition is true.

---

## 7. Manual vs Automatic Dispatch

Extend `ce-audit-communication-dispatch`:
1. Select `status='approved' AND scheduled_at <= now() AND sent_at IS NULL AND cancelled_at IS NULL AND dispatch_locked_at IS NULL`.
2. **Acquire lock**: atomic `UPDATE ... SET dispatch_locked_at=now() WHERE dispatch_locked_at IS NULL RETURNING id` — single-worker dispatch guarantee.
3. Send via existing notification/email infra; on success set `sent_at`, log event, trigger recurrence rollover (in materializer).
4. On failure: increment `dispatch_attempts`, store `last_dispatch_error`, release lock; backoff = `min(60, 2^attempts)` minutes via `scheduled_at` bump; after 5 attempts → `failed` + event.
5. **Cancel-on-status-change**: nightly job marks `status='cancelled'` for items whose template `cancel_on_status_change_json` matches current case/report state.

Manual sends bypass `scheduled_at` (set to `now()` on submit); same approval + dispatch path.

---

## 8. Instance Workflow Improvements

New `CommunicationDraftDialog`:
- Tabs: Content / Recipients / Schedule / Preview
- **Schedule tab**: radio { Send now | Schedule for | Auto (read-only, from policy) }; datetime picker; recurrence toggle (only if template allows); reschedule + cancel for existing scheduled items; "send now" override.
- Approval submit, approve/reject buttons gated by role.
- Delivery history table at bottom (deliveries + events join).

---

## 9. Backward Compatibility

- All schema additions are nullable / defaulted → existing rows untouched.
- `attachment_rule_json` kept; new actions table additive.
- Default `send_mode='MANUAL_ONLY'` preserves current "manual draft + approve + send" flow exactly.
- Existing dispatcher loop still works on day 1; lock + retry + recurrence are pure extensions.
- Read-only admin page becomes the templates index with filters; editor is a new route.
- Existing services extended (not rewritten); new services for policy and actions.

---

## 10. Phased Rollout Plan

| Phase | Scope | User-visible? |
|---|---|---|
| **1 — Schema & data migration** | Migration §3.1–3.5; auto-classify; seed actions; new services; typed registry; updated TS types | No (foundation) |
| **2 — Admin Template Editor** | Templates index w/ filters + clone/preview; full editor route with all 7 tabs; preview renderer | Yes |
| **3 — Instance workflow upgrades** | `CommunicationDraftDialog` with schedule/recurrence/preview; reschedule + cancel + send-now; delivery history | Yes |
| **4 — Dispatcher hardening** | Extend `ce-audit-communication-dispatch`: lock, retries/backoff, recurrence-aware, cancel-on-status | Background |
| **5 — Materializer + hooks** | New edge fn `ce-audit-communication-materialize` + pg_cron (15 min); hooks wired into inspection/report/case services | Background |
| **6 — QA / docs** | Knowledge entries, test cases, smoke run, brief admin guide | No |

I will pause for your approval after **each** phase before starting the next.

---

## 11. Files Changed (anticipated)

**New**
- `supabase/migrations/<ts>_audit_comm_templates_v2.sql`
- `supabase/functions/ce-audit-communication-materialize/index.ts`
- `src/services/auditCommunicationSchedulePolicyService.ts`
- `src/services/auditCommunicationTemplateActionsService.ts`
- `src/lib/audit/communicationActions.ts`
- `src/lib/audit/scheduleHooks.ts`
- `src/lib/audit/templatePreview.ts`
- `src/pages/compliance/admin/AuditCommunicationTemplateEditorPage.tsx`
- `src/components/compliance/communication/template-editor/{Content,Sections,Recipients,Approvals,Actions,Scheduling,Preview}Tab.tsx`
- `src/components/compliance/communication/CommunicationDraftDialog.tsx`

**Modified**
- `src/pages/compliance/admin/AuditCommunicationTemplatesPage.tsx`
- `src/services/auditCommunicationTemplateService.ts`
- `src/services/auditCommunicationService.ts`
- `supabase/functions/ce-audit-communication-dispatch/index.ts`
- `src/types/auditCommunication.ts` (likely split per existing 212-line warning)
- `src/components/routing/AppRoutes.tsx`
- Inspection/report/case services where event hooks emit
