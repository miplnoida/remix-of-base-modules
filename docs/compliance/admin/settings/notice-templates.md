# Notification Templates (Compliance Notices / Reminders / Letters)

## 1. Screen Overview
- **Screen name**: Notification Templates (labelled "Templates" in sidebar)
- **Route/path**: `/compliance/admin/settings/templates`
- **Page component**: `src/pages/compliance/settings/ComplianceTemplates.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_notice_templates'`, sort_order 7)
- **Screen type**: Settings / List + Dialog editor with raw and live preview

## 2. Business Function
Manages the **library of message templates** used by the Compliance module to communicate with employers — late-filing notices, payment reminders, summons, hearing notifications, arrangement confirmations, etc. Each template targets one channel (email / SMS / letter) and embeds `{{variables}}` that are merged from the live employer / violation / case context at send time.

Used by **Compliance Communications Owner / Compliance Admin** at set-up and whenever wording needs to be revised (legal review, branding change, bilingual rollout, etc.).

> **Distinction from the Audit Communication Templates screen** (`/compliance/admin/communication-templates`): this screen is the legacy/general compliance notice library backed by `ce_notice_templates`. The other screen is the newer audit-specific template builder with section/clause foundation.

## 3. Primary User Roles
- **Access / Edit**: Compliance Admin, Communications Owner.
- **View only**: Supervisors with read-only role.
- **No approval workflow** — saves are live.

## 4. UI Responsibilities
- Header with `Add Template` button.
- **Filters**: channel (email/sms/letter/all), category (derived from existing templates).
- **Table**: template name, code, category, channel badge, `N vars` summary, active switch, actions (Raw Preview, Live Preview, Edit, Duplicate, Delete).
- **Add/Edit dialog**: template name, code (auto-generated `TPL-EM/SM/LT-NNN`), category (existing or new), channel, subject (for email), body (textarea), inline list of click-to-insert `{{variables}}` (derived from existing templates), `is_active`.
- **Raw Preview dialog**: shows pattern verbatim with variable tokens.
- **Live Preview dialog**: substitutes `SAMPLE_MERGE_DATA` (hardcoded examples like employer name, violation number, amount due, dates) plus a real employer pulled from `er_master` for the employer-name slot.

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Downstream |
|---|---|---|---|
| **Add Template** | INSERT via `createNoticeTemplate`. Variables auto-extracted from body + subject by regex. | INSERT `ce_notice_templates` | Available to be selected by communication composer / cron / case action. |
| **Edit** | UPDATE via `updateNoticeTemplate`. Variables re-extracted. | UPDATE | Future sends use updated wording; already-sent notices are unaffected. |
| **Toggle Active** | `toggleNoticeTemplate`. | UPDATE `is_active` | Communications composer hides inactive templates. |
| **Duplicate** | Insert new with auto-generated code. | INSERT | Useful for variant wording / A-B versions. |
| **Delete** | **Hard delete** via `deleteNoticeTemplate`. | DELETE | Template gone permanently. |
| **Raw Preview / Live Preview** | Read-only render. | None | UX aid. |

## 6. Data Model / Tables Used
| Table | R/W | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_notice_templates` | RW | Template library | `template_code`, `template_name`, `category`, `subject`, `body`, `channel` (email/sms/letter), `variables[]` (auto-extracted), `is_active` | Communication composer (`CommunicationComposer.tsx`), case action handlers, automated reminder cron, audit-planning notifications |
| `er_master` | R | Pulls 10 active employers for the live-preview employer dropdown | `regno`, `name` (where `status='A'`) | Employer master and almost every employer-touching screen |

## 7. Services / Hooks / Queries Used
- `src/services/noticeTemplateService.ts` — `fetchNoticeTemplates`, `createNoticeTemplate`, `updateNoticeTemplate`, `deleteNoticeTemplate`, `toggleNoticeTemplate`, `duplicateNoticeTemplate`, type `NoticeTemplateRow`.
- `@tanstack/react-query` — list query + 5 mutations.
- `@/integrations/supabase/client` — direct query for sample employers.
- Inline helpers: `generateNextCode`, `resolveTemplate` (regex `{{var}}` substitution), `SAMPLE_MERGE_DATA` (hardcoded preview values).

## 8. Validation Rules
| Rule | Where |
|---|---|
| `template_name` required | UI |
| `category` required | UI |
| `body` required | UI |
| `template_code` uniqueness | Service-side `checkDuplicateNoticeTemplate` exists in `complianceSettingsService.ts` (called inside `createNoticeTemplate` — assumed). |
| Variables auto-extracted from `{{name}}` regex matches | UI on save |
| Channel ∈ {email, sms, letter} | UI Select (no DB enum) |

## 9. Workflow / Approval / Notification Logic
- **No draft/submit/approve workflow** — saves are live, deletes are immediate.
- The screen does not *send* notifications; it only stores the templates that the **communication composer** and notification engine will use later.
- Per mem://features/notifications/system-architecture, the wider notification engine routes templates through configured providers (email / SMS / letter print). That orchestration is *outside* this screen.

## 10. Linkages to Other Screens
- **Communication Composer** (`src/components/compliance/communication/CommunicationComposer.tsx`) — selects a template by code and renders it with live employer/case context.
- **Field Stage Template Mapping** (`/compliance/admin/field-stage-template-mapping`) — maps templates to field-visit stages so the right notice is suggested at the right point.
- **Comm Trigger Rules** (`/compliance/admin/comm-trigger-rules`) — automated firing of templates on triggers.
- **Cases / Workbench** — quick actions can dispatch a template-driven notice.
- **Audit Communication Templates** (`/compliance/admin/communication-templates`) — sibling/overlapping surface (audit-specific). Risk of confusion (see §12).

## 11. Audit Trail / Logging
- No explicit audit fields on the visible page (the service may stamp `created_by`/`updated_by` — needs verification in `noticeTemplateService.ts`).
- Hard delete leaves no trace.
- Sent-notice history lives in the **notification engine** tables, not here.

## 12. Technical Risks / Gaps / Assumptions
- **Hard delete** without preservation: a template that was used to send 10,000 notices can be deleted; the historical notice records will reference a non-existent template_code, breaking traceability.
- **Two parallel template systems** (this screen + Audit Communication Templates) — unclear which is authoritative for which use case. Risk of admins editing the wrong one.
- **Hardcoded `SAMPLE_MERGE_DATA`** — preview shows fake amounts/dates; some real variables (e.g. fund-specific amounts) are not represented, so the preview can lull the admin into thinking the template is complete.
- **No locale / language** dimension — bilingual (English / Kreyol / etc.) needs would require adding a language column.
- **Variables are auto-extracted but not validated** against a known dictionary — a typo like `{{empoyer_name}}` will silently render literally at send time.
- **Channel-specific requirements not enforced**: SMS templates have no length warning; letter templates have no header/footer concept.
- **No template versioning** — once edited, the prior wording is lost.

## 13. Recommended Improvements
1. Convert delete to soft-delete (add `is_active=false` flow) so historical notices retain a valid template reference; or copy-on-write into a `ce_notice_template_versions` table.
2. Validate `{{variables}}` against a known data dictionary (analogous to `ce_rule_variable_mappings`) on save.
3. Consolidate or clearly delineate the two template surfaces (this screen vs. Audit Communication Templates) — one should be deprecated or scoped explicitly.
4. Add language dimension and per-channel constraints (SMS char limit, email subject required, letter header).
5. Add versioning + restore.
6. Block deletion when the template is referenced by an active `Comm Trigger Rule` or `Field Stage Template Mapping`.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1082)
- Page: `src/pages/compliance/settings/ComplianceTemplates.tsx`
- Service: `src/services/noticeTemplateService.ts`
- Settings helpers: `src/services/complianceSettingsService.ts` (`checkDuplicateNoticeTemplate`)
- Sibling screen: `src/pages/compliance/admin/AuditCommunicationTemplatesPage.tsx`
- Composer (consumer): `src/components/compliance/communication/CommunicationComposer.tsx`
- Migrations: `supabase/migrations/*ce_notice_templates*`
- Types: `src/integrations/supabase/types.ts`
