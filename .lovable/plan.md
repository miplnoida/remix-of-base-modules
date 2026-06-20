
# Legal Module Action Audit & Fix

Wire every Legal button/menu to a real `lg_*` service, remove mock runtime data, ensure routes resolve, and add audit trail on critical mutations. Done in two phases: canonical `Lg*` screens first, then legacy.

## Phase 1 — Canonical Lg* screens (primary)

**Screens**
- `/legal/lg/dashboard` — `LgDashboard.tsx`
- `/legal/lg/cases/:id` — `LgCaseDetail.tsx` (Overview, Parties, Hearings, Tasks, Notices, Documents, Settlements, Orders, Fees tabs)
- `/legal/lg/hearings` — `LgHearingCalendar.tsx`

**Required actions wired to services**

| Action | Service | Audit |
|---|---|---|
| New Legal Case | `lgCaseService.create` | yes |
| View / Edit Case | route + `lgCaseService.update` | edit only |
| Assign Officer | `lgCaseService.assign` | yes |
| Change Stage | `lgCaseService.changeStage` | yes |
| Add Hearing / Update Outcome / Add Next | `lgHearingService` (extend `lgCaseService`) | yes |
| Add / Complete Task | new `lgTaskService` on `lg_case_task` | complete only |
| Upload / Link Document | `lgDocumentLinkService` | no |
| Generate / Preview / Send Notice | `lgNoticeService` on `lg_notice` (new) + `lgTemplateService` | generate+send |
| Add Settlement | `lgSettlementService` on `lg_settlement` (new) | yes |
| Link Payment Arrangement | `lgPaymentArrangementService.link` | yes |
| Add Legal Fee / Post to Employer Acct | `lgFeeChargeService.create` + `.postToEmployer` (extend) | post only |
| Add Order / Judgment | `lgOrderService` on `lg_order` (new) | yes |
| Close Case | `lgCaseService.close` | yes |
| Export / List filters / search | client-side + URL params | no |

**New service files**
- `src/services/legal/lgHearingService.ts` (`lg_hearing`, `lg_hearing_attendee`)
- `src/services/legal/lgTaskService.ts` (`lg_case_task`)
- `src/services/legal/lgNoticeService.ts` (`lg_notice`, preview + send)
- `src/services/legal/lgSettlementService.ts` (`lg_settlement`)
- `src/services/legal/lgOrderService.ts` (`lg_order`)

**New hooks** — `src/hooks/legal/`
- `useLgHearings`, `useLgTasks`, `useLgNotices`, `useLgSettlements`, `useLgOrders`, `useLgFees`

**New dialogs / forms** (small focused components under `src/components/legal/lg/`)
- `NewCaseDialog`, `AssignOfficerDialog`, `ChangeStageDialog`, `AddHearingDialog`, `HearingOutcomeDialog`, `AddTaskDialog`, `LinkDocumentDialog`, `GenerateNoticeDialog`, `AddSettlementDialog`, `LinkPaymentArrangementDialog`, `AddFeeDialog`, `AddOrderDialog`, `CloseCaseDialog`
- Reuse existing `ScheduleHearingDialog`, `IssueNoticeDialog`, `CreateTaskDialog`, `UploadDocumentDialog`, `UploadOrderDialog`, `PaymentPlanDialog` where they fit — wire them to `lg_*` services instead of mock state.

**UI behavior on every action**
- `useMutation` from React Query, `useBlockingMutation` for full-screen ops
- Required-field validation on each dialog (zod or inline)
- Disabled buttons get a `title=` reason
- Success toast + invalidate related query
- Error toast via shielded error pattern
- Audit via `lgAuditService.log` on the actions flagged above

## Phase 2 — Legacy screens

Same audit applied to:
- `CaseTracking`, `CaseDetailView`, `CaseEditView`
- `NoticeGeneration`
- `LegalHearingCalendar`
- `CourtOrdersManagement`, `EnforcementActions`, `LegalPaymentPlans`, `EvidenceManagement`, `DocumentCenter`

For each:
1. Replace mock arrays with `lg_*` queries via the new hooks.
2. Re-point any "create/update" buttons to the same dialogs from Phase 1.
3. Add missing route handlers; any orphaned `navigate('/legal/...')` target gets either a route or a redirect.

**Routes** — add to `AppRoutes.tsx`
- `/legal/lg/cases` (list)
- `/legal/lg/cases/new` (intake)
- `/legal/lg/tasks`
- `/legal/lg/notices`
- `/legal/lg/documents`
- `/legal/lg/fees`
- `/legal/lg/orders`
- `/legal/lg/settlements`

## Out of scope
- Schema changes to `lg_*` tables (assumed adequate; will add columns only if a required action has nowhere to write).
- Removing the parallel `SSB*` Legal UI — left in place, just kept working.
- Redesigning legacy screen layouts — only wiring + mock removal.

## Acceptance
- Every visible Legal button performs a real action or shows a reasoned `disabled`.
- Zero mock arrays in runtime Legal screens (`grep -n "const mock" src/pages/legal src/components/legal` returns nothing).
- All `navigate('/legal/...')` targets resolve to a defined route.
- All 21 required actions wired to `lg_*` services with toast + query invalidation.
- Critical actions write to `lgAuditService`.
- TypeScript build passes.

## Execution order
1. Add 5 new services + 6 new hooks (parallel writes).
2. Add new route entries.
3. Refactor `LgDashboard` to use real queries + "New Case" dialog.
4. Refactor `LgCaseDetail` tabs to use real data + wire every tab's actions.
5. Refactor `LgHearingCalendar` to use `useLgHearings` + outcome dialog.
6. Sweep legacy screens — replace mock data + repoint actions to new dialogs.
7. Run `tsc` / fix until clean.
