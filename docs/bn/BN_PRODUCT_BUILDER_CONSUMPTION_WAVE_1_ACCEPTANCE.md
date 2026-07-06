# BN Product Builder — Consumption Wave 1 Acceptance

**Date:** 2026-07-06
**Scope:** Existing BN Product Builder (`/bn/config/products/:id`) — no new page.
**Goal:** Consume SSB Platform v1.0 configuration through approved process
resolvers only, replacing local/hardcoded platform dropdowns while leaving
BN-owned areas (definition, eligibility, formula, rate tables, versioning)
untouched.

---

## 1. Approach

- No new Product Builder is created — `src/pages/bn/config/ProductEditor.tsx`
  is the only entry point and continues to work.
- No BN legacy table is altered structurally.
- Platform configuration is surfaced via a new read-only panel,
  `BnPlatformConsumptionPanel`, mounted directly under the version /
  conflict panels and above the tabs. The panel calls the frozen
  resolvers from `ssbBusinessProcessConfigService`:
  - `getBenefitAdministrationConfiguration()`
  - `getMemberRegistrationConfiguration()`
  - `getEmployerRegistrationConfiguration()`
  - `evaluateBenefitsReadiness()`
- Every platform-owned area is shown with its resolved status
  (Ready / Partial / Missing) and a deep link to the exact SSB Setup
  section (`/admin/ssb-setup?section=<key>`) or Configuration
  Governance (`/admin/configuration-governance`).

## 2. Platform-owned surfaces now consumed via resolvers

| Surface | Resolver output field | Deep link |
|---|---|---|
| Country / jurisdiction | Implicit in resolved config (KN profile) | `/admin/ssb-setup` |
| Identity requirements | `member.resolvedPolicies['identity']` | `?section=identity` |
| Payment channels / financial | `benefit.resolvedPolicies['financial']` | `?section=financial` |
| Legal references | `benefit.resolvedPolicies['legal']` | `?section=legal` |
| Documents | `benefit.resolvedPolicies['documents']` | `?section=documents` |
| Workflow / SLA | `benefit.resolvedPolicies['workflow']` | `?section=workflow` |
| Communication templates | `benefit.resolvedPolicies['communication']` | `?section=communication` |
| Numbering | `benefit.resolvedPolicies['numbering']` | `?section=numbering` |
| Contribution calendar | `benefit.resolvedPolicies['contribution_calendar']` | `?section=contribution` |

BN no longer instructs users to type or pick these values inside the
Product Builder — they are configured once in SSB Setup and consumed
here read-only.

## 3. BN-owned fields (unchanged)

The following remain fully editable in their existing tabs and continue
to write to BN-owned tables only:

- Product Definition (code, name, category, branch, payment type,
  status, sort order, description, scheme)
- Visual Builder
- Eligibility Rules
- Calculation (V2 panel + legacy visual builder / per-version rules)
- Timelines
- Documents (product-level document rules; consumes DMS document types
  from the platform)
- Workflow (per-product workflow config; consumes Workflow Engine
  templates from the platform)
- Screens
- Participant Workflow
- Public Form Rules
- Application Channels
- Communications (per-product template bindings; consumes canonical
  templates from the platform)
- Interactions
- Approval / Override Policies
- Preview
- Version History (create, clone-to-draft, activation, retirement)

## 4. Governance readiness visibility

The consumption panel renders `evaluateBenefitsReadiness()`:

- A single READY / NOT READY badge in the panel header.
- An expandable list of readiness reasons (process status, governance
  errors, etc.) when NOT READY.
- Direct link to `/admin/configuration-governance` for the full audit.

Existing activation guards in `ProductEditor.handleSave` (country
validity, `bn_product_can_activate` RPC) still apply and are unchanged.

## 5. Files touched

**Added**
- `src/components/bn/config/BnPlatformConsumptionPanel.tsx`
- `docs/social-security/SSB_PLATFORM_V1_FREEZE_CONTRACT.md`
- `docs/bn/BN_PRODUCT_BUILDER_CONSUMPTION_WAVE_1_ACCEPTANCE.md`

**Edited**
- `src/pages/bn/config/ProductEditor.tsx` — imports + mounts the panel
  above the tabs; no other structural change; no tab removed or
  reordered.

**Not touched**
- Any `bn_*` / `bema_*` / `ia_*` / legacy table or migration.
- BN service files (`productService`, `productVersionResolver`,
  `productCalculationLoader`, etc.).
- SSB policy tables, shared-domain tables, admin/setup/governance
  screens.

## 6. No duplicate screen

`BnPlatformConsumptionPanel` is strictly read-only. It surfaces resolver
output and links to the canonical SSB Setup / Governance screens. It
does not implement policy CRUD, validation runs, package publishing, or
any admin action.

## 7. No BN/BEMA/IA/legacy structural change

Confirmed. The wave adds one React component and one import in the
existing Product Builder page. No migrations, no schema changes.

## 8. Acceptance checklist

- [x] Existing Product Builder still opens for new and existing products.
- [x] Platform-owned options come from process resolvers only.
- [x] BN-owned tabs (definition, eligibility, calculation, timelines,
      documents, workflow, screens, participants, public rules,
      channels, communications, interactions, approval policies,
      preview, versions) remain editable and behaviour-preserving.
- [x] BN readiness banner visible on the product editor.
- [x] No duplicate Product Builder created.
- [x] No BN / BEMA / IA / legacy tables changed structurally.
- [x] Typecheck passes.
