

## Plan: Document Configuration in Global Settings + Public API Endpoint

### Overview

Build a fully database-driven Document Configuration feature inside Global Settings where admins can configure required documents per module, organized by categories. Then expose a public API endpoint for external systems to retrieve the configuration by module identifier.

### 1. Database Schema (Migration)

Create 2 new tables (reuse existing `app_modules` as the module master):

**`module_doc_categories`** — Document categories per module
- `id` UUID PK
- `module_id` UUID FK → `app_modules(id)`
- `category_name` TEXT NOT NULL
- `description` TEXT
- `sort_order` INTEGER DEFAULT 0
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `created_by`, `updated_at`, `updated_by`
- UNIQUE constraint on `(module_id, category_name)`

**`module_doc_configs`** — Individual document configurations per category
- `id` UUID PK
- `category_id` UUID FK → `module_doc_categories(id)` ON DELETE CASCADE
- `document_name` TEXT NOT NULL
- `is_required` BOOLEAN DEFAULT true
- `allowed_extensions` TEXT[] (e.g. `{pdf,jpg,png}`)
- `max_file_size_mb` NUMERIC DEFAULT 5
- `requires_supportive_doc` BOOLEAN DEFAULT false
- `supportive_doc_description` TEXT
- `allow_alternate_doc` BOOLEAN DEFAULT false
- `alternate_doc_name` TEXT
- `alternate_requires_supportive` BOOLEAN DEFAULT false
- `alternate_supportive_description` TEXT
- `sort_order` INTEGER DEFAULT 0
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `created_by`, `updated_at`, `updated_by`
- UNIQUE constraint on `(category_id, document_name)`

No RLS (per project convention). Audit fields (`created_by`, `updated_by`) use user_code strings.

### 2. Global Settings — New Route + UI

**New route**: `/admin/document-configuration`  
**New page**: `src/pages/admin/DocumentConfigurationPage.tsx`  
**Register** in `AppRoutes.tsx`

**UI Layout**:
- Top: Module selector dropdown (loaded from `app_modules` table)
- After selecting a module, show a list of categories with an "Add Category" button
- Each category is an expandable card/accordion showing its documents
- Each category has Edit, Delete, Toggle Active buttons
- Inside each category: a table of documents with Add/Edit/Delete/Toggle Active
- Document edit modal with all fields: name, required/optional, extensions, max size, supportive doc toggle + description, alternate doc toggle + name + alternate supportive toggle + description
- Active/Inactive badge + toggle on both categories and documents

**Components** (under `src/components/admin/document-configuration/`):
- `ModuleSelector.tsx` — fetches `app_modules`, renders Select dropdown
- `CategoryList.tsx` — lists categories for selected module, CRUD actions
- `CategoryFormModal.tsx` — add/edit category
- `DocumentList.tsx` — table of documents in a category
- `DocumentFormModal.tsx` — add/edit document with all config fields

**Service hook**: `src/hooks/useDocumentConfiguration.ts`
- `useDocCategories(moduleId)` — fetch categories
- `useDocConfigs(categoryId)` — fetch documents
- Mutations for create/update/delete categories and documents
- All operations write `created_by` / `updated_by` with user_code from `useUserCode()`

### 3. Public API Endpoint

Add a new route to the existing `public-api` edge function:

**Route**: `GET /api/v1/module-documents/:moduleIdentifier`

**Logic**:
1. Look up module by `name` (module identifier) in `app_modules`
2. If not found, return 404 with clear error
3. Query `module_doc_categories` WHERE `module_id` matches AND `is_active = true`
4. For each category, query `module_doc_configs` WHERE `category_id` matches AND `is_active = true`
5. Return structured response

**Response shape**:
```json
{
  "status": "success",
  "data": {
    "module": { "id": "...", "name": "...", "display_name": "..." },
    "categories": [
      {
        "category_name": "Identity Documents",
        "documents": [
          {
            "document_name": "National ID",
            "is_required": true,
            "allowed_extensions": ["pdf", "jpg", "png"],
            "max_file_size_mb": 5,
            "requires_supportive_doc": false,
            "allow_alternate_doc": true,
            "alternate_doc_name": "Passport",
            "alternate_requires_supportive": true,
            "alternate_supportive_description": "..."
          }
        ]
      }
    ]
  }
}
```

**Changes to `supabase/functions/public-api/index.ts`**:
- Add handler `handleModuleDocuments` 
- Add route match for `/api/v1/module-documents/:identifier`
- Register in `matchRoute()` and `executeHandler()`

**API Registry**: Insert a new row into `api_registry` for this endpoint so it can be enabled/disabled and shows on the Public API Management screen.

### 4. Files to Create/Modify

| File | Action |
|---|---|
| `supabase/migrations/..._document_configuration.sql` | Create tables + seed API registry entry |
| `src/pages/admin/DocumentConfigurationPage.tsx` | New page |
| `src/hooks/useDocumentConfiguration.ts` | New hook |
| `src/components/admin/document-configuration/ModuleSelector.tsx` | New |
| `src/components/admin/document-configuration/CategoryList.tsx` | New |
| `src/components/admin/document-configuration/CategoryFormModal.tsx` | New |
| `src/components/admin/document-configuration/DocumentList.tsx` | New |
| `src/components/admin/document-configuration/DocumentFormModal.tsx` | New |
| `src/components/routing/AppRoutes.tsx` | Add route |
| `supabase/functions/public-api/index.ts` | Add module-documents endpoint |

