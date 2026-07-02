## Legal Sidebar Cutover — 13 Sections (Administration preserved)

Restructure the DB-driven Legal sidebar (`app_modules`) from today's 7 groups (Dashboard / Workbench / Legal Services / Recovery & Enforcement / Litigation / Knowledge & Documents / Administration) into the 13 canonical sections defined in the master prompt, without touching the Administration subtree.

### Target section layout (under `Legal Enforcement` root)


| #   | Section                    | Sort | Populated from                                                                                                                                                                                              |
| --- | -------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Command Centre             | 10   | `/legal/lg/dashboard`                                                                                                                                                                                       |
| 2   | Recovery Workbench         | 20   | `/legal/lg/recovery`                                                                                                                                                                                        |
| 3   | Referrals                  | 30   | `/legal/referrals-workbench`, `/compliance/legal-referral/launcher`, `/bn/legal-referral/launcher`                                                                                                          |
| 4   | Cases                      | 40   | `/legal/lg/cases`, `/legal/lg/cases/new`, `/legal/workbench`                                                                                                                                                |
| 5   | Hearings                   | 50   | `/legal/lg/hearings`                                                                                                                                                                                        |
| 6   | Orders & Judgments         | 60   | `/legal/court-orders`                                                                                                                                                                                       |
| 7   | Recovery & Payments        | 70   | `/legal/enforcement` (Recovery Actions)                                                                                                                                                                     |
| 8   | Settlements                | 80   | `/legal/payment-plans`                                                                                                                                                                                      |
| 9   | Tasks & SLA                | 90   | `/legal/lg/tasks` (new menu entry — page already exists)                                                                                                                                                    |
| 10  | Documents & Notices        | 100  | `/legal/documents`, `/legal/notices`                                                                                                                                                                        |
| 11  | Advisory & Contract Review | 110  | existing `lg_contract_review_root` subtree, Services Hub                                                                                                                                                    |
| 12  | Analytics                  | 120  | `/legal/reports` (Explorer hub)                                                                                                                                                                             |
| 13  | Administration             | 130  | **unchanged** — same `lg_admin` node with all existing children (Profile, Routing, Teams, Courts, Codesets, Policy, Templates, Fees, SLA Rules, Referral Integrity, Case Integrity, Legal References, etc.) |


### What the migration does

1. Insert 12 new section rows (`lg_sec_command_centre` … `lg_sec_analytics`) as children of `legal_enforcement` root.
2. Re-point existing leaf modules (`lg_dashboard`, `lg_cases_list`, `lg_court_orders`, `lg_hearing_calendar`, `lg_enforcement_actions`, `lg_payment_plans`, `lg_notices`, `lg_documents`, `lg_reports`, referral launchers, contract review root, services hub, workbench, referrals workbench) to the new sections via `parent_id` update; reset `sort_order`.
3. Insert missing leaf entries: **Recovery Workbench** (`/legal/lg/recovery`) and **Tasks & SLA** (`/legal/lg/tasks`) — pages already shipped, only menu rows are new.
4. Rename `lg_sec_admin` section to `Administration` at sort 130 and keep its `parent_id` = root. **No changes to its descendants.**
5. Retire the six legacy section rows (Dashboard / Workbench / Legal Services / Recovery & Enforcement / Litigation / Knowledge & Documents) by setting `is_enabled=false, show_in_menu=false` — safe rollback via one UPDATE.
6. All new rows use deterministic UUIDs and `ON CONFLICT (id) DO UPDATE` so re-runs are idempotent.

### Not in scope

- No route removals, no page deletions, no code changes to `src/pages/legal/*`.
- No changes under `parent_id = lg_admin` (Administration Hub) or its grandchildren.
- Legacy pages (`SSB*`, `NewLegalModule`, `LegalUnifiedWorkbench`, etc.) remain reachable by direct URL per the earlier route-retirement plan.

### Rollback

Single migration re-run with the inverse UPDATE (reactivate the six legacy sections, restore original `parent_id`s from `docs/legal/route-retirement-plan.md` appendix which we'll extend with the pre-cutover snapshot).  
  
i think you also add administration menu , so please add those items which you created to be placed under same menu structure in administration

&nbsp;

### Deliverables

- One migration reorganising `app_modules`.
- Updated `docs/legal/route-retirement-plan.md` with the pre/post section map and rollback SQL.
- Plan file marked: sidebar cutover complete.
## Sidebar Cutover — Shipped

Legal sidebar restructured via app_modules into 13 sections (Command Centre, Recovery Workbench, Referrals, Cases, Hearings, Orders & Judgments, Recovery & Payments, Settlements, Tasks & SLA, Documents & Notices, Advisory & Contract Review, Analytics, Administration). Administration subtree preserved untouched. Pre-cutover snapshot in `app_modules_reorg_backup`; rollback SQL in `docs/legal/route-retirement-plan.md`.
