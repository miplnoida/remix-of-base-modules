# Shared Sections & Foundation

> **Module 29** · Section G — Communication & Reports

| Field | Value |
|---|---|
| Route | `/compliance/admin/document-foundation` |
| Page component | `src/pages/compliance/admin/ComplianceReportTemplates.tsx` rendered with `foundationFocused={true}`, `defaultTab="foundation"` |
| Banner | `<AdminAreaBanner area="foundation" />` |
| Tables touched | `ce_org_document_foundation`, `ce_document_section_library` |
| Hooks | `useComplianceFoundation`, `useComplianceSectionLibrary` |

---

## 1. Purpose

A focused admin surface for the **shared** parts of compliance audit
documents:

- **Section Library** — the catalogue of reusable section blueprints
  that any report template can claim via its `applies_to` array.
- **Foundation** — organisation-wide branding and pagination defaults
  applied to every compliance audit document at render time.

This is the same React component that powers Module 28 (Report
Templates), but with two prop changes:

```tsx
<ComplianceReportTemplates
  defaultTab="foundation"
  foundationFocused={true}
  pageTitle="Shared Sections & Foundation"
  pageDescription="Reusable section library, common clauses/disclaimers, branding and merge fields shared across all employer-audit report templates."
/>
```

The `foundationFocused` flag (line 76 of `ComplianceReportTemplates.tsx`)
**hides the Templates tab** so this URL never shows per-type editing.
Only the Section Library and Foundation tabs are exposed, keeping the
two admin areas conceptually separate even though they share code.

---

## 2. What an admin can do here

### 2.1 Section Library tab

Identical to the implementation documented in
[Report Templates § 2.2](./report-templates.md#22-sectionlibrarytab):

- Filter the library by lifecycle stage (10 stages from
  `COMM_LIFECYCLE_STAGE_ORDER`).
- See, per row: label, mandatory flag, category, lifecycle tags,
  optional description, and which report types (`applies_to`) consume
  the section.

It is **read-only** today — adding/editing a library entry requires a
seed migration. The screen is positioned as a discoverability tool so
admins can confirm what shared content already exists before
authorising a new one.

### 2.2 Foundation tab

Edits the single row of `ce_org_document_foundation` keyed by
`foundation_key='default'`. The form currently surfaces:

- `branding.organization_name`
- `pagination.footer_text`

Save merges the patch into the existing JSON columns and persists via
`useComplianceFoundation.update.mutate(...)`.

---

## 3. Why two routes for one component

Splitting the URL keeps the navigation menu honest:

| Module | Route | Hidden tab(s) |
|---|---|---|
| 28 — Report Templates | `/compliance/admin/report-templates` | none — the Templates tab is the focus |
| 29 — Shared Sections & Foundation | `/compliance/admin/document-foundation` | Templates tab hidden via `foundationFocused` |

This means an admin who is *only* maintaining branding never sees the
per-template noise, and an admin editing one report's structure never
accidentally edits the org-wide footer.

---

## 4. Data flow

Both tabs are pure React-Query reads/writes through the hooks in
`useComplianceDocumentTemplates.ts`. There is no extra service layer.

```text
useComplianceSectionLibrary()
   └─▶ select * from ce_document_section_library order by default_order

useComplianceFoundation()
   ├─▶ select * from ce_org_document_foundation where foundation_key='default'
   └─▶ update ... where foundation_key='default'
```

Cache invalidation: the foundation update invalidates the
`['ce_org_document_foundation']` key, refreshing both tabs that read it
across the app.

---

## 5. Cross-references

- [Report Templates](./report-templates.md) — primary consumer of the
  section library and foundation values; renders the same component
  with the Templates tab visible.
- `mem://design/document-branding` — project rule that every generated
  document must carry Misha Infotech branding on its cover page. The
  organisation name set here feeds that rule.

---

## 6. Findings & risks

1. **Library rows are not editable in the UI.** Any change requires a
   migration. This is intentional today (governance), but means that
   onboarding a new audit type may need engineering involvement.
2. **Foundation tab exposes only two of the JSON keys.** The
   underlying `branding` and `pagination` columns can hold richer
   structures (logos, watermarks, page-number formats). The minimal
   form is a deliberate MVP — flagged so the gap is visible.
3. **Same-component / two-routes pattern** is convenient but means a
   future change to the Templates tab implicitly touches both routes.
   Future contributors should test both URLs after structural edits.
4. **No preview.** The Foundation values cannot be previewed in
   isolation — they only show up when a report is generated. A "render
   sample cover page" affordance would close that loop.

---

_Last updated: see git history of this file._
