# Enterprise Configuration Architecture

Status: Approved for KN implementation
Owner: Enterprise Architecture
Related: Enterprise Framework Blueprint, Common Consumption Model, Enterprise Registration Pipeline v1.0

## Purpose

Define the three configuration layers every product in the platform consumes, in
strict order, and clarify who owns each layer, who consumes it, and how change
flows across the stack. This document is the reference for any future decision
about where a piece of configuration belongs.

---

## 1. The three layers

### Layer 1 — Shared Domain Configuration

**Purpose:** Canonical reference libraries used by every module. These are
implementation-agnostic; the same domain is reused across countries, products
and modules.

**In scope:**

| Domain | Live route | Owning table prefix |
| --- | --- | --- |
| Geography | `/admin/geography` | `ssp_geo_*`, `ssp_admin_level`, `ssp_jurisdiction` |
| Identity | `/admin/identity` | `ssp_identity_*`, `ssp_party_identity` |
| Financial Reference | `/admin/financial-reference` | `ssp_bank*`, `ssp_currency_*`, `ssp_chart_of_account_ref` |
| Legal Reference | `/admin/legal-reference` | `ssp_legal_*`, `ssp_regulation`, `ssp_court_reference` |
| Participant / Party | `/admin/participant` | `ssp_party_*`, `ssp_participant_role`, `ssp_relationship_type` |
| Communication & Correspondence | `/admin/communication-domain` | `ssp_correspondence_*`, `ssp_communication_channel`, `ssp_recipient_preference` |
| Documents | (Document Domain — decision pending) | TBD |

**Owner:** Enterprise Architecture (shared domain custodians).
**Consumers:** All modules (BN, Compliance, IA, Legal, Cashiering, Registration).
**Change impact:** Cross-module. Requires enterprise architecture review.
**Governance:** Any structural change follows the Enterprise Registration Pipeline
v1.0. Additive data (new codes, aliases) can be seeded per country pack.

### Layer 2 — Enterprise Implementation Configuration

**Purpose:** Defines how *this* deployment operates. Choices made once for the
implementation (currently St. Kitts & Nevis) that all modules inherit.

**In scope:**

- Default country (KN)
- Organisation profile (offices, departments, designations, branding)
- Financial year & accounting periods
- Working calendar & holidays
- Default currency, timezone, locale
- Numbering policy (sequences, prefixes)
- Approval policy (maker–checker defaults, delegation)
- Communication policy (default channels, templates, recipient defaults)
- Document policy (retention, signature, storage)
- Audit policy (retention, sensitivity thresholds)

**Owner:** Platform Administration (implementation team, e.g. SSB KN).
**Consumers:** All modules through the Common Consumption Model.
**Change impact:** Implementation-wide. Requires platform admin approval and
change-window coordination.
**Governance:** Recorded in `core_configuration_assignment` and the Enterprise
Service Catalogue.

### Layer 3 — Module Configuration

**Purpose:** Business behaviour specific to one module or product. Consumes
Layer 1 and Layer 2 rather than redefining them.

**In scope:**

- Benefit product definitions, eligibility, formulas, rate tables
- Contribution requirements, filing periods
- Claim/appeal workflows, override policies
- Employer registration rules and validation config
- Compliance rules, risk bands, arrangement policies
- IA planning parameters, engagement templates
- Legal case types, routing rules, SLA policies

**Owner:** Module product owner (BN, Compliance, IA, Legal, etc.).
**Consumers:** The owning module and its downstream reports.
**Change impact:** Scoped to the module unless it references shared domain codes.
**Governance:** Module-specific approval flow; may reference Layer 1/2 items but
never redefines them.

---

## 2. Configuration order (bootstrapping rule)

Configuration MUST be applied top-down:

```text
Layer 1 (Shared Domains)
   |
   v
Layer 2 (Enterprise Implementation)
   |
   v
Layer 3 (Module Configuration)
```

A Layer 3 configuration that references a code, party role, template or bank
that has not been seeded in Layer 1/2 is invalid and MUST be rejected by the
Enterprise Registration Pipeline.

## 3. Ownership matrix

| Layer | Owner | Approver | Change ticket type |
| --- | --- | --- | --- |
| Shared Domain | Enterprise Architecture | Enterprise Architecture Board | Domain change request |
| Enterprise Implementation | Platform Administration | Implementation Sponsor | Implementation change request |
| Module | Module Product Owner | Module Steering Committee | Module change request |

## 4. Consumer map

| Consumer module | Reads Layer 1 | Reads Layer 2 | Owns Layer 3 |
| --- | --- | --- | --- |
| Benefits (BN) | All | All | Products, eligibility, formulas, awards, payments |
| Compliance (CE) | Geography, Identity, Legal, Financial, Participant, Communication | All | Risk, arrangements, audits, violations |
| Internal Audit (IA) | Geography, Identity, Legal, Communication | Calendar, org, numbering | Plans, engagements, findings |
| Legal (LG) | Legal, Identity, Participant, Communication | All | Matters, referrals, orders, recovery |
| Cashiering (CN) | Financial, Identity, Participant | Numbering, calendar | Batches, receipts, invoices |
| Registration (IP/ER) | Identity, Geography, Participant, Legal | Org, numbering, communication | Applicant screens, validation |

## 5. Change impact model

- **Layer 1 change** — Notify all consumers. Requires backwards-compatible
  additive migration + deprecation window for removals. Regression tests across
  all modules that read the affected domain.
- **Layer 2 change** — Notify all modules in this implementation. Schedule via
  change window. Update Enterprise Service Catalogue entry.
- **Layer 3 change** — Scoped to the module. Does not require enterprise sign-off
  unless it introduces new cross-module dependencies.

## 6. Approval & governance model

Every change is recorded through the Enterprise Registration Pipeline:

1. Draft — proposer records intent, layer, consumers.
2. Review — layer owner + affected consumers sign off.
3. Registration — added to `enterprise_capability_registry` /
   `core_configuration_assignment`.
4. Rollout — seed / migration applied per environment.
5. Verification — acceptance document filed under `docs/enterprise/` or the
   owning module's `docs/` folder.

## 7. Where each layer lives in the platform

- **Layer 1** — Left menu → *Shared Domains* group. Platform Admin card →
  *Shared Domains*.
- **Layer 2** — Left menu → *Administration → Organization Management*,
  *Configuration Center*, *Numbering*, *Notifications*, *Workflow*. Platform
  Admin cards → *Organisation*, *Platform Services*, *Security*, *Operations*,
  *Governance*.
- **Layer 3** — Owning module's own admin area (e.g. `/bn/config`,
  `/compliance/admin`, `/audit/settings`).

## 8. Non-goals

- This document does not define individual codes or values.
- It does not replace the domain packs; it sequences them.
- It does not change legacy tables (BEMA/IA/BN/legacy `ip_*`, `er_*`, `cl_*`,
  `cn_*`). Shared domain reads are additive via `ssp_*`.
