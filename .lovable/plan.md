# Enterprise Refactor — Organization, Department Profile & Communication Assets

This is an **architecture proposal only**. No code/SQL runs until you approve.

---

## Part 1 — Current Department Profile audit

**Table:** `lg_department_profile` (57 columns today, single row)

**Consumers found in repo:**


| File                                      | What it reads                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `useLgPolicy.ts → useLgDepartmentProfile` | 5 workflow mode flags (size, auto-assign, approvals, asst review, mgr role) — drives `useLgCan` gating |
| `useLegalSetupValidation.ts`              | Existence check only                                                                                   |
| `useLgDepartmentProfileFull.ts`           | Full row, used by letterhead + admin page                                                              |
| `LegalAdminDepartmentProfile.tsx`         | Edits 50+ identity/contact/branding/comms fields                                                       |
| `LegalLetterhead.tsx`                     | Institution, dept, address block, phone, email, website, logo                                          |
| `GenerateTemplateDialog.tsx`              | Preview letterhead + signature                                                                         |
| `departmentMergeContext.ts`               | Builds `{{dept.*}}` tokens (institution, address, signature, footer, AI prefix…)                       |
| `LgPolicyConfig.tsx`                      | Cache invalidation                                                                                     |


**Not yet wired** (configured but not consumed anywhere): `core_template` rendering, `lg_notice`, generated PDFs (`htmlToPdf`), `dms_transfer_queue`, `notification_*`, `la_ai_analysis`, reports. The letterhead component exists but is only rendered in two preview spots.

---

## Part 2 — Existing master tables that should be reused (no new duplicates)


| Need                        | Existing table                                                                                 | Reusable?                                                                    | Gap                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Organization / Institution  | *(none — implicit "SSB")*                                                                      | ❌                                                                            | Need 1 lightweight `core_organization` (single row OK for SKN)             |
| Office / Branch             | `tb_office` (9 cols), `office_locations` (11), `er_locations` (9), `tb_office_departments` (7) | ✅ `tb_office` + `office_locations`                                           | Need: GPS, office_hours, manager_user_code, logo_override                  |
| Country                     | `tb_country`                                                                                   | ✅                                                                            | —                                                                          |
| Currency                    | `tb_currencies`                                                                                | ✅                                                                            | —                                                                          |
| District / Parish / Village | `tb_district`, `tb_villages`, `tb_postal_district`                                             | ✅                                                                            | —                                                                          |
| Postal                      | `tb_postal_code`, `tb_postal_zones`                                                            | ✅                                                                            | —                                                                          |
| Users / Staff               | `profiles`, `lg_staff`, `security_users`                                                       | ✅                                                                            | —                                                                          |
| Teams                       | `lg_team`, `lg_team_member`                                                                    | ✅ Legal scope; need generic `core_team` later when Benefits/Compliance adopt | Optional Phase 2                                                           |
| Workbaskets                 | `lg_workbasket`, `bn_workbasket`, `ce_assignment_queues`                                       | ⚠️ per-module today                                                          | Keep per-module; Department Profile references its own module's workbasket |
| Department list             | `tb_dept`, `tb_office_departments`, `ia_departments`                                           | ✅ — pick `tb_office_departments` as canonical                                | Add `module_code` discriminator                                            |
| Templates                   | `core_template*` (15 tables)                                                                   | ✅ — already a strong central system                                          | Wire token resolver to new comm assets                                     |
| Document storage            | `core_dms_*`, `dms_transfer_queue`                                                             | ✅                                                                            | Pass org/dept/location IDs into metadata                                   |
| Number sequences            | `core_number_sequence*`                                                                        | ✅                                                                            | —                                                                          |


**Decision:** do NOT create new geography/people masters. Extend `office_locations` minimally if missing fields. Promote `lg_department_profile` to a generic `core_department_profile` (keep `lg_*` view for back-compat).  
  


---

## Part 3 — Proposed enterprise data model

```text
core_organization (1..N, usually 1 per tenant)
  └─ office_locations (N — St Kitts, Nevis, …)  [existing, extended]
       └─ phone/email/hours/gps/manager
core_department_profile (N — one per module/department)
  ├─ organization_id
  ├─ primary_location_id           → office_locations
  ├─ default_letter_location_id    → office_locations
  ├─ default_email_location_id     → office_locations
  ├─ default_dms_location_id       → office_locations
  ├─ department_manager_user_code  → profiles
  ├─ deputy_manager_user_code      → profiles
  ├─ default_team_id               → lg_team / bn_workbasket / …
  ├─ default_workbasket_id
  ├─ default_letterhead_id         → comm_letterhead
  ├─ default_email_signature_id    → comm_email_signature
  ├─ default_disclaimer_id         → comm_disclaimer
  ├─ default_print_footer_id       → comm_print_footer
  └─ workflow mode flags (existing 5, untouched)
core_department_location  (M:N — active locations a dept operates from)

comm_letterhead          (name, version, logo_url, secondary_logo_url,
                          header_html, footer_html, qr_code_url,
                          effective_from/to, is_active)
comm_email_signature     (name, department_id?, officer_user_code?,
                          html_signature, plain_text_signature, is_active)
comm_disclaimer          (name, category, language, body, effective_from/to, is_active)
comm_print_footer        (name, footer_html, watermark_url, page_footer, version, is_active)
```

`lg_department_profile` becomes a **view** over `core_department_profile WHERE module_code='LEGAL'` so existing code keeps working unchanged.

---

## Part 4 — Department Profile UI (thin)

Header summary bar (always visible): Department • Code • Manager • Default Team • Primary Location • Save status.

Tabs (each saves independently):

1. **General** — name, code, type, description, status
2. **Leadership** — manager, deputy, default team, default workbasket
3. **Locations** — primary + multi-select active locations (lookup `office_locations`); per-purpose defaults (letter / email / DMS)
4. **Communication** — pick Letterhead / Email Signature / Disclaimer / Print Footer (with inline preview button)
5. **Integrations** — DMS folder root, AI prompt prefix, show-on-PDFs toggle, show-letterhead-on-reports toggle
6. **Usage & Validation** — live "Used By" matrix; flags missing/inactive references

All free-text identity/contact/branding fields move OUT of `lg_department_profile`. Existing rows migrated:

- address fields → seed/match to `office_locations` (St Kitts HQ row), set `primary_location_id`
- `letter_signature`, `email_signature`, `notice_footer`, `letterhead_*`, `print_footer`, `legal_disclaimer`, `logo_url`, `seal_url` → new `comm_*` rows; profile keeps only the ID
- 50→~20 columns; removed columns kept as **deprecated nullable** for one release for back-compat

---

## Part 5 — Centralised Communication Assets admin

New routes under `/admin/communication/`:

- Letterheads · Email Signatures · Disclaimers · Print Footers
Each list page shows "Used By" chips computed from `core_department_profile.default_*_id` joins.

---

## Part 6 — Token resolver (single source)

New `src/lib/comm/communicationResolver.ts` produces a flat token map:

```
{{organization.name}}      {{department.name}}      {{department.code}}
{{location.address}}       {{location.phone}}       {{location.email}}
{{letterhead.logo}}        {{letterhead.header}}    {{letterhead.footer}}
{{email.signature}}        {{disclaimer.standard}}  {{print.footer}}
{{ai.systemPrompt}}
```

Wired into: `coreTemplateResolverService`, `legalTemplateContextService`, `GenerateTemplateDialog`, `htmlToPdf` headers/footers, `notification_*` sender block, `dms_transfer_queue` metadata, `la_ai_analysis` system prompt. Existing `{{dept.*}}` tokens kept as **aliases** → resolver, so no template breaks.

---

## Part 7 — Backward compatibility

- `lg_department_profile` becomes a view; `useLgDepartmentProfileFull` still works (joins through view).
- 5 workflow mode flags untouched → `useLgCan` unaffected.
- Old free-text columns kept (deprecated) for 1 release; resolver reads new IDs first, falls back to legacy text.
- All current routes/APIs/permissions preserved.
- `LegalLetterhead.tsx` now reads from resolver instead of profile directly (same JSX output).

---

## Part 8 — Phased delivery

1. **Phase A — Masters & migration** (no UI change)
  - Add `core_organization`, `core_department_profile`, `core_department_location`, `comm_*` tables + grants.
  - Backfill from `lg_department_profile` + seed SKN org + St Kitts/Nevis offices into `office_locations` if not present.
  - Replace `lg_department_profile` with a view; regenerate types.
2. **Phase B — Resolver & wiring**
  - Build `communicationResolver`; alias `{{dept.*}}` → new tokens.
  - Switch `LegalLetterhead`, `GenerateTemplateDialog`, PDF/print, notifications, DMS metadata, AI prompts to resolver.
3. **Phase C — UI**
  - Rebuild `LegalAdminDepartmentProfile.tsx` as the 6-tab thin workspace (drives `core_department_profile`).
  - Add `/admin/communication/*` CRUD pages with "Used By" panels.
4. **Phase D — Cleanup** (next release)
  - Drop deprecated free-text columns after verifying no consumer reads them.

---

## Part 9 — Out of scope

- Multi-tenant org isolation (single `core_organization` row for SKN SSB)
- Cross-module workbasket unification (kept per-module: `lg_workbasket`, `bn_workbasket`, `ce_assignment_queues`)
- Translating existing template bodies (only the token resolver changes)

---

## Acceptance check

✓ Department Profile shrinks to ~20 columns of IDs/flags
✓ Addresses live only in `office_locations`
✓ Branding lives only in `comm_*`
✓ Letters / emails / PDFs / notifications / DMS / AI all resolve through one resolver
✓ Existing `lg_*` code, routes, permissions, workflow gating unchanged
✓ TypeScript build green after each phase

---

**Reply `approve A**` to start with Phase A (migration + masters + view), or tell me which parts to trim/expand.