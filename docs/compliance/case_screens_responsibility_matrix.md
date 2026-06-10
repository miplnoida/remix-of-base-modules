# Compliance — Case Screens Responsibility Matrix

> Source-of-truth for which compliance case screen does what, who owns it, and
> how users get in and out. Keep this aligned with the routes registered in
> `src/pages/compliance/Routes.tsx`.

| Screen                        | Route                                 | Primary purpose                                                                 | Owner role(s)                                  | Typical entry points                                              | Typical exits                                  |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| **Case Management**           | `/compliance/cases`                   | Master list of all cases across statuses; central search and triage.            | Compliance Inspector, Senior, Head             | Sidebar, dashboards, employer 360                                 | New Case dialog, Case Detail                   |
| **Case Intake**               | `/compliance/cases/intake`            | Newly created / unassigned cases awaiting officer assignment.                   | Senior Inspector (assignment)                  | Sidebar, "Intake" link from Case Management                       | Case Detail (assign officer)                   |
| **Case Detail**               | `/compliance/cases/:id`               | Single case workspace: history, violations, notices, comms, closure actions.    | Assigned officer (read/write); Senior (review) | Case Management row click, Intake "Review & Assign", deep links   | Case Management, request dialogs               |
| **Assigned Cases**            | `/compliance/cases/assigned`          | "My cases" view filtered to the signed-in officer.                              | Compliance Inspector                           | Sidebar, My Work Queue                                            | Case Detail                                    |
| **Case Requests Queue**       | `/compliance/cases/requests`          | Generic queue for CLOSURE / REOPEN / MERGE approvals (admin/supervisor view).   | Senior, Head                                   | Sidebar                                                           | Approve/Reject dialog                          |
| **Case Closure**              | `/compliance/cases/closure`           | Specialized request queue scoped to closure approvals.                          | Senior, Head                                   | Sidebar, My Work Queue                                            | Approve/Reject closure                         |
| **Reopen Requests**           | `/compliance/cases/reopen-requests`   | Specialized request queue scoped to reopen approvals.                           | Senior, Head                                   | Sidebar                                                           | Approve/Reject reopen                          |
| **Case Merge Review**         | `/compliance/cases/merge`             | Specialized request queue scoped to merge approvals.                            | Senior, Head                                   | Sidebar                                                           | Approve/Reject merge                           |
| **Penalty Management**        | `/compliance/cases/penalties`         | Penalty calculations, waivers and adjustments tied to cases.                    | Senior, Head                                   | Case Detail, sidebar                                              | Penalty waiver flow                            |

## Action ownership cheat sheet

- **Create case** — Compliance Inspector or Senior, via "New Case" on Case Management.
- **Assign officer** — Senior Inspector, from Case Intake or Case Detail.
- **Request closure / reopen / merge** — Assigned officer, from Case Detail.
- **Approve closure / reopen / merge** — Senior or Head, via the matching request queue.
- **Apply penalty / waiver** — Senior, via Penalty Management (waivers reviewed by Head).
- **Escalate to Legal** — Senior, via Case Detail → Legal Recommendation Queue.

## Cross-links

To reduce navigation guesswork, each case-related page header should include a
"Related screens" link group pointing to its siblings:

- Case Management → Intake, Assigned Cases, Case Requests Queue
- Case Closure → Reopen Requests, Case Merge Review, Case Requests Queue
- Case Detail → Case Management, Penalty Management

## Updating this matrix

When you add or remove a case-related route or change ownership:

1. Update the rows above and the cross-link list.
2. Update the page subtitle on the affected screen to match the "Primary purpose" cell.
3. Cross-check the Role → Tab visibility matrix in
   `docs/compliance/role_tab_visibility_matrix.md`.
