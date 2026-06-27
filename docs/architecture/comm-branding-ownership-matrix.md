# Enterprise Communication & Branding — Ownership Matrix (Phase 2)

Status: Approved direction (incorporates user decisions on the 6 audit questions + Communication Profiles + Enterprise Resolver).
Supersedes the open questions in `comm-branding-audit.md` §Open Questions.

---

## 1. Decisions locked in

| # | Topic | Decision |
|---|-------|----------|
| 1 | `comm_disclaimer` + `comm_print_footer` | **Keep as specializations.** Inherit from `core_text_block`, do NOT flatten. |
| 2 | `comm_email_signature` | **Keep separate.** Structured (officer/designation/dept/contact/photo/logo/social/confidentiality) with its own inheritance chain (org → dept → officer). |
| 3 | `notification_templates` vs `core_template_channel_variant` | **Keep separate.** Notification = trigger + workflow + recipients + retry + scheduling + delivery tracking. Official Template stays document-shaped. Chain: Official Template → Notification Template → Delivery. |
| 4 | `office_locations` vs `core_department_location` | **Split confirmed.** `office_locations` = physical place; `core_department_location` = which department operates from that place. Shared across Legal/Benefits/Compliance/etc. |
| 5 | Receipt / Statement / Certificate | **Not just templates.** Introduce `core_document_profile` between Template and concrete document. Profiles encode behaviour (numbering, duplicate/cancel for receipts; QR/expiry/issuing authority for certificates; period/ageing/balances for statements). |
| 6 | Enterprise Health | **Expand beyond comm/branding.** Becomes Enterprise Configuration Health module covering Organization, Departments, Communication, Templates, Assets, Locations, Notifications, DMS, Security, Legal, Benefits, Compliance, Finance. |
| 7 | **NEW — Enterprise Communication Resolver** | Single service every module calls. Only it knows inheritance rules. Internally delegates to Organization/Department/Asset/TextBlock/Template/Notification/Profile resolvers. |
| 8 | **NEW — Communication Profiles** | Reusable bundles (STANDARD_LETTER, LEGAL_NOTICE, BENEFIT_NOTICE, PAYMENT_NOTICE, CERTIFICATE, STATEMENT, RECEIPT, EMAIL, SMS, PORTAL, MOBILE_PUSH). Every template inherits one. Eliminates repeated settings. |

---

## 2. Inheritance topology

```
Organization Profile
        │
        ▼
Locations  ──────────────────── shared physical places
        │
        ▼
Departments
        │
        ▼
Department Communication (overrides)
        │
        ▼
Communication Profiles   ◄── NEW reusable bundles
        │
        ▼
Communication Assets ── Text Blocks ── (Disclaimer / Print Footer specializations)
        │                    │
        ▼                    ▼
Official Communication Templates  ── inherits one Profile
        │
        ▼
Document Profiles (Receipt / Statement / Certificate / Letter / Notice / Memo)
        │
        ▼
Notification Templates  (trigger + workflow + recipients + retry)
        │
        ▼
Enterprise Document Generation
        │
        ▼
 Email · Print · PDF · SMS · Portal · DMS · API
```

Specialization chain (no flattening):
```
core_text_block
   ├── comm_disclaimer       (effective dates, jurisdiction, dept, doc types, legal approval)
   └── comm_print_footer     (address, tel, email, web, regno, confidentiality, copyright, QR, version, page#)
```

Email signature stays its own chain:
```
comm_email_signature: organization → department → officer
```

---

## 3. Ownership — single owner per concern

| Concern | Owner screen | Source table(s) | Consumers |
|---|---|---|---|
| Organization identity & defaults | Organization Profile | `core_organization` | All modules via OrganizationResolver |
| Physical places | Locations | `office_locations` | Departments, Templates, Portals |
| Department behaviour & comm overrides | Departments | `core_department`, `core_department_profile`, `core_department_location` | All modules via DepartmentResolver |
| Communication Profiles (reusable bundles) | Communication Profiles (NEW) | `core_communication_profile` (new) | Every template |
| Logos / seals / stamps / signatures / QR / watermarks | Communication Assets | `comm_media_asset`, `comm_media_asset_version` | Templates, Portals, Receipts |
| Reusable paragraphs | Text Blocks | `core_text_block` | Templates, Notifications |
| Disclaimers | Disclaimers (specialization screen) | `comm_disclaimer` → FK `core_text_block` | Templates, Documents |
| Print footers | Print Footers (specialization screen) | `comm_print_footer` → FK `core_text_block` | Templates, Letterheads |
| Email signatures | Email Signatures | `comm_email_signature` | Email channel only |
| Letterheads | Letterheads | `comm_letterhead` | Official Templates |
| Official document layouts | Official Communication Templates | `core_template` + `core_template_version` + `core_template_section` + `core_template_token` | Document Generation |
| Document behaviour profiles | Document Profiles (NEW) | `core_document_profile` (new) | Receipts, Certificates, Statements, Letters, Notices, Memos |
| Notification wording + delivery rules | Notification Templates | `notification_templates`, `notification_template_versions` | Notification Engine |
| Portal appearance | Portal Branding | `app_themes` + asset links | Portals |
| Generated document audit | (system) | `core_generated_document`, `core_document_signature_usage`, `core_document_test_print_log` | All modules |

Rule: **No screen reads `comm_*` / `core_template*` / `notification_*` / `core_organization` / `core_department*` directly after Phase 3. All access via resolvers.**

---

## 4. Enterprise Communication Resolver (NEW — Phase 3 centerpiece)

`src/lib/enterprise/CommunicationResolver.ts` — single entry point.

```ts
resolveCommunication({
  module, departmentCode, documentType, profileCode?,
  organizationId?, locationId?, transactionOverrides?
}): ResolvedCommunication
```

Internally composes:
- `OrganizationResolver`
- `DepartmentResolver`
- `LocationResolver`
- `CommunicationProfileResolver`   ← NEW
- `AssetResolver`
- `TextBlockResolver` (+ DisclaimerResolver, PrintFooterResolver specializations)
- `EmailSignatureResolver`
- `LetterheadResolver`
- `TemplateResolver`
- `DocumentProfileResolver`        ← NEW
- `NotificationResolver`

Every module (Legal, Benefits, Compliance, Finance, HR, Registration, Employer Services, future) calls **only** `resolveCommunication()` + `generateDocument()`. They never assemble inheritance themselves.

---

## 5. Schema impact (vs. Phase 1 audit)

### New tables (2, both narrow)

1. `core_communication_profile`
   - `code` (e.g. LEGAL_NOTICE), `name`, `description`
   - default `letterhead_id`, `email_signature_id`, `disclaimer_text_block_id`, `print_footer_text_block_id`
   - default `confidentiality`, `retention_years`, `requires_signature`, `requires_stamp`, `requires_qr`
   - default channels enabled (email/print/pdf/sms/portal/dms/api), default `priority`
   - `applicable_document_types[]`, `is_system`, `is_active`, version fields

2. `core_document_profile`
   - `code` (RECEIPT, CERTIFICATE, STATEMENT, LETTER, NOTICE, MEMO), `name`
   - behaviour flags: `has_numbering`, `numbering_sequence_id`, `supports_duplicate`, `supports_cancel`, `requires_verification_qr`, `has_expiry`, `requires_issuing_authority`, `verification_portal_url`, `has_accounting_period`, `shows_balances`, `shows_ageing`
   - default `communication_profile_id`

### Column extensions

- `core_text_block`: add `code` (unique), `scope` enum, `parent_text_block_id`, `body_html`/`body_text`/`body_md`
- `comm_disclaimer`: add FK `text_block_id`, keep specialization columns (effective_from/to, jurisdiction, applicable_document_types[], applicable_department_codes[], legal_approved_by, legal_approved_on, languages[])
- `comm_print_footer`: add FK `text_block_id`, keep specialization columns (address/tel/email/web/regno/confidentiality/copyright/qr_asset_id/version/page_number_format)
- `comm_email_signature`: extend with officer_user_code, designation, department_code, contact_*, photo_asset_id, logo_asset_id, social_links jsonb, confidentiality_text_block_id, inheritance flags
- `core_template`: add `parent_template_id`, `owner_scope`, `communication_profile_id`, `document_profile_id`
- `core_template_token`: add types `text_block`, `asset`, `org_field`, `department_field`, `profile_field`
- `core_organization` / `core_department_profile`: add default_communication_profile_id (per module)
- `core_generated_document`: add `communication_profile_id`, `document_profile_id`, plus existing asset/text-block tracking
- `app_themes`: add asset links for portal logo/favicon/login banner

### Tables NOT consolidated (per user decision)

- `comm_disclaimer` — kept (specialization of text block)
- `comm_print_footer` — kept (specialization of text block)
- `comm_email_signature` — kept (own chain)
- `notification_templates` — kept (notification layer)
- `office_locations` + `core_department_location` — kept (place vs mapping)

### Enterprise Health (Phase 13)

- `enterprise_health_finding` — runtime + persisted findings across Organization, Departments, Communication, Templates, Assets, Locations, Notifications, DMS, Security, Legal, Benefits, Compliance, Finance.

---

## 6. Execution order (revised)

1. **Phase 2 (this doc) — Ownership matrix locked.**
2. Phase 3 — Build `Enterprise Communication Resolver` skeleton + sub-resolvers; no screens migrated yet.
3. Phase 4 — Inheritance utility (`resolveWithInheritance(layers, key)`).
4. Phase 5 — Extend reference integrity (`referenceRegistry`, `safeDeleteService`) for all 12 owner types incl. Profiles.
5. Phase 6 — `core_communication_profile` + `core_document_profile` tables + seed STANDARD_LETTER, LEGAL_NOTICE, BENEFIT_NOTICE, PAYMENT_NOTICE, CERTIFICATE, STATEMENT, RECEIPT, EMAIL, SMS, PORTAL, MOBILE_PUSH and RECEIPT/CERTIFICATE/STATEMENT/LETTER/NOTICE/MEMO document profiles.
6. Phase 7 — `DocumentGenerationResolver` becomes single entry point; migrate Legal first, then Benefits, Compliance, Finance, HR, Registration, Employer Services.
7. Phase 8 — Master logo pipeline (asset derivation).
8. Phase 9 — Text-block tokenization sweep; specializations (Disclaimer, Print Footer) screens wired.
9. Phase 10 — Official Communication Templates designer extended with Profile picker + inheritance.
10. Phase 11 — Notification Templates extended with token system + profile inheritance.
11. Phase 12 — Portal Branding via `PortalBrandingResolver`.
12. Phase 13 — Receipts/Statements/Certificates refactored onto `core_document_profile`.
13. Phase 14 — Enterprise Configuration Health dashboard (full scope).
14. Phase 15 — Acceptance gates: `tsgo` zero errors, lint rule blocking direct `comm_*` / `core_template*` / `notification_*` imports outside `src/lib/enterprise/`, grep gate for hardcoded org/dept/branding strings.

---

## 7. Open items needing your confirmation before Phase 3 build

1. **Communication Profile seed list** — confirm the 11 codes above (or add/remove).
2. **Document Profile seed list** — confirm: RECEIPT, CERTIFICATE, STATEMENT, LETTER, NOTICE, MEMO (anything else? e.g. CONTRACT, AGREEMENT, REPORT?).
3. **Resolver folder location** — proposed `src/lib/enterprise/`. OK or prefer `src/lib/comm/enterprise/`?
4. **Enterprise Health module placement** — new top-level admin page `EnterpriseHealthPage.tsx` under `/admin/health`, or under `/admin/organization/health`?

Once you confirm those four, I will start Phase 3 (resolver skeleton + sub-resolvers) without further questions.
