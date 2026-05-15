## What I actually verified now

- **Backends are healthy**: Live (`pruvbfejdpodpalqafcu`) responds normally; Test (`xynceskeiiisiefqlgxo`) project exists and is reachable via project_info.
- **Migrations are aligned**: 501 local files = 501 in Test = 501 in Live, latest `20260514150558` everywhere. No drift.
- **Live DB logs are clean**: only normal app-level errors (rate-limit dupes, missing view), nothing that would block a publish.
- **The "Test vs Live different project ref" theory was wrong**: Lovable Cloud always uses two separate Supabase projects for Test and Live. That is by design, not a bug, and not the publish blocker.

## Real likely cause

Local production build succeeds but the output is dangerously heavy:

```
dist/assets/index-*.js          11,054 kB   (gzip 2,270 kB)
dist/assets/excel-vendor-*.js      941 kB
dist/assets/icons-vendor-*.js      780 kB
dist/assets/pdf-vendor-*.js        623 kB
dist/assets/charts-vendor-*.js     441 kB
build time: ~1m 3s with --max-old-space-size=4096
```

A single 11 MB main chunk + 1m+ build at the 4 GB heap cap is right at the edge of the publish pipeline's CPU/memory/time budget. Generic "Publishing failed" with no log entry on Live is the typical signature of the build step itself being killed (OOM/timeout) before deploy starts. This is the only remaining concrete blocker after migrations, ledgers, lockfiles, and archived migrations were already cleaned up.

## Fix plan (source-only, no DB or platform changes)

1. **Raise publish build headroom**
   - In `package.json`, raise `build` and `build:dev` to `--max-old-space-size=8192` so the publish builder is not killed at the 4 GB cap.

2. **Split the 11 MB main chunk**
   - In `vite.config.ts`, add `build.rollupOptions.output.manualChunks` to push heavy libs out of the main bundle:
     - `xlsx` / `exceljs` → `excel-vendor`
     - `jspdf`, `pdfjs-dist`, `html2canvas` → `pdf-vendor` (already partially split)
     - `recharts`, `d3-*` → `charts-vendor`
     - `lucide-react` → `icons-vendor`
     - `@radix-ui/*` → `radix-vendor`
     - `@tanstack/*` → `tanstack-vendor`
     - `react`, `react-dom`, `react-router-dom` → `react-vendor`
   - Set `build.chunkSizeWarningLimit: 2000` to silence the noisy warning.

3. **Lazy-load the heaviest pages**
   - Convert these route components to `React.lazy()` + `Suspense` in the router:
     - Audit module pages (`AuditPlanDetail`, `AuditReportBuilder`, `DocumentTemplateSettings`, `LegalHearingCalendar`)
     - DB diagram page
     - Excel/PDF export-heavy pages
   - Goal: get the main `index-*.js` chunk well under 4 MB.

4. **Verify**
   - Run `bunx vite build` locally and confirm:
     - main `index-*.js` < 4 MB raw
     - total build time < 60 s
     - no chunk > 1.5 MB except known vendor chunks
   - Then run **Publish → Update** once.

5. **Only if step 4 still fails**
   - Capture the exact failure timestamp and check Lovable Cloud edge-function deploy logs for the 92 functions; identify any function that fails to deploy (most common: a function importing a missing local file or a syntax error introduced in the most recent batch).

## What I will NOT touch

- No more migration backfills, ledger inserts, or `supabase_migrations.schema_migrations` edits.
- No changes to Live data, storage, secrets, auth, or custom domain.
- No changes to `src/integrations/supabase/client.ts`, `.env`, or `supabase/config.toml` project_id.
- No edge-function logic changes in this pass — only the Vite build and router lazy-loading.

## Why this is the right next step

Migrations and backend mapping are already verified clean. The only remaining unverified area that can produce a generic "Publishing failed" with no Live DB error is the Vite build / artifact step, and the local build numbers (11 MB single chunk, 1m+ at 4 GB cap) match exactly that failure profile. Fixing it is a pure source change with zero risk to Live data.
