

## Compliance Admin → Templates & Output: Refinement Plan

Approved scope: refine the 3 areas (Communication Templates, Report Templates, Shared Sections & Foundation) for the employer audit lifecycle. Additive, backward-compatible.

---

### 1. Database changes (one migration)

**A. Lifecycle taxonomy on communication templates**
- Add column `lifecycle_stage` (text) to `ce_audit_communication_templates` with CHECK in:
  `pre_visit | during_audit | post_review | final_enforcement | reminders_escalation`
- Backfill from existing `category` values (best-effort mapping; defaults `during_audit`).
- Keep existing `category` column for backward compatibility.

**B. Explicit Communication → Report linkage**
- Add column `linked_report_template_type` (text) on `ce_audit_communication_templates`
  referencing `ce_document_templates.template_type` (the existing CE report-template enum).
- Nullable. No FK (template_type is an enum-like text), validated in UI.

**C. Seed default schedule policies** (only if missing) for:
- Audit Intimation → TIME_RELATIVE, anchor `inspection.visit_date`, offset −10 days
- Books / Records Required → TIME_RELATIVE, anchor `inspection.visit_date`, offset −7 days
- Visit Reminder → TIME_RELATIVE, anchor `inspection.visit_date`, offset −1 day
- Due Date Reminder → recurring every 7 days, max 4
- Escalation Notice → EVENT, `communication.no_response`

**D. Seed shared section library blocks** (insert-if-missing into `ce_document_section_library`):
statutory_authority, audit_purpose, employer_obligations_pre_visit, books_required_checklist, payroll_records_checklist, pre_visit_preparation, contact_reschedule, confidentiality_cooperation, acknowledgment_block, dispute_objection, corrective_action, follow_up_instructions, payment_instructions, escalation_warning.

**E. Seed missing communication templates** (only if absent, by `template_code`) covering each lifecycle stage so admin sees a complete starter set. Each links to the appropriate report template_type where applicable (Final Report → `employer_audit_report`, Violation Notice → `violation_notice`, Evidence Summary → `evidence_summary`, Interim Findings → `findings_memo`, Enforcement → `enforcement_pack`).

All inserts are idempotent (`ON CONFLICT … DO NOTHING` or `WHERE NOT EXISTS`).

---

### 2. Frontend changes

**Types** — `src/types/auditCommunication.ts`
- Add `CeCommLifecycleStage` union + `lifecycle_stage` and `linked_report_template_type` fields on `AuditCommunicationTemplate`.

**Service** — `src/services/auditCommunicationTemplateService.ts`
- Accept new fields in create/update payloads. Add `listByStage(stage)` helper.

**Communication Templates page** — `src/pages/audit/AuditCommunicationTemplatesPage.tsx`
- Replace flat list with **lifecycle-stage grouped accordion** (5 collapsible groups in lifecycle order). Each group shows count + a "Add template to this stage" action.
- Add a top **"Coverage" tab** that shows a matrix: stage × (template exists? schedule policy exists? linked report?) with red/green chips and quick "Fix" buttons.
- Keep existing search/filter; add a stage filter.

**Template editor** — `src/components/audit/communications/TemplateContentTab.tsx` (or equivalent)
- Add **Lifecycle Stage** select.
- Add **Linked Report Template** picker (loads from `ce_document_templates`, filtered to employer-audit-relevant types). Shown only when comm involves an attached document.
- Inline helper text explains the responsibility split (this tab = how/when; report template = what document).

**Report Templates page** — `src/pages/audit/DocumentTemplateSettings.tsx`
- Add a **"Used by Communications" sidebar/badge** on each report template tab showing which comm templates link to it (via `linked_report_template_type`). Read-only cross-reference.

**Shared Sections & Foundation viewer** — `src/components/audit/templates/SectionLibraryViewer.tsx`
- Add a **"Lifecycle usage" filter chip row** (Pre-Visit / During / Post-Review / Final / Reminders) so admins can find audit-stage-relevant blocks. Powered by a new optional `lifecycle_tags text[]` column on `ce_document_section_library` (additive) — seeded for the new blocks.

**Legacy deprecation**
- `src/pages/audit/TemplatesManagement.tsx` — add a top banner: "This page is deprecated. Use Compliance Admin → Communication Templates / Report Templates / Shared Sections."
- Do not delete; do not remove route.

---

### 3. Lifecycle mapping (what gets seeded)

| Stage | Comm Template | Linked Report | Schedule |
|---|---|---|---|
| Pre-Visit | Audit Intimation | (none / annexure) | TIME_RELATIVE −10d |
| Pre-Visit | Books Required | (records checklist annexure) | TIME_RELATIVE −7d |
| Pre-Visit | Visit Reminder | — | TIME_RELATIVE −1d |
| During | Additional Info Request | — | MANUAL |
| During | Clarification Request | — | MANUAL |
| During | Interim Findings | findings_memo | MANUAL |
| During | Evidence Summary Comm | evidence_summary | MANUAL |
| Post-Review | Draft Findings | findings_memo | MANUAL |
| Post-Review | Acknowledgment Request | — | MANUAL |
| Final | Final Report | employer_audit_report | MANUAL (approval) |
| Final | Violation Notice | violation_notice | MANUAL (approval) |
| Final | Corrective Action Request | — | MANUAL |
| Reminders | Due Date Reminder | — | RECURRING 7d ×4 |
| Reminders | Escalation Notice | enforcement_pack | EVENT no_response |

---

### 4. Backward compatibility

- All DB changes additive (new nullable columns, seeded rows only when missing).
- Existing templates keep working; new fields default to null/`during_audit`.
- Legacy page kept with deprecation banner; no routes removed.
- No changes to RLS, no destructive SQL.

---

### 5. Files to change

- `supabase/migrations/<new>.sql` (schema + seeds, idempotent)
- `src/types/auditCommunication.ts`
- `src/services/auditCommunicationTemplateService.ts`
- `src/pages/audit/AuditCommunicationTemplatesPage.tsx`
- `src/components/audit/communications/TemplateContentTab.tsx`
- `src/pages/audit/DocumentTemplateSettings.tsx`
- `src/components/audit/templates/SectionLibraryViewer.tsx`
- `src/pages/audit/TemplatesManagement.tsx` (deprecation banner only)

Proceeding to implement on approval.

