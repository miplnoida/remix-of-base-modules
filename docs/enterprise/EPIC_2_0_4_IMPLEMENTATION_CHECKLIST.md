# Epic 2.0.4 — Enterprise Implementation Checklist

**Applies to**: every implementation delivered in this repository — framework, shared domain, module, facade, screen, capability. Non-optional.

**How to use**: copy this checklist into the epic's acceptance document (`docs/enterprise/EPIC_<n>_<slug>_ACCEPTANCE.md`) and tick every box. An epic is not complete until every applicable box is ticked or explicitly marked `N/A — <reason>`.

---

## A. Discovery (Pipeline P1)

- [ ] A1. Repository inspection performed (existing screens, routes, tables, services, hooks listed).
- [ ] A2. Reuse map produced — canonical assets identified for every requested capability.
- [ ] A3. Legacy map produced — BEMA / `tb_*` / `ip_*` / `er_*` / `cl_*` / `cn_*` / `au_*` / `ia_*` / `lg_*` / `bema_*` tables in scope listed.
- [ ] A4. Duplicate risks enumerated and mitigated (parallel screens, tables, services, hooks explicitly rejected).
- [ ] A5. Governance touchpoints logged: BEMA impact? static menu risk? screen duplication risk? enterprise-core dependency? organisation dependency?

## B. Architecture validation (Pipeline P2)

- [ ] B1. Canonical owner declared (Platform / Enterprise Core / Organisation / Shared Domain / Business Application).
- [ ] B2. Framework dependencies declared (Reference Framework, MDP, Organisation Foundation, Common Consumption Model, others).
- [ ] B3. Consumers declared (which products / modules will consume this).
- [ ] B4. Route + menu placement declared (parent `app_modules` id + intended `sort_order`).
- [ ] B5. Permission vocabulary declared (subset of view / manage / admin / approve / retire / import / export with rationale).
- [ ] B6. Roles that receive grants declared (Admin + Application Admin always; +role-owner if applicable).
- [ ] B7. Facade / hook surface declared per Common Consumption Model.
- [ ] B8. Adapter view(s) declared for any legacy compatibility, or `N/A — no legacy touch`.
- [ ] B9. Rollback plan drafted (must be a single reversible SQL/code block).

## C. Reuse & duplication gates

- [ ] C1. No duplicate screens introduced (each canonical page has one shell).
- [ ] C2. No duplicate tables introduced (canonical table reused; new tables are additive only).
- [ ] C3. No duplicate services introduced (facades reused per Common Consumption Model).
- [ ] C4. No duplicate hooks introduced.
- [ ] C5. No new static menu file relied on; menu lives in `app_modules` only.

## D. Compatibility gates

- [ ] D1. BEMA compatibility — no structural change; adapter view only, if any. If any BEMA touch, `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` updated **before** execution.
- [ ] D2. Enterprise Core compatibility — Reference Framework, MDP, Platform Admin, Common Consumption Model rails respected.
- [ ] D3. Organisation compatibility — Organisation Foundation shell reused for any org-scoped surface.
- [ ] D4. Consumption compatibility — all shared reads/writes go through canonical facades; no direct table access from new module code.

## E. Registration (Pipeline P3, idempotent SQL)

- [ ] E1. `enterprise_capability_registry` row upserted with `capability_key`, category, grouping, owner, initial `status`, `version`, routes, menu module, permission hint, consumers[], dependencies[], docs/architecture/acceptance links, health flags.
- [ ] E2. `app_modules` row inserted (fixed UUID) with correct `parent_id`, `route`, `icon`, `sort_order`, `is_enabled=true`, `show_in_menu` as intended, `routes_enabled=true`, `actions_enabled=true`.
- [ ] E3. `module_actions` rows inserted for the declared permission vocabulary.
- [ ] E4. `role_permissions` grants inserted for `Admin` + `Application Admin` (+role-owner) via `NOT EXISTS` guard.
- [ ] E5. Any new table CREATE followed by `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;` + `GRANT ALL ON public.<t> TO service_role;` (+ `GRANT SELECT … TO anon` only if publicly readable).

## F. Implementation (Pipeline P4)

- [ ] F1. Route(s) registered in `src/components/routing/AppRoutes.tsx` (lazy + Suspense).
- [ ] F2. Canonical shell reused; new tabs/leaves added inside canonical shell when applicable.
- [ ] F3. Facade(s) added under `src/services/…` and hook(s) under `src/hooks/…`, exported through the shared barrel.
- [ ] F4. Legacy redirects added instead of parallel routes where the legacy path is user-known.
- [ ] F5. Additive schema only; adapter views (`v_*`) used for any legacy read compatibility.

## G. Verification (Pipeline P5)

- [ ] G1. Menu visibility verified: `app_modules` row `is_enabled=true`, `show_in_menu` as intended, no static menu dependency.
- [ ] G2. Permission wiring verified: every declared action has `module_actions` + `role_permissions` grants for Admin + Application Admin.
- [ ] G3. Current-user access verified using the standard query (Automation Guide §3.4): at least one active admin user inherits every declared action through role mapping.
- [ ] G4. Route health verified: every new route resolves; no parallel/duplicate route registered.
- [ ] G5. Platform Admin visibility verified where applicable: capability appears in Enterprise Service Catalogue and in the relevant Platform Admin group card.
- [ ] G6. Breadcrumb verified: page uses `PageHeader` with correct breadcrumb chain (Home → Administration → Platform → …).
- [ ] G7. Governance verified: no BEMA structural change, no static menu edit, no duplicate screen, no duplicate table, no duplicate service/hook.

## H. Publish (Pipeline P6)

- [ ] H1. Acceptance document created at `docs/enterprise/EPIC_<n>_<slug>_ACCEPTANCE.md` (or `docs/social-security/…`) with every checkbox in this file ticked.
- [ ] H2. `enterprise_capability_registry` updated: `status='active'`, `version` bumped, health flags flipped to `green` where verified, `overall_health` computed.
- [ ] H3. Consumers list updated on affected registry rows as each product adopts the capability.
- [ ] H4. Rollback block published inside the acceptance document.
- [ ] H5. Implementation summary in the epic's final chat response covers: capabilities registered, menu changes, permission changes, current-user verification, Platform Admin verification, next steps.

## I. Retire (Pipeline P7, only when applicable)

- [ ] I1. `enterprise_capability_registry.status='deprecated'`; successor `capability_key` recorded.
- [ ] I2. `app_modules.is_enabled=false`, `show_in_menu=false`; row **not** deleted (preserves `role_permissions` history).
- [ ] I3. Adapter views left in place until all consumers migrate; migration plan recorded.
- [ ] I4. Retirement rationale in acceptance document.

---

## Definition of Done for the epic

An epic is Done when:

- Every applicable box in sections A–H is ticked.
- The acceptance document contains the completed checklist (not just a link to this file).
- The final chat response confirms current-user access without manual SQL.
