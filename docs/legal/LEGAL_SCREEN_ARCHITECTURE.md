# Legal Platform — Screen Architecture Map

**Version:** 1.0  
See also: `LEGAL_SCREEN_CERTIFICATION.md`, `LEGAL_NAVIGATION.md`.

---

## 1. Operational Screens

| Route | Menu | Services | Hooks | Major Components | Permissions | Master Data | Related |
|-------|------|----------|-------|------------------|-------------|-------------|---------|
| `/legal/lg/dashboard` | Dashboard | `lgLiabilityService`, `lgCaseService`, `lgSlaService` | `useLgDashboard`, `useLegalCapability` | KPI cards, SLA panel, Financial widget (`v_lg_case_financials`) | `view` | — | All |
| `/legal/lg/intake` | Intake Queue | `lgIntakeService`, `lgReferralService` | `useLgIntake`, `useIntakeChecklist` | IntakeList, QualificationDialog | `view` + intake caps | Matter Type, Source | Referrals, Case |
| `/legal/lg/referrals` | Referrals | `lgReferralService` | `useLegalReferralsWorkbenchData`, `useLegalAssignmentScope` | Workbench, AssignmentDialog | `canViewWorkbench` | Officers | Intake |
| `/legal/lg/cases` | Cases | `lgCaseService` | `useLgCases`, `useCaseFilters` | CaseList, Filters, Bulk actions | `view` | Matter Type, Stage | Case 360 |
| Case 360 (`/legal/lg/cases/:id`) | — | All lg* services | `useLgCase`, tabs hooks | Parties, Liability, Timeline, Docs, Fees, Orders, Recovery tabs | `view` + tab caps | All lg reference | All |
| `/legal/lg/hearings` | Hearings | `lgHearingService`, `lgCourtService` | `useLgHearings`, `useLgHearingPermissions` | Calendar, HearingDialog | `view` | Court, Officer | Orders |
| `/legal/lg/orders` | Orders | `lgOrderService` | `useLgOrders` | OrderList, PublishDialog | `view` | — | Enforcement |
| `/legal/lg/recovery` | Recovery | `lgRecoveryService` | `useLgRecovery` | Assignment board | `view` | Campaign types | Dashboard |
| `/legal/lg/tasks` | Tasks | `lgCaseService` | `useLgTasks` | TaskBoard | `view` | — | Case |
| `/legal/lg/my-work` | My Work | `lgCaseService`, `lgSlaService` | `useMyWork` | Assignments, SLA breaches | `view` | — | Case |

## 2. Admin Screens

| Route | Capability | Services | Tables |
|-------|-----------|----------|--------|
| `/legal/admin/routing` | `canManageRouting` | `lgRoutingService` | `lg_routing_*` |
| `/legal/admin/teams` | `canAssignCase` | `lgTeamService` | `lg_team`, `lg_team_member`, `lg_team_workbasket` |
| `/legal/admin/staff` | `canAssignCase` | `lgTeamService` | `lg_staff` |
| `/legal/admin/fees` | `canManageReferenceData` | `lgFeeService` | `lg_fee_rule/bundle/*` |
| `/legal/admin/waiver-policies` | `canManageReferenceData` | `lgFeeService` | `lg_fee_waiver_policy*` |
| `/legal/admin/policy` | `canManageRouting` | `lgWorkflowService` | `lg_workflow_policy` |
| `/legal/admin/workflow` | `canManageRouting` | `lgWorkflowService` | `lg_stage_*` |
| `/legal/admin/templates` | `canManageTemplates` | `lgDocumentService` | `lg_document_template_registry`, `core_template` |
| `/legal/admin/codesets` | `canManageReferenceData` | — | `legal_code_sets` |
| `/legal/admin/legal-references` | `canManageReferenceData` | — | `core_legal_reference*` |
| `/legal/admin/sla-rules` | `canManageSla` | `lgSlaService` | `lg_sla_policy` |
| `/legal/admin/courts` | `canManageReferenceData` | `lgCourtService` | `lg_court*` |
| `/legal/admin/audit` / `/legal/admin/*-integrity` | `canRunIntegrityChecks` | Audit RPCs | `lg_*_audit`, `legal_audit_log` |

## 3. Screen Hierarchy

```mermaid
graph TD
  Root[/legal] --> Dash[/legal/lg/dashboard]
  Root --> Ops[Operations]
  Ops --> Intake[/legal/lg/intake]
  Ops --> Refs[/legal/lg/referrals]
  Ops --> Cases[/legal/lg/cases]
  Cases --> C360[Case 360]
  Ops --> Hear[/legal/lg/hearings]
  Ops --> Orders[/legal/lg/orders]
  Ops --> Rec[/legal/lg/recovery]
  Ops --> Tasks[/legal/lg/tasks]
  Root --> Admin[/legal/admin]
  Admin --> ARouting[routing]
  Admin --> ATeams[teams/staff]
  Admin --> AFees[fees/waiver-policies]
  Admin --> AWorkflow[workflow/policy]
  Admin --> ATemplates[templates]
  Admin --> ACourts[courts]
  Admin --> AAudit[audit/integrity]
```
