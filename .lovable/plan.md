## BN Product Catalogue: Classification & Version Governance

Make Product Catalog the single source of product configuration, with safe version lifecycle, claim-date resolution, and read-only enforcement for non-draft versions.

### 1. ProductEditor UI changes (`src/pages/bn/config/ProductEditor.tsx`)
- Rename "Active Version:" → "Selected Version:" with helper text: *"Claims use the version active on the claim date. Draft versions are for future changes."*
- Compute `isEditableVersion = selectedVersion?.status === 'DRAFT'` and pass to every tab.
- Add **Version Summary Card** above tabs showing: Status badge, Effective From/To, Editable Yes/No, counts (eligibility, calculation, document), workflow assigned, screen template assigned, public application ready.
- Add **Version Lifecycle Actions** bar (Submit / Approve / Reject / Publish / Retire) gated by current status.
- Add **Compare with Active** button → opens dialog using existing `compareVersions` / `useBnCompareVersions`.

### 2. Read-only enforcement across tabs
Add `isReadOnly` prop (or reuse pattern from `OverridePoliciesTab`) to:
- `EligibilityRulesTab`, `CalculationRulesTab`, `TimelineRulesTab`, `DocumentRulesTab`, `WorkflowTab`, `ScreenTemplateTab`, `ChannelsTab`, `InteractionRulesTab`, `OverridePoliciesTab`.

When read-only:
- Hide Add / Edit / Delete / Save buttons.
- Show banner: *"This version is read-only. Create a new draft version to make changes."*

### 3. New Version flow (`VersionHistoryTab.tsx` + `productService.ts`)
When user clicks **New Version**:
- Dialog asks: copy from **Selected Version** or **Current Active Version** (or blank).
- Create DRAFT version, then call extended `copyVersionRules` to copy:
  - eligibility, calculation, timeline rules (already done)
  - document requirements (already done)
  - workflow assignment (`workflow_template_id` on version)
  - screen template assignment (`screen_template_id`)
  - channels (`bn_product_channel_config` rows)
  - version-specific override policies
  - relevant version-level JSON config fields

### 4. Version lifecycle service
Extend / wire existing `src/services/bn/rulesAdminService.ts` actions (submit, approve, reject, publish, retire) into ProductEditor:
- DRAFT → Submit
- PENDING_APPROVAL → Approve / Reject
- APPROVED → Publish (with effective_from date)
- ACTIVE → Retire (only if replacement exists OR `effective_to` set)
- ARCHIVED/RETIRED → no actions

### 5. No overlapping ACTIVE versions on publish
In publish path (service layer):
- Query existing ACTIVE versions for same `product_id`.
- If new `effective_from` > existing active's `effective_from` and existing has no `effective_to`, auto-set existing `effective_to = new.effective_from - 1 day`.
- If ranges still overlap, throw blocking error.

### 6. Claim date resolver — new file
Create `src/services/bn/productVersionResolver.ts`:
```ts
resolveProductVersion(productIdOrCode: string, claimDate: string | Date)
```
- Resolves product by id or `benefit_code`; product must be ACTIVE.
- Finds versions where status=ACTIVE, `effective_from <= claimDate`, and (`effective_to IS NULL` OR `claimDate <= effective_to`).
- 0 rows → `NoActiveVersionError`; >1 rows → `OverlappingVersionsError`.

Integrate the resolver at these call sites (replace existing "latest active" lookups):
- Claim intake (BN claim creation entry point)
- Public application config loader
- Calculation engine entry
- Eligibility check entry
- Document checklist generator

### 7. Classification/menu copy updates
Update descriptions on these pages/menu entries:
- **Product Catalog** — "Configure benefit products, versions, eligibility, calculations, documents, workflow, screens, and application requirements."
- **Rule Group Library** — "Reusable categories for organizing rules. Product-specific rules are configured in Product Catalog."
- **Formula Templates** — "Reusable formula library. Attach formulas inside Product Catalog → Calculation."
- **Document Setup** — "Reusable document type library. Required documents for each benefit are configured in Product Catalog → Documents."
- **Rule Version Governance** — "Approve, publish, retire, and audit product versions. Rules are edited in Product Catalog."

### 8. Version comparison view
Reuse `useBnCompareVersions` in a `VersionCompareDialog` shown from ProductEditor; render diff sections: eligibility, calculation, documents, workflow, screens, timelines.

### Technical notes
- No new DB tables needed; relies on existing `bn_product_version.status`, `effective_from`, `effective_to`, and `bn_version_approval`.
- Read-only is enforced in UI; service layer should also reject writes when version status ≠ DRAFT (defense in depth — add status check inside `upsertEligibilityRule`/`upsertCalculationRule`/`upsertTimelineRule`/`upsertDocumentRule` by joining to version).
- `copyVersionRules` return type expands to include `workflow`, `screen_template`, `channels`, `overrides` counts.
- Resolver errors surface via existing shielded-error pattern.

### Verification
- Switching to an ACTIVE version hides all mutation controls and shows banner.
- DRAFT version remains fully editable.
- Creating a new version offers copy-from choice and produces non-zero counts across all categories.
- Publish blocks when an overlapping ACTIVE version cannot be auto-closed.
- `resolveProductVersion(code, date)` returns correct version for a given claim date in unit/manual check.
- TypeScript build passes.
