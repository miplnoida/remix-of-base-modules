

## Plan: Fix Employer Application Detail — Code Lookups, Missing Fields, and Document Actions

### Problem Summary
The employer application detail page displays raw codes instead of human-readable descriptions for several fields, is missing some fields entirely, and has non-functional document View/Download buttons.

### Changes Required

---

### 1. Update `useEmployerApplicationDetail.ts` — Uncomment Missing Fields

**What**: Uncomment `inspector_code` in the `EmployerApplicationDetail` interface and in `normalizeEmployerDetail()` so these values from the external API are captured.

- Uncomment `inspector_code` field in interface (line ~148)
- Uncomment mapping in `normalizeEmployerDetail` (line ~364)

---

### 2. Create a Reusable Lookup Resolver Hook — `useEmployerCodeResolver.ts`

**What**: A new hook that takes the raw code values from the application and resolves them to descriptions using the existing `useERLookups` hook (which already fetches from `tb_legal_status`, `tb_sector`, `tb_office`, `tb_indus`, `tb_villages`, `tb_activity`, `tb_inspector`).

**Location**: `src/hooks/useEmployerCodeResolver.ts`

**Logic**:
```
function resolveCode(lookupList, code) → description or "code - description"
```

Takes an `EmployerApplicationDetail` and returns resolved strings for:
- `ownershipDescription` — from `tb_legal_status` by `ownership_code`
- `sectorDescription` — from `tb_sector` by `sector_code`
- `officeDescription` — from `tb_office` by `office_code`
- `industryDescription` — from `tb_indus` by `industry_code`
- `villageDescription` — from `tb_villages` by `village_code`
- `activityTypeDescription` — from `tb_activity` by `activity_type`
- `inspectorDescription` — from `tb_inspector` by `inspector_code`

Reuses the existing `useERLookups()` hook — no new database queries needed.

---

### 3. Update `EmployerApplicationDetailPage.tsx` — UI Fixes

**Changes**:

**a) Import and use the new resolver hook**
```tsx
const resolved = useEmployerCodeResolver(application);
```

**b) Employer Profile tab — Organization Classification section (line ~346)**
- Replace `application.ownership_code` with `resolved.ownershipDescription`
- Replace `application.sector_code` with `resolved.sectorDescription`

**c) Employer Profile tab — Organization Details section (line ~358)**
- Replace `application.office_code` with `resolved.officeDescription`
- Replace `application.industry_code` with `resolved.industryDescription`

**d) Contact & Reach tab — Location Information section (line ~448)**
- Replace `application.village_code` with `resolved.villageDescription`
- Uncomment and add Activity Type field using `resolved.activityTypeDescription`
- Uncomment and add Inspector field using `resolved.inspectorDescription`

**e) Acquisition/Incorporation section (line ~335)**
- Acquisition Date field already exists at line 335 (`application.date_acquired`). Verify it renders. If the API field name differs (e.g., `acquisition_date`), add a fallback: `application.date_acquired || application.acquisition_date`.

**f) Documents tab — Fix View/Download buttons (line ~647)**

Current buttons use `documentUrl` (the raw URL from the external API) which may not be accessible. Replace with proper handling:

- If `doc.file_path` exists, generate a signed URL from Supabase Storage using `supabase.storage.from('employer-documents').createSignedUrl(doc.file_path, 3600)`.
- If `doc.download_url` exists (from external API), use it directly.
- Add click handlers instead of plain `<a>` tags for View (opens in new tab) and Download (triggers download).
- Add a `useEffect` or on-click lazy URL generation to avoid generating signed URLs for all documents at once.
- Log view/download actions for audit using an insert into `system_audit_trail` or `audit_logs`.

---

### 4. Files Modified

| File | Action |
|------|--------|
| `src/hooks/useEmployerApplicationDetail.ts` | Uncomment `inspector_code` field + mapping |
| `src/hooks/useEmployerCodeResolver.ts` | **New** — reusable code-to-description resolver |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Use resolver for all code fields, add missing fields, fix document actions |

### Technical Notes
- No new database tables or migrations needed
- All lookups use existing `useERLookups()` which queries `tb_legal_status`, `tb_sector`, `tb_office`, `tb_indus`, `tb_villages`, `tb_activity`, `tb_inspector`
- Document signed URL generation uses the existing Supabase Storage client
- Backward compatible — raw codes are shown as fallback if lookup resolution fails

