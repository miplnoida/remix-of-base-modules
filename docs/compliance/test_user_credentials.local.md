# Compliance & Enforcement — UAT Test User Credentials (local reference)

> **Do NOT commit any password value to this file.** The shared throwaway password is held only in the Lovable Cloud secret `COMPLIANCE_UAT_TEMP_PASSWORD` and is rotated by the UAT lead.

| # | Email | Role (`roles.role_name`) | Password source |
|---|---|---|---|
| 1 | `mipl.student+compliance.admin@gmail.com` | `Admin` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 2 | `mipl.student+compliance.manager@gmail.com` | `ComplianceHead` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 3 | `mipl.student+compliance.officer@gmail.com` | `ComplianceInspector` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 4 | `mipl.student+compliance.supervisor@gmail.com` | `SeniorInspector` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 5 | `mipl.student+field.inspector@gmail.com` | `ComplianceInspector` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 6 | `mipl.student+finance@gmail.com` | `ComplianceFinanceUser` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 7 | `mipl.student+legal@gmail.com` | `ComplianceLegalOfficer` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 8 | `mipl.student+reports.viewer@gmail.com` | `ComplianceReportsViewer` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |
| 9 | `mipl.student+restricted@gmail.com` | `ReadOnly` | env: `COMPLIANCE_UAT_TEMP_PASSWORD` |

All 9 accounts are seeded with `force_password_change = true`; each tester sets a personal password at first login.

To rotate: update the `COMPLIANCE_UAT_TEMP_PASSWORD` secret, then re-invoke `seed-compliance-uat-users`.
