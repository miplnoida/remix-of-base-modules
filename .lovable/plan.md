
# Internal Audit Architecture — Completed

## Changes Implemented

### Phase 1: Database Changes ✅
- Added `function_id` FK column to `ia_risk_assessments` → `ia_department_functions`
- Replaced 5 employer-focused risk criteria with internal audit criteria: Operational Criticality (20%), Financial Exposure (25%), Compliance Sensitivity (20%), Control Weakness (20%), Time Since Last Audit (15%)
- Seeded default risk scoring model with thresholds: Critical ≥90, High ≥75, Medium ≥50, Low <50
- Populated `ia_risk_criteria_weights` with matching weights
- Added `risk_frequency` audit settings: Critical=6mo, High=12mo, Medium=24mo, Low=36mo

### Phase 2: Risk Assessment Page ✅
- Replaced Audit Universe dropdown with Department → Function cascading selectors
- Dynamic criteria loaded from `ia_risk_criteria_weights` with slider inputs
- Auto-calculates `overall_score = Σ(score × weight%)`
- Auto-determines risk level from scoring model thresholds
- Auto-suggests audit frequency from configurable mapping

### Phase 3: Enhanced Risk Configuration ✅
- AuditConfig "Risk Assessment" tab with:
  - Editable criteria weights table with add/remove
  - Weight sum validation (must = 100%)
  - Configurable risk level thresholds (Critical/High/Medium)
  - Audit frequency mapping (months per risk level)

### Phase 4: Audit Universe Disabled ✅
- `FEATURE_AUDIT_UNIVERSE: false` in auditRouteConfig.ts
- Removed from sidebar navigation
- ExecutiveDashboard: "High-Risk Entities" → "High-Risk Functions" using Function Master
- CommitteeReports: same replacement

### Phase 5: Navigation Updated ✅
- Sidebar group renamed "Audit Universe & Risk" → "Risk Assessment"
- Removed `/audit/audit-universe` from navigation routes

---

# Document Configuration Feature — Completed

## Changes Implemented

### Database Schema ✅
- Created `module_doc_categories` table (FK to `app_modules`, unique on module+name)
- Created `module_doc_configs` table (FK to categories, unique on category+name)
- Full audit fields (created_by, updated_by, timestamps)
- Active/inactive status on both tables

### Global Settings UI ✅
- New route: `/admin/document-configuration`
- Page: `DocumentConfigurationPage.tsx`
- Components: `ModuleSelector`, `CategoryList`, `CategoryFormModal`, `DocumentFormModal`, `DocumentList`
- Module dropdown loads from `app_modules` table
- Collapsible category cards with document tables inside
- Full CRUD for categories and documents
- Toggle active/inactive on both levels
- Document form includes: name, required/optional, allowed extensions, max file size, supportive doc rules, alternate doc rules

### Public API Endpoint ✅
- `GET /api/v1/module-documents?module=<module_name>`
- Returns active categories and documents structured by category
- Validates module identifier, returns 404 for invalid
- Registered in `api_registry` table
- Deployed to edge function `public-api`

### Service Hook ✅
- `useDocumentConfiguration.ts` with queries and mutations
- All mutations use `useUserCode()` for audit trail
- Proper cache invalidation via react-query
