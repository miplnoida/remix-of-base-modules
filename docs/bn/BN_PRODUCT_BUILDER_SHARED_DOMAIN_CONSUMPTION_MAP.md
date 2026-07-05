# BN Product Builder — Shared Domain Consumption Map

**Status:** Draft — for review before resuming BN Product Builder.
**BN Product Builder:** ON HOLD until this map is signed off.
**Scope:** Non-functional. Documents where each Product Builder configuration area *should* source its data from once BN adopts the shared platform + shared-domain packs. No code refactor is done as part of this document.

---

## 1. Consumption Map (by Product Builder area)

| Product Builder Area | Canonical Source | Screen / Table | Notes |
|---|---|---|---|
| Country / jurisdiction | Geography Domain | `/admin/geography` — `ssp_country`, `ssp_admin_area` | Product versions bind to a country code; jurisdictional variants come from admin areas. |
| Currency | Financial Reference Domain | `/admin/financial-reference` — `ssp_currency` | Default KN currency `XCD`. |
| Identity requirements (accepted ID types) | Identity Domain | `/admin/identity` — `ssp_id_type`, `ssp_id_type_country` | Product declares which ID types are required/accepted, not its own list. |
| Member / participant eligibility | Participant Domain (read-only projection) | `/admin/participant` — `v_ssp_party_projection` | Consume via facade; do not read `bn_member*` directly from Product Builder. |
| Relationship eligibility (spouse/child/etc.) | Participant Domain | `ssp_relationship_type`, `ssp_party_relationship` | Product Builder chooses allowed relationship codes. |
| Payment channels | Financial Reference Domain | `/admin/financial-reference` — `ssp_payment_channel` | e.g., Bank Transfer, Cheque, Cash, Mobile Wallet. |
| Bank / clearing references | Financial Reference Domain | `ssp_bank`, `ssp_clearing_code` | Consumed when defining disbursement rules. |
| Legal basis (act / section) | Legal Reference Domain | `/admin/legal-reference` — `ssp_legal_act`, `ssp_legal_section`, `ssp_legal_reference` | Every benefit and rule cites a legal reference. |
| Country legal applicability | Legal Reference Domain | `ssp_country_legal_applicability` | Determines which acts apply per country/effective date. |
| Communication templates | Communication Domain + Platform Notification Templates | `/admin/communication-domain` (bindings) + `/admin/notification-templates` (bodies) | Product Builder references template bindings by correspondence type + channel, never inlines body text. |
| Correspondence legal notices | Communication Domain × Legal Reference | `ssp_correspondence_legal_ref` | Legal notices attached to benefit correspondence. |
| Recipient preferences | Communication Domain | `ssp_recipient_preference` (resolved via Participant facade) | Product Builder does not store contact preferences. |
| Document / evidence requirements | Document Domain / DMS | Existing DMS module | Product Builder declares required document type codes, not file storage. |
| Workflow / approval | Platform Workflow | `/admin/workflow-management`, `/admin/workflows` | Product Builder attaches workflow codes; does not define workflow engine behavior. |
| Numbering / sequences | Platform Numbering | `/admin/numbering` — `numbering_rules`, `reference_sequences` | Product versions request numbers via platform numbering. |
| Audit trail | Platform Audit | `/system-logs/audit` | Product Builder emits audit events through the platform audit service. |
| Calendar / working days / holidays | Organisation Foundation (Calendar & Holidays) | `/admin/calendar-holidays` | For payment run scheduling and effective-date arithmetic. |
| Roles & permissions | Platform People & Access | `/admin/roles` | No BN-local role table. |
| Benefit type catalogue | **BN-owned** | `bn_benefit_type`, `bn_benefit_class` | Kept BN-local. |
| Eligibility rules (age, contributions, waiting period) | **BN-owned** | `bn_eligibility_rule*` | BN business logic. |
| Formula / calculation rules | **BN-owned** | `bn_formula*`, `bn_rate_table*` | BN-local; consumes shared domain codes only as inputs. |
| Product versioning / lifecycle | **BN-owned** | `bn_product_version*` | Governed by BN version lifecycle policy. |
| Rate tables (contribution ceilings, benefit caps) | **BN-owned (values)** with Financial Reference currency | `bn_rate_table*` × `ssp_currency` | Amounts BN-owned; currency shared. |

---

## 2. Readiness Classification (per configuration field)

Legend:
- **READY** — shared domain exists and is populated for KN.
- **SEED-PENDING** — shared domain exists but needs KN seed data (or additional seeds).
- **MISSING** — shared domain not yet built.
- **BN-OWNED** — remains BN configuration; not a shared-domain concern.
- **LEGACY** — currently sourced from legacy table; migration to shared facade pending.

| Product Builder Field / Config | Classification | Source / Target | Notes |
|---|---|---|---|
| Country code | READY | `ssp_country` (KN default) | Bootstrapped in Epic 2.4A. |
| Administrative area (parish/island) | SEED-PENDING | `ssp_admin_area` | KN parishes/islands seed not yet loaded. |
| Currency | READY | `ssp_currency` (XCD seeded) | Epic 2.5A. |
| Accepted ID types | READY | `ssp_id_type` + `ssp_id_type_country` | Minimum KN ID types seeded (Epic 2.5A). |
| Member lookup (SSN) | READY (via facade) | `v_ssp_party_projection` | Read-only projection (Epic 2.6A). |
| Employer lookup (REGNO) | READY (via facade) | `v_ssp_party_projection` | Read-only projection (Epic 2.6A). |
| Relationship types | SEED-PENDING | `ssp_relationship_type` | Table exists; KN-specific relationship set needs confirmation. |
| Payment channels | READY | `ssp_payment_channel` | Basic channels seeded for KN (Epic 2.5A). |
| Bank list | SEED-PENDING | `ssp_bank` | KN bank list to be seeded from `src/data/bankData.ts`. |
| Clearing / routing codes | SEED-PENDING | `ssp_clearing_code` | Awaiting KN clearing scheme confirmation. |
| Legal act (chapter) | READY | `ssp_legal_act` (Cap 329 seeded) | Epic 2.5B; chapter number reconciliation flagged (Cap 25.09 vs Cap 329). |
| Legal section citation | READY (partial) | `ssp_legal_section` | 11 KN sections seeded; additional sections pending legal review. |
| Country legal applicability | READY | `ssp_country_legal_applicability` | Seeded in Epic 2.5B. |
| Correspondence type | READY | `ssp_correspondence_type` | Epic 2.7. |
| Communication channel | READY | `ssp_communication_channel` (Email, Portal active) | SMS / Letter placeholders inactive. |
| Template bindings (Email/Portal) | READY | `ssp_correspondence_template_binding` | 15 KN bindings active (Epic 2.7A). |
| Template bindings (SMS/Letter) | SEED-PENDING | `ssp_correspondence_template_binding` | `TODO_KN_SMS_*`, `TODO_KN_LETTER_*` placeholders. |
| Correspondence → legal notice mapping | READY | `ssp_correspondence_legal_ref` | 9 KN mappings activated (Epic 2.5B). |
| Recipient preferences | READY (demo) | `ssp_recipient_preference` | Real member/employer preferences via Participant facade; only demo rows currently. |
| Document type requirements | MISSING | Document Domain not yet built | Product Builder currently references legacy DMS types. |
| Document storage | LEGACY | Legacy DMS module | No structural change planned in this pass. |
| Workflow assignment | READY | Platform Workflow (`/admin/workflow-management`) | Existing platform capability. |
| Numbering rules | READY | Platform Numbering | Existing capability. |
| Audit trail | READY | Platform Audit | Existing capability. |
| Calendar / holidays | SEED-PENDING | Organisation Foundation → Calendar & Holidays | Screen present; KN holiday set to be confirmed. |
| Roles / permissions | READY | Platform People & Access | Existing capability. |
| Benefit type | BN-OWNED | `bn_benefit_type` | — |
| Eligibility rule (age / contributions / waiting) | BN-OWNED | `bn_eligibility_rule*` | — |
| Contribution ceilings | BN-OWNED | `bn_rate_table*` | Currency reference via `ssp_currency`. |
| Benefit formula | BN-OWNED | `bn_formula*` | — |
| Product version lifecycle | BN-OWNED | `bn_product_version*` | Governed by BN version lifecycle policy. |
| Effective date rules | BN-OWNED | BN engines | Consumes Calendar/Holidays from Organisation Foundation. |
| Legacy product configuration | LEGACY | Existing BN legacy tables | Not migrated; consumption map targets net-new product versions only. |

---

## 3. Non-goals for this pass

- No changes to `bn_*` tables.
- No changes to legacy Member / Employer / BEMA tables.
- No refactor of Product Builder screens.
- No new shared-domain screens.
- No changes to the notification template designer.

## 4. Prerequisites before resuming BN Product Builder

1. Sign-off on this consumption map.
2. Resolve **SEED-PENDING** items required for MVP scope:
   - KN administrative areas.
   - KN bank list.
   - Relationship type set.
   - Calendar/holidays for KN.
   - SMS/Letter template bindings (or explicit deferral).
3. Decision on **Document Domain**: build now vs. continue consuming legacy DMS during the first BN adoption wave.
4. Legal reconciliation: confirm chapter reference (`Cap 329` vs `Cap 25.09`) before any Product version cites a legal reference in production.

## 5. Rollback

This document is non-functional. No rollback required. If the map changes, revise this file and re-circulate for sign-off.
