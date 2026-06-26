# Legal IA Refactor — Route → New Menu Mapping

Every existing route, where it appears in the new sidebar (if anywhere), and the compatibility action.

| # | Existing route | Today's menu | New sidebar location | Compatibility action |
|---|---|---|---|---|
| 1 | `/legal` | (root) | Dashboard | redirect → `/legal/lg/dashboard` |
| 2 | `/legal/dashboard` | Legal → Dashboard | Dashboard → Executive | route kept; menu now points to `/legal/lg/dashboard` |
| 3 | `/legal/lg/dashboard` | — | **Dashboard → Executive** | canonical |
| 4 | `/legal/ops` | — | Dashboard → Team | new sidebar entry |
| 5 | `/legal/workbench` | — | **Workbench → My Work** | canonical (unified Phase 3) |
| 6 | `/legal/referrals-workbench` | — | Workbench → Department Referrals | route kept; sidebar via Workbench |
| 7 | `/legal/advice/workbench/:bucket` | — | Workbench → Awaiting Information / Response Received | route kept |
| 8 | `/legal/lg/cases` | Legal → Cases | **Litigation → Legal Matters** | canonical |
| 9 | `/legal/lg/cases/new` | (button) | Litigation → New Matter | canonical |
| 10 | `/legal/lg/cases/:id` | (drill-in) | **Litigation → Matter Workspace** | canonical (gets tab spine in Phase 2) |
| 11 | `/legal/lg/cases/:id/edit` | (drill-in) | Matter Workspace → header action | canonical |
| 12 | `/legal/cases` | Legal Mgmt → All Cases | — | route kept; menu removed (duplicate) |
| 13 | `/legal/case-tracking` | — | — | route kept; duplicate |
| 14 | `/legal/cases/intake` | Legal Mgmt → New Case Intake | — | route kept; menu points to `/legal/lg/cases/new` |
| 15 | `/legal/case-intake` | — | — | route kept; duplicate |
| 16 | `/legal/cases/intake/:id` | (drill-in) | Matter Workspace → Intake tab | route kept |
| 17 | `/legal/cases/delinquent` | Legal Mgmt → Delinquent | — | route kept; Workbench filter |
| 18 | `/legal/case-detail/:id` | — | — | route kept; duplicate of LgCaseDetail |
| 19 | `/legal/case-edit/:id` | — | — | route kept; duplicate |
| 20 | `/legal/lg/hearings` | Legal → Hearing Calendar | **Workbench → Calendar** | canonical |
| 21 | `/legal/hearings` | Legal Mgmt → Hearings Calendar | — | route kept; menu points to `/legal/lg/hearings` |
| 22 | `/legal/court-orders` | Legal Mgmt → Court Orders | **Litigation → Orders** | canonical |
| 23 | `/legal/notices` | — | — (Matter tab) | route kept; surfaced as Matter → Letters tab |
| 24 | `/legal/appeals` | — | — (Matter tab) | route kept; surfaced as Matter → Appeals tab |
| 25 | `/legal/evidence` | — | — (Matter tab) | route kept; surfaced as Matter → Documents tab |
| 26 | `/legal/enforcement` | Legal Mgmt → Enforcement Actions | **Recovery & Enforcement → Recovery Actions** | canonical |
| 27 | `/legal/payment-plans` | Legal Mgmt → Payment Plans | **Recovery & Enforcement → Payment Arrangements** | canonical |
| 28 | `/legal/advice/dashboard` | — | **Legal Services → Advice Requests** | canonical |
| 29 | `/legal/advice/new` | — | Legal Services → New Advice | canonical |
| 30 | `/legal/advice/mine` | — | Legal Services → My Advice | canonical |
| 31 | `/legal/advice/:id` | — | (drill-in) | canonical |
| 32 | `/legal/contract-review/dashboard` | — | **Legal Services → Contract Reviews** | canonical |
| 33 | `/legal/contract-review/new` | — | Legal Services → New Contract Review | canonical |
| 34 | `/legal/contract-review/mine` | — | Legal Services → My Reviews | canonical |
| 35 | `/legal/contract-review/:id` | — | (drill-in) | canonical |
| 36 | `/legal/documents` | Legal → Documents Center | **Knowledge & Documents → Document Centre** | canonical |
| 37 | `/legal/templates` | — | Knowledge & Documents → Templates | canonical |
| 38 | `/legal/admin/templates` | Legal Admin | **Admin → Communications → Templates** | canonical |
| 39 | `/legal/admin/templates/:id/edit` | (drill-in) | Admin → Communications → Templates → Edit | canonical |
| 40 | `/legal/admin/legal-references` | Legal Admin | **Knowledge & Documents → Legal References** | canonical |
| 41 | `/legal/admin/legal-references/verification` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 42 | `/legal/reports/cases-by-stage` | Legal Mgmt → Reports | **Dashboard → Reports** | canonical |
| 43 | `/legal/reports/recovery` | Legal Mgmt → Reports | Dashboard → Reports | canonical |
| 44 | `/legal/reports/aging` | Legal Mgmt → Reports | Dashboard → Reports | canonical |
| 45 | `/legal/reports/costs-fees` | Legal Mgmt → Reports | Dashboard → Reports | canonical |
| 46 | `/legal/reports/performance` | Legal Mgmt → Reports | Dashboard → Reports | canonical |
| 47 | `/legal/reports/pending-hearings` | Legal Mgmt → Reports | Dashboard → Reports | canonical |
| 48 | `/legal/admin/teams` | Legal Admin | **Admin → Work Management → Teams** | canonical |
| 49 | `/legal/admin/staff` | Legal Admin | Admin → Work Management → Staff | canonical |
| 50 | `/legal/admin/routing` | Legal Admin | Admin → Case Processing → Routing Rules | canonical |
| 51 | `/legal/admin/policy` | Legal Admin | **Admin → Case Processing → Workflow Rules** | canonical |
| 52 | `/legal/admin/workflow` | Legal Admin | — | route kept; duplicate of `/legal/admin/policy` |
| 53 | `/legal/admin/stage-template-mapping` | Legal Admin | Admin → Case Processing → Stage Rules | canonical |
| 54 | `/legal/admin/stage-reference-mapping` | Legal Admin | Admin → Case Processing → Stage Rules | canonical |
| 55 | `/legal/admin/stage-document-rules` | Legal Admin | Admin → Case Processing → Stage Rules | canonical |
| 56 | `/legal/admin/sla-rules` | Legal Admin | Admin → Case Processing → SLA Rules | canonical |
| 57 | `/legal/admin/codesets` | Legal Admin | Admin → Reference Data → Code Sets | canonical |
| 58 | `/legal/admin/code-sets` | — | — | route kept; duplicate |
| 59 | `/legal/admin/complainant` | Legal Admin | Admin → Reference Data → Complainant | canonical |
| 60 | `/legal/admin/courts` | Legal Admin | Admin → Reference Data → Courts | canonical |
| 61 | `/legal/admin/document-types` | Legal Admin | Admin → Reference Data → Document Types | canonical |
| 62 | `/legal/admin/fees` | Legal Admin | Admin → Reference Data → Fees | canonical |
| 63 | `/legal/admin/fee-bundles` | Legal Admin | Admin → Reference Data → Fees → Bundles | canonical |
| 64 | `/legal/admin/waiver-policies` | Legal Admin | Admin → Reference Data → Fees → Waivers | canonical |
| 65 | `/legal/admin/profile` | Legal Admin | Admin → System → Department Profile | canonical |
| 66 | `/legal/admin/permissions` | Legal Admin | Admin → System → Permissions | canonical |
| 67 | `/legal/admin/audit` | Legal Admin | Admin → System → Audit | canonical |
| 68 | `/legal/admin/validation` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 69 | `/legal/admin/referral-integrity` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 70 | `/legal/admin/case-integrity` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 71 | `/legal/admin/assignment-integrity` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 72 | `/legal/admin/matter-workspace-integrity` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 73 | `/legal/admin/intake-validation` | Legal Admin | Admin → System → Integrity Checks | canonical |
| 74 | `/legal/settings/workflow` | Legal Mgmt → Settings | — | route kept; menu points to `/legal/admin/policy` |
| 75 | `/legal/settings/statuses` | Legal Mgmt → Settings | — | route kept; merged into workflow |
| 76 | `/legal/settings/courts` | Legal Mgmt → Settings | — | route kept; menu points to `/legal/admin/courts` |
| 77 | `/legal/settings/hearing-types` | Legal Mgmt → Settings | Admin → Reference Data → Hearing Types | canonical |
| 78 | `/legal/settings/roles` | Legal Mgmt → Settings | Admin → Reference Data → Legal Roles | canonical |
| 79 | `/legal/settings/fee-mappings` | Legal Mgmt → Settings | Admin → Reference Data → Fees → Mappings | canonical |
| 80 | `/legal/settings/territory` | Legal Mgmt → Settings | Admin → Reference Data → Territory | canonical |
| 81 | `/legal/config/reference-data` | — | Admin → Reference Data → Master Codes | canonical |
| 82 | `/legal-advanced` (LADashboard) | (separate tree) | — | redirect → `/legal/lg/dashboard` |
| 83 | `/legal-advanced/matters` | — | — | redirect → `/legal/lg/cases` |
| 84 | `/legal-advanced/matters/new` | — | — | redirect → `/legal/lg/cases/new` |
| 85 | `/legal-advanced/matters/:id` | — | — | redirect → `/legal/lg/cases/:id` |
| 86 | `/legal-advanced/workbaskets` | — | — | redirect → `/legal/workbench` |
| 87 | `/legal-advanced/settings` | — | — | redirect → `/legal/admin/routing` |

**Validation:** every route in `src/components/routing/AppRoutes.tsx` matching `/legal*` is accounted for above. Zero routes deleted. Phase 6 adds redirect components only.
