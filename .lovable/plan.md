# Plan: Full Module & Screen Inventory (with Master vs Other classification)

## Goal
Produce a single, easy-to-share document that lists **every module** in the platform, **every screen** within each module, and **classifies each screen** by type (Master, Transactional, Reporting, Configuration, Workflow/Approval, Admin/Security, Dashboard, Utility).

## Initial Headcount (from sidebar definitions)
Quick scan of `src/components/sidebar/menuItems/*.ts` shows ~30 menu files and roughly **620+ navigable screens** across all modules. Exact per-module counts will be confirmed in the doc.

| Module file | Routes (approx) |
|---|---|
| Internal Audit | 19 |
| BeMA Compliance (legacy) | 13 |
| Benefits (legacy) | 9 |
| BN — Benefits Management (current) | 30 |
| C3 Contributions | 44 |
| Cashier / Payments | 32 |
| Compliance & Enforcement | 100 |
| Correspondence | 6 |
| Dashboard | 1 |
| Document Management | 3 |
| Employer Registration | 5 |
| Employers Management | 2 + 45 (employersMenuItems) |
| Finance | 37 |
| Insured Persons | 26 |
| Legal (Final / Management / Original) | 4 + 19 + 11 |
| Master Data | 34 |
| Medical | 4 |
| New Benefit (nbenefit / newBenefit) | 62 + 17 |
| Notifications | 8 |
| Registration | 4 |
| Reports | 8 |
| Self-Employed | 3 |
| SSB Legal | 7 |
| System Administration | 49 |
| Users | 17 |

These are raw route counts; the doc will deduplicate, mark legacy menus as deprecated, and report a clean active total.

## Deliverable
**`/mnt/documents/SecureServe_Module_Screen_Inventory_v1.docx`** — Word document, delivered as a downloadable artifact.

It will contain:

1. **Cover page** (Misha Infotech branding).
2. **Executive summary** — total active modules, total screens, breakdown by classification (counts + % chart).
3. **Classification legend** — what each type means:
   - **Master** — reference/lookup data maintenance (e.g., Offices, Departments, Banks, Lookups).
   - **Transactional** — day-to-day data entry/processing (e.g., Invoices, C3 Filings, Claims).
   - **Workflow / Approval** — maker-checker, approval queues, escalations.
   - **Configuration** — module settings, rules, templates, number formats.
   - **Reporting** — reports, exports, analytics screens.
   - **Dashboard** — KPI/overview screens.
   - **Admin / Security** — roles, permissions, audit trail, IP access, system logs.
   - **Utility / Tool** — diagnostics, demos, help, document proxy, etc.
4. **Per-module chapter** (one per module). Each chapter contains a single table:

   | # | Screen Title | Route | Type | Notes |
   |---|---|---|---|---|
   | 1 | Office Master | /master-data/offices | Master | Source for tb_offices |
   | 2 | Invoice Entry | /cashier/invoice/new | Transactional | Atomic locks |
   | … | … | … | … | … |

   Each chapter ends with a small summary line: *"Total screens: N — Master: x, Transactional: y, Workflow: z, Config: c, Reports: r, Admin: a, Dashboard: d, Utility: u."*
5. **Cross-module summary table** — every module on one row with the same counts, plus grand totals.
6. **Appendix A — Legacy / Deprecated menus** (e.g., BeMA Compliance, legacy Benefits, legacy Legal) with note that they're superseded.
7. **Appendix B — Method** — sources used (sidebar files, `src/pages`, `src/config/routes.ts`), classification rules, and how a future regeneration can be automated.

## How It Will Be Generated
1. Parse all `src/components/sidebar/menuItems/*.ts` to extract `{ title, url, description }` for every leaf entry, including nested `subItems` and `items`.
2. Cross-reference with `src/config/routes.ts` and `src/pages/*` to catch screens not in the sidebar.
3. Tag each screen with a Type using:
   - URL pattern (e.g., `/master-data/*` → Master, `/reports/*` → Reporting, `/admin/*` → Admin, `/*/config*` or `/*/settings*` → Configuration, `/*/dashboard` → Dashboard).
   - Title keywords (Master, Configuration, Settings, Templates, Rules, Approval, Queue, Report, Export, Dashboard, Audit, Roles, Permissions).
   - Manual override list for known special cases.
4. Generate the `.docx` with `docx-js` (US Letter, Arial, proper Heading styles, auto TOC, branded cover, light-shaded tables with DXA widths).
5. QA: convert to PDF, render each page to image, inspect for layout/overflow, fix, re-export.
6. Save to `/mnt/documents/` and emit `<lov-artifact>`.

## Out of Scope
- Per-screen field lists, workflow diagrams, or screenshots (this is an inventory, not a user manual — those can be a follow-up doc).
- Database table mapping per screen.

## Open Question (non-blocking — I'll assume "Yes" unless you say otherwise)
Include legacy/deprecated menus (BeMA, legacy Benefits, legacy Legal) in the main count, or only list them in Appendix A? **Default:** list them only in Appendix A so the main totals reflect the *current* active platform.

Approve to generate.
