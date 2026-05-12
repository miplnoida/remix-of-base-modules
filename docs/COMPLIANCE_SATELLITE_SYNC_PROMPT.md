# Paste-in prompt for the Integrated Compliance Hub satellite

> Open project **Integrated Compliance Hub** (`8471f73c-7659-4260-8d4d-c70dfbebe261`)
> and paste everything below the line as a single chat message.
> Source project (SocialServe): `455cbbae-c40e-4f3f-af49-d9ed99089948`

---

You are the satellite app for SocialServe's **Compliance & Enforcement** module.
Sync this project so its Compliance components, screens, hooks, services, lib code,
sidebar menu, and routes EXACTLY match SocialServe. Do **NOT** touch the database,
edge functions, RLS, auth providers, or `src/integrations/supabase/*`.

## Hard rules

- Source of truth for all Compliance UI = SocialServe project `455cbbae-c40e-4f3f-af49-d9ed99089948`.
- Use `cross_project--list_project_dir` and `cross_project--read_project_file` to read,
  then write the same path locally with `code--write`. Use `cross_project--copy_project_asset`
  for binary assets.
- Preserve `@/...` import aliases verbatim.
- Do NOT edit `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, or `.env`.
- Do NOT add any non-Compliance SocialServe modules, menus, or routes.
- Do NOT create migrations or change auth settings.

## Step 1 — Mirror Compliance code (recursive)

For each directory below, list it in the source project, then for every file
read it from SocialServe and write it to the same path locally. Replace existing
files. Recurse into all subdirectories.

- `src/pages/compliance/**`
- `src/components/compliance/**`
- `src/hooks/compliance/**`
- `src/services/compliance/**`
- `src/lib/compliance/**`

## Step 2 — Mirror sidebar menu

Replace `src/components/sidebar/menuItems/complianceMenuItems.ts` with the SocialServe
version. Keep the satellite's `DynamicSidebarContent` rendering ONLY `complianceMenuItems`.

## Step 3 — Mirror Compliance route map

Replace `src/pages/compliance/Routes.tsx` with the SocialServe version. After copying,
the satellite must support these canonical groups:

- `/compliance/workbench/*` (manager, inspector, legal, analytics, monitoring, queues, review-queue, reassignment)
- `/compliance/violations/*`
- `/compliance/cases/*`
- `/compliance/field/*` (plan-builder, plan-builder-v2, my-plans, pending-review, revisions-pending, execution, operations, inspections, audit-management, findings, employer-360, employer-statements, weekly-report*, sampling*)
- `/compliance/enforcement/*` (recommendation-queue, legal-queue, proceedings, notices, arrangements, breaches, waivers, legal-referral/new)
- `/compliance/reports/*`
- `/compliance/admin/*` (settings/*, geography/*, staff/*, automation/*, tools/*, communication-templates*, report-templates, document-foundation, online-response, risk-operations)
- All legacy redirects from the SocialServe `Routes.tsx`.

## Step 4 — Resolve dependencies (import sweep)

After the bulk copy, run a missing-import sweep. For every `@/...` import in the
copied files that does not exist locally, read it from SocialServe and write it
to the same path. Iterate until the project type-checks. Likely files include:

- `src/pages/audit/DocumentTemplateSettings.tsx` and any audit components/services it imports
  (the Compliance admin reuses it for `/admin/report-templates` and `/admin/document-foundation`)
- `src/lib/audit/**` files referenced by the audit document settings page
- `src/services/audit*` services referenced by copied components
- `src/config/legalConfig.ts`
- `src/types/violation.ts`, `src/types/violationActions.ts`, `src/types/violationNotes.ts`,
  `src/types/complianceSettings.ts`, `src/types/legal.ts`, `src/types/legalEscalation.ts`,
  `src/types/legalFinal.ts`, `src/types/legalReferralTypes.ts`, `src/types/inspectionTypes.ts`,
  and any other types referenced transitively
- Shared hooks used by Compliance: `src/hooks/useComplianceRole.ts`, `useComplianceCapability.ts`,
  `useComplianceWorkbench.ts`, `useEmployerComplianceSummary.ts`, `useAuditTrail.ts`,
  `useUserCode.ts`, `useBlockingMutation.ts`, `useDynamicNavigation.ts`
- Shared lib/utility files referenced by copied code: `src/lib/utils.ts`, `src/lib/format-config.ts`,
  `src/lib/statusColors.ts`, `src/lib/exportUtils.ts`, `src/lib/htmlToPdf.ts`, `src/lib/dateFormat.ts`,
  `src/lib/satelliteSso.ts`, `src/lib/runtimeEnvironment.ts`
- Shared contexts already present must remain: `SupabaseAuthContext`, `PIIMaskingContext`,
  `GlobalBlockingContext`, `SystemSettingsContext`, `ThemeContext`. If any are missing, copy them.

If a copied file references a SocialServe-only module (BN, C3, payments, etc.) that is
clearly NOT part of Compliance, prefer to remove that import and the dependent UI block.
Do NOT pull non-Compliance modules into the satellite.

## Step 5 — Preserve satellite app shell and SSO

Do NOT replace `src/App.tsx`. Confirm it still has, in this order:
1. `/auth/exchange` route (OUTSIDE `<ProtectedLayout>`) → `ExchangeCodePage`.
2. `/login` route → `SupabaseLoginScreen`.
3. `/` → `<Navigate to="/compliance/workbench/manager" replace />`.
4. `/compliance/*` wrapped in `<ProtectedLayout>` → `<ComplianceRoutes />`.
5. Catch-all `*` → `NotFound`.

If the SocialServe `Routes.tsx` redirects root to `/compliance/workbench`, ensure the
satellite's root `Navigate` points to `/compliance/workbench/manager` (the canonical
landing).

## Step 6 — Verification

- Type-check passes (no missing `@/...` imports).
- Sidebar shows the full Compliance menu identical to SocialServe.
- These routes render without runtime errors:
  - `/compliance/workbench/manager`
  - `/compliance/workbench/inspector`
  - `/compliance/workbench/legal`
  - `/compliance/violations`
  - `/compliance/cases`
  - `/compliance/field/plan-builder`
  - `/compliance/enforcement/legal-queue`
  - `/compliance/admin/settings/rule-engine`
  - `/compliance/admin/report-templates`
- `/auth/exchange?code=...` still redeems and lands on `/compliance/workbench/manager`.
- No database migrations were created; no edge functions were modified.
