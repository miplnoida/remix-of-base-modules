# ERP-02 · Role-Based Business Journey Certification

Scope: Legal Module V1 for SSB St. Kitts & Nevis. Certification lens is a Legal
Department business user — not a developer. No new features proposed; only
validation of the existing platform.

Status legend: ✅ supported end-to-end · ⚠️ supported with friction ·
✖ gap (documented as recommendation, not implemented).

---

## 1. Legal Officer (LG_CASE_HANDLER)

**Daily responsibilities**
- Work assigned referrals and cases through intake → notice → hearing →
  judgment → recovery.
- Draft statutory notices, request information from source modules, upload
  evidence, log hearing outcomes, record orders.
- Keep case status, next-action date, and SLA current.

**Typical workflow (one day)**
1. Open `/legal/lg/my-work` — read new assignments, overdue tasks, hearings
   today.
2. Open Case Detail (`/legal/lg/cases/:id`) — review Source Link tab, upload
   evidence, request info if needed.
3. Draft & submit notice for reviewer approval.
4. Add hearing / record hearing outcome.
5. Record court order or settlement; link payment arrangement.
6. Close working day with tasks/deadlines updated.

**Screens used**
`/legal/lg/my-work`, `/legal/lg/cases`, Case Detail (all tabs), `/legal/lg/hearings`,
`/legal/lg/orders`, `/legal/lg/recovery`, `/legal/lg/tasks`, `/legal/referrals-workbench`.

**Reports required**
- My open cases by stage & SLA
- My hearings this week
- My overdue notices / info requests
- My recovery pipeline (assigned liabilities)

**Decisions taken**
- Notice type & content, hearing date proposals, evidence sufficiency,
  settlement recommendation (approval by senior).

**Information needed**
- Source module context (Compliance case / Benefit overpayment), party
  master, liability breakdown, prior activity timeline, next SLA date.

**Certification:** ✅ All journeys supported. ⚠ Two friction points documented
in ERP02_SCREEN_USABILITY.md (hearings quick-record; recovery split view).

---

## 2. Senior Legal Officer (LG_REVIEWER)

**Daily responsibilities**
- Review draft notices, orders, and settlements from officers.
- Peer-review evidence bundles before hearing.
- Coach officers, redistribute cases at risk of SLA breach.

**Typical workflow**
1. `/legal/workbench` → Reviewer bucket: pending notice approvals, pending
   settlement approvals.
2. Open each item, review draft, approve/return with comment.
3. Scan team hearings for the next 5 business days.
4. Escalate blocked matters to Legal Manager.

**Screens used**
Referrals Workbench, Case Detail (Notices, Settlements, Documents tabs),
Team Queue, Hearings calendar.

**Reports required**
- Pending my review (age, SLA)
- Team SLA breach risk
- Notices approved vs rejected (weekly)

**Decisions taken**
- Approve/return notices, settlements; recommend escalation.

**Certification:** ✅ Supported. ⚠ "Return with comment" surfaces only in
activity timeline — a dedicated inbox indicator would help (recommendation).

---

## 3. Legal Manager (LG_APPROVER)

**Daily responsibilities**
- Final sign-off: accept/reject referrals, approve closures, approve
  settlements, authorise external counsel engagement.
- Assign officers and rebalance caseload; manage SLA and escalations.
- Report to Director on portfolio, recovery, and risk.

**Typical workflow**
1. `/legal/dashboard` — portfolio KPIs.
2. Referrals Workbench → decision queue (accept/reject).
3. Approvals inbox: settlements, closures, cost recovery write-offs.
4. Assignment console: rebalance, reassign, workload heatmap.
5. Review weekly reports for Director.

**Screens used**
Dashboard, Referrals Workbench, `/legal/admin/staff`, `/legal/admin/routing`,
Case Detail, Reports.

**Reports required**
- Portfolio ageing, stage funnel
- Recovery vs judgment value (period)
- SLA compliance by officer / team
- Settlements approved (value & count)

**Decisions taken**
- Accept/reject referral, close case, approve settlement, assign officer,
  approve cost write-off.

**Certification:** ✅ Supported. Recommendation: single "Approvals inbox" that
aggregates settlement/closure/write-off queues (currently three screens).

---

## 4. Director / Executive (view-only)

**Daily responsibilities**
- Portfolio oversight, board reporting, risk & recovery trends.
- No transactional work; consumes dashboards and periodic reports.

**Typical workflow**
1. Executive Dashboard — high-level KPIs, MoM/YoY trends.
2. Drill down into ageing buckets or recovery gaps as needed.
3. Export monthly board pack (PDF/Excel).

**Screens used**
`/legal/dashboard` (Executive view), Reports.

**Reports required**
- Monthly recovery vs target
- Portfolio value by stage
- Judgments obtained vs referrals accepted
- Cost of legal recovery (fees vs recoveries)

**Decisions taken**
- Strategic direction, resourcing, escalation to Board.

**Certification:** ✅ Supported via Legal Command Centre + Analytics Explorer.
Recommendation: single-page Executive PDF export (currently multi-report).

---

## 5. External Counsel Coordinator

**Daily responsibilities**
- Engage/track external counsel, share matter dossiers, ingest external
  filings, reconcile invoices/fees against `LEGAL_FEE_MASTER_POLICY`.

**Typical workflow**
1. Case Detail → External Counsel tab: assign counsel, share bundle.
2. Log external counsel filings & correspondence back into the matter.
3. Review counsel fee invoice against fee master; raise for approval.

**Screens used**
Case Detail (External Counsel, Documents, Fees tabs), `/legal/admin/fee-bundles`.

**Reports required**
- Active external engagements
- Counsel fees by matter, by counsel (period)
- Outstanding counsel invoices

**Certification:** ⚠ Supported. Recommendation: dedicated "External Counsel
Console" surfacing the three reports above; today they are per-case.

---

## 6. System Administrator (LG_ADMIN)

**Daily responsibilities**
- Manage reference data (courts, templates, codesets, fees, SLA rules).
- Manage teams, staff, role mapping, routing policy.
- Run integrity checks (referral, case, assignment, matter-workspace).
- Support audits and cutovers.

**Typical workflow**
1. `/legal/admin` — landing tiles for configuration & integrity.
2. Manage templates / SLA rules / routing after policy change.
3. Run integrity checks weekly; action any red flags.
4. Manage role type mapping when HR changes occur.

**Screens used**
Entire `/legal/admin/*` surface.

**Reports required**
- Integrity check results
- Role mapping vs HR feed
- Configuration change log

**Certification:** ✅ Supported. All admin routes gated by
`legalRouteCapabilities.ts` and covered in Screen Certification.

---

## Consolidated gaps → recommendations (not implemented)

| # | Gap | Role affected | Priority |
|---|---|---|---|
| R1 | Unified "Approvals Inbox" across notices / settlements / closures / write-offs | Manager, Senior | Medium |
| R2 | Reviewer "returned to me" indicator on My Work | Officer | Low |
| R3 | External Counsel Console (cross-matter view) | Counsel Coordinator | Medium |
| R4 | One-click Executive PDF export | Executive | Low |
| R5 | Hearings quick-record modal (avoid full Case Detail navigation) | Officer | Medium |

All recommendations are logged in `ERP02_VERSION2_BACKLOG.md`.
