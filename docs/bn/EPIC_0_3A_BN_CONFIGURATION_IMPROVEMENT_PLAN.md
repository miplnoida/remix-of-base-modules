# Epic 0.3A — BN Configuration Foundation Improvement Plan

_Prepared: 2026-07-05_
_Scope: **documentation and planning only** — no code, route, menu, schema, seed, `app_modules`, or feature-flag changes._
_Source: `docs/bn/EPIC_0_3_BN_CONFIGURATION_INVENTORY.md` (all evidence, row counts, and route/page references originate there and are not re-derived here)._

Canonical namespace: **`/bn/*`**. Live menu source: **`app_modules`**. Every action below is a proposal for a future implementation prompt; nothing in this document authorises an edit.

---

## 1. Ranking model

Priority buckets used throughout §3:

| Priority | Meaning |
|----------|---------|
| **P0** | Blocks Epic 0.4 (Product Builder). Must land before Product Builder work starts. |
| **P1** | Should land during Product Builder to avoid rework, but does not block kickoff. |
| **P2** | Post-Product-Builder hardening / cleanup. |
| **P3** | Cosmetic / consistency. |

Risk levels: **Low** (isolated UI or docs), **Medium** (touches shared schema, feature flags, or menu), **High** (touches formula/rule execution or payment behaviour).

---

## 2. Solid areas — preserve and regression-test only

Per the inventory, these areas are healthy. **No rebuild, no consolidation, no route churn.** They only require regression coverage when adjacent work lands.

| # | Area | Regression trigger |
|---|------|--------------------|
| 1 | Reference Data | Any schema change to `bn_reference_group` / `bn_reference_value` |
| 2 | Formula Library | Any Variable Registry consolidation (item I-1) or Product Builder wiring |
| 4 | Rule Catalogue | Product Builder rule-binding work |
| 6 | Screen / Field Library | Product Builder screen selection |
| 7 | Workbaskets | Escalation policy edits |
| 8 | Escalation | Workbasket edits |
| 9 | Reason Codes | Any transition-matrix edit |

Regression standard for each: **existing `/bn/config/*` route still loads, existing rows still render, existing edits still save.** No new tests are commissioned by this document; they are commissioned by the future implementation prompt.

---

## 3. Improvement backlog (Partial / Investigate items)

Every item below carries the eleven required fields.

---

### I-1 — Unified Variable Registry browser  ·  **P0**

- **Area:** Variable Registry (inventory §1.3)
- **Current route(s):** `/bn/config/derived-facts`, `/bn/config/product-parameters`, formula variables surfaced only inside the Formula editor.
- **Current page(s):** `DerivedFactRegistry.tsx`, `ProductParameterRegistry.tsx`, `FormulaConfiguration.tsx` (variable sub-view).
- **Current tables:** `bn_derived_fact` (31), `bn_derived_fact_event`, `bn_product_parameter` (56), `bn_product_parameter_event`, `bn_formula_variable_registry` (61).
- **Issue / gap:** Three parallel registries with three separate editors and no single browse-and-search surface. A rule/formula author cannot answer "does a variable already exist for X?" in one place.
- **Impact on Product Builder:** **High.** Product creation binds formulas → variables → derived facts. Without a unified browser, authors will create duplicate variables per product, poisoning the library from day one of Epic 0.4.
- **Recommended action:** Add a **read-only** `/bn/config/variables` landing page that unions the three registries into a single searchable/filterable table (Source column: Derived Fact / Product Parameter / Formula Variable), with deep-links to the existing editors. Do **not** merge tables; do **not** move existing routes.
- **Risk:** Low — additive read-only page.
- **Priority:** **P0** (Product Builder blocker).
- **Implementation dependency:** None. Uses existing three tables.
- **Acceptance criteria (for future code prompt):**
  1. New route `/bn/config/variables` registered under `bn.config.rules`, added as an `app_modules` row (canonical only, no legacy namespace).
  2. Page lists all three sources, correct row counts on load match `select count(*)` from each table.
  3. Every row deep-links to the existing editor for its source.
  4. No writes; existing three editors remain unchanged.
  5. Duplicate-name warning banner across the three sources when names collide (case-insensitive).

---

### I-2 — Document Library seed / catalogue completeness  ·  **P0**

- **Area:** Document Library (§1.5)
- **Current route(s):** `/bn/config/document-setup`, `/bn/config/service-doc-types`.
- **Current page(s):** `DocumentSetup.tsx`, `ServiceDocTypes.tsx`.
- **Current tables:** `bn_document_profile` (1 row), `bn_claim_document`, `bn_external_task_document`.
- **Issue / gap:** `bn_document_profile` has **only 1 row**. Product Builder needs a real catalogue of document types (proof of age, medical certificate, employer confirmation, life certificate, funeral invoice, etc.) to attach to products.
- **Impact on Product Builder:** **High.** Every benefit product requires document requirements. Empty catalogue → each product author invents one-off types → schema drift.
- **Recommended action:** Publish a **seed proposal** (list of document types with code, label, category, retention policy, mandatory-by-default flag) for review, then load via a dedicated seed migration. **This document proposes the seed; it does not add the migration.**
- **Risk:** Low (seed) / Medium if any type is misclassified.
- **Priority:** **P0**.
- **Implementation dependency:** Business sign-off on the seed list. Coordinate with DMS ownership matrix (Platform Ownership Matrix).
- **Acceptance criteria:**
  1. Seed list reviewed and approved by BN + DMS owners.
  2. Post-seed `bn_document_profile` row count ≥ 20 covering short-term, long-term, and medical benefits.
  3. Every seeded row references a valid category and retention policy already used elsewhere in the system.
  4. `DocumentSetup.tsx` renders all seeded rows without pagination bugs.

---

### I-3 — Duplicate `/bn/config/communication-templates` route ownership  ·  **P0**

- **Area:** Notification Mappings (§1.10)
- **Current route(s):** `/bn/config/communication-templates` is registered **twice** (`AppRoutes.tsx` L2176 as `<Navigate>` and L2373 as `<BnBenefitCommunicationTemplates>`).
- **Current page(s):** `BenefitCommunicationTemplates.tsx` (BN) + shared `/admin/notification-templates` (Platform).
- **Current tables:** Owned by shared notifications module; no dedicated `bn_notification_*` table exists.
- **Issue / gap:** Route order means the redirect at L2176 wins; the BN page at L2373 is dead code. Ownership between BN and Platform Notifications is ambiguous.
- **Impact on Product Builder:** **Medium.** Product Builder needs to know which surface authors use for BN letter templates. Ambiguity means duplicate authoring UIs.
- **Recommended action:** Decision needed — pick **one** owner. Two options:
  - **Option A (recommended):** Platform Notifications owns all templates. Delete the L2373 BN registration (per one-release retirement policy). Keep the L2176 `<Navigate>` shim. `BenefitCommunicationTemplates.tsx` retained on disk one release, then deleted.
  - **Option B:** BN owns benefit-specific templates. Remove the L2176 `<Navigate>`, register the BN page canonically, and document a data-sync contract with Platform.
- **Risk:** Medium — affects which surface authors land on.
- **Priority:** **P0** (ownership must be settled before Product Builder wires template selection).
- **Implementation dependency:** Confirm owner in Platform Ownership Matrix (`docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`).
- **Acceptance criteria:**
  1. Only one route registration for `/bn/config/communication-templates` after the decision.
  2. If Option A: any deep-link with `module=BENEFITS` opens Core Template Designer pre-filtered.
  3. If Option B: `BnBenefitCommunicationTemplates.tsx` reads from and writes to the same underlying template store as Platform (no divergent table).
  4. `app_modules` row for this entry points at the winning route with no legacy alias.

---

### I-4 — Medical Policy seed / catalogue completeness  ·  **P1**

- **Area:** Medical Policy (§1.11)
- **Current route(s):** `/bn/config/medical` + 7 sub-pages.
- **Current page(s):** 8 medical config pages.
- **Current tables:** 15 `bn_medical_*` tables. Key row counts: `bn_medical_procedure` (3), `bn_medical_tariff_table` (1), `bn_medical_authorization_rule` (3).
- **Issue / gap:** Full surface, rich schema, but seed data is **too thin to bind to real medical products** (procedures, tariffs, and authorisation rules are effectively empty).
- **Impact on Product Builder:** **Medium.** Only medical-benefit products need this. Non-medical products (age, survivors, funeral, unemployment) can be built without it.
- **Recommended action:** Publish a **phased seed proposal** aligned with `docs/bn/medical-engine-audit.md`. Phase A: procedures + expense types + tariff v1. Phase B: authorisation and referral rules. Phase C: facility availability matrix.
- **Risk:** Medium — clinical/actuarial content must be validated.
- **Priority:** **P1** (only blocks medical-benefit rollout in Product Builder, not the whole builder).
- **Implementation dependency:** Clinical review + tariff sign-off.
- **Acceptance criteria:**
  1. Phase A seed approved and loaded; `bn_medical_procedure` ≥ 50, `bn_medical_tariff_table` ≥ 1 populated with rows.
  2. All 8 medical config pages render seeded data with no console errors.
  3. Existing formula bindings that reference medical variables still resolve (regression via `scripts/bn/run-formula-resolution.ts`).

---

### I-5 — Payment Masters location / ownership  ·  **P3**

- **Area:** Payment Masters (§1.12)
- **Current route:** `/bn/config/payment-masters`.
- **Current page:** `src/pages/bn/admin/PaymentMasters.tsx` (lives under `admin/`, not `config/`).
- **Current tables:** `bn_country_payment_config` (7), `bn_country_payment_cycle_method`, `bn_product_channel_config`.
- **Issue / gap:** Page file lives in a directory that implies a different ownership than every other Configuration Foundation page. Cosmetic drift; no runtime impact.
- **Impact on Product Builder:** **Low.** Route works; only file-tree navigation is affected.
- **Recommended action:** Move `src/pages/bn/admin/PaymentMasters.tsx` → `src/pages/bn/config/PaymentMasters.tsx` in a dedicated micro-PR. Update its single import in `AppRoutes.tsx`. Keep the same route path, same feature flag (`bn.payments`), same `app_modules` row.
- **Risk:** Low.
- **Priority:** **P3** (cosmetic).
- **Implementation dependency:** None.
- **Acceptance criteria:**
  1. `git mv` moves the file; import path updated in exactly one place.
  2. `/bn/config/payment-masters` still resolves and renders identical UI.
  3. No `app_modules` change, no menu change.

---

### I-6 — Legal Reference linkage to product / rule level  ·  **P2**

- **Area:** Legal References (§1.13)
- **Current route:** `/bn/config/country/legal-refs` (country-scoped only).
- **Current page:** `config/country/CountryLegalRefs.tsx`.
- **Current tables:** `bn_legal_reference` (42), `bn_country_legal_ref` (42).
- **Issue / gap:** Legal references are attachable to a country but **not** to a product, rule, or formula version. Product Builder cannot cite "the section of the Act that authorises this benefit."
- **Impact on Product Builder:** **Medium.** Nice-to-have on day one; required for audit/compliance sign-off.
- **Recommended action:** In a **future** schema prompt (not this one), propose join tables `bn_product_legal_ref` and `bn_rule_legal_ref`, plus a small "Legal citations" panel embedded in Product editor and Rule editor. **This document only proposes the shape; it does not add the migration.**
- **Risk:** Medium — new tables + grants + RLS review.
- **Priority:** **P2** (after Product Builder v1 works end-to-end).
- **Implementation dependency:** Compliance module owner approval; alignment with `docs/legal/*` naming.
- **Acceptance criteria:**
  1. Proposed schema (product/rule ↔ legal ref join tables) reviewed by BN + Compliance owners.
  2. Product editor exposes a Legal Citations tab reading the new join table.
  3. `bn_legal_reference` remains the single legal-text store (no duplication into product rows).

---

### I-7 — Feature-flag grouping for config pages  ·  **P1**

- **Area:** Cross-cutting (§2 observation 1)
- **Current state:** Nearly all `/bn/config/*` routes share the single flag `bn.config.rules`. `/bn/config/payment-masters` uses `bn.payments`. `/bn/config/communication-templates` (BN copy) uses `bn.config.rules` despite storing data in the shared notifications module.
- **Issue / gap:** One mega-flag makes staged rollout impossible. Toggling `bn.config.rules` off hides Reference Data, Formulas, Rules, Screens, Documents, Workbaskets, Escalation, Reason Codes, Country pack, and Medical Policy in one shot.
- **Impact on Product Builder:** **Medium.** Product Builder rollout will need to switch on some config surfaces without exposing incomplete ones (e.g. Medical Policy before its seed is loaded).
- **Recommended action:** Propose a flag decomposition (documentation only for now):
  - `bn.config.reference` — Reference Data
  - `bn.config.formulas` — Formula Library, Variable Registry, Engine
  - `bn.config.rules` — Rule Catalogue, Transitions, Reason Codes (keep name)
  - `bn.config.documents` — Document Library, Service Doc Types
  - `bn.config.screens` — Screen / Field Library
  - `bn.config.workflow` — Workbaskets, Role Bundles, Delegations, Escalation
  - `bn.config.medical` — all Medical Policy pages
  - `bn.config.country` — Country pack + Legal Refs
  - `bn.payments` — Payment Masters (unchanged)
- **Risk:** Medium — every gate site needs auditing to avoid accidental lockouts.
- **Priority:** **P1**.
- **Implementation dependency:** Registered flag catalog in `src/lib/bn/featureToggles.ts`; ensure default = current value of `bn.config.rules` so nothing changes on rollout.
- **Acceptance criteria:**
  1. New flags default to the same effective value as `bn.config.rules` for existing environments (no lockouts).
  2. Every `/bn/config/*` route uses its area-specific flag; `bn.config.rules` narrowed to Rule Catalogue only.
  3. `docs/bn/permission_feature_flag_matrix.md` updated.
  4. `bn.config.rules` is not deleted; it remains as an umbrella for backward compatibility for one release.

---

### I-8 — Validation requirements before Product Builder  ·  **P0 (gate)**

- **Area:** Cross-cutting readiness gate
- **Current state:** No published pre-flight check exists that a product author can run to confirm all foundations are ready.
- **Issue / gap:** Product Builder (Epic 0.4) will silently fail if Formula Library, Variable Registry, Reference Data, Documents, Screens, Reason Codes, Workbaskets, Escalation, or Payment Masters have missing catalog rows.
- **Impact on Product Builder:** **Blocking.**
- **Recommended action:** Reuse the existing `/bn/config/calculation-readiness` and `/bn/config/validation` surfaces (already present per inventory §1.2) and extend their check-list — in a **future** prompt — with a "Product Builder Readiness" section that verifies:
  - `bn_reference_group` count > 0 and `bn_reference_value` count > 0
  - `bn_formula_template` count > 0 and every formula has at least one `bn_formula_version`
  - Unified Variable Registry (item I-1) shows zero cross-source duplicate names
  - `bn_document_profile` count ≥ 20 (item I-2)
  - `bn_reason_code` count > 0
  - `bn_workbasket` count > 0 and every workbasket has ≥ 1 role
  - `bn_escalation_policy` count > 0 and every policy has ≥ 1 level
  - `bn_country_payment_config` populated for the tenant's country
  - Medical Policy checks (item I-4) surface as warnings, not errors, when only non-medical products are planned
- **Risk:** Low — read-only validation view.
- **Priority:** **P0** (gate).
- **Implementation dependency:** Items I-1 and I-2 land first; item I-4 needed only for medical-benefit go-live.
- **Acceptance criteria:**
  1. `/bn/config/calculation-readiness` (or a sibling) shows a **"Product Builder Ready"** badge only when all P0 checks pass.
  2. Every failing check links to the exact `/bn/config/*` page that fixes it.
  3. Screen is read-only; it never mutates configuration.

---

## 4. Ranked backlog summary

| ID | Item | Priority | Risk | Blocks Epic 0.4? |
|----|------|----------|------|:----------------:|
| I-1 | Unified Variable Registry browser | P0 | Low | **Yes** |
| I-2 | Document Library seed / catalogue | P0 | Low–Med | **Yes** |
| I-3 | Communication Templates ownership | P0 | Med | **Yes** |
| I-8 | Product Builder readiness view | P0 | Low | **Yes (gate)** |
| I-4 | Medical Policy seed | P1 | Med | Only medical products |
| I-7 | Feature-flag decomposition | P1 | Med | No, but avoids rework |
| I-6 | Legal Reference product/rule linkage | P2 | Med | No |
| I-5 | Payment Masters file relocation | P3 | Low | No |

---

## 5. Explicit pre-conditions for Epic 0.4 — Product Builder

Epic 0.4 must **not** start until every item in this list is true:

1. **I-1 shipped.** `/bn/config/variables` unified browser live; duplicate-name warnings visible.
2. **I-2 shipped.** `bn_document_profile` seed ≥ 20 rows loaded and rendering.
3. **I-3 decided and shipped.** Exactly one `/bn/config/communication-templates` route registration.
4. **I-8 shipped.** Product Builder Readiness view green for the target tenant's non-medical scope.
5. All Solid areas (§2) pass their regression checks after items 1–4 land.
6. `docs/bn/EPIC_0_3A_BN_CONFIGURATION_IMPROVEMENT_PLAN.md` (this document) is closed out with each P0 item marked "shipped".

Medical-benefit products additionally require **I-4** and the medical branch of **I-8** to be green.

Nothing else in the backlog blocks Epic 0.4 kickoff.

---

## 6. Explicit non-goals of this document

- No code, route, schema, seed, migration, RLS policy, grant, `app_modules` row, or feature-flag toggle is introduced.
- No Solid area is touched.
- No page is deleted, moved, or renamed.
- No decision on Option A vs Option B for I-3 is made here — the decision is required, but the decision itself belongs to the ownership matrix.
- No timeline or estimate is committed; only ordering and dependencies.
