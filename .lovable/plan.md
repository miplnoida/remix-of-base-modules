
## Audit findings — existing template surfaces

The codebase already has significant template infrastructure. Nothing new called "Communication Studio" will be added; we will consolidate what exists.

**Designers/editors found (to be unified):**
- `src/pages/admin/organization/TemplatesDesignerPage.tsx` — richest one; will become the single Core Template Designer.
- `src/components/comm/TemplateDesignerDialog.tsx` — designer dialog (recently upgraded with scale + margin guides). Keep as the shared modal shell.
- `src/components/comm/NotificationTemplateEditorDialog.tsx` — will be folded into the designer as a channel filter (`IN_APP`, `EMAIL`, `SMS`, `WHATSAPP`).
- `src/pages/admin/organization/NotificationTemplatesPage.tsx`, `src/pages/admin/NotificationTemplates.tsx`, `NotificationTemplatesAdmin.tsx`, `NotificationTemplateManager.tsx`, `pages/notifications/TemplateManagement.tsx`, `systemAdmin/NotificationTemplates.tsx` — reduce to thin filtered views over Core Template Designer (or redirect).
- `src/pages/legal/admin/LegalTemplateEditor.tsx`, `LegalTemplateManagement.tsx`, `components/legal/GenerateTemplateDialog.tsx` — refactor to open Core Template Designer with `module_code=LEGAL` filter.
- `src/pages/c3Management/EmailTemplates.tsx`, `components/c3Management/email-templates/*` — refactor to filtered view (`module=PAYMENTS`, channel=`EMAIL`).
- `src/pages/audit/TemplatesManagement.tsx`, `DocumentTemplateSettings.tsx`, `components/audit/templates/*` — audit-specific editors move behind the same designer with `module=AUDIT`. Override panels stay (plan/report specific fields).
- `src/pages/compliance/admin/ComplianceReportTemplates.tsx` — filter view over Core.
- `src/pages/nbenefit/shared/DocumentTemplates.tsx` — filter view (`module=BENEFITS`).
- `src/pages/admin/CoreTemplateAdmin.tsx`, `src/components/templates/CoreTemplateManagement.tsx` — keep as admin listing surface.

**Services already in place (reuse, no duplication):**
`coreTemplateService`, `coreTemplateResolverService`, `coreTemplateDispatcherService`, `coreTemplateSendService`, `coreDocumentGenerationService`, `coreTemplateApprovalService`, `coreTemplateBridgeService`, `coreTemplateChannelService`, `coreTemplateVariableBindingService`, `coreTemplateLegalRefService`, `signatureResolver`, `letterheadContentResolver`, `templateCatalog`.

**Backend tables already present:**
`core_template`, `core_template_version`, `core_template_channel`, `core_template_channel_variant`, `core_template_layout`, `core_template_category`, `core_template_section`, `core_template_localization`, `core_template_token`, `core_template_variable_binding`, `core_template_schedule_policy`, `core_template_approval`, `core_template_usage`, `core_text_block`, `comm_letterhead`, `comm_email_signature`, `comm_print_footer`, `comm_disclaimer`.

No schema changes required. Consolidation is data + UI + resolver work.

## Proposed plan

### 1. One Core Template Designer (UI consolidation)
- Promote `TemplatesDesignerPage` → `/admin/comm/templates` as the single authoring surface.
- Add filter bar: `module_code`, `template_type` (EMAIL/LETTER/NOTICE/CERTIFICATE/STATEMENT/RECEIPT/REPORT/PDF/SMS/WHATSAPP/IN_APP), `channel`, `business_event`, `workflow_stage`, `language`, `status`.
- Every legacy editor page becomes a thin wrapper that opens the same designer with a preset filter, or a `<Navigate>` redirect. No editing logic duplicated.
- Notification editor dialog absorbed as the SMS/WhatsApp/IN_APP channel form inside the designer.

### 2. Base Layout Shells (`core_template_layout`)
Seed one canonical base layout per channel/type:
- `BASE_EMAIL`, `BASE_LETTER`, `BASE_NOTICE`, `BASE_CERTIFICATE`, `BASE_STATEMENT`, `BASE_RECEIPT`, `BASE_REPORT`, `BASE_SMS`, `BASE_WHATSAPP`, `BASE_IN_APP`.

Each layout stores default rules for: branding source, letterhead inheritance (letter/notice/pdf), header/footer zones, signature slot, disclaimer slot, language fallback, token behaviour, CSS.

Templates reference a `layout_code`; runtime merges layout + template body + resolved assets.

### 3. Central resolution at runtime
Extend `coreTemplateResolverService` so a render call resolves:
- `letterhead` (letter/notice/pdf) via existing `letterheadContentResolver` — org → dept → module → template override.
- `signature` via existing `signatureResolver` — org → dept → module → workflow event → template override.
- `footer` from `comm_print_footer` with same override chain.
- `disclaimer` from `comm_disclaimer` with channel + language variants.
- Tokens via `coreTemplateVariableBindingService`.

Author templates NEVER inline signatures/footers/disclaimers. Legacy inline copies get migrated to references.

### 4. Data migration / seeding
- Insert base layouts.
- Backfill existing `core_template` rows: set `layout_code`, strip duplicated signature/footer HTML into references, tag `module_code` and `template_type` where missing.
- Seed standard templates per module (Org/Legal/Benefits/Compliance/Employer/Member/Payments/Reports) as listed in the request, only where not already present (idempotent `WHERE NOT EXISTS`).
- Migrate any templates found in legacy `notification_templates` / mock template services into `core_template` and mark old rows deprecated.

### 5. Configuration Center
`core_configuration_assignment` already exists — surface an "Assign template" screen that binds `(module, business_event, workflow_stage, channel, language) → template_code`. No editing of body from here.

### 6. Preview & testing (in the one designer)
- Channel-specific preview (email HTML, PDF via existing generation service, SMS/WhatsApp bubble, in-app card).
- Sample-token panel with missing token + missing asset warnings.
- Language fallback preview toggle.
- Test send/render using `coreTemplateDispatcherService`.

### 7. Versioning & approval
Already modeled in `core_template_version` + `coreTemplateApprovalService`. Expose Draft → Approved → Published → Archived + clone + diff inside the designer.

### 8. Navigation cleanup (Communication Library)
Under Communication Library group entries:
- Templates (all)
- Email Templates (filter)
- Document Templates (filter: LETTER/NOTICE/PDF/CERTIFICATE/STATEMENT/RECEIPT)
- SMS/WhatsApp Templates (filter)
- In-App Notification Templates (filter)
- Text Blocks · Tokens · Disclaimers · Categories · Channels · Languages

All open the same designer; only the filter changes.

### 9. Deprecations
Legacy pages either redirect or render `<CoreTemplateDesignerPage filter={...} />`. Remove duplicated editor code, keep any module-specific override panels (e.g. audit report override) as pluggable side panels.

### 10. Validation
- No duplicate designer components remain (grep gate).
- All module templates carry `module_code` + `layout_code`.
- Base layouts exist for every channel/type.
- Legal templates render through the same pipeline as all others.
- Configuration Center only assigns.
- `tsgo` typecheck passes.

## Scope note
This is a large, multi-day refactor touching ~30 files, seed migrations, and every module's template touchpoints. I recommend approving the plan first, then I will execute in ordered phases (base layouts + resolver → designer consolidation → per-module redirects → seed cleanup → nav → validation), verifying typecheck between phases. If you'd rather I do a subset first (e.g. phase 1 only), tell me which phase(s).
