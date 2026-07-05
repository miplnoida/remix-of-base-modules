# Domain Dependency Graph

> **Status:** Architecture only. No code, schema, routes, `app_modules`, menus, hooks, services, or feature-flag changes.
> Companion to `ENTERPRISE_DOMAIN_MODEL.md` and `DOMAIN_BOUNDARIES.md`.

---

## 1. Layered Dependency Order

Dependencies flow **downward only**. A lower layer must not depend on a higher one.

```text
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — Platform Foundation                                   │
│   Auth · RBAC · Audit · Numbering · Workflow · Notification ·   │
│   DMS · Scheduler · Feature Flags · API Gateway · Observability │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — Organisation                                          │
│   Tenant · Offices · Calendars · Org Roles · Org Document Types │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3 — Shared Enterprise Domains                             │
│   Location & Jurisdiction · Identity · Reference Data ·         │
│   Lookup Registry · Validation · Document · Payment             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4 — Social Security Platform (SSP core)                   │
│   Person · Employer · Scheme · Coverage · Contribution          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5 — Business Modules (Verticals)                          │
│   Benefits · Compliance · Legal · Finance                       │
│   (+ future: HRMS · Licensing · Prison Mgmt · DMS product)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6 — Products                                              │
│   Benefit Products · Contribution Products · Legal Products     │
│   Compliance Products · Finance Sub-ledgers                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 7 — Transactions                                          │
│   Applications · Claims · Filings · Cases · Orders · Journals   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 8 — Reporting & Analytics                                 │
│   Report Catalogue · Report Runs · Metrics · Dashboards         │
└─────────────────────────────────────────────────────────────────┘

Cross-cutting: Case Management (used by Layer 5), Integration
(used by all layers via Platform), Analytics (reads from all
producing layers).
```

---

## 2. Explicit Dependency Edges

| From (consumer) | To (owner) | Nature |
|---|---|---|
| Organisation | Platform Foundation | RBAC, Audit |
| Location | Platform Foundation | Storage, Audit |
| Identity | Location, Reference Data, Validation | Country-scoped ID rules |
| Reference Data | Location, Platform Foundation | Country scoping |
| Lookup Registry | All lookup-owning domains | Metadata only |
| Validation | Identity, Location, Reference Data | Rule composition |
| Document | Platform Foundation (DMS), Organisation | Engine + tenancy |
| Payment | Location, Person, Employer, Organisation, Platform Foundation | Country channels, party linkage |
| Person | Identity, Location, Reference Data, Validation, Document | Party master |
| Employer | Identity, Location, Reference Data, Validation, Document | Party master |
| Scheme | Location, Reference Data | Country- and code-scoped |
| Coverage | Person, Employer, Scheme, Location | Party × Scheme × Time |
| Contribution | Employer, Person, Scheme, Location, Reference Data, Payment | Filings & rates |
| Benefits | Person, Employer, Coverage, Scheme, Identity, Location, Legal, Document, Reference Data, Validation, Payment | Product + delivery |
| Finance | Contribution, Benefits, Payment, Organisation, Location | Money truth |
| Case Management | Platform Foundation, Organisation, Person, Employer | Generic case engine |
| Legal | Case Management, Reference Data, Person, Employer, Document, Payment | Matter lifecycle |
| Compliance | Case Management, Employer, Contribution, Legal, Document, Reference Data | Enforcement |
| Reporting | All source domains | Read-only |
| Analytics | All producing domains | Event/metric |
| Integration | Platform Foundation, all consuming domains | Mediation |

---

## 3. Cyclic Dependency Risks & Mitigations

| Risk | Where it appears | Why it is tempting | Mitigation |
|---|---|---|---|
| **Benefits ↔ Payment** | Benefit product wants to define new channels. | Product-specific channel behaviour. | Payment owns channels; Benefits **binds** allowed channels per product. |
| **Compliance ↔ Legal** | Compliance case escalates to Legal matter; Legal outcome updates Compliance. | Two-way lifecycle. | One-way write per direction: Compliance writes referral → Legal writes matter → Case Management brokers status via events. |
| **Contribution ↔ Coverage** | Coverage depends on Contribution accrual; Contribution needs Coverage window. | Chicken-and-egg. | Coverage is derived from Contribution events; Contribution reads Coverage only via a read model, never writes. |
| **Benefits ↔ Legal Refs** | Products cite statutes; statutes are versioned. | Product bindings to Legal Refs. | Legal Refs owned centrally (Reference Data / Legal); Benefits stores only citation IDs + version. |
| **Person ↔ Employer** | Same human as employee and self-employed. | Same underlying party. | Both consume Identity; neither owns the other. Coverage links them. |
| **Organisation ↔ Location** | Offices are addresses. | Address stored inside Office. | Office references an Address ID owned by Location. |
| **Case Management ↔ Verticals** | Vertical wants domain fields on the case. | Custom case attributes. | Vertical stores extension rows keyed by case ID, never mutates Case core. |
| **Reporting ↔ Everything** | Report needs write-back (e.g. mark as sent). | Convenience. | Write-back goes through owning domain's service, not directly to source table. |

---

## 4. Dependency Diagram (Mermaid)

See artifact: `Enterprise_Domain_Dependencies.mmd`.

---

## 5. Non-Goals

- No implementation, no schema, no code, no routes, no menus, no `app_modules`, no flags.
- No migration is triggered by this graph; it only documents legal edges.
