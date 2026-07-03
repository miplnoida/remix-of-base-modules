# Legal Platform — Data Ownership Matrix

**Version:** 1.0

| Entity | Business Owner | Module Owner | System Owner | Primary CRUD Screen | Master Source | Dependent Modules |
|--------|----------------|--------------|--------------|---------------------|---------------|-------------------|
| `lg_case_intake` | Legal Manager | Intake | Legal Platform | `/legal/lg/intake` | Compliance Referral | Matter, Recovery |
| `lg_case` | Legal Director | Matter | Legal Platform | `/legal/lg/cases` | Intake | Liability, Court, Orders, Recovery |
| `lg_case_party` | Legal Officer | Matter | Legal Platform | Case 360 → Parties | Master (ER/IP) | Notices, Filings |
| `lg_recoverable_liability` | Finance + Legal | Liability | Legal Platform | Liability tab | Compliance Assessment | Orders, Appeals, Enforcement, Recovery |
| `lg_court` / `lg_court_officer` | Court Registrar | Admin | Legal Platform | `/legal/admin/courts` | Reference | Hearings, Filings |
| `lg_hearing` | Legal Officer | Court Ops | Legal Platform | `/legal/lg/hearings` | Case | Orders |
| `lg_order` | Legal Manager | Judicial | Legal Platform | Case 360 → Orders | Court decision | Enforcement, Recovery, Appeal |
| `lg_appeal` | Legal Manager | Appeals | Legal Platform | Case 360 → Appeals | Order | Liability freeze |
| `lg_enforcement_action` | Legal Manager | Enforcement | Legal Platform | Case 360 → Enforcement | Order | Recovery |
| `lg_recovery_assignment` | Recovery Supervisor | Recovery | Legal Platform | `/legal/lg/recovery` | Judgment | Dashboard |
| `lg_settlement` / `lg_consent_order` | Legal Officer | Matter | Legal Platform | Case 360 → Settlement | Case | Liability, Payment |
| `lg_external_counsel*` | Legal Manager | Counsel | Legal Platform | `/legal/admin/counsel` | Manual | Cost recovery |
| `lg_fee_rule` / `lg_fee_bundle` | Finance | Admin | Legal Platform | `/legal/admin/fees` | Reference | Fee charges |
| `lg_fee_charge` | Finance Officer | Financial | Legal Platform | Case 360 → Fees | Fee Rule | Liability |
| `lg_legal_cost` | Finance Officer | Cost | Legal Platform | Case 360 → Costs | Cost entry | Liability |
| `lg_payment_allocation` | Finance | Financial | Legal Platform | Recovery workbench | Ledger | Liability rollup |
| `lg_document_link` | Legal Officer | Documents | Enterprise DMS | Case 360 → Docs | `core_generated_document` | All modules |
| `core_legal_reference` | Legal Director | Reference | Enterprise | `/legal/admin/legal-references` | Manual | Templates, Orders |
| `lg_workflow_policy` | Legal Director | Admin | Legal Platform | `/legal/admin/workflow` | Manual | Case transitions |
| `lg_routing_policy` | Legal Manager | Admin | Legal Platform | `/legal/admin/routing` | Manual | Intake |
| `lg_sla_policy` | Legal Director | Admin | Legal Platform | `/legal/admin/sla-rules` | Manual | Dashboards |
| `lg_team` / `lg_staff` | Legal HR | Admin | Legal Platform | `/legal/admin/teams` | HR | Assignment |
| `v_lg_case_financials` | Finance | Reporting | Legal Platform | Dashboard | Liability | All financial reports |
