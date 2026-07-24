## Goal

Deliver a single planning workbook that catalogues every screen, tab and user operation across the SSB platform, with cross-cutting integration status (Workflow, Audit, DMS, Notifications/Communication) so we can drive final closure.

## Deliverable

`/mnt/documents/SSB_Platform_Screen_Inventory.xlsx`

### Sheets

1. **Legend** — status vocabulary: `YES` (implemented), `MANAGED` (toggle/setting driven), `AUTO` (applied by default), `PLANNED` (designed but not built), blank (not applicable). Column definitions.
2. **All Screens** — master flat table (filterable, frozen header). One row per (Route × Tab/Action × Operation). Every artifact-producing operation (notice generated, case created, email sent, upload, cheque printed, referral packet) explicitly listed so DMS + Notification columns are meaningful.
3. **Pivot — Module × Status** — count of YES / MANAGED / AUTO / PLANNED / blank per module, split by the four integration columns.
4. **Gaps** — auto-filtered rows where any of Workflow / Audit / DMS / Notification = `PLANNED` — the closure worklist.
5. **Per-module sheets** — one sheet per module (same schema as All Screens) for focused review: Admin & Master Data, SSB Setup, Configuration Governance, Identity & Organisation, Employer, Insured Person, C3 Contributions, Benefits (BN) — Product/Award360/Claims/Payments/Servicing/Suspension/Mortality/Appeals/Overpayments/Means-Test/Risk/Uprating, Compliance & Enforcement, Legal, BeMA (legacy), Communication Hub, Workflow Engine, Audit, DMS, Portals (Employer / Doctor / External Task), Reports & Analytics, Public API.

### Columns (All Screens and per-module sheets)


| #      | Column                  | Notes                                                                    | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| ------ | ----------------------- | ------------------------------------------------------------------------ | ------ | ------ | ------ | ------ |
| 1      | Module                  | e.g. Benefits, Compliance, Comm Hub                                      | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 2      | Sub-Module              | e.g. Award360, Weekly Planning                                           | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 3      | Route                   | e.g. `/compliance/weekly-plan`                                           | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 4      | Main Task               | Business purpose of the screen                                           | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 5      | Page Level Task         | Tab or major section                                                     | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 6      | User Action / Operation | Button, dialog, wizard step                                              | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 7      | Produces Artifact       | e.g. Notice PDF, Case, Referral packet, Cheque, Email, blank if none     | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 8      | Workflow Implementation | YES / MANAGED / AUTO / PLANNED / blank                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 9      | Audit Logs              | YES / MANAGED / AUTO / PLANNED / blank                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 10     | DMS Integration         | YES / MANAGED / AUTO / PLANNED / blank (mandatory whenever col 7 is set) | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| 11     | Notification / Comm Hub | YES / MANAGED / AUTO / PLANNED / blank                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| &nbsp; | &nbsp;                  | &nbsp;                                                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| &nbsp; | &nbsp;                  | &nbsp;                                                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| &nbsp; | &nbsp;                  | &nbsp;                                                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| &nbsp; | &nbsp;                  | &nbsp;                                                                   | &nbsp; | &nbsp; | &nbsp; | &nbsp; |


Rule I will follow while filling column 10: any row whose column 7 is non-blank must have column 10 set to `YES` or `PLANNED` — never blank — because every artifact must land in DMS.

## Source strategy

Docs first, code second:

1. **Docs sweep** — read the module-level docs already in the repo: `docs/social-security/*`, `docs/enterprise/*`, `docs/communication-hub/*`, `docs/compliance/*`, `docs/modernisation/benefits-gap/*`, `docs/organization/*`, `docs/architecture/*`, `docs/business-modules/*`, `docs/platform/*`, plus the memory index files under `mem://` referenced in the project memory.
2. **Menu & routes** — walk `src/components/sidebar/menuItems/*`, `src/App.tsx` router, `src/config/routes.ts`, satellite `docs/satellite-templates/*` for the route spine.
3. **Screens & operations** — for each route, open the page component under `src/pages/**` (and its major child components) to enumerate tabs, dialogs, wizard steps, and mutation calls.
4. **Cross-cutting enrichment** — for each operation, decide the four status cells by checking:
  - Workflow: usage of `workflow_*` tables, `workflow-service`, `useWorkflowInstance`, or a documented workflow template.
  - Audit: call to `audit_logs` / `bn_*_audit` / `ce_*_audit` / `_comm_hub_*_audit` insert or trigger.
  - DMS: `generated_documents` / `core_generated_document` / `documentsAdapter` / storage bucket upload.
  - Notification: call to `sendCommunication` façade, `communication_*`, `notification_*`, or `notificationsAdapter`.
5. **Governance labels** — treat toggle-gated behaviour (feature flags, `app_lockdown_state`, module settings) as `MANAGED`; trigger-driven or middleware-applied behaviour (audit triggers, RLS-linked logs) as `AUTO`; documented-but-not-landed items as `PLANNED`.

## Build steps

1. Read docs and memory files listed above; extract module → screen map.
2. Walk sidebar menu + `src/App.tsx` router; produce the authoritative route list.
3. For each route, open the page file and its major sub-components; enumerate tabs, dialogs, wizard steps and mutations into a JSON intermediate.
4. Enrich each operation with the four status columns using the checks above; mark artifacts and force DMS column accordingly.
5. Generate the XLSX with `openpyxl`:
  - Legend sheet with coloured status swatches and column definitions.
  - All Screens sheet with frozen header, autofilter, conditional colouring per status.
  - Pivot sheet built with `COUNTIFS` formulas (kept dynamic).
  - Gaps sheet as a filtered view (formulas referencing All Screens).
  - Per-module sheets sliced from All Screens.
6. Run the recalculate_formulas skill script and fix any errors.
7. Save workbook to `/mnt/documents/SSB_Platform_Screen_Inventory.xlsx` and drop a short `SSB_Platform_Screen_Inventory_README.md` next to it summarising sheet layout and how to use the Gaps sheet for closure planning.

## Scope confirmation

- All modules (internal admin + Employer/Doctor/External portals + Public API + Reports).
- Every route × major tab/action × user operation gets a row.
- Docs are the primary source; code fills gaps and validates.
- Output: XLSX with legend, pivot, gaps and per-module sheets — no separate MD except a short README.

## Out of scope

- Design/UX critique.
- Any code changes to the app.
- Estimating effort or timeline per gap (can be added later in the Notes column if you want).

## Verification

- Every module in the sidebar menu appears as its own sheet and in the pivot.
- Every row with a value in `Produces Artifact` has `DMS Integration` set.
- Pivot totals match row counts on All Screens.
- Legend covers all status values used; no stray values.
- Workbook opens cleanly; formulas recalculate with zero errors.