
## Diagnosis so far

What is **already known to work**:

- Local production build succeeds (`vite build` → `✓ built in 51.87s`, no errors).
- Live URL `https://admin.secureserve.biz` responds **HTTP 200** and `social-wellspring-app.lovable.app` 302‑redirects to it — the previously‑published version is live and reachable.
- Publish visibility is `public` and project is marked `is_published: true`.
- Lovable Cloud **production** backend reports healthy.
- `.env` is **not** in `.gitignore`, so Supabase keys are not the cause (the canned "missing VITE_SUPABASE_*" pattern doesn't apply here).

So the *previous* publish is fine; the **current** Update click is what's failing. The user reports only "Publish failed" with no extra detail.

## Most likely root causes (ranked)

### A. Oversized main JS chunk → publish/upload timeout

`vite build` produced:

```text
dist/assets/index-w8OKfKA0.js   14,440.04 kB │ gzip: 3,158.58 kB
```

A **14 MB** single JS bundle is far above the comfortable upload window for Lovable's publish step and is exactly what causes "Publish failed" with no actionable error in the dialog. Vite itself flagged this:

```
(!) Some chunks are larger than 500 kB after minification.
```

The bundle is bloated because several services that *should* be lazy are imported both statically and dynamically (build log lists them):

- `src/services/wizAdminApiService.ts`
- `src/services/auditNotificationService.ts`
- `src/services/resolveReportingManager.ts`
- `src/utils/exportUtils.ts`
- `src/services/selfEmployedService.ts`
- `src/services/wizSelfEmployedService.ts`
- `src/services/bn/calculationEngine.ts`

When a module is statically imported anywhere, its dynamic `import()` is collapsed back into the main bundle — defeating code‑splitting.

### B. Edge‑function fan‑out timeout

`supabase/functions/` contains **92** functions. Publish redeploys all of them; transient failures on any single function deploy are reported back as a generic "Publish failed".

### C. (Less likely) Pending migration on Live

Most recent migration is dated 2026‑05‑11 (today is 2026‑05‑13), small (184 B). Worth a glance but unlikely to be the blocker since production cloud is healthy.

## Plan

### Step 1 — Capture the exact publish error (cheap, decisive)

Re‑run Update once with the browser DevTools **Network** tab open and grab:

- The failing request URL (typically `…/publish` or `…/deploy`).
- Its HTTP status + response body.
- Any error toast text inside the publish dialog.

This is a 30‑second step that turns a guess into a fix. If the network response says e.g. *"asset too large"*, *"function X failed to deploy"*, *"migration failed"*, the rest of this plan narrows accordingly.

### Step 2 — Reduce main bundle size (fixes A)

Edit the seven files listed above so that each "service" module has **one** import style across the codebase — preferably static (since they're already pulled into the main bundle). Concretely, for each file replace its dynamic `await import('…/X')` call sites with a top‑of‑file `import` of the same symbols. This removes the warnings, lets Rollup keep the dynamic chunks split, and shrinks `index-*.js`.

Add a Vite manualChunks split for the heaviest vendor groups in `vite.config.ts` (only if Step 1 confirms size is the cause):

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom', 'react-router-dom'],
        supabase: ['@supabase/supabase-js'],
        charts: ['recharts'],
        pdf: ['jspdf', 'html2canvas'],
        radix: [/* @radix-ui/* packages actually used */],
      },
    },
  },
  chunkSizeWarningLimit: 1500,
},
```

Target: main `index-*.js` < 2 MB gzipped, < 6 MB raw — well within the publish upload window.

### Step 3 — De‑risk the edge‑function deploy (fixes B, only if Step 1 points there)

If the failing request is on an edge function deploy:

- Identify the failing function name from the response.
- Open `supabase/functions/<name>/index.ts`, fix any TypeScript / Deno import error, and re‑publish.
- No bulk changes — touch only the offending function.

### Step 4 — Re‑publish and verify

After Step 2 (and optionally Step 3):

1. `vite build` locally to confirm `index-*.js` shrank and no new warnings.
2. Click **Update** in the publish dialog.
3. Hit `https://admin.secureserve.biz/?_=$(date +%s)` and confirm a new `x-deployment-id` header.

### Out of scope

- `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml` — never edit.
- Any auth/RLS/migration changes.
- Refactoring beyond converting the 7 listed files' import styles (no logic changes, no UI changes).

## What I need from you to start

The single most useful thing right now is the **exact text or a screenshot of the publish error** (Step 1). Once I have that, I'll either go straight to Step 2 (bundle slim‑down) or Step 3 (function fix) — not both blindly.
