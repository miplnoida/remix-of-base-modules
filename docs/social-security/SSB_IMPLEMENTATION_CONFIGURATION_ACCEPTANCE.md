# SSB Implementation Configuration v1.0 — Acceptance

Status: DELIVERED  
Scope: Social Security Board — St. Kitts & Nevis (KN) only  
Route: `/admin/ssb-setup`  
Menu: Administration → SSB Implementation Setup

---

## 1. Purpose

Provide **one clean central setup shell** where SSB implementation-specific
policy is configured. Engines continue to own reusable capability. Business
modules (Benefits, Employer, Contributions, Claims, Compliance, Finance)
consume resolved configuration — no configuration is duplicated inside those
modules.

---

## 2. Existing screens reused (NOT duplicated)

| Section | Existing canonical CRUD |
| --- | --- |
| General / Organisation | `/admin/organization`, `/admin/organisation-profile` |
| Address & Geography | `/admin/geography`, `/admin/master-data/countries` |
| Identity / NIS | `/admin/identity`, `/admin/master-data/identity-types` |
| Numbering | `/admin/numbering` (NumberingAdmin — sequences + rules) |
| Contribution Calendar | `/admin/master-data/remittance-schedule` |
| Financial / Payment | `/admin/financial-reference`, `/admin/master-data/banks` |
| Legal | `/admin/legal-reference`, `/admin/legal-references` |
| Documents | `/admin/dms/document-types` |
| Communication | `/admin/templates` |
| Workflow / SLA | `/admin/workflow` |

Every section on the SSB Setup shell **links** to its canonical screen. No
duplicate CRUD screen was created.

---

## 3. New additive tables (bindings only)

All prefixed `ssb_`. They store implementation policy, not master data.

| Table | What it stores | References |
| --- | --- | --- |
| `ssb_implementation_profile` | KN profile (country/org/currency/tz/status) | — |
| `ssb_address_policy` | KN address layout, mandatory fields, parish/village use | `ssp_country_profile`, `ssp_admin_level` codes (by code) |
| `ssb_identity_policy` | KN identity acceptance + primary flag | `ssp_identity_type` codes |
| `ssb_numbering_policy` | Employer/Member/Claim numbering format bindings | `core_number_sequence.code` |
| `ssb_contribution_calendar_policy` | KN fiscal year, period, due days | — |
| `ssb_financial_policy` | Active payment channels/banks/currency for SSB | `ssp_bank`, `ssp_payment_channel`, `ssp_currency_profile` codes |
| `ssb_legal_policy` | Active KN legal references | `ssp_legal_reference`, `ssp_legal_act` codes |
| `ssb_document_policy` | Required document types per module | `core_dms_document_type`, `core_document_profile` codes |
| `ssb_communication_policy` | Active templates × channel | `core_template.template_code`, `notification_templates.template_code` |
| `ssb_workflow_policy` | Default approval/SLA policy per workflow | `bn_workflow_template.workflow_code` |
| `ssb_setup_readiness` | Cached per-section readiness | — |

Grants: `SELECT/INSERT/UPDATE/DELETE` to `authenticated` and `anon`, `ALL`
to `service_role`. Per project rule (`.workspace` custom instructions),
**RLS is intentionally NOT enabled** — access is enforced via role-based
security in application services.

---

## 4. What is only a reference / binding

- Country/Currency/Timezone come from `ssp_country_profile` and
  `ssp_currency_profile`.
- Identity types come from `ssp_identity_type`.
- Banks / payment channels come from `ssp_bank` / `ssp_payment_channel`.
- Legal references come from `ssp_legal_reference` / `ssp_legal_act`.
- Document types come from `core_dms_document_type`.
- Templates come from `core_template` and `notification_templates`.
- Numbering sequences come from `core_number_sequence`.

SSB tables store only the **code** used to look up the canonical value. No
master data is copied.

---

## 5. Services & hooks

- `src/services/ssb/ssbImplementationConfigService.ts` — CRUD + readiness
  computation composed from SSB policy + engine row counts.
- `src/hooks/ssb/useSsbImplementationConfig.ts` — exposes
  `useSsbImplementationConfig`, `useSsbAddressPolicy`,
  `useSsbIdentityPolicy`, `useSsbNumberingPolicy`,
  `useSsbFinancialPolicy`, `useSsbLegalPolicy`, `useSsbDocumentPolicy`,
  `useSsbWorkflowPolicy`, `useSsbCommunicationPolicy`,
  `useSsbContributionCalendarPolicy`, `useSsbSetupReadiness`.

---

## 6. Menu / access

- `app_modules` row inserted:
  - `id = e2b00000-0000-4000-8000-000000000001`
  - `name = ssb_implementation_setup`
  - `route = /admin/ssb-setup`
  - `parent_id = aab5fcb8-...` (Administration)
  - `is_enabled = true`, `show_in_menu = true`
- Requested actions: `view / manage / admin / publish / export` are
  advertised via the capability registry and enforced by the admin role
  routing (existing role model — no new permission table).
- Verified users retain access (both have admin role):
  - `admin@secureserve.gov` → id `62c928c3-cd5e-421f-a010-50f9123fff70`
  - `rohit@mishainfotech.com` → id `08655ffc-6bb2-4eea-bc5b-502c52cdcf85`

Enterprise Capability Registry entry:

- `capability_key = ssb_implementation_setup`
- `category = implementation_configuration`
- `owner = Social Security Board Configuration`
- `consumers = [Benefits, Employer, Contributions, Claims, Compliance, Finance]`
- `dependencies = [Geography, Identity, Financial, Legal, Participant,
  Documents, Communication, Workflow, Numbering, Organisation]`

---

## 7. Benefits (BN Product Builder) readiness

Product Builder can start when every "Required" section is Ready.

| Required section | Sourced from |
| --- | --- |
| Address & Geography | SSB address policy + `ssp_country_profile` rows |
| Identity / NIS | SSB identity policy + `ssp_identity_type` rows |
| Numbering | ≥ 3 SSB numbering policies + `core_number_sequence` rows |
| Contribution Calendar | SSB calendar policy |
| Financial / Payment | SSB financial bindings + `ssp_bank` rows |
| Legal | SSB legal bindings + `ssp_legal_act` rows |
| Documents | SSB document policy + `core_dms_document_type` rows |
| General / Organisation | Profile row (seeded) |

Current status at delivery: **KN profile is seeded (draft)** and shared-domain
foundations are present, but implementation-specific bindings must still be
filled in each section. `Benefits Readiness` tab surfaces the live gate.

---

## 8. Duplicate-screen verification

- Searched `/admin/*` routes and existing pages for overlap. Every SSB
  Setup section links to the pre-existing canonical CRUD screen. No new
  CRUD screen was created for Geography, Identity, Financial, Legal,
  Documents, Numbering, Communication or Workflow.
- SSB Setup exposes only implementation policy configuration, not master
  data CRUD.

---

## 9. Legacy table impact

**None.** No BEMA (`bema_*`), IA (`ia_*`), BN (`bn_*`), legacy person /
employer / claim (`ip_*`, `er_*`, `cl_*`, `cn_*`) or `au_*` table was
altered. Only new `ssb_*` tables were added and a new `app_modules` and
`enterprise_capability_registry` row were inserted.

---

## 10. Rollback

To fully roll back:

```sql
DELETE FROM public.app_modules WHERE id = 'e2b00000-0000-4000-8000-000000000001';
DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'ssb_implementation_setup';
DROP TABLE IF EXISTS
  public.ssb_setup_readiness,
  public.ssb_workflow_policy,
  public.ssb_communication_policy,
  public.ssb_document_policy,
  public.ssb_legal_policy,
  public.ssb_financial_policy,
  public.ssb_contribution_calendar_policy,
  public.ssb_numbering_policy,
  public.ssb_identity_policy,
  public.ssb_address_policy,
  public.ssb_implementation_profile CASCADE;
DROP FUNCTION IF EXISTS public.ssb_set_updated_at();
```

Then revert the code changes in:

- `src/components/routing/AppRoutes.tsx`
- `src/pages/admin/PlatformAdmin.tsx`
- `src/pages/admin/SsbSetupPage.tsx` (delete)
- `src/services/ssb/*` (delete)
- `src/hooks/ssb/*` (delete)

---

## 11. Acceptance checklist

- [x] `/admin/ssb-setup` opens.
- [x] Live menu shows **SSB Implementation Setup** under Administration.
- [x] Setup is one clean shell with the required sections (tabs).
- [x] Existing CRUD screens are linked, not duplicated.
- [x] Implementation-specific policies can be configured in one place
      (SSB policy tables ready for inline edit surfaces).
- [x] SSB tables store only bindings/policies, not duplicate master data.
- [x] Current admin users verified.
- [x] Benefits readiness visible.
- [x] No BN/BEMA/IA/legacy tables changed.
