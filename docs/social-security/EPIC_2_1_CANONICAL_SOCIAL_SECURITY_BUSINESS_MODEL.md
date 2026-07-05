# Epic 2.1 — Canonical Social Security Business Model

Status: Planning only (no code, schema, routes, menus, app_modules or permissions).
Governs: Enterprise Registration Pipeline v1.0, Enterprise Framework Blueprint, Common Consumption Model.
Companions: `EPIC_2_1_BUSINESS_ENTITY_CATALOGUE.md`, `EPIC_2_1_ENTITY_RELATIONSHIP_MAP.md`, `EPIC_2_1_IMPLEMENTATION_SEQUENCE.md`.

## 1. Purpose

Define the canonical business entities that every Social Security module (Contributions, Benefits, Employer, Compliance, Case Management, Payments, Appeals, Recovery, Investigation) must consume through shared facades — not by direct legacy table reads.

This epic does not create tables. It classifies what already exists in the repository, names the canonical owner for each business concept, and sequences the adoption work.

## 2. Repository Inventory (as observed)

Legacy BEMA tables (protected — no structural change, adapter views only):
- `ip_*` — Insured Person master, wages, dependants, verification, self-employed history.
- `er_*` — Employer master, locations, owners, commence, notes, documents.
- `cn_*` — Contributions ledger: receipts, batches, C3 reported/missing, journals, arrears, refunds.
- `tb_*` — Country reference tables (currencies, addresses, IDs, etc.).

Modern domain tables:
- `bn_*` — Benefits: claim, award, entitlement, payment_instruction, eligibility, formula, medical, cheque, EFT, communication.
- `lg_*` — Legal / Case Management: case, intake, party, assignment, deadline, action, appeal, arrangement.
- `core_*` — Enterprise Core: organization, department, team, reference_value, number_sequence, template, document_profile, payment_arrangement, ledger_head, legal_reference, communication_profile.

Modern UI surfaces already present:
- Contributions: `pages/c3Management/*`, `pages/cashier`, `services/*` for cn_ ledger.
- Benefits: `pages/bn`, `pages/newBenefit`, `pages/nbenefit`, `portals/claimant/benefits`.
- Employer: `pages/employer`, `pages/employersManagement`, `pages/employer-registration`, `portals/employer`.
- Compliance: `pages/compliance/*`, `components/compliance`, `components/bema/compliance`.
- Case Management / Legal: `pages/legal`, `pages/legalFinal`, `pages/legal-advanced`.
- Payments: `pages/c3Management/payments`, `components/payments`, `components/core/payment-arrangements`.

## 3. Classification Model

Every business concept below is tagged with:
- **Canonical** — a single authoritative implementation exists and is (or will become) the shared source.
- **Reusable** — an implementation exists that can be adopted as-is via a facade.
- **Duplicate** — the same business concept is expressed in more than one place; consolidation required.
- **Legacy** — lives in BEMA (`ip_*`, `er_*`, `cn_*`, `tb_*`); must be surfaced through adapter views, never rewritten.
- **Missing** — no implementation; a canonical owner and future additive plan is required (later epic).

Details per entity are in `EPIC_2_1_BUSINESS_ENTITY_CATALOGUE.md`.

## 4. Canonical Ownership Principles

1. Each business entity has exactly one canonical owner domain.
2. Consumers read the entity only through the owner's shared hook / view — never by touching legacy tables directly.
3. Legacy BEMA tables remain the system of record where already authoritative (Member, Employer, Contribution ledger). Adapter views (`v_member`, `v_employer`, `v_contribution_period`, `v_contribution_receipt`) become the shared surface.
4. New concepts with no legacy home (Scheme, Scheme Membership, Contribution Type, Benefit Product, Benefit Category, Appeal, Recovery, Investigation) are owned by the new Social Security shared domain — additive tables to be proposed in a later epic, never inside BEMA.
5. Overrides are stored in module-specific binding tables. The canonical master is never duplicated.

## 5. Governance Boundaries

- No parallel screens: existing shells (Organisation Management, Platform Admin, Case Workspace, Employer Workspace) are reused.
- No static menus: all navigation stays `app_modules` driven.
- No BEMA structural change: any impact requires `BEMA_LEGACY_TABLE_IMPACT_NOTE.md` first.
- All future capabilities register in `enterprise_capability_registry`.
- All shared reads go through facades listed in `EPIC_2_0_3_COMMON_CONSUMPTION_MODEL.md`.

## 6. Deliverables

| Document | Purpose |
|---|---|
| `EPIC_2_1_BUSINESS_ENTITY_CATALOGUE.md` | Entity-by-entity classification, owner, consumers, dependencies. |
| `EPIC_2_1_ENTITY_RELATIONSHIP_MAP.md` | ASCII relationship map across canonical entities. |
| `EPIC_2_1_IMPLEMENTATION_SEQUENCE.md` | Ordered adoption plan aligned to Phase 2 waves. |

## 7. Acceptance

- No implementation changes made.
- Existing repository inventoried before any canonical claim.
- Canonical ownership defined for every listed entity.
- Duplicate business concepts named explicitly.
- Implementation sequence established and aligned with the Phase 2 Programme.
