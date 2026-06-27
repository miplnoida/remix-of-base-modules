## Goal

Turn the Template Designer into a fully **resolver-driven** workspace. Two things change:

1. **General tab** becomes the complete enterprise definition of a template (14 properties below).
2. **Preview panel** becomes a **Resolved Preview**: every visible value (logo, address, phone, signature, stamp, disclaimer, footer, QR, text block) is fetched through the resolver chain and the right-side inspector shows the exact source of each value.

No branding or communication value is ever hardcoded or read directly from a comm/core table inside the designer — everything flows through `resolveCommunication()` (Enterprise framework).

---

## Part A — General Tab (complete enterprise definition)

Add to `TemplateDesignerDialog.tsx` → General tab, grouped into 4 cards:

**1. Identity**
- Code, Name, Category (existing)
- Description

**2. Ownership & Scope**
- Owner Department  (`core_department.code`)
- Business Object   (`Employer | Insured Person | Case | Claim | Invoice | …` — enum)
- Recipient Type    (`Employer | Individual | Internal | External Counsel | Regulator | Public`)
- Security Classification (`Public | Internal | Confidential | Restricted`)

**3. Profiles & Policies**
- Communication Profile  (`core_communication_profile.code`)
- Document Profile       (`core_document_profile.code`)
- Signature Policy       (`None | Optional | Required | Required+Witness`)
- Stamp Policy           (`None | Optional | Required | Required+Seal`)
- Approval Workflow      (`workflow_template.code` lookup)
- Retention Policy       (`Short 1y | Standard 7y | Legal 10y | Permanent`)
- DMS Folder             (free path with token support, e.g. `/Cases/{{case.number}}/Letters`)

**4. Localization & Delivery**
- Default Language (single-select from `tb_country` languages)
- Supported Languages (multi-select)
- Output Channels (multi-select: `EMAIL | PRINT | PDF | SMS | PORTAL | DMS | API | MOBILE_PUSH`)

All values persist on `core_template` (extend columns as needed in a single forward-compatible migration; unknown columns degrade gracefully).

---

## Part B — Resolved Preview + Source Inspector

Rewrite the right-hand preview area as a 2-column layout:

```text
┌──────────────────────────── Preview ────────────────────────────┐
│ ┌─────────────────────────┐  ┌─────────────────────────────────┐│
│ │                         │  │ Source Inspector                ││
│ │   A4 RESOLVED DOCUMENT  │  │ ─────────────────────────────── ││
│ │   (rendered via         │  │ Logo        → Organization Profile││
│ │    generateDocument)    │  │ Org Name    → core_organization  ││
│ │                         │  │ Address     → Basseterre Office  ││
│ │                         │  │ Phone       → Department override││
│ │                         │  │ Signature   → Senior Legal Officer││
│ │                         │  │ Stamp       → Legal Dept Seal    ││
│ │                         │  │ Disclaimer  → Text Block LEGAL_v3││
│ │                         │  │ QR Code     → System default     ││
│ │                         │  │ Footer      → Print Footer #2    ││
│ └─────────────────────────┘  │ ⚠ Missing: case.number token     ││
│                              └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

How:
- New hook `useResolvedTemplatePreview(template)` calls `generateDocument({ templateCode, documentProfileCode, moduleCode, ... })`.
- Designer renders `result.html` inside the A4 frame (replacing the current hand-built preview).
- Inspector reads `result.resolution.trace` + `assets` + `textBlocks` + `context` and lists each value with its `resolved_via` scope (ORGANIZATION / MODULE / DEPARTMENT / LOCATION / USER / SYSTEM_DEFAULT / MISSING) and a colored chip.
- Each row links to the source admin page (e.g. Logo row → `/admin/organization/assets/:id`).
- Missing/MISSING entries surface a warning banner with a "Fix" link.

This deletes the existing local resolution code paths inside the designer (assetResolverByCode, manual asset URL fetches) — designer now consumes only `generateDocument` output.

---

## Part C — Implementation Steps (in order)

1. **Migration** `core_template`: add nullable columns for the 14 fields (owner_department_code, business_object, recipient_type, security_classification, communication_profile_code, document_profile_code, signature_policy, stamp_policy, approval_workflow_code, retention_policy, dms_folder, default_language, supported_languages text[], output_channels text[]). All nullable; no data backfill.
2. **Types** — extend `ResolvedTemplate` & enterprise types with the new fields; surface through `templateResolver`.
3. **General tab UI** — replace existing fields with the 4-card layout. Use `SearchableSelect` for all lookups (Owner Department, Profiles, Workflow). Multi-select for languages & channels.
4. **Resolved preview hook** — `src/hooks/comm/useResolvedTemplatePreview.ts`.
5. **Preview component** — `src/components/comm/ResolvedPreview.tsx` with iframe + inspector.
6. **Source inspector component** — `src/components/comm/SourceInspector.tsx`. Reads `ResolvedCommunication.trace` & renders rows with scope chips, links, and missing-token warnings.
7. **Wire into TemplateDesignerDialog** — replace current right pane.
8. **Health check** — add finding in `healthChecks.ts` flagging any template missing: communication_profile_code, document_profile_code, owner_department_code, or output_channels.
9. **Knowledge entry** — add `docs/architecture/template-designer-resolver-rules.md` codifying "designer reads only resolver output, never raw tables".

---

## Technical Details

- All lookups loaded via parallel React Query calls in the dialog mount.
- `SearchableSelect` options come from: `core_department`, `core_communication_profile`, `core_document_profile`, `bn_workflow_template`, `tb_country` (languages).
- Save flow: General tab → upsert into `core_template`. Unknown columns are guarded with a try/catch and surfaced as a single banner if the migration hasn't been applied yet (forward-compatibility).
- Inspector chip colors use existing semantic tokens: `ORGANIZATION` = primary, `DEPARTMENT` = accent, `LOCATION` = secondary, `SYSTEM_DEFAULT` = muted, `MISSING` = destructive.
- No new business logic — only configuration capture + transparent resolution.

---

## Out of Scope (for this phase)
- Migrating existing modules off direct comm_* reads (already enforced separately).
- Re-rendering live document instances. This work only affects the template definition + designer.
