# Legal Department Profile — Audit & Enhancement Plan

## Part 1 — Usage Audit (findings)

Current `lg_department_profile` columns (20):
`institution_name, department_name, country_code, email, phone, address_line1/2, city, state_region, postal_code, website, department_size_mode, auto_assign_mode, approvals_mode, assistant_review_required, manager_role_required, updated_at/by, created_at, id`

Where they are read today:

| File | Uses |
|---|---|
| `useLgPolicy.ts → useLgDepartmentProfile` | Only the 5 *workflow* fields (size_mode, auto_assign, approvals, assistant_review, manager_role) for `useLgCan` gating |
| `useLegalSetupValidation.ts` | Existence check only (setup completeness) |
| `LegalAdminDepartmentProfile.tsx` | Edits 11 identity fields |
| `LgPolicyConfig.tsx` | Invalidates cache |

**Unused fields (configured but never consumed):** `institution_name`, `department_name`, `country_code`, `email`, `phone`, `address_line1/2`, `city`, `state_region`, `postal_code`, `website`.
Nothing in letter templates, notices, generated PDFs, DMS metadata, AI prompts, dashboard, or print layouts currently reads the profile. The "issuing authority" promise in the UI is not honoured.

**Missing integrations to wire (single source of truth):**
1. Letter/notice template merge fields (`{{dept.*}}`) — `core_template` rendering and `GenerateTemplateDialog`.
2. PDF/print layouts — `htmlToPdf`, `invoicePrinter`, legal document headers/footers.
3. AI prompt context — legal AI analysis (`la_ai_analysis`, contract review prompts) gets dept identity in the system prompt.
4. DMS metadata — `core_generated_document` / `dms_transfer_queue` payload tags issuing dept.
5. Email notifications — `from`/signature block sourced from profile.
6. Dashboard — header chip shows institution + department.
7. Reports — footer/letterhead block.

## Part 2 — UI/UX Enhancement

Reshape `LegalAdminDepartmentProfile.tsx` into sectioned form:

- **General** — Institution, Department, Country (SearchableSelect from `tb_country`), Time Zone (SearchableSelect — IANA list), Website, Logo URL
- **Contact** — Email, Phone (PhoneInput), Fax, Reply-to email, Support email
- **Leadership** — Head of Legal (SearchableSelect from `lg_staff` lawyers), Deputy Head, Default Approver Role (existing role-type), Default Reviewer
- **Communication** — Default letter signature block (textarea), Email signature, Default notice footer, Default salutation
- **Operations** — Department size mode, Auto-assign mode, Approvals mode, Assistant review required, Manager role required, Default Team (SearchableSelect `lg_team`), Default Workbasket (`lg_workbasket`)
- **Integrations** — DMS folder root, AI prompt prefix, Reports letterhead toggle, Show dept on PDFs toggle

All dropdowns use `SearchableSelect`. Address block keeps inputs but City uses free text (no master); State/Postal validated by length. Inline help under each field. zod-style validation; save blocks on invalid email/phone/URL.

New DB columns added (nullable, backward compatible):
`time_zone, fax, reply_to_email, support_email, head_of_legal_staff_id, deputy_head_staff_id, default_team_id, default_workbasket_id, letter_signature, email_signature, notice_footer, default_salutation, logo_url, dms_folder_root, ai_prompt_prefix, show_on_pdfs (bool), show_letterhead_on_reports (bool)`

## Part 3 — Usage Visibility

Add **"Used By"** read-only card at bottom of profile page listing each consumer with status:

| Consumer | Field(s) used | Status |
|---|---|---|
| Letter templates | institution, department, address, signature | ✅ wired |
| Notices | dept, footer, contact | ✅ wired |
| Email notifications | email, reply_to, email_signature | ✅ wired |
| Generated PDFs | full identity, logo | ✅ wired |
| Reports | letterhead | toggle |
| AI prompts | ai_prompt_prefix, dept name | ✅ wired |
| Dashboard header | institution, department | ✅ wired |
| DMS metadata | dms_folder_root, dept | ✅ wired |
| Print layouts | logo, address, phone | ✅ wired |
| Workflow gating | 5 mode flags | ✅ already wired |

Statuses computed live: green when at least one matching ref exists in templates/notices/etc., grey "not yet referenced" when no consumer reads that field — fulfils the "highlight unreferenced configured fields" requirement.

## Implementation order

1. **Migration** — add 17 new columns + grants (no-op for existing data).
2. **Shared hook** `useLgDepartmentProfileFull()` returning the full row, cached 5 min.
3. **Merge token helper** `buildDepartmentMergeContext(profile)` → exposes `{{dept.institution}}`, `{{dept.signature}}` etc. Wire into `core_template` rendering path and `GenerateTemplateDialog` preview.
4. **PDF/print** — header/footer component `<LegalLetterhead/>` reads profile; used by `htmlToPdf` legal renderers.
5. **AI prompt** — prepend `ai_prompt_prefix` + institution/dept to existing legal AI prompts.
6. **DMS metadata** — include `department_code` + `dms_folder_root` in upload payload.
7. **Email notifications** — replace hardcoded "Legal Department" strings with profile values.
8. **Dashboard chip** — top-of-page badge in `LegalUnifiedWorkbench` & `LegalAdminHub`.
9. **Rewrite `LegalAdminDepartmentProfile.tsx`** — six sections, SearchableSelect lookups, validation, inline help, "Used By" card.

## Out of scope

- Renaming or removing existing columns
- Changing workflow gating logic in `useLgCan`
- New master tables (reusing `tb_country`, `lg_staff`, `lg_team`, `lg_workbasket`, `lg_role_type_mapping`)

Reply **go** to execute, or tell me which sections to trim.
