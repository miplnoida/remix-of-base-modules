# Compliance → Admin — Screen Documentation Index

This index lists every screen registered under **Compliance → Admin** in `app_modules`, with its route, page component, sub-section, and link to the per-screen technical document.

Source of truth: `app_modules` table (filter `route LIKE '/compliance/admin%'`) cross-checked against `src/components/routing/AppRoutes.tsx`.

Generation status legend: ✅ documented · 🟡 pending (next batch) · ⚪ not in current batch

---

## Section A — Settings (parent: `ca…0110`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 1 | Rule Engine | `/compliance/admin/settings/rule-engine` | `src/pages/compliance/settings/RuleEngine.tsx` | ✅ [rule-engine.md](./settings/rule-engine.md) |
| 2 | Violation Types | `/compliance/admin/settings/violation-types` | `src/pages/compliance/settings/ViolationTypes.tsx` | ✅ [violation-types.md](./settings/violation-types.md) |
| 3 | Assignment Routing Rules | `/compliance/admin/settings/assignment-routing` | `src/pages/compliance/settings/AssignmentRoutingRules.tsx` | ✅ [assignment-routing.md](./settings/assignment-routing.md) |
| 4 | Risk & Escalation Policy | `/compliance/admin/settings/risk-policy` | `src/pages/compliance/settings/RiskRulePolicy.tsx` | ✅ [risk-policy.md](./settings/risk-policy.md) |
| 5 | Sampling Settings | `/compliance/admin/settings/sampling` | `src/pages/compliance/sampling/RiskSamplingSettings.tsx` | ✅ [sampling-settings.md](./settings/sampling-settings.md) |
| 6 | Reference Numbering | `/compliance/admin/settings/number-templates` | `src/pages/compliance/settings/NumberTemplates.tsx` | ✅ [number-templates.md](./settings/number-templates.md) |
| 7 | Templates (Notice) | `/compliance/admin/settings/templates` | `src/pages/compliance/settings/ComplianceTemplates.tsx` | ✅ [notice-templates.md](./settings/notice-templates.md) |

## Section B — Geography (parent: `ca…0120`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 8 | Zones | `/compliance/admin/geography/zones` | `src/pages/compliance/geography/ZoneManagement.tsx` | ✅ [zones.md](./geography/zones.md) |
| 9 | Office-to-Zone Mapping | `/compliance/admin/geography/office-zone-mapping` | `src/pages/compliance/geography/OfficeZoneMapping.tsx` | ✅ [office-zone-mapping.md](./geography/office-zone-mapping.md) |
| 10 | Village-to-Zone Mapping | `/compliance/admin/geography/village-zone-mapping` | `src/pages/compliance/geography/VillageZoneMapping.tsx` | ✅ [village-zone-mapping.md](./geography/village-zone-mapping.md) |

## Section C — Staff (parent: `ca…0130`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 11 | Officers / Inspectors | `/compliance/admin/staff/officers` | `src/pages/compliance/staff/OfficerManagement.tsx` | ✅ [officers.md](./staff/officers.md) |
| 12 | Queue Members | `/compliance/admin/staff/queue-members` | `src/pages/compliance/staff/QueueMembers.tsx` | ✅ [queue-members.md](./staff/queue-members.md) |
| 13 | Supervisor Hierarchy | `/compliance/admin/staff/supervisors` | `src/pages/compliance/staff/SupervisorHierarchy.tsx` | ✅ [supervisor-hierarchy.md](./staff/supervisor-hierarchy.md) |
| 14 | Link Legacy Inspectors | `/compliance/admin/staff/link-legacy` | `src/pages/compliance/staff/LegacyInspectorLinking.tsx` | ✅ [legacy-inspector-linking.md](./staff/legacy-inspector-linking.md) |

## Section D — Automation & Jobs (parent: `ca…0115`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 15 | Job Configuration | `/compliance/admin/automation/jobs` | `src/pages/compliance/automation/JobConfiguration.tsx` | ✅ [job-configuration.md](./automation/job-configuration.md) |
| 16 | Job History | `/compliance/admin/automation/history` | `src/pages/compliance/automation/JobHistory.tsx` | ✅ [job-history.md](./automation/job-history.md) |
| 17 | Employer Compliance Jobs | `/compliance/admin/automation/employer-jobs` | `src/pages/compliance/automation/EmployerComplianceJobs.tsx` | ✅ [employer-compliance-jobs.md](./automation/employer-compliance-jobs.md) |

## Section E — Integrations & Ledger (parent: `ca…0118`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 18 | C3 Ledger Sync | `/compliance/admin/settings/c3-ledger-sync` | `src/pages/compliance/settings/C3LedgerSync.tsx` | 🟡 pending |
| 19 | Payment Ledger Sync | `/compliance/admin/settings/payment-ledger-sync` | `src/pages/compliance/settings/PaymentLedgerSync.tsx` | 🟡 pending |
| 20 | Ledger Administration | `/compliance/admin/settings/ledger-admin` | `src/pages/compliance/settings/LedgerAdministration.tsx` | 🟡 pending |
| 21 | Ledger Posting Framework | `/compliance/admin/settings/ledger-posting` | `src/pages/compliance/settings/LedgerPostingAdmin.tsx` | 🟡 pending |
| 22 | Ledger Operations | `/compliance/admin/settings/ledger-operations` | `src/pages/compliance/settings/LedgerOperationsDashboard.tsx` | 🟡 pending |
| 23 | Ledger Help & SOP | `/compliance/admin/settings/ledger-help` | `src/pages/compliance/settings/LedgerHelpCenter.tsx` | 🟡 pending |

## Section F — Tools (parent: `ca…0140`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 24 | Rule Simulator | `/compliance/admin/tools/rule-simulator` | `src/pages/compliance/tools/ComplianceRuleSimulator.tsx` | 🟡 pending |
| 25 | Risk Simulator | `/compliance/admin/tools/risk-simulator` | `src/pages/compliance/tools/ComplianceRiskSimulator.tsx` | 🟡 pending |

## Section G — Communication & Reports (parent: `ca…0170`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 26 | Communication Templates | `/compliance/admin/communication-templates` | `src/pages/compliance/admin/AuditCommunicationTemplatesPage.tsx` | 🟡 pending |
| 27 | Communication Template Editor | `/compliance/admin/communication-templates/:id` | `src/pages/compliance/admin/AuditCommunicationTemplateEditorPage.tsx` | 🟡 pending |
| 28 | Report Templates | `/compliance/admin/report-templates` | `src/pages/compliance/admin/ComplianceReportTemplates.tsx` | 🟡 pending |
| 29 | Shared Sections & Foundation | `/compliance/admin/document-foundation` | `src/pages/compliance/admin/ComplianceReportTemplates.tsx` (foundation tab) | 🟡 pending |

## Section H — Online Response (parent: `ca…0180`)

| # | Display Name | Route | Page Component | Doc |
|---|---|---|---|---|
| 30 | Employer Online Response Config | `/compliance/admin/online-response` | `src/pages/compliance/admin/OnlineResponseConfigPage.tsx` | 🟡 pending |

---

## Section I — Container/Dashboard pages (no per-screen doc planned)

| Display Name | Route | Notes |
|---|---|---|
| Compliance Settings (landing) | `/compliance/admin/settings` | `ComplianceSettings.tsx` — link hub |
| Automation & Jobs | _(no route)_ | Menu group header only |
| Integrations & Ledger | _(no route)_ | Menu group header only |

---

## Methodology notes

- Code-grounded analysis: routes resolved from `AppRoutes.tsx`; tables resolved from `supabase.from('…')` calls in pages, child components, hooks and services.
- "Reused elsewhere" cites Compliance sub-modules at module level (workbench / field / cases / reports / audit-planning / arrangements / legal) rather than per-file. For exhaustive grep, run `grep -rn "from\(['\"]<table>['\"]" src/`.
- Audit fields convention: `created_by`, `updated_by` store the **UserCode** of the actor (resolved via `useUserCode` / `resolveUserCode`), per project Knowledge Repository entry "User Identity Tracking in Database Actions".
- All Compliance settings tables follow the **soft-delete** pattern (`is_active=false` / `is_enabled=false`) — there are no hard `DELETE` calls except in `AssignmentRoutingRules` (which uses `.delete()`). This is flagged in that doc.
- "Workflow / Approval / Notification Logic" sections describe what the screen does *itself*; the new Planner Approval Workflow (mem://features/compliance/planner-approval-workflow.md) governs only `convert_exception` / `merge_duplicate` and is not invoked from any Admin screen.
