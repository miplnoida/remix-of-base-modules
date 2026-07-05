# Epic 2.7 — Document Domain Decision (Acceptance)

Status: **Complete** — Option A adopted (link-only, no new screen).
BN Product Builder: **ON HOLD** (document dependency now RESOLVED for consumption).

## 1. Existing assets inspected

Routes discovered in `src/components/routing/AppRoutes.tsx`:

| Route | Component | Purpose |
|---|---|---|
| `/admin/dms` | `CoreDmsAdmin` | Canonical Document Repository / DMS admin |
| `/admin/document-configuration` | `DocumentConfigurationPage` | Per-module document category/type configuration |
| `/admin/dms-api-test` | `DmsApiTest` | DMS API harness |
| `/legal/documents`, `/legal/admin/stage-document-rules`, `/legal-advanced/documents` | Legal document screens |
| `/bn/config/document-setup`, `/bn/config/service-doc-types`, `/bn/config/medical/documents` | BN-owned document setup |
| `/compliance/admin/document-foundation` | Compliance shared sections |
| `/audit/document-templates` | Audit document/output settings |

`app_modules` already contains:
- `core_dms_admin` → `/admin/dms` (Document Repository)
- `document_configuration` / `admin_cde_doc_config` → `/admin/document-configuration`
- Module-specific document rows for legal, BN, compliance, audit.

Master tables reused (no structural change): `core_dms_document_type`, `core_document_profile`, `bn_document_profile`.

## 2. Decision — Option A (link to existing canonical DMS)

Canonical document management already exists (`/admin/dms` + `/admin/document-configuration`). Building a new shared-domain shell would duplicate DMS. Deferring would leave the Platform Admin link broken.

Chosen: register a Shared-Domains menu entry that **links to the existing canonical routes**. No new screen. No new tables. No BN data migration.

## 3. Changes applied

### app_modules
Inserted (idempotent) one row under `shared_domains` (id `2c2c0000-0000-4000-8000-000000000200`):

| Field | Value |
|---|---|
| id | `2c2c0000-0000-4000-8000-000000000207` |
| name | `documents_domain` |
| display_name | `Documents` |
| route | `/admin/dms` (canonical Document Repository) |
| parent_id | `2c2c0000-0000-4000-8000-000000000200` (Shared Domains) |
| sort_order | 70 |
| is_enabled / show_in_menu | true |
| icon | `FileText` |

Existing DMS rows (`core_dms_admin`, `document_configuration`, module-specific) are untouched and remain in their current parents.

### Platform Admin (`src/pages/admin/PlatformAdmin.tsx`)
Shared Domains → Documents card now links to the two canonical routes:
- `/admin/dms` — Document Repository (DMS)
- `/admin/document-configuration` — Document Configuration

The previously broken `/admin/documents` placeholder link is removed.

### Permissions / actions
`documents_domain` inherits access via existing role checks against `core_dms_admin` and `document_configuration` (same routes). No new `role_permissions` rows are required — Admin / Application Admin already have access to `/admin/dms` and `/admin/document-configuration` in the current environment. Recommended future actions (`view`, `manage`, `admin`, `import`, `export`) will be registered when a dedicated documents_domain landing shell is introduced (not in this epic).

### Current user verification
Manual check: signed-in Admin can reach `/admin/dms` and `/admin/document-configuration` from Platform Admin → Shared Domains → Documents. Sidebar renders "Documents" under Shared Domains via `useNavigationMenu` (driven by `app_modules`).

## 4. Legacy impact

- No changes to legacy / BEMA / IA / BN document tables.
- No change to DMS storage, upload, or viewer services.
- No structural change to `core_dms_document_type`, `core_document_profile`, or `bn_document_profile`.
- No route removed. No duplicate screen created.

## 5. BN Product Builder document dependency

| Consumption need | Source | Status |
|---|---|---|
| Global document types | `core_dms_document_type` via `/admin/dms` | READY |
| Document categorisation per module | `/admin/document-configuration` (`core_document_profile`) | READY |
| BN-specific document library | `/bn/config/document-setup` (`bn_document_profile`) | READY (BN-owned) |
| Shared-domain menu entry | `app_modules.documents_domain` under Shared Domains | READY (this epic) |
| Dedicated documents_domain landing shell with view/manage/admin/import/export actions | Not built | DEFERRED — not required for BN Product Builder MVP |

BN Product Builder can now consume the Document Domain through the existing canonical DMS routes and master tables. No blocker remains from the document side.

## 6. Rollback

```sql
DELETE FROM app_modules WHERE id = '2c2c0000-0000-4000-8000-000000000207';
```
Revert `src/pages/admin/PlatformAdmin.tsx` Documents links to prior placeholder.

## 7. Acceptance checklist

- [x] No broken Documents link in Platform Admin.
- [x] Documents appears under Shared Domains in live sidebar.
- [x] No duplicate DMS or document screen created.
- [x] No legacy table changed.
- [x] Permissions / menu / current admin access verified.
- [x] BN Product Builder document dependency documented and unblocked.
- [x] BN Product Builder remains ON HOLD pending consumption map sign-off.

## 8. Next recommendation

1. Sign off the BN Product Builder Shared-Domain Consumption Map.
2. Optional future epic: build a dedicated `documents_domain` landing shell (view/manage/admin/import/export actions) if governance requires a single Shared-Domain surface distinct from the DMS admin.
3. Resume BN Product Builder implementation.
