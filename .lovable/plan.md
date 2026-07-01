# Email Template Enterprise Refactor — Plan

Mirror the Letterhead architecture already in place: **Base Layout (shell) + Branding Defaults (resolver chain) + Business Template (content only) → composed at render time**. No email template stores shell HTML, logo, signature, footer, or disclaimer.

## 1. Data model (additive, non-breaking)

Extend existing tables — do NOT create parallel engines.

- `core_template_layout` — add `layout_kind` (`LETTERHEAD` | `EMAIL`) and email-only columns: `email_max_width`, `email_background_hex`, `email_font_family`, `email_button_style_json`, `email_divider_style_json`, `header_html`, `body_placeholder_html`, `signature_slot`, `footer_slot`, `disclaimer_slot`, `logo_position`, `mobile_responsive`.
- `core_template` (email rows, `template_type='EMAIL'`) — add `preheader`, `cta_label`, `cta_href_token`, `attachment_rules_json`. Body stays content-only.
- `core_department_profile` / `core_module_profile` / `core_organization` — add `default_email_layout_id`, `default_email_signature_id`, `default_email_footer_id`, `default_email_disclaimer_id`, `default_email_sender_name`, `default_email_reply_to`, `default_email_language`, and matching `inherit_email_*_from_parent` flags (same pattern as letterhead columns already present).
- `core_configuration_assignment` — reuse existing table for scope-based email layout/signature/footer/disclaimer/sender/reply-to overrides (module, workflow, workflow-stage, business-event scopes).

GRANTs identical to sibling tables. No RLS (per project policy).

## 2. Resolver

Create `src/lib/enterprise/resolvers/emailBrandingResolver.ts` that walks:
`Global → Organization → Department → Module → Workflow → Workflow Stage → Business Event → Template explicit override`
and returns `{ layout, signature, footer, disclaimer, logo, senderName, replyTo, language, theme }` each with `{ value, source }`.

Update `NotificationResolver.ts` `EMAIL` path to compose:
`layout.header_html + rendered(body) + signature + footer + disclaimer` with tokens/text-blocks expanded through existing tokenizer. Plain-text fallback auto-derived from HTML.

## 3. Seeds (migration)

Insert 6 base layouts: `BASE_EMAIL_GOVERNMENT`, `BASE_EMAIL_MINIMAL`, `BASE_EMAIL_ALERT`, `BASE_EMAIL_RECEIPT`, `BASE_EMAIL_LEGAL`, `BASE_EMAIL_REPORT`. Assign org default = `BASE_EMAIL_GOVERNMENT`. Module overrides: LEGAL→LEGAL, PAYMENTS→RECEIPT, REPORTS→REPORT. Only inserts new rows; existing templates untouched.

## 4. UI

- **Core Catalogue → Base Layouts**: filter by `layout_kind`. New `EmailLayoutDesigner.tsx` (header, body/signature/footer/disclaimer placeholders, theme, width, button/divider styles, mobile toggle, live desktop+mobile preview). Existing letterhead designer keeps working.
- **Business Templates → Email Editor**: simplified — Name, Module, Event, Language, Subject, Preheader, Body (RichTextEditor, no shell), Insert Token / Insert Text Block, CTA, Attachments. Full-HTML editing hidden behind an "Advanced developer mode" toggle with warning.
- **Inheritance panel** in the editor: shows effective Layout / Signature / Footer / Disclaimer / Logo / Sender / Reply-to / Language with `Source: Org|Dept|Module|Event` badges and Override / Reset buttons — same visual language as `DepartmentEffectivePreview`.
- **Effective Preview**: Desktop / Mobile / Plain-text tabs rendered via the actual resolver.
- **Configuration Center**: add Email Branding assignment rows (layout / signature / footer / disclaimer / sender / reply-to / language) at Org/Dept/Module/Workflow/Event scopes. Assignment only — no content editing.
- **Organization Profile → Email Branding Preview** section: header + sample body + signature + footer + disclaimer + sender/reply-to + selected default layout + **Test Resolve** button.

## 5. Audit / cleanup

New admin action `Audit Email Templates` (report only, no destructive changes) that scans existing `notification_templates` + `core_template` email rows for: inline `<img logo>`, hard-coded footer/disclaimer phrases, inline `Sincerely/Regards` signatures, full `<html>`/`<body>` shells. Report offers "Migrate footer→text_block" / "Migrate signature→signature master" / "Strip shell" one-click actions; original body preserved as legacy version in `core_template_version`.

## 6. Validation

Extend `runtimeValidation.ts` with checks: missing base layout, inline signature/footer/disclaimer, missing referenced signature/footer/disclaimer, inactive layout, missing language fallback, unresolved tokens, module email without assignment, event email without fallback. Surfaces in existing Runtime Validation panel.

## 7. Runtime cutover

All emails go through `resolveNotification()` → `emailBrandingResolver` → dispatcher. Existing lint rule `scripts/lint-no-direct-comm.ts` extended to catch direct HTML email sends. Legal email templates (referral, hearing, RFI, decision, closure) reseeded as content-only rows bound to `BASE_EMAIL_LEGAL` — no bespoke HTML.

## 8. Backward compatibility

- No routes renamed, no tables dropped, no columns removed.
- Existing email templates continue to render — if a template still has full shell HTML and no layout binding, resolver falls back to raw body (current behavior) and validation flags it.
- Migration is additive; audit + one-click migrate lets admins move templates over gradually.

## 9. Deliverables checklist

- [ ] Migration: layout_kind + email columns + org/dept/module email defaults + seeds + GRANTs
- [ ] `emailBrandingResolver.ts` + `NotificationResolver` EMAIL composition
- [ ] `EmailLayoutDesigner.tsx` in Core Catalogue
- [ ] Simplified Email Template Editor + Inheritance panel + Desktop/Mobile/Plain preview
- [ ] Configuration Center email assignment rows
- [ ] Organization Profile Email Branding Preview + Test Resolve
- [ ] Audit tool + one-click migrators
- [ ] Extended runtime validation checks
- [ ] Legal email templates reseeded as content-only
- [ ] Typecheck clean

## Scope note

This is a substantial multi-file change (~15–20 files, 1 migration, 6 seed layouts, resolver + 4 UI surfaces, audit tooling). Suggest we ship it in **two passes**:

1. **Pass A (foundation)** — schema + seeds + resolver + runtime cutover + validation. Invisible to end users but everything renders correctly through the new pipeline.
2. **Pass B (UI)** — Email Layout Designer, simplified editor, inheritance panel, Configuration Center rows, Org Profile preview, audit tool.

Confirm this split (or say "do it all in one pass") and I'll start with Pass A.
