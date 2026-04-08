


## ✅ Completed: C3-Wizard Integration Fixes (4 Issues)

### Changes Made

| File | Change |
|------|--------|
| Database migration | Added `payment_reference_id TEXT` column to `cn_payment_header`; updated `public_api_payment_save` RPC to extract and persist `paymentReferenceId` from payload |
| `src/services/wizC3DetailsService.ts` | Added `schedule?: number \| null` to `SeContributionRecord` interface |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Added Schedule column with blue badge; updated `handlePayment` to use dynamic `record.schedule` |
| `src/pages/c3Management/reports/WizPaymentsHistory.tsx` | Expanded `PaymentStatusBadge` to treat `COMPLETED` and `SUCCESS` as green/success; added filter options |
| `src/pages/c3Management/payments/WizPaymentDetails.tsx` | Expanded transaction status icon and badge logic for `COMPLETED`/`SUCCESS`; added filter options |
| Issue 3 (BIMA) | Verified — `is_imported_from_bema` is already used only for badge display; `payment_status` alone controls Pay button. No change needed |

## ✅ Completed: Configurable Document Template Settings for Internal Audit Module

### Changes Made

| File | Change |
|------|--------|
| Database migration | Created `ia_document_template_settings` table with `template_type`, `config_json` (JSONB), `updated_by`; seeded `audit_report` and `audit_plan` default rows |
| `src/lib/audit/documentTemplateDefaults.ts` | TypeScript interfaces (`AuditReportTemplateConfig`, `AuditPlanTemplateConfig`) and exported default configs matching current hardcoded behavior |
| `src/lib/audit/documentTemplateResolver.ts` | `resolveReportTemplate()` and `resolvePlanTemplate()` — merge config + status → render-ready structure |
| `src/hooks/useAuditDocumentTemplates.ts` | `useAuditReportTemplate()`, `useAuditPlanTemplate()`, `useAuditDocumentTemplateMutation()` |
| `src/pages/audit/DocumentTemplateSettings.tsx` | Settings page shell with Audit Report / Internal Audit Plan tabs |
| `src/components/audit/templates/AuditReportTemplateEditor.tsx` | Form-driven editor: branding, cover page, sections, findings layout, risk distribution, action plan, sign-off, draft/final rules |
| `src/components/audit/templates/AuditPlanTemplateEditor.tsx` | Form-driven editor: cover page, plan summary, columns, resource plan, governance |
| `src/components/audit/templates/TemplatePreviewPane.tsx` | Live mini-preview for both template types |
| `src/components/routing/AppRoutes.tsx` | Added `/audit/document-templates` route with lazy loading |
| `src/config/auditRouteConfig.ts` | Added `document-templates` route entry |
| `src/components/sidebar/menuItems/auditMenuItems.ts` | Added "Document Templates" menu item under Settings |
| `src/components/audit/reports/AuditReportPreview.tsx` | Uses resolver for branding, watermark, issued stamp, confidentiality text, signatories |
| `src/components/audit/reports/AuditReportPDFExport.ts` | Uses resolver for branding, watermark text, signatories |
| `app_modules` (data) | Seeded navigation entry for Document Templates under Internal Audit |

## ✅ Completed: Standardize Employer Document Flow to Match IP Flow Reliability

### Changes Made

| File | Change |
|------|--------|
| Database migration | Dropped and recreated `convert_application_to_employer` with `p_documents_json TEXT DEFAULT '[]'` parameter; inserts into `er_application_documents` atomically inside the transaction; returns `documents_added` count |
| `src/hooks/useConvertToEmployerRegistration.ts` | Added `buildEmployerDocumentsForConversion()` and `mapDocToRpcFormat()` — merges external API + meeting-uploaded docs with dedup; passes JSON to RPC; removed post-RPC document transfer block |
| `src/components/meetings/EmployerMeetingDocumentsTab.tsx` | External docs now routed through `document-proxy` edge function (blob streaming); added per-row loading state |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Fallback `handleDocAction` updated to use `document-proxy` for external docs with graceful fallback |
| `supabase/functions/document-proxy/index.ts` | Added project's own Supabase storage origin (`xynceskeiiisiefqlgxo.supabase.co`) to `allowedOrigins` |
