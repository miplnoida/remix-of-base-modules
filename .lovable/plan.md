# Enterprise Communication & Branding Framework

A unified architecture so every comm/branding screen has one owner, one data source, and one generation path. Delivered in sequenced phases — no code lands until Phase 1 (audit) is reviewed, because audit results determine what gets reused vs. created.

## Scope (10 screens, one ecosystem)

Organization Profile · Locations/Branches · Departments & Units · Department Communication · Communication Assets Library · Text Blocks · Official Communication Templates · Email/SMS/Notification Templates · Public Portal Branding · Receipt/Statement/Certificate Assets

---

## Phase 1 — Table Audit (deliverable: report, no code)

Inventory every existing comm/branding table. Output a markdown report at `docs/architecture/comm-branding-audit.md` with one row per table:

| Table | Status (Existing/New) | Purpose | Owner Screen | Consumer Screens | Duplicate Of | Reuse Decision |

Candidate tables already in schema (partial list — full audit will enumerate all):
`core_organization`, `core_department`, `core_department_profile`, `core_department_location`, `core_team`, `core_workbasket`, `office_locations`, `comm_letterhead`, `comm_media_asset`, `comm_media_asset_version`, `comm_asset_mapping`, `comm_asset_audit_log`, `comm_disclaimer`, `comm_email_signature`, `comm_print_footer`, `core_text_block`, `core_template`, `core_template_version`, `core_template_channel`, `core_template_channel_variant`, `core_template_section`, `core_template_layout`, `core_template_token`, `core_template_localization`, `core_template_category`, `core_template_approval`, `core_template_usage`, `core_template_schedule_policy`, `core_template_variable_binding`, `core_template_legal_reference`, `notification_templates`, `notification_template_versions`, `notification_template_audit_logs`, `notification_types`, `notification_providers`, `notification_queue`, `notification_logs`, `email_layout_components`, `email_campaigns`, `app_themes`, `core_generated_document`, `core_document_signature_usage`, `core_document_test_print_log`, `core_document_sequence`, `core_dms_*`, `app_modules`.

**Rule:** zero new tables until reuse is ruled out per row.

---

## Phase 2 — Ownership Matrix

Single document at `docs/architecture/comm-ownership-matrix.md`. One owner per concern:

- **Organization Profile** → identity, defaults, branding defaults, default assets, default text blocks, default locations, default policies.
- **Departments** → behaviour, comm overrides, contacts, manager, workbasket, team, DMS defaults.
- **Communication Assets** → logos, seals, stamps, signatures, QR, watermarks, icons, images.
- **Text Blocks** → reusable paragraphs (disclaimers, instructions, notices, footers).
- **Official Templates** → layouts, structure, print/PDF rules, channels, inheritance.
- **Notification Templates** → wording, triggers, recipients, channels.
- **Portal Branding** → portal appearance, login, dashboards, banners, theme.
- **Receipt/Statement/Certificate Assets** → financial layouts only (inherit everything else).

Any field listed for two owners is a conflict and must be resolved before Phase 3.

---

## Phase 3 — Enterprise Resolver Services

New folder `src/lib/enterprise/`. One service per concern, each the **only** way modules read configuration:

```
src/lib/enterprise/
  OrganizationResolver.ts
  DepartmentResolver.ts
  CommunicationAssetResolver.ts
  TextBlockResolver.ts
  TemplateResolver.ts
  NotificationResolver.ts
  PortalBrandingResolver.ts
  ReceiptResolver.ts
  DocumentGenerationResolver.ts
  index.ts            // re-exports + EnterpriseContext type
  inheritance.ts      // shared resolve(org, dept, module, docType, txn) helper
  references.ts       // shared "where used" registry
```

Each resolver exposes `resolve(ctx)`, `whereUsed(id)`, `list(filter)`. No screen queries `comm_*` / `core_template*` / `notification_*` tables directly after Phase 3 lands. A lint rule + codemod will enforce it.

---

## Phase 4 — Inheritance Chain

`Organization → Department → Module → Document Type → Transaction`

Implemented once in `inheritance.ts` as `resolveWithInheritance(layers, key)` returning `{ value, sourceLayer, overriddenAt[] }`. All resolvers use it. UI shows the source badge ("inherited from Organization", "overridden at Department").

---

## Phase 5 — Reference Integrity (extend existing safe-delete)

Extend `src/lib/comm/referenceRegistry.ts` + `safeDeleteService.ts` (already built) to cover every owner type from Phase 2. Every config record exposes:

- `whereUsed()` — direct refs
- `usedBy()` — transitive refs
- `dependents()` — children that would break
- Delete blocked while refs exist; **Replace References** dialog (already built) reused.

---

## Phase 6 — Centralized Document Generation Service

`src/lib/enterprise/DocumentGenerationResolver.ts` is the single entry point. Legal / Benefits / Compliance / Finance / HR / Registration / Employer Services all call:

```ts
generateDocument({ moduleCode, docTypeCode, transactionRef, channel, context })
```

Every call writes a `core_generated_document` row capturing: template id + version, organization, department, asset ids used, text block ids used, PDF blob ref, print/email/portal history, DMS document id. Modules lose their private PDF/email code paths.

---

## Phase 7 — Master Logo Pipeline

Upload one master logo → asset pipeline derives: favicon, mobile icon, sidebar logo, watermark, QR-center logo, login logo, email logo, document logo. Stored as a `comm_media_asset` family (parent + derived versions in `comm_media_asset_version`). Supports regenerate, version, usage tracking, replace.

---

## Phase 8 — Text Blocks Everywhere

Audit templates and code for hardcoded paragraphs (Disclaimer, Appeal Rights, Employer Instructions, Office Hours, Confidentiality, Payment Instructions, Footer Notes). Replace with `{{text_block:CODE}}` tokens resolved by `TextBlockResolver`. Migration seeds canonical blocks into `core_text_block`.

---

## Phase 9 — Official Communication Templates

Extend the existing TemplateDesigner with: template inheritance picker, department overrides, asset selectors (signature/stamp/seal/watermark already in progress), header/footer designer, live preview, print preview, test print, test email. Every preview/test inserts into `core_template_usage` + `core_document_test_print_log`.

---

## Phase 10 — Notification Templates

`notification_templates` extended to use `{{text_block:…}}` and `{{asset:…}}` tokens resolved via `TextBlockResolver` + `CommunicationAssetResolver`. Channels: Email, SMS, In-App, Push, future WhatsApp. Recipients resolved via `DepartmentResolver` + `OrganizationResolver`.

---

## Phase 11 — Portal Branding

`PortalBrandingResolver` reads from Organization + Communication Assets only; department overrides allowed where flagged. No new branding tables — `app_themes` + `core_organization` + `comm_media_asset` are the source.

---

## Phase 12 — Receipt / Statement / Certificate Assets

Refactored to inherit org branding + comm assets + official template layouts + text blocks + department comm. Drop any duplicate branding fields they hold today (migration moves data to the canonical owner).

---

## Phase 13 — Enterprise Configuration Health Dashboard

New page `src/pages/admin/organization/EnterpriseHealthPage.tsx` driven by `src/lib/enterprise/healthChecks.ts`. Checks:

missing defaults · broken references · unused assets · duplicate assets · orphaned department profiles · inactive assets · broken template inheritance · invalid text block refs · missing signatures/stamps/logos · missing org defaults.

Each finding links to the owner screen with the offending record preselected.

---

## Phase 14 — Acceptance Gates

Automated checks merged into CI:

1. `tsgo` zero errors.
2. Lint rule: no direct imports from `@/integrations/supabase/client` inside comm/branding screens — must go through resolvers.
3. Grep gate: no hardcoded org/department names, branding strings, or comm content in `src/**`.
4. Every owner type has: versioning, audit log, usage tracking, where-used, replace-before-delete.

---

## Execution order & checkpoints

1. **Phase 1 audit report** — I produce `docs/architecture/comm-branding-audit.md` and stop. You review and confirm reuse decisions.
2. **Phase 2 ownership matrix** — produced and confirmed.
3. **Phase 3 resolvers + Phase 4 inheritance** — landed together (no UI change yet).
4. **Phase 5 reference integrity expansion** — extend existing safe-delete.
5. **Phase 6 DocumentGenerationResolver** — modules migrated one at a time (Legal → Benefits → Compliance → Finance → HR → Registration → Employer Services).
6. **Phases 7–12** — owner-by-owner refactors, each behind the resolvers from Phase 3.
7. **Phase 13 health dashboard.**
8. **Phase 14 CI gates flipped on.**

Each phase is its own PR-sized change with its own migration (if any), tests, and TypeScript green.

---

## Technical notes

- All new tables follow project NO-RLS standard (auth at app/edge layer) and include `GRANT` blocks.
- Resolvers cache via `@tanstack/react-query` with `staleTime` aligned to project navigation standards.
- Inheritance source badges use existing `SearchableSelect` + tooltip patterns.
- Reuses existing `useSafeDelete`, `ReplaceReferencesDialog`, `WhereUsedPanel`, `referenceRegistry`, `referenceScanner`, `signatureResolver`, `buildSignatureBlockHtml`, `signatureValidation`, `signatureAuditService`.
- No mock data; seed rows tagged `SEED-` per project policy.

## What I will NOT do until you approve this plan

Touch any file. The audit (Phase 1) is the first deliverable and is itself reviewable before any schema or code change.
