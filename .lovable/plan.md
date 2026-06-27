
## Goal
Upload the official SSB logo ONCE. The system derives every branding asset (logo variants, favicons, app icons, letterhead, email, watermark, QR center, portal banners, sidebar, etc.), wires them to organization/department defaults, and archives the old "System Default …" placeholders.

## Approach (phased)

### Phase 1 — Schema & relationships (migration)
Extend `comm_media_asset` with the parent/derived/usage model the spec requires:
- `asset_type` (`MASTER_LOGO` | `DERIVED` | `STANDALONE`)
- `parent_asset_id`, `derived_from_asset_id` (FK self → `comm_media_asset.id`)
- `usage_slot` (text, e.g. `SSB_LOGO_MAIN`, `SSB_FAVICON`, …)
- `generated_by_system` (bool), `generated_at` (timestamptz)
- `replaced_by_asset_id` (FK self), `version_no` (int, default 1)
- `checksum_sha256` (text)
- Partial unique index: one active default per `usage_slot` (`is_default=true AND is_active=true`).

Add `organization_branding_defaults` columns on `core_organization`:
`default_logo_asset_id`, `default_small_logo_asset_id`, `default_favicon_asset_id`, `default_letterhead_logo_asset_id`, `default_email_header_asset_id`, `default_watermark_asset_id`, `default_qr_logo_asset_id` (all FK → comm_media_asset).

Departments inherit via existing `core_department_profile.inherit_*_from_org` flags (no duplicate files).

### Phase 2 — Master upload + generator service
Server-side TypeScript module `src/lib/comm/logoGenerator.ts` (browser-side, uses Canvas API since we have no edge runtime for image processing in this project):
- Input: master PNG (uploaded once to `comm-assets/master/ssb_master_logo.png`).
- Generates 25 derived PNGs in-browser with `<canvas>`:
  - Logo variants: main (original), small (256px), transparent (alpha-flatten), monochrome (desaturate), dark-mode (white-tinted), light-mode (original).
  - Icons: favicon (32×32, 16×16 inside ico-like png), mobile app icon (1024×1024 square + safe padding), PWA (512×512), notification (96×96 monochrome), splash (1242×2208 centered), login (480px).
  - Documents: letterhead (600×180), email header (600×120), email footer (300×60), watermark light (1200×1200 @ 8% opacity), watermark center, QR center (120×120 transparent), certificate watermark.
  - Portals: public/member/employer banners (1600×320), dashboard header (320×80), sidebar (200×60).
- Each uploaded to `comm-assets/derived/<usage_slot>.png`.
- Each row inserted with `parent_asset_id`, `derived_from_asset_id`, `usage_slot`, `generated_by_system=true`, `version_no=1`, `is_default=true`, `approval_status='approved'`, `source='upload'` (storage), checksum.

### Phase 3 — Replace placeholder seeds
SQL: existing `is_system_default=true` rows where `name ILIKE 'System Default %'` are flipped:
- `is_active=false`, `is_default=false`, `approval_status='archived'`
- `replaced_by_asset_id` set to the new generated slot's id (matched by category).
Not deleted.

### Phase 4 — Organization & department wiring
After generation, update active `core_organization`'s `default_*_asset_id` columns. Department profiles keep `inherit_*_from_org=true` so they pull from organization automatically. No new department rows.

### Phase 5 — UI (MediaLibraryPage + new "Master Logo" tab)
- New top section "Master Logo" with upload + "Generate Derived Assets" button.
- "Regenerate Derived Assets from Master Logo" action → bumps `version_no`, archives previous versions (keeps audit), new becomes default.
- Asset cards now show:
  - usage_slot, parent/derived link, replaced-by relationship
  - dimensions, file size, default badge, preview
  - Regenerate / Archive / Restore buttons
- Validation banner: "X usage slots have no active default" / "Y orphaned defaults".

### Phase 6 — Asset resolver integration
`assetResolver.ts` already supports priority lookup; extend `resolve_comm_asset` RPC to accept `usage_slot` and prefer slot match over generic category. Falls back to category → system default.

### Scope split for this iteration
This turn: **Phase 1, 2, 3, 4** (the data layer + generation + wiring). Phase 5/6 UI in the next turn after schema lands.

## Technical notes
- Image generation runs client-side via Canvas 2D (no server image-magick available in this stack). All derived PNGs uploaded via the existing `comm-assets` bucket policies.
- Color/mono/dark transforms = pixel passes on imageData.
- Checksum via `crypto.subtle.digest('SHA-256', arrayBuffer)`.
- All inserts go through one `generateAllDerivedAssets(masterFile)` function with a transaction-like cleanup (delete prior generated rows for same usage_slot, then insert fresh — keeps history via `version_no`).
- Constraint enforces single active default per slot.

## Files
- `supabase/migrations/<ts>_ssb_master_logo_schema.sql` (new)
- `src/lib/comm/logoGenerator.ts` (new, ~400 lines)
- `src/lib/comm/derivedAssetSpecs.ts` (new — spec table for 25 slots)
- `src/pages/admin/organization/MediaLibraryPage.tsx` (edit — add Master Logo card + Generate button)
- `src/hooks/comm/useMediaAssets.ts` (edit — add `usage_slot`, `parent_asset_id` to type)

## Acceptance
- Upload 1 logo → click Generate → 25 rows appear, all `generated_by_system=true`, slot-unique defaults.
- Old "System Default *" placeholders flip to archived with `replaced_by_asset_id` set.
- Organization row's `default_*_asset_id` columns point at the generated slot ids.
- Departments resolve via inheritance (no per-dept rows created).
- TypeScript build passes.
