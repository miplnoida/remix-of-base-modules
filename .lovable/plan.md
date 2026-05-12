## Plan: Make the satellite match SocialServe Compliance & Enforcement

### Scope
- Target app: `Integrated Compliance Hub` satellite.
- Source app: current SocialServe Compliance & Enforcement module.
- Copy/update frontend code only.
- Do not create, alter, seed, or migrate any database objects.
- Preserve the shared backend connection and existing authentication/SSO behavior.

### What I found
- The satellite already has a Compliance shell, but its `src/pages/compliance/Routes.tsx` is older and incomplete.
- SocialServe has many Compliance areas missing or outdated in the satellite, including canonical Workbench routes, Operations, Geography, Staff, Tools, expanded Admin routes, Enhanced planning routes, Employer 360, report template/admin pages, and legacy redirects.
- The satellite menu is also older and does not fully match SocialServe’s `complianceMenuItems`.

### Implementation steps

1. **Copy the complete Compliance module UI from SocialServe to the satellite**
   - Replace/sync these directories in the satellite from SocialServe:
     - `src/pages/compliance/**`
     - `src/components/compliance/**`
     - `src/hooks/compliance/**`
     - `src/services/compliance/**`
     - `src/lib/compliance/**`
   - This includes all submodules, screens, widgets, dialogs, dashboards, workbench components, and helper code.

2. **Copy Compliance menu/navigation exactly**
   - Replace satellite `src/components/sidebar/menuItems/complianceMenuItems.ts` with the SocialServe version.
   - Keep satellite sidebar rendering only the Compliance & Enforcement menu, not the full SocialServe menu.

3. **Sync Compliance route map exactly**
   - Replace satellite `src/pages/compliance/Routes.tsx` with the SocialServe version.
   - Ensure these canonical route groups exist in the satellite:
     - `/compliance/workbench/*`
     - `/compliance/violations/*`
     - `/compliance/cases/*`
     - `/compliance/field/*`
     - `/compliance/enforcement/*`
     - `/compliance/reports/*`
     - `/compliance/admin/*`
   - Preserve legacy redirects so older links still land on the new canonical paths.

4. **Copy all dependencies referenced by the Compliance module**
   - Copy any missing shared components, hooks, services, types, contexts, config, and utilities referenced by the copied files.
   - Important examples likely needed:
     - `src/pages/audit/DocumentTemplateSettings.tsx` and dependencies used by Compliance admin template routes
     - relevant audit document/template components and services
     - `src/config/legalConfig.ts`
     - `src/config/routes.ts` if imported
     - compliance-related `src/types/*.ts`
     - shared UI components that differ between projects
   - Do this by running an import sweep after copying and resolving missing `@/...` imports until the satellite compiles.

5. **Preserve satellite-only app shell and SSO**
   - Keep `/auth/exchange` outside protected routes.
   - Keep `/login` available.
   - Keep `/compliance/*` wrapped in the satellite `ProtectedLayout`.
   - Change the satellite root redirect to the canonical `/compliance/workbench` or `/compliance/workbench/manager` path used by the copied routes.
   - Do not add non-Compliance SocialServe modules to the satellite navigation.

6. **Do not touch database/backend schema**
   - No migrations.
   - No RLS changes.
   - No table/function/trigger changes.
   - No auth provider/config changes unless a copied frontend file exposes an already-existing route dependency.

7. **Validation after implementation**
   - Run the satellite app checks for missing imports and TypeScript errors.
   - Verify the satellite menu matches SocialServe’s Compliance menu.
   - Verify key routes render:
     - `/compliance/workbench/manager`
     - `/compliance/workbench/inspector`
     - `/compliance/violations`
     - `/compliance/field/plan-builder`
     - `/compliance/enforcement/legal-queue`
     - `/compliance/admin/settings/rule-engine`
   - Verify `/auth/exchange?code=...` still redeems before protected routing.

### Important note
This implementation must be applied inside the `Integrated Compliance Hub` project because the current editable workspace is SocialServe. The copy source is SocialServe; the destination must be the satellite project.