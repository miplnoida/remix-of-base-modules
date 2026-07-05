# Epic 1.2 — Master Template Standard

**Status:** Architecture (documentation only)
**Purpose:** The single, mandatory template every future master (E, O, B) must follow. No exceptions.

## 1. Every Master Has 8 Layers

| # | Layer | Artefact | Mandatory |
|---|-------|----------|-----------|
| 1 | **Identity** | Master code, name, category, owner | ✅ |
| 2 | **Schema** | Data model with standard governance columns | ✅ |
| 3 | **Registry** | Row in `master_registry` (MDP) | ✅ |
| 4 | **Service** | Standard CRUD service contract | ✅ |
| 5 | **UI** | Screen following the master UI template | ✅ |
| 6 | **Routing** | `/admin/master-data/<name>` + `app_modules` row | ✅ |
| 7 | **Permissions** | Fixed action vocabulary | ✅ |
| 8 | **Governance** | Owner, steward, lifecycle, versioning, audit | ✅ |

## 2. Layer 1 — Identity

Every master must declare:

```
master_code:       <UPPER_SNAKE_CASE>       e.g. ENT_BANK, ENT_COUNTRY, ORG_OFFICE
master_name:       <Human readable>          e.g. "Enterprise Bank"
tier:              R | E | O | B
category:          Geography | Finance | Person | Employment | Legal | ...
business_owner:    <Role or team>
technical_owner:   <Squad>
steward:           <Named person>
consumers:         [product codes]
version_strategy:  IMMUTABLE_CODES | VERSIONED_ROWS | SNAPSHOT_ON_PUBLISH
lifecycle:         DRAFT → REVIEW → APPROVED → PUBLISHED → RETIRED
```

## 3. Layer 2 — Schema Standard

Every master table must include these standard columns (naming exact):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | text unique | Stable business code |
| `name` | text | Display name |
| `description` | text | |
| `status` | text | `DRAFT` \| `ACTIVE` \| `INACTIVE` \| `RETIRED` |
| `effective_from` | date | For versioned masters |
| `effective_to` | date | For versioned masters |
| `version` | int | Increments on publish |
| `is_platform_owned` | bool | true = protected from tenant edit |
| `metadata` | jsonb | Extension bag |
| `created_at` | timestamptz | |
| `created_by` | uuid | User code |
| `updated_at` | timestamptz | |
| `updated_by` | uuid | User code |
| `deleted_at` | timestamptz | Soft delete |

Follow the **No RLS** rule (`docs/ARCHITECTURE-NO-RLS-RULE.md`). Authorization enforced at service/edge layer.

## 4. Layer 3 — Registry Row

Every master registers itself in the MDP registry (`master_registry`, to be created in Epic 1.2.1):

```
INSERT INTO master_registry (
  master_code, master_name, tier, category,
  table_name, primary_key_column, code_column, name_column,
  business_owner, technical_owner, steward,
  route_path, module_id,
  version_strategy, lifecycle_status,
  supports_import, supports_export, supports_versioning,
  consumers
) VALUES (...);
```

## 5. Layer 4 — Service Contract

Every master service exposes this standard TS interface:

```ts
interface MasterService<T> {
  list(filter?: MasterFilter): Promise<Page<T>>;
  get(id: string): Promise<T | null>;
  getByCode(code: string): Promise<T | null>;
  create(input: Partial<T>, actor: string): Promise<T>;
  update(id: string, patch: Partial<T>, actor: string): Promise<T>;
  retire(id: string, reason: string, actor: string): Promise<void>;
  bulkImport(rows: unknown[], mode: "insert"|"upsert", actor: string): Promise<ImportResult>;
  export(filter?: MasterFilter, format: "csv"|"xlsx"|"json"): Promise<Blob>;
  dependencies(id: string): Promise<DependencyReport>;
  impact(id: string, change: ChangeSpec): Promise<ImpactReport>;
  history(id: string): Promise<VersionRecord[]>;
}
```

Naming convention: `src/services/masters/<masterCode>Service.ts`.

## 6. Layer 5 — UI Template

Every master screen has the same sections in the same order:

1. **Header** — master name, tier badge, owner, lifecycle badge
2. **Toolbar** — Search, Filter, Add, Import, Export, Bulk Actions
3. **Table** — with columns: Code, Name, Status, Version, Updated
4. **Row actions** — View, Edit, History, Dependencies, Retire
5. **Side drawer** — Create / Edit form
6. **Tabs on detail** — Details · Versions · Dependencies · Impact · Audit

Reuse existing common components (Table, DataGrid, Drawer, ValidationSummary, PhoneInput, DatePicker per project standards).

## 7. Layer 6 — Routing & `app_modules`

Every master must register:

```
app_modules row:
  code:          master_<master_code_lower>
  name:          <Master Name>
  route:         /admin/master-data/<slug>
  parent:        Master Data
  icon:          <lucide icon name>
  show_in_menu:  true
  sort_order:    <n>
```

## 8. Layer 7 — Permissions

Fixed action vocabulary (per Epic 1.1.4 Blueprint):

| Action | Meaning |
|--------|---------|
| `view` | Read list + detail |
| `create` | Add a record |
| `update` | Edit a record |
| `delete` | Soft delete |
| `manage` | Full CRUD |
| `approve` | Approve DRAFT → APPROVED |
| `publish` | APPROVED → PUBLISHED |
| `retire` | ACTIVE → RETIRED |
| `import` | Bulk import |
| `export` | Bulk export |
| `admin` | Configure registry entry |

Seed permissions in the same migration as the `app_modules` row. Grant `view` + `manage` to Admin and Application Admin by default.

## 9. Layer 8 — Governance

Every master carries:
- **Business owner** (role/team)
- **Technical owner** (squad)
- **Steward** (named person)
- **Lifecycle** (DRAFT / REVIEW / APPROVED / PUBLISHED / RETIRED)
- **Versioning strategy**
- **Audit** — every change written to `system_audit_trail`
- **Change approval** — DRAFT → PUBLISHED requires `approve` permission

## 10. Anti-Patterns (Forbidden)

- ❌ Creating a new master table without a `master_registry` row
- ❌ Hand-rolled CRUD screen that doesn't reuse common components
- ❌ Storing role/permission logic on the master itself
- ❌ Enabling RLS
- ❌ Skipping soft-delete (`deleted_at`)
- ❌ Enum columns without a corresponding Reference Framework group
- ❌ Duplicating an existing Enterprise master under a product prefix

## 11. Applying the Template

For any new master, follow this order:

1. Fill the Identity block
2. Design the schema with the 15 standard columns
3. Write the migration (schema + registry row + `app_modules` + permissions)
4. Implement the service against `MasterService<T>`
5. Build the screen using the UI template
6. Register in the sidebar (`masterDataMenuItems.ts`)
7. Follow the 7-stage adoption lifecycle from Epic 1.1.4 Blueprint
