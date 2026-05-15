## Diagnosis

The backend side is not showing a publish blocker:

- Live backend is healthy.
- Recent Live database error logs are clean.
- Recent Live backend-function request logs are clean.
- Only one package lockfile remains: `bun.lock`.
- Migrations and backend functions are not unusually large for this project.

The remaining concrete blocker is the frontend bundle/build step:

- `src/components/routing/AppRoutes.tsx` has 2,056 lines.
- It eagerly imports 725 page modules and 733 total imports.
- Only 18 lazy-loading references exist.
- Previous `manualChunks` changes only split `node_modules`; they cannot split local page code while the router imports every page upfront.
- This keeps the main app graph extremely large and matches the generic `Publishing failed` behavior: build/artifact step dies before deploy logs are produced.

## Fix Plan

1. **Refactor route page imports to lazy imports**
   - Convert `@/pages/...` imports in `src/components/routing/AppRoutes.tsx` from eager static imports to `React.lazy()` declarations.
   - Preserve default imports as lazy default imports.
   - Preserve named page exports using the safe lazy mapping pattern:
     ```ts
     const WeeklyPlanReview = lazy(() =>
       import('@/pages/compliance/audit-planning/WeeklyPlanReview').then((m) => ({ default: m.WeeklyPlanReview }))
     );
     ```

2. **Keep route infrastructure eager**
   - Keep small/core route infrastructure eager, including:
     - `Routes`, `Route`, `Navigate`
     - `LoginScreen`
     - `ProtectedLayout`
     - `ProtectedRoute`
     - auth/layout wrappers and context hooks
   - This avoids changing auth behavior while still removing hundreds of heavy page modules from the initial build graph.

3. **Add a single reusable lazy route wrapper**
   - Add a small local helper in `AppRoutes.tsx` for consistent Suspense wrapping, for example:
     ```tsx
     const routeFallback = <div className="min-h-screen bg-background" />;
     const lazyRoute = (node: React.ReactNode) => (
       <Suspense fallback={routeFallback}>{node}</Suspense>
     );
     const protectedLazyRoute = (node: React.ReactNode) => (
       <ProtectedLayout>{lazyRoute(node)}</ProtectedLayout>
     );
     ```
   - Replace existing repeated `<ProtectedLayout><Page /></ProtectedLayout>` route elements with `protectedLazyRoute(<Page />)` only for lazy pages.
   - Keep existing custom wrappers where needed, but place lazy pages inside `Suspense`.

4. **Apply in controlled batches**
   - First convert all obvious `@/pages/...` default imports.
   - Then handle named page imports.
   - Then update route elements so no lazy component renders outside `Suspense`.
   - Avoid changing route paths, permissions, layouts, or business logic.

5. **Verification after implementation**
   - Confirm there are no remaining eager `@/pages/...` imports except intentionally kept public/auth pages.
   - Confirm every lazy page is rendered inside `Suspense`.
   - Use the automatic harness/build feedback to catch syntax or JSX issues.
   - Then ask you to publish again.

## What will not be changed

- No database migrations.
- No Live data changes.
- No backend function logic changes.
- No changes to generated Lovable Cloud client/type files.
- No route URL changes.
- No UI/business behavior changes beyond loading pages lazily.

## Expected result

The main bundle should drop substantially because the router will no longer include every page in the initial application chunk. This directly targets the remaining publish failure cause instead of repeating lockfile or migration cleanup.