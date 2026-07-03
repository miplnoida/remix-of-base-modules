# Legal V1 — UAT Document Manifest

Last generated: 2026-07-03 · Version 1.0

All artefacts are downloadable from the in-app **Legal Administration → UAT Documents** page (`/legal/admin/uat-documents`) and from the public path `/downloads/legal/uat/`.

| # | Document | Category | Formats | File |
|---|----------|----------|---------|------|
| 1 | Master UAT Handbook | Handbook | DOCX, PDF | `Legal_V1_UAT_Handbook.*` |
| 2 | Business UAT Test Cases | Test Cases | XLSX | `Legal_V1_UAT_TestCases.xlsx` |
| 3 | UAT Execution Tracker | Tracking | XLSX | `Legal_UAT_Execution_Tracker.xlsx` |
| 4 | Defect Register | Tracking | XLSX | `Legal_UAT_Defect_Register.xlsx` |
| 5 | Requirements Traceability Matrix | Traceability | XLSX | `Legal_RTM.xlsx` |
| 6 | Test Data Catalogue | Reference | XLSX | `Legal_Test_Data.xlsx` |
| 7 | Financial Reconciliation | Financial | XLSX | `Legal_Financial_Reconciliation.xlsx` |
| 8 | Permission Matrix | Security | XLSX | `Legal_Permission_Matrix.xlsx` |
| 9 | Business Process Document | Process | DOCX, PDF | `Legal_Business_Process.*` |
| 10 | Screen Catalogue | Reference | DOCX, PDF | `Legal_Screen_Catalogue.*` |
| 11 | Operations Manual | Operations | DOCX, PDF | `Legal_Operations_Manual.*` |
| 12 | Quick Reference Guides | Guides | DOCX, PDF | `Legal_Quick_Reference_Guides.*` |
| 13 | UAT Sign-Off Pack | Signoff | DOCX, PDF | `Legal_UAT_Signoff.*` |
| 14 | Production Handover Pack | Handover | DOCX, PDF | `Legal_Production_Handover.*` |

Machine-readable manifest: `public/downloads/legal/uat/manifest.json` (mirrors `src/pages/legal/uat/uatDocumentsManifest.json`).

## Access

| Role | View | Download | Manage |
|------|------|----------|--------|
| SYSTEMADMIN | ✓ | ✓ | ✓ |
| LG_ADMIN | ✓ | ✓ | ✓ |
| LG_APPROVER / Legal Manager | ✓ | ✓ | — |
| LG_CASE_HANDLER / Legal Officer | ✓ | ✓ | — |
| LG_REVIEWER / LG_LEGAL_ASSISTANT | ✓ | ✓ | — |
| LG_READ_ONLY | ✓ | ✓ | — |
| Non-legal roles | — | — | — |

Guarded by `getRequiredLegalCap("/legal/admin/uat-documents") = "view"` combined with `useLgAccess().hasLegalAccess`.
