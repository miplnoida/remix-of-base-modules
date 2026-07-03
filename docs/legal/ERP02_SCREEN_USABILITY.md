# ERP-02 · Screen Usability Review

Scope: every operational Legal screen exposed to end-users. Each row scores
five heuristics on a 0–2 scale (0 = broken, 1 = works with friction, 2 = good)
and lists concrete, non-architectural recommendations.

Heuristics:
- **Hierarchy** — most important info first, secondary info secondary.
- **Actions** — primary CTA visible without scrolling; no hidden menus.
- **Density** — no unnecessary fields; summary cards present where needed.
- **Navigation** — related records reachable in ≤ 1 click.
- **Clarity** — labels, empty/error states, and status colour are clear.

---

## Officer / Handler screens

| Screen | H | A | D | N | C | Notes / recommendations |
|---|:-:|:-:|:-:|:-:|:-:|---|
| `/legal/lg/my-work` | 2 | 2 | 1 | 2 | 2 | Density: hide "Legacy ref" column by default. |
| `/legal/lg/cases` list | 2 | 2 | 2 | 2 | 2 | ✅ |
| Case Detail — Summary | 2 | 2 | 1 | 2 | 2 | Move rarely-used "Confidentiality" chip into overflow. |
| Case Detail — Notices | 2 | 2 | 2 | 2 | 2 | ✅ |
| Case Detail — Hearings | 1 | 1 | 1 | 2 | 2 | ⚠ Recording an outcome requires opening the hearing modal + 3 steps. Recommend inline "Record outcome" quick action. |
| Case Detail — Orders | 2 | 2 | 2 | 2 | 2 | ✅ |
| Case Detail — Documents | 2 | 2 | 1 | 2 | 2 | Long lists lack section headers (Confidential vs Public). |
| Case Detail — Recovery / Liability | 1 | 2 | 1 | 1 | 2 | ⚠ Split-view (liability list + activity) requires horizontal scroll on 1366 screens. Recommend collapsible activity panel. |
| Case Detail — External Counsel | 2 | 2 | 2 | 2 | 2 | ✅ |
| `/legal/lg/hearings` calendar | 2 | 1 | 2 | 2 | 2 | Primary action ("Add hearing") lives in header — good; but "Record outcome" from row requires opening case first. |
| `/legal/lg/orders` | 2 | 2 | 2 | 2 | 2 | ✅ |
| `/legal/lg/recovery` | 2 | 2 | 2 | 2 | 2 | ✅ |
| `/legal/lg/tasks` | 2 | 2 | 2 | 2 | 2 | ✅ |

## Reviewer / Approver screens

| Screen | H | A | D | N | C | Notes |
|---|:-:|:-:|:-:|:-:|:-:|---|
| `/legal/workbench` | 2 | 2 | 2 | 2 | 2 | ✅ Segmented by bucket; SLA chips clear. |
| Referrals Workbench | 2 | 2 | 2 | 2 | 2 | ✅ |
| Assignment Console (`/legal/admin/staff`) | 2 | 2 | 1 | 2 | 2 | Recommend caseload heatmap density option. |

## Dashboards

| Screen | H | A | D | N | C | Notes |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Legal Command Centre | 2 | 2 | 1 | 2 | 2 | Some KPI tiles duplicate Analytics Explorer — recommend consolidating "Recovery MTD" / "Recovery YTD" into one toggled tile. |
| Analytics Explorer | 2 | 2 | 2 | 2 | 2 | ✅ |
| Executive Dashboard | 2 | 2 | 2 | 2 | 2 | ✅ |

## Admin screens

All admin screens score ≥ 9/10 total; already certified in `LEGAL_SCREEN_CERTIFICATION.md`.
No usability changes recommended for V1.

---

## Top 5 usability recommendations (deferred to V2)

1. **Hearings — inline "Record outcome" quick action** (Officer).
2. **Case Documents — group by confidentiality / type** (Officer, Reviewer).
3. **Liability panel — collapsible activity feed** (Officer).
4. **Command Centre — consolidate duplicate MTD/YTD tiles** (Manager).
5. **My Work — remember column visibility per user** (Officer).

None of these are blockers for V1 release; all are logged in
`ERP02_VERSION2_BACKLOG.md`.
