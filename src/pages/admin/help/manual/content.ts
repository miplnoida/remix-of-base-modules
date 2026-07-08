/**
 * Organisation Management — User Manual content.
 *
 * Documentation only. All routes and hook names here are grounded in real
 * source code (see `_manualNav.ts` and the platform packages under
 * `src/platform/organization-settings/` and `src/platform/business-settings/`).
 *
 * Rendered by `ManualPage.tsx` using `react-markdown`.
 */
export const MANUAL_CONTENT: Record<string, string> = {
  /* ─────────────────────────────  INTRODUCTION  ───────────────────────────── */

  'overview': `
# Overview & Mental Model

Organisation Management is the **single source of truth** for the settings that
every business module (Employer Registry, Compliance, Benefits, Legal,
Finance, …) uses to produce official communication, apply governance rules,
and identify itself as the organisation.

## What lives here

- **Foundation** — the organisation itself, its locations, departments,
  modules and designation hierarchy.
- **Brand Assets** — media, letterheads, signatures, headers/footers,
  disclaimers, portal branding.
- **Communication Library** — document + notification templates, text blocks,
  tokens, categories, channels, languages.
- **Configuration Center** — binds resolved settings to a scope + business
  event + channel across the six configuration domains (communication,
  workflow, numbering, branding, reporting, ai).
- **Validation & Impact** — health dashboard, usage, impact analysis, broken
  references.

## The one rule

Every business module obtains every setting from
[\`@/platform/business-settings\`](/admin/help/organization-management/consumption-guide).
The module **never reads** template, asset, letterhead, signature, disclaimer,
footer, text-block, notification-template or configuration-assignment tables
directly, and **never calls** the low-level resolver in \`src/lib/comm\`.

## Mental model — inheritance

A setting is resolved along this precedence chain (see \`effectiveSettingsResolver\`):

\`\`\`text
user  →  workflow stage  →  workflow  →  location  →  department
      →  module  →  organisation  →  global default
\`\`\`

Whichever layer is the most specific and has a value wins. When a department
sets \`inherit_letterhead_from_org = true\`, that layer is skipped and the
resolver continues upward.

> **Note.** The manual mirrors the leaves defined in
> \`src/pages/admin/organization/_sections.tsx\`. **Layouts** (Base Layouts /
> Layout Blocks) are referenced in the golden path but are not yet exposed
> as a dedicated menu leaf — marked **VERIFY** where mentioned.

[screenshot placeholder — top-level Organisation Management shell]
`,

  'configuration-order': `
# The Configuration Order (Golden Path)

Order matters. Each step needs the previous one to exist, because every
Brand Asset references org/department scope, every Template references
Layouts + Tokens + Text Blocks, and every Assignment references a Template.

\`\`\`text
1. Organization Profile
        ↓
2. Locations  →  Departments
        ↓
3. Brand Assets  (media → letterheads, signatures, headers/footers, disclaimers)
        ↓
4. Layouts  (base layouts + layout blocks)          [VERIFY — not yet a menu leaf]
        ↓
5. Content primitives  (tokens, text blocks, languages)
        ↓
6. Templates  (document + notification, per channel + language variants)
        ↓
7. Channels  (Email / SMS / WhatsApp / Print / In-App enabled)
        ↓
8. Template Assignments  /  Configuration Center
        ↓
9. Validation  (Health, Usage, Broken References)
        ↓
10. Consumption  (business modules call the settings contract)
\`\`\`

## Step-by-step

1. **[Organization Profile](/admin/org/foundation/profile)** — set org-wide
   defaults: default letterhead, logo, language, default channel, DMS folder.
   Everything inherits from here.
2. **[Locations](/admin/org/foundation/locations)** &
   **[Departments](/admin/org/foundation/departments)** — define the scopes.
   On each department choose *inherit from org* or set an override for each
   asset column (\`inherit_letterhead_from_org\`,
   \`inherit_disclaimer_from_org\`, etc.).
3. **[Brand Assets](/admin/org/assets/media)** — upload media, then create
   letterheads, signatures, headers/footers, and disclaimers that reference
   those media.
4. **Layouts** — build base layouts + layout blocks that compose the above
   assets. **VERIFY** — layouts are not yet exposed as a dedicated menu leaf.
5. **Content primitives** — define
   [Tokens](/admin/org/library/tokens) (merge fields),
   [Text Blocks](/admin/org/library/text-blocks) and
   [Languages](/admin/org/library/languages).
6. **[Templates](/admin/notification-templates)** — document + notification
   templates that consume a layout, tokens, text blocks; author per-channel
   variants (Email / SMS / WhatsApp / Print / In-App).
7. **[Channels](/admin/org/library/channels)** — ensure the delivery channels
   are enabled and configured.
8. **[Template Assignments](/admin/configuration/template-assignments)** /
   **[Configuration Center](/admin/org/configuration-center?domain=communication)**
   — bind Template → Scope → Business Event → Channel.
9. **[Validation](/admin/org/validation/health)** — run Health, Usage and
   Broken References before go-live.
10. **Consumption** — business modules call
    [\`@/platform/business-settings\`](/admin/help/organization-management/consumption-guide).

## Why this order

- A **template** cannot be authored before its **layout** and **tokens** exist.
- A **layout** cannot render before its **letterhead / signature / footer**
  exist.
- A **letterhead** cannot render before its **media** is uploaded.
- An **assignment** cannot resolve to a template that does not exist yet.
- **Business modules** cannot run readiness checks before assignments exist.
`,

  /* ─────────────────────────────  FOUNDATION  ───────────────────────────── */

  'foundation-profile': `
# Foundation — Organization Profile

Route: [/admin/org/foundation/profile](/admin/org/foundation/profile)

## Purpose
The organisation-level record that holds the **top of the inheritance chain**
for every setting.

## When to use it
- First-time setup.
- Rebranding, changing the default language, or switching the default channel.
- Every value here is inherited by every department unless overridden.

## Step-by-step
1. Open **Foundation → Organization Profile**.
2. Fill legal name, short name, registration codes, primary address.
3. Set defaults: **default letterhead, default logo, default seal, default
   watermark, default language, default DMS folder, default location**.
4. Save. All departments that keep \`inherit_*_from_org = true\` will
   immediately resolve to the new values.

## Depends on
- Nothing (root of the chain).

## Used by
- Every department (via \`core_department_profile.inherit_*_from_org\`).
- The resolver \`resolveEffectiveSettingsBundle\` for the \`ORGANIZATION\` layer.
- Every business module through
  [\`@/platform/business-settings\`](/admin/help/organization-management/consumption-guide).

## Tips / common mistakes
- Do **not** treat the profile as a "test scratch pad" — changes propagate to
  every inheriting department.
- Set the default language even if only one is planned; templates without a
  language variant fall back to the org default.

[screenshot placeholder — Organization Profile edit form]
`,

  'foundation-locations': `
# Foundation — Locations & Branches

Route: [/admin/org/foundation/locations](/admin/org/foundation/locations)

## Purpose
The physical / logical **branches** of the organisation. Locations are a scope
in the inheritance chain (below department in precedence) and are the target of
\`default_location\` in \`SETTING_KEYS\`.

## When to use it
- Whenever a new branch, zone, or office is opened.
- When routing user-facing communication to a specific branch address.

## Step-by-step
1. Open **Foundation → Locations / Branches**.
2. Add a location: code, name, address, country, timezone, active flag.
3. Optionally mark one as the organisation's **primary location**
   (feeds \`default_location_id\` on the org).
4. Save.

## Depends on
- Organization Profile.

## Used by
- Department profiles (\`primary_location_id\`).
- The resolver layer \`LOCATION\`.
- Reporting, letterhead address blocks, and any channel that needs a physical
  return address.

## Tips
- Deactivating a location does not delete it — resolver skips inactive layers.
- Never repurpose an existing location code; create a new one.

[screenshot placeholder — Locations list]
`,

  'foundation-departments': `
# Foundation — Departments

Route: [/admin/org/foundation/departments](/admin/org/foundation/departments)

## Purpose
Departments are the **primary override layer** for every branded asset. Each
department can either **inherit** from the organisation or **override** with
its own letterhead, signature, disclaimer, print footer, logo, seal,
watermark, language, DMS folder, or location.

## When to use it
- Creating a new department.
- Giving a department its own letterhead / signature / disclaimer.
- Reverting a department back to org defaults.

## Step-by-step
1. Open **Foundation → Departments**.
2. Add or edit a department (code, name, parent department, primary location).
3. For each asset row (Letterhead, Signature, Disclaimer, Print Footer,
   Language, Logo, Seal, Watermark, DMS Folder) choose either:
   - **Inherit from organisation** — sets \`inherit_<asset>_from_org = true\`.
   - **Override** — pick a specific asset. This sets the override column
     (e.g. \`default_letterhead_id\`).
4. Save. The resolver picks up the change immediately for anyone reading with
   this department in context.

## Depends on
- Organization Profile, Locations, and the Brand Assets you want to override with.

## Used by
- The resolver layer \`DEPARTMENT\` — the most common override layer in practice.
- Every business module that passes \`departmentCode\` in its context.

## Tips / common mistakes
- If a department shows the org value after you set an override, check that
  the corresponding \`inherit_*_from_org\` flag is \`false\`.
- **Never** delete a department that is referenced by a business record —
  deactivate it instead.
- Slot-specific text-block codes on the department profile take precedence
  over the scope-aware \`default_text_block\` assignment.

[screenshot placeholder — Department profile with inheritance toggles]
`,

  'foundation-modules': `
# Foundation — Module Ownership & Defaults

Route: [/admin/org/foundation/modules](/admin/org/foundation/modules)

## Purpose
Defines the **business modules** recognised by the platform (EMPLOYER,
INSURED_PERSON, COMPLIANCE, BENEFITS, LEGAL, FINANCE, REPORTING, …) and their
module-level defaults. Modules sit in the resolver chain between department
and organisation.

## When to use it
- Onboarding a new business module.
- Setting a module-wide override that should apply regardless of department
  (e.g. all BENEFITS communication uses a specific print footer).

## Step-by-step
1. Open **Foundation → Modules**.
2. Add or select a module by code (must match the \`BusinessModuleCode\`
   the business module passes at runtime).
3. Set the module-level owner department and any module-scoped defaults.
4. Save.

## Depends on
- Departments (owner department must exist).

## Used by
- Resolver layer \`MODULE\`.
- The business-settings service, which uses \`moduleCode\` as the primary
  routing key.

## Tips
- Module codes are **stable identifiers** — never rename in place.
- Use module defaults sparingly; prefer department-level overrides for
  branding, because departments are the more common scope in real letters.

[screenshot placeholder — Modules list]
`,

  'foundation-designations': `
# Foundation — Designation & Approval Hierarchy

Route: [/admin/org/foundation/designations](/admin/org/foundation/designations)

## Purpose
Defines job **designations** and the **approval hierarchy** used by workflows
and signature resolution.

## When to use it
- Introducing a new role (Officer / Head / Director / Commissioner).
- Changing who can approve which action.
- Wiring signatures to designations rather than to specific users.

## Step-by-step
1. Open **Foundation → Designation & Approval Hierarchy**.
2. Add a designation (code, label, level, reports-to).
3. Optionally attach a **default signature asset** to a designation so
   letters signed by that role automatically use the correct block.
4. Save.

## Depends on
- Departments (each designation belongs to a department scope).
- Signatures (if attaching a default signature).

## Used by
- Workflow approver resolution.
- Letterhead / signature composition on official documents.

## Tips
- Keep the hierarchy shallow — deep chains slow approvals.
- Test signature resolution with a preview after any change here.

[screenshot placeholder — Designation hierarchy tree]
`,

  /* ─────────────────────────────  BRAND ASSETS  ───────────────────────────── */

  'assets-media': `
# Brand Assets — Media Library

Route: [/admin/org/assets/media](/admin/org/assets/media)

## Purpose
The central repository for **binary brand assets**: logos, seals, watermarks,
signature images, header/footer images, portal images. Every downstream asset
(letterhead, signature, header/footer) references media by ID.

## When to use it
- Uploading a new logo, seal, watermark, or scanned signature.
- Replacing an existing media file with a new revision.

## Step-by-step
1. Open **Brand Assets → Media Library**.
2. Upload the file (PNG/JPG/SVG/PDF as appropriate).
3. Set: title, category, alt text, active flag, and (if used organisation-wide)
   mark it as the organisation logo / seal / watermark.
4. Save.

## Depends on
- Asset Categories (recommended, not required).

## Used by
- Letterheads, Signatures, Headers/Footers, Portal Branding.
- \`default_logo\`, \`default_seal\`, \`default_watermark\` in \`SETTING_KEYS\`.

## Tips
- Prefer SVG for logos and seals so they scale for print.
- Never delete media referenced by a live letterhead — replace the file
  version instead.

[screenshot placeholder — Media Library grid]
`,

  'assets-letterheads': `
# Brand Assets — Letterheads

Route: [/admin/org/assets/letterheads](/admin/org/assets/letterheads)

## Purpose
Composed **letterhead** definitions used by every printed / PDF document. A
letterhead references media (logo, seal), text (return address), and language.

## When to use it
- Creating the default organisation letterhead.
- Creating a department-specific letterhead.

## Step-by-step
1. Open **Brand Assets → Letterheads**.
2. Create a letterhead: code, name, language, logo (from Media), return
   address, contact block, footer strip, active flag.
3. Preview and save.
4. Attach as the org or department default via
   [Organization Profile](/admin/org/foundation/profile) or
   [Departments](/admin/org/foundation/departments).

## Depends on
- Media Library.

## Used by
- \`default_letterhead\` in \`SETTING_KEYS\`.
- Layouts and Document Templates.
- Every business communication that renders a document.

## Tips
- Keep separate letterheads per language when the return address is translated.
- Deactivating a letterhead does not remove existing assignments —
  run **Broken References** afterwards.

[screenshot placeholder — Letterhead editor]
`,

  'assets-signatures': `
# Brand Assets — Signatures

Route: [/admin/org/assets/signatures](/admin/org/assets/signatures)

## Purpose
**Signature blocks** used at the bottom of official documents and emails.
Signatures reference a media asset (scanned signature or seal) and text
(name, designation, department).

## When to use it
- Adding a signature for a specific approver or designation.
- Rotating the default email signature.

## Step-by-step
1. Open **Brand Assets → Signatures**.
2. Create a signature: code, name, signatory name, designation, department,
   signature image (from Media), language, active flag.
3. Optionally set the org-level or department-level default via
   Organization Profile / Departments.

## Depends on
- Media Library, Designations, Departments.

## Used by
- \`default_email_signature\` in \`SETTING_KEYS\`.
- Layouts, Templates, and per-transaction \`signatureOverrideAssetId\` from
  business modules.

## Tips
- Store signature images as transparent PNGs so they compose over any
  background.

[screenshot placeholder — Signature editor]
`,

  'assets-headers-footers': `
# Brand Assets — Headers / Footers

Route: [/admin/org/assets/headers-footers](/admin/org/assets/headers-footers)

## Purpose
Print **header** and **footer** strips reused by layouts. Typical use:
page-number footer, print classification header, legal footnote strip.

## When to use it
- Creating a "For official use only" header.
- Creating a default print footer with page numbers and copyright.

## Step-by-step
1. Open **Brand Assets → Headers / Footers**.
2. Create a header or footer: code, name, type, HTML / text content, media,
   language, active flag.
3. Save.

## Depends on
- Media Library (if using images).

## Used by
- \`default_print_footer\` in \`SETTING_KEYS\`.
- Layouts and Document Templates.

## Tips
- Keep footers short — they are repeated on every page.
- Test with a multi-page document before making the default.

[screenshot placeholder — Header/Footer list]
`,

  'assets-disclaimers': `
# Brand Assets — Disclaimers

Route: [/admin/org/assets/disclaimers](/admin/org/assets/disclaimers)

## Purpose
Standard **disclaimer** blocks appended to documents and emails
(confidentiality, legal, no-reply notices).

## When to use it
- Creating a confidentiality disclaimer for external emails.
- Creating a legal disclaimer for compliance notices.

## Step-by-step
1. Open **Brand Assets → Disclaimers**.
2. Create a disclaimer: code, name, language, HTML/text body, active flag.
3. Assign as the org or department default via
   [Organization Profile](/admin/org/foundation/profile) /
   [Departments](/admin/org/foundation/departments).

## Depends on
- Languages (for translated disclaimers).

## Used by
- \`default_disclaimer\` in \`SETTING_KEYS\`.
- Templates and per-transaction \`disclaimerOverrideId\` from business modules.

## Tips
- Author a language variant for every language your channels support.

[screenshot placeholder — Disclaimer editor]
`,

  'assets-portal-branding': `
# Brand Assets — Portal Branding

Route: [/admin/org/assets/portal-branding](/admin/org/assets/portal-branding)

## Purpose
Configures the **look and feel** of external-facing portals (Employer,
Insured Person, Doctor): logo, colours, hero images, footer.

## When to use it
- Rebranding the public portals.
- Rotating a seasonal banner or hero image.

## Step-by-step
1. Open **Brand Assets → Portal Branding**.
2. Choose the portal.
3. Upload / select logo, wordmark, hero image (from Media). Set primary and
   accent colours.
4. Preview and save.

## Depends on
- Media Library.

## Used by
- External portal shells (\`src/portals/**\`).

## Tips
- Use the built-in preview before publishing — colours affect accessibility.

[screenshot placeholder — Portal branding preview]
`,

  'assets-document-assets': `
# Brand Assets — Document Assets

Route: [/admin/org/assets/document-assets](/admin/org/assets/document-assets)

## Purpose
Reusable **document-scoped assets** (cover pages, appendices, terms sheets)
that are embedded by document templates but managed centrally.

## When to use it
- Standard cover page for annual reports.
- Terms & conditions appendix used by multiple templates.

## Step-by-step
1. Open **Brand Assets → Document Assets**.
2. Create the asset: code, name, category, file (from Media), active flag.
3. Reference it from a Document Template.

## Depends on
- Media Library, Asset Categories.

## Used by
- Document Templates.

## Tips
- Version cover pages by name (e.g. \`COVER_2026\`) rather than replacing files.

[screenshot placeholder — Document Assets list]
`,

  'assets-categories': `
# Brand Assets — Asset Categories

Route: [/admin/org/assets/categories](/admin/org/assets/categories)

## Purpose
Taxonomy for filtering and grouping brand assets in the Media Library and
Document Assets pickers.

## When to use it
- Creating a new asset type / grouping.
- Reorganising the Media Library for a large catalogue.

## Step-by-step
1. Open **Brand Assets → Asset Categories**.
2. Add category: code, label, parent (optional), active.
3. Save.

## Depends on
- Nothing.

## Used by
- Media Library, Document Assets pickers.

## Tips
- Prefer a shallow, stable taxonomy — asset categories are painful to
  re-organise once heavily used.

[screenshot placeholder — Asset Categories]
`,

  /* ─────────────────────────  COMMUNICATION LIBRARY  ─────────────────────── */

  'library-templates': `
# Communication Library — Document Templates

Route: [/admin/org/library/templates](/admin/org/library/templates) — the
Templates Designer is also reachable at
[/admin/notification-templates](/admin/notification-templates).

## Purpose
Long-form **official documents** (letters, notices, certificates, statements,
receipts, reports, PDFs). A document template composes a layout with tokens,
text blocks, media, and per-channel + per-language variants.

## When to use it
- Authoring a new letter or certificate.
- Creating a translated variant of an existing template.
- Adding a new channel (e.g. WhatsApp) to an existing template.

## Step-by-step
1. Open **Communication Library → Templates**.
2. Create template: code, name, category, module owner, language, active flag.
3. Pick a **layout** (or build one under Layouts — **VERIFY**, not yet a menu leaf).
4. Compose the body using tokens (e.g. \`{{employer.name}}\`) and text blocks.
5. Add per-**channel** variants (Email / SMS / WhatsApp / Print / In-App).
6. Preview against sample data. Save + activate.

## Depends on
- Letterheads, Signatures, Headers/Footers, Disclaimers, Tokens, Text Blocks,
  Languages, Channels.

## Used by
- \`default_document_template\` in \`SETTING_KEYS\` (resolved per business event
  via \`core_configuration_assignment\`, \`resource_type = DOCUMENT_TEMPLATE\`).
- Every business module through the business-settings contract.

## Tips / common mistakes
- Do **not** paste raw addresses / signatures — reference the tokens and let
  the resolver inject the effective values.
- Deactivating a template does not remove assignments — run
  [Broken References](/admin/org/validation/broken) after any deactivation.

[screenshot placeholder — Template Designer]
`,

  'library-notification-templates': `
# Communication Library — Notification Templates

Route: [/admin/org/library/notification-templates](/admin/org/library/notification-templates)

## Purpose
Short-form **notifications** for Email / SMS / WhatsApp / In-App
(registration confirmations, OTPs, workflow alerts). Distinct from long-form
Document Templates.

## When to use it
- Authoring an OTP SMS.
- Sending a workflow-stage-change email.

## Step-by-step
1. Open **Communication Library → Notification Templates**.
2. Create template: code, name, module owner, business event, channel,
   language, active flag.
3. Compose subject (email) and body using tokens.
4. Preview and save.

## Depends on
- Tokens, Text Blocks, Channels, Languages.

## Used by
- \`default_notification_template\` in \`SETTING_KEYS\`
  (\`resource_type = NOTIFICATION_TEMPLATE\` in \`core_configuration_assignment\`).

## Tips
- Keep SMS bodies under carrier length limits — the preview shows the count.

[screenshot placeholder — Notification Templates list]
`,

  'library-text-blocks': `
# Communication Library — Text Blocks

Route: [/admin/org/library/text-blocks](/admin/org/library/text-blocks)

## Purpose
Reusable **paragraphs** referenced by many templates (opening greeting,
closing paragraph, regulatory notice). Update the block once, every template
that consumes it re-resolves.

## When to use it
- Standard opening / closing lines across all letters.
- A boilerplate legal paragraph used by multiple modules.

## Step-by-step
1. Open **Communication Library → Text Blocks**.
2. Create block: code, name, category, language, body (may contain tokens),
   active flag.
3. Reference from templates by code.

## Depends on
- Languages.

## Used by
- \`default_text_block\` in \`SETTING_KEYS\` (scope-aware via
  \`core_configuration_assignment\`, \`resource_type = TEXT_BLOCK\`).
- Document + Notification Templates.

## Tips
- Slot-specific text-block codes on the **department profile** take precedence
  over the scope-aware default.

[screenshot placeholder — Text Blocks editor]
`,

  'library-tokens': `
# Communication Library — Tokens

Route: [/admin/org/library/tokens](/admin/org/library/tokens)

## Purpose
The **merge-field dictionary**. Tokens are what a template references
(\`{{employer.name}}\`, \`{{case.reference}}\`, \`{{today}}\`) and what the
resolver injects at render time.

## When to use it
- Exposing a new business field to templates.
- Documenting the data type / format of an existing field.

## Step-by-step
1. Open **Communication Library → Tokens**.
2. Add token: code, label, data type, sample value, source module, category.
3. Save. The token becomes selectable inside every Template editor.

## Depends on
- Modules (source module).

## Used by
- Every Document Template and Notification Template.
- The runtime resolver in \`src/lib/comm/**\`.

## Tips
- Never repurpose an existing token code — templates in the wild will break.
- Provide a sample value; template previews depend on it.

[screenshot placeholder — Tokens list]
`,

  'library-categories': `
# Communication Library — Categories

Route: [/admin/org/library/categories](/admin/org/library/categories)

## Purpose
Cross-library **taxonomy** used to group templates, notification templates,
text blocks and tokens for search and pickers.

## When to use it
- Introducing a new category (e.g. "Compliance Notices").
- Reorganising the pickers for a large catalogue.

## Step-by-step
1. Open **Communication Library → Categories**.
2. Add category: code, label, scope (template / text-block / token / …),
   parent (optional), active.
3. Save.

## Depends on
- Nothing.

## Used by
- All library pickers and reports.

## Tips
- Keep taxonomies shallow and stable.

[screenshot placeholder — Categories hub]
`,

  'library-channels': `
# Communication Library — Channels

Route: [/admin/org/library/channels](/admin/org/library/channels)

## Purpose
The delivery **channels** the organisation supports: Email, SMS, WhatsApp,
Print/Letter, In-App / Portal Message. Each channel has enablement, provider
config and per-language defaults.

## When to use it
- Enabling a new channel (e.g. WhatsApp).
- Switching an email provider or updating the "from" address.

## Step-by-step
1. Open **Communication Library → Channels**.
2. Toggle enablement per channel.
3. Configure provider-level details (from address, sender IDs, business
   account IDs).
4. Set a default language for each channel.

## Depends on
- Languages.

## Used by
- \`default_output_channel\` in \`SETTING_KEYS\`
  (\`resource_type = CHANNEL\` in \`core_configuration_assignment\`).
- Every send path in every business module.

## Tips
- A disabled channel makes any assignment bound to it fail readiness — this
  is intentional; fix the assignment instead of the channel.

[screenshot placeholder — Channels]
`,

  'library-languages': `
# Communication Library — Languages / Translations

Route: [/admin/org/library/languages](/admin/org/library/languages)

## Purpose
The set of **languages** the platform can render into. Every template, text
block, letterhead, disclaimer and channel can carry a language variant.

## When to use it
- Adding a new supported language.
- Deactivating a language that is no longer supported.

## Step-by-step
1. Open **Communication Library → Languages**.
2. Add language: ISO code, label, direction (LTR/RTL), active flag.
3. Optionally mark one as the organisation default (feeds
   \`default_language\` on the org).

## Depends on
- Nothing.

## Used by
- Every template variant, text block, disclaimer, letterhead, channel.

## Tips
- Never deactivate a language while templates still have variants only in it.

[screenshot placeholder — Languages]
`,

  /* ─────────────────────────  CONFIGURATION CENTER  ─────────────────────── */

  'configuration-center': `
# Configuration Center

Routes (by domain):

- [Communication](/admin/org/configuration-center?domain=communication)
- [Workflow](/admin/org/configuration-center?domain=workflow)
- [Numbering](/admin/org/configuration-center?domain=numbering)
- [Branding](/admin/org/configuration-center?domain=branding)
- [Reporting](/admin/org/configuration-center?domain=reporting)
- [AI](/admin/org/configuration-center?domain=ai)

## Purpose
The Configuration Center **binds resources to scopes and business events**.
Under the hood it writes to \`core_configuration_assignment\`, keyed by
\`resource_type\` (TEMPLATE / DOCUMENT_TEMPLATE / NOTIFICATION_TEMPLATE /
TEXT_BLOCK / CHANNEL / RETENTION_POLICY / APPROVAL_WORKFLOW / …) and by scope
(organisation / module / department / location / workflow / user).

## When to use it
- Assigning a template to a specific module + business event.
- Overriding the retention policy for one department.
- Wiring the approval workflow for a business event.

## Step-by-step
1. Open **Configuration Center** and pick a domain.
2. Choose the **resource type** (Template, Channel, Retention Policy,
   Approval Workflow, …).
3. Pick a **scope** (org / module / department / location / workflow / user).
4. Pick a **business event** (optional but usually required).
5. Pick the target resource. Save.
6. Repeat for other channels or languages as needed.

## Depends on
- The resource being assigned (Template, Text Block, Channel, …).
- The scope (Organisation Profile, Department, Location, Module, …).

## Used by
- \`resolveEffectiveSettingsBundle\` for scope-aware setting keys
  (\`default_document_template\`, \`default_notification_template\`,
  \`default_output_channel\`, \`default_text_block\`,
  \`default_retention_policy\`, \`default_approval_workflow\`).
- Every business module via
  [\`@/platform/business-settings\`](/admin/help/organization-management/consumption-guide).

## Tips / common mistakes
- Always run **[Impact Analysis](/admin/org/validation/impact)** before
  changing an assignment that is already in use.
- More specific scopes win — a department assignment beats a module assignment.
- The **AI** and **Numbering** domains follow the same shape but consume
  different resolvers; the UX is identical.

[screenshot placeholder — Configuration Center domain page]
`,

  /* ─────────────────────────  VALIDATION & IMPACT  ─────────────────────── */

  'validation-health': `
# Validation & Impact — Health Dashboard

Route: [/admin/org/validation/health](/admin/org/validation/health)

## Purpose
A one-page **status board** of the inheritance model: which settings are
resolved at each scope, which are missing, and which fall back to org
defaults.

## When to use it
- Weekly / release readiness review.
- After bulk configuration changes.

## Step-by-step
1. Open **Validation & Impact → Health Dashboard**.
2. Inspect each row; drill down into any \`WARN\` or \`ERROR\` cell.
3. Fix the underlying config and re-check.

## Depends on
- Every configuration surface above.

## Used by
- Release readiness checks (\`src/platform/release-readiness/checks.ts\`).
- Business-settings readiness API
  (\`validateBusinessModuleSettingsReadiness\`).

## Tips
- Aim for a green board **before** any go-live migration.

[screenshot placeholder — Health Dashboard]
`,

  'validation-usage': `
# Validation & Impact — Usage Validation

Route: [/admin/org/validation/usage](/admin/org/validation/usage)

## Purpose
Shows **where each configured asset is used** — every template that references
a letterhead / disclaimer / signature / text block / token / media asset.

## When to use it
- Before deactivating an asset.
- Before renaming a token.
- To document a template's dependencies for audit.

## Step-by-step
1. Open **Validation & Impact → Usage Validation**.
2. Pick a resource type (Letterhead / Signature / Token / …).
3. Select a resource; the usage list refreshes with every referencing template
   and assignment.

## Depends on
- The catalogue of assets and templates.

## Used by
- Change-management reviews.

## Tips
- Zero usage often means the asset is safe to deactivate — but always confirm
  with **[Impact Analysis](/admin/org/validation/impact)** first.

[screenshot placeholder — Usage Validation]
`,

  'validation-impact': `
# Validation & Impact — Impact Analysis

Route: [/admin/org/validation/impact](/admin/org/validation/impact)

## Purpose
Simulates a proposed change (deactivate, replace, reassign) and lists the
**downstream effect** on templates, assignments, business events and modules.

## When to use it
- Before deactivating or replacing a letterhead / template / channel.
- Before switching a department from override back to inherit.

## Step-by-step
1. Open **Validation & Impact → Impact Analysis**.
2. Choose the change scenario (deactivate / replace / reassign).
3. Pick the resource. Review the impact report.
4. Approve and apply, or cancel.

## Depends on
- A well-populated Usage index (\`Usage Validation\`).

## Used by
- Governance workflows / change reviews.

## Tips
- Attach the impact report to your change-management ticket.

[screenshot placeholder — Impact Analysis]
`,

  'validation-broken': `
# Validation & Impact — Broken References

Route: [/admin/org/validation/broken](/admin/org/validation/broken)

## Purpose
Lists every **dangling reference**: templates pointing at deactivated
letterheads, assignments to missing templates, tokens with no source, text
blocks in unsupported languages, and so on.

## When to use it
- After any bulk change to Brand Assets, Library, or Configuration Center.
- Before every release.

## Step-by-step
1. Open **Validation & Impact → Broken References**.
2. Group by resource type. Click a row to jump to the offending record.
3. Fix (re-attach, replace, or re-activate) and re-scan.

## Depends on
- Every configuration surface above.

## Used by
- Release readiness checks.

## Tips
- Aim for zero broken references before go-live. This is a hard gate for many
  business-event readiness checks.

[screenshot placeholder — Broken References]
`,

  /* ─────────────────────────  DEVELOPER GUIDE  ─────────────────────── */

  'consumption-guide': `
# How Business Modules Consume This

Documentation for **developers / integrators** wiring a business module
(EMPLOYER, INSURED_PERSON, COMPLIANCE, BENEFITS, LEGAL, FINANCE, REPORTING,
…) into Organisation Management.

> **The rule, in bold: a business module imports only from**
> **\`@/platform/business-settings\` — never from \`comm_*\` / \`core_*\`**
> **tables or \`lib/comm/*\` directly.**

## Precedence chain

The resolver (\`resolveEffectiveSettingsBundle\`) walks:

\`\`\`text
user  →  workflow stage  →  workflow  →  location  →  department
      →  module  →  organisation  →  global default
\`\`\`

The **most specific layer with a value wins**. Inheritance flags on
\`core_department_profile\` (e.g. \`inherit_letterhead_from_org\`) short-circuit
the department layer.

## Step 1 — Register your business events

Open
\`src/platform/business-settings/businessEventSettingsRegistry.ts\`
and append your module's events:

\`\`\`ts
{
  moduleCode: 'BENEFITS',
  businessEventCode: 'CLAIM_APPROVED',
  requiredSettings: [
    'default_document_template',
    'default_letterhead',
    'default_disclaimer',
    'default_print_footer',
    'default_output_channel',
    'default_retention_policy',
  ],
  recommendedSettings: ['default_email_signature'],
},
\`\`\`

Required keys drive
\`validateBusinessModuleSettingsReadiness()\`; recommended keys surface as
warnings, not blockers.

## Step 2 — Resolve settings at each send / generate point

Import from the platform contract only:

\`\`\`ts
import {
  useRelevantSettingsForModule,
  useBusinessModuleCommunicationContext,
  useBusinessModuleSettingsReadiness,
} from '@/platform/business-settings';
\`\`\`

### 2a — Grouped effective settings (React)

\`\`\`ts
const { data, isLoading, warnings, healthStatus } =
  useRelevantSettingsForModule({
    moduleCode: 'BENEFITS',
    departmentCode: 'BEN_HQ',
    businessEventCode: 'CLAIM_APPROVED',
    languageCode: 'en',
    channel: 'EMAIL',
  });

if (data) {
  const letterhead = data.communicationDefaults.letterhead;
  const disclaimer = data.communicationDefaults.disclaimer;
  const template   = data.templateDefaults.documentTemplate;
  const retention  = data.governanceDefaults.retentionPolicy;
  // data.sourceTrace shows which scope contributed each value
}
\`\`\`

### 2b — Full communication context (template + assets + tokens)

\`\`\`ts
const { data: comm } = useBusinessModuleCommunicationContext({
  moduleCode: 'BENEFITS',
  departmentCode: 'BEN_HQ',
  businessEventCode: 'CLAIM_APPROVED',
  channel: 'EMAIL',
  languageCode: 'en',
});

// comm.resolvedTemplateCode         → 'BENEFITS_CLAIM_APPROVED_EMAIL_EN'
// comm.effective.defaultLetterhead  → EffectiveSettingResult (with source trace)
// comm.render                       → RenderContext (template + layout + tokens)
// comm.warnings                     → string[]  (surface to admin UI, do not swallow)
\`\`\`

### 2c — Same call, no React (services, edge functions)

\`\`\`ts
import {
  resolveBusinessModuleCommunicationContext,
} from '@/platform/business-settings';

const ctx = await resolveBusinessModuleCommunicationContext({
  moduleCode: 'BENEFITS',
  departmentCode,
  businessEventCode: 'CLAIM_APPROVED',
  channel: 'EMAIL',
  languageCode: 'en',
});
\`\`\`

## Step 3 — Gate the send with a readiness check

\`\`\`ts
const { data: readiness } = useBusinessModuleSettingsReadiness({
  moduleCode: 'BENEFITS',
  departmentCode: 'BEN_HQ',
  businessEventCode: 'CLAIM_APPROVED',
  channel: 'EMAIL',
});

if (!readiness?.ok) {
  // readiness.missingRequiredSettings, readiness.blockingIssues, readiness.warnings
  return showBlockingBanner(readiness);
}
\`\`\`

**Never** dispatch a communication when readiness returns \`ok: false\`.
Show the blocking issues to the admin so config gaps fail loudly.

## Worked example — BENEFITS · CLAIM_APPROVED · EMAIL

\`\`\`tsx
import {
  useBusinessModuleCommunicationContext,
  useBusinessModuleSettingsReadiness,
} from '@/platform/business-settings';

export function SendClaimApprovedEmail({ claim }: { claim: Claim }) {
  const ctxInput = {
    moduleCode: 'BENEFITS' as const,
    departmentCode: claim.owningDepartmentCode,
    businessEventCode: 'CLAIM_APPROVED',
    channel: 'EMAIL',
    languageCode: claim.preferredLanguage ?? 'en',
  };

  const { data: readiness } = useBusinessModuleSettingsReadiness(ctxInput);
  const { data: comm }      = useBusinessModuleCommunicationContext(ctxInput);

  if (!readiness?.ok) {
    return <BlockingBanner issues={readiness?.blockingIssues ?? []} />;
  }
  if (!comm?.render) {
    return <BlockingBanner issues={['No template resolved for CLAIM_APPROVED / EMAIL']} />;
  }

  return (
    <SendEmailButton
      templateCode={comm.resolvedTemplateCode!}
      letterhead={comm.effective.defaultLetterhead?.value}
      signature={comm.effective.defaultEmailSignature?.value}
      disclaimer={comm.effective.defaultDisclaimer?.value}
      tokens={{
        'claim.reference': claim.reference,
        'claim.amount':    claim.amount,
        'insured.name':    claim.insuredName,
      }}
    />
  );
}
\`\`\`

## Reference pattern

Mirror the shipped adapter for Employer Registry:
[\`src/platform/business-settings/examples/employerSettingsExample.ts\`](/admin/help/organization-management/business-event-registry)
and its module-scoped wrapper
\`src/platform/employer-registry/communication.ts\`.

## Forbidden imports in business modules

- Any \`comm_*\` table (\`comm_letterhead\`, \`comm_email_signature\`,
  \`comm_disclaimer\`, \`comm_print_footer\`, \`comm_media_asset\`,
  \`comm_text_block\`, …).
- \`core_configuration_assignment\`, \`core_department_profile\`,
  \`core_organization\`, \`core_template\`, \`notification_templates\`.
- Anything under \`src/lib/comm/*\` (that's the resolver's private surface).

CI enforces this for the Employer module in
\`src/platform/employer-registry/__tests__/communication.test.ts\` — copy the
guard for your module.
`,

  'business-event-registry': `
# Business Event Registry (reference)

File: \`src/platform/business-settings/businessEventSettingsRegistry.ts\`

The registry is the **source of truth** for which settings a given
\`(moduleCode, businessEventCode)\` needs to produce a compliant
communication. It powers \`validateBusinessModuleSettingsReadiness()\` and the
readiness gate in every business module.

## Shape

\`\`\`ts
export interface BusinessEventRequirement {
  moduleCode: BusinessModuleCode;
  businessEventCode: string;
  requiredSettings: string[];           // block on missing
  recommendedSettings?: string[];       // warn on missing
  appliesToChannel?: string | null;     // narrow to a single channel
  notes?: string;
}
\`\`\`

All \`requiredSettings\` / \`recommendedSettings\` values must be keys defined
in \`src/platform/organization-settings/settingKeys.ts\`
(\`SETTING_KEY_CODES\`).

## Currently registered events (excerpt)

| Module    | Business Event                       | Required (partial)                                             |
|-----------|--------------------------------------|-----------------------------------------------------------------|
| EMPLOYER  | EMPLOYER_REGISTRATION_SUBMITTED      | document_template, letterhead, output_channel                   |
| EMPLOYER  | EMPLOYER_REGISTRATION_APPROVED       | + disclaimer, print_footer, retention_policy                    |
| EMPLOYER  | EMPLOYER_REGISTRATION_REJECTED       | document_template, letterhead, output_channel                   |
| EMPLOYER  | EMPLOYER_COMPLIANCE_WARNING          | + disclaimer, notification_template                             |
| EMPLOYER  | EMPLOYER_REGISTRY_CREATED            | document_template, letterhead, output_channel                   |
| EMPLOYER  | EMPLOYER_REGISTRY_UPDATED            | notification_template, output_channel                           |
| EMPLOYER  | EMPLOYER_REGISTRY_DEACTIVATED        | document_template, letterhead, disclaimer, …                    |
| EMPLOYER  | EMPLOYER_STATUS_CHANGED              | notification_template, output_channel                           |

> The table above shows the shape only. The authoritative list lives in
> \`businessEventSettingsRegistry.ts\` — read that file for the current set.

## How to add a new event

1. Import \`SETTING_KEY_CODES\` for validation.
2. Append an entry to \`BUSINESS_EVENT_SETTINGS_REGISTRY\`.
3. Only reference keys already in \`SETTING_KEYS\`. If a new key is needed,
   add it in \`settingKeys.ts\` first with a proper \`status\` / \`storage\`.
4. Add a test in your module ensuring readiness returns \`ok: false\` when a
   required key is unset.

## Available setting keys

See \`src/platform/organization-settings/settingKeys.ts\`. Categories:

- **LOCATION** — \`default_location\`
- **BRANDING** — \`default_letterhead\`, \`default_logo\`, \`default_seal\`,
  \`default_watermark\`
- **COMMUNICATION** — \`default_email_signature\`, \`default_disclaimer\`,
  \`default_print_footer\`
- **TEMPLATE** — \`default_document_template\`, \`default_notification_template\`
- **TEXT** — \`default_text_block\`
- **OUTPUT** — \`default_language\`, \`default_output_channel\`
- **GOVERNANCE** — \`default_dms_folder\`, \`default_retention_policy\`,
  \`default_approval_workflow\`
`,

  'glossary-troubleshooting': `
# Glossary & Troubleshooting

## Glossary

- **Business Event** — a stable code identifying a moment in a business flow
  (\`CLAIM_APPROVED\`, \`EMPLOYER_REGISTRATION_APPROVED\`, …).
- **Business Module** — a domain module (\`EMPLOYER\`, \`BENEFITS\`,
  \`COMPLIANCE\`, …) that emits business events and consumes settings.
- **Effective Setting** — the value chosen by \`resolveEffectiveSettingsBundle\`
  after walking the precedence chain, with source trace.
- **Inheritance Flag** — column on \`core_department_profile\` such as
  \`inherit_letterhead_from_org\` — when \`true\` the resolver skips that layer.
- **Scope** — user / workflow-stage / workflow / location / department /
  module / organisation.
- **Resource Type** — the kind of thing being assigned (TEMPLATE,
  DOCUMENT_TEMPLATE, NOTIFICATION_TEMPLATE, TEXT_BLOCK, CHANNEL,
  RETENTION_POLICY, APPROVAL_WORKFLOW).
- **Assignment** — a row in \`core_configuration_assignment\` binding a
  resource to a scope (+ optional business event, channel, language).
- **Readiness** — the boolean gate \`validateBusinessModuleSettingsReadiness\`
  returns before a business module dispatches a communication.

## Common problems

**"My department shows the org letterhead even after I set an override."**
Check \`inherit_letterhead_from_org\` on the department — it must be \`false\`.

**"Readiness says \`ok: false — default_output_channel missing\`."**
The business event requires a channel assignment in Configuration Center →
Communication for the module (+ event, + scope). Add it, then re-check.

**"Broken References shows a template pointing at a deactivated letterhead."**
Either reactivate the letterhead or edit the template to use a live one, then
rerun Broken References until zero.

**"My business module needs a value I can't find in the resolved bundle."**
Add a new key in \`src/platform/organization-settings/settingKeys.ts\`, expose
it in \`RelevantSettingsGroup\` if it belongs there, then reference it from
your event registry entry.

**"An admin changed a template and it didn't take effect."**
Two things to check: (1) the change is on the correct language variant; and
(2) \`useBusinessModuleCommunicationContext\` cache has expired (default
\`staleTime\` is 15s in that hook).

## Where to look in the code

- Inheritance model: \`src/platform/organization-settings/**\`
- Business-settings contract: \`src/platform/business-settings/**\`
- Employer reference adapter:
  \`src/platform/employer-registry/communication.ts\`
- Menu & IA: \`src/pages/admin/organization/_sections.tsx\`
- Setting keys: \`src/platform/organization-settings/settingKeys.ts\`
- Business event registry:
  \`src/platform/business-settings/businessEventSettingsRegistry.ts\`
`,
};

export function getManualContent(slug: string): string | undefined {
  return MANUAL_CONTENT[slug];
}
