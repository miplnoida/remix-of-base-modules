# Legal V1 — UAT Security & Permission Tests

**Version:** 1.0  
**Reference:** `docs/legal/permission-matrix.md`, `src/config/legalRouteCapabilities.ts`, `src/hooks/legal/useLgAccess.ts`.

Enforcement layers under test:
1. **Route guard** — `LegalRouteGuard` denies unauthorized route.
2. **UI gate** — `<LgActionButton capability=...>` disables control.
3. **Service guard** — `legalCaseStateMachine`, `lgOrderStateMachine`, etc. throw `PermissionError`.

---

## 1. Test matrix

| ID | Capability | Role expected PASS | Role expected DENY | Verify layer |
|---|---|---|---|---|
| SEC-001 | viewLegalModule | all Legal roles | anonymous | Route |
| SEC-002 | viewCase | all | anonymous | Route |
| SEC-003 | createCase | Handler, Approver, Admin | Read-only, Assistant | UI + Service |
| SEC-004 | editCase | Handler, Reviewer, Approver, Admin | Read-only, Assistant | UI |
| SEC-005 | closeCase | Approver, Admin | Handler, Reviewer | UI + Service |
| SEC-006 | acceptReferral | Approver, Admin | Handler, Assistant | UI + Service |
| SEC-007 | rejectReferral | Approver, Admin | Handler | UI + Service |
| SEC-008 | requestInformation | Assistant, Handler, Approver, Admin | Read-only, Reviewer | UI |
| SEC-009 | assignOfficer | Approver, Admin | Handler | UI + Service |
| SEC-010 | reassignCase | Approver, Admin | Handler | UI + Service |
| SEC-011 | generateNotice | Assistant, Handler, Approver, Admin | Read-only | UI |
| SEC-012 | approveNotice | Reviewer, Approver, Admin | Handler, Assistant | UI + Service |
| SEC-013 | sendNotice | Approver, Admin | Reviewer | Service |
| SEC-014 | uploadDocument | Assistant, Handler, Approver, Admin | Read-only | UI |
| SEC-015 | viewConfidentialDocuments | Reviewer, Approver, Admin | Handler | UI |
| SEC-016 | addHearing | Handler, Approver, Admin | Reviewer, Assistant | UI |
| SEC-017 | addOrder / createOrder | Handler, Approver, Admin | Reviewer | UI |
| SEC-018 | addSettlement | Handler, Approver, Admin | Reviewer | UI |
| SEC-019 | approveSettlement | Approver, Admin | Handler | UI + Service |
| SEC-020 | linkPaymentArrangement | Handler, Approver, Admin | Assistant | UI |
| SEC-021 | exportData | Handler, Approver, Admin | Assistant, Read-only | UI |
| SEC-022 | manageTemplates | Admin only | everyone else | Route + UI |
| SEC-023 | configureFees | Admin only | everyone else | Route + UI |
| SEC-024 | configurePolicy | Admin only | everyone else | Route + UI |
| SEC-025 | manageRoleMapping | Admin only | everyone else | Route + UI |

---

## 2. Route-guard tests

### SEC-R-001 · Unauthenticated user hitting `/legal/lg/dashboard`
- **Expected:** Redirect to login / Access Denied.

### SEC-R-002 · Read-only visiting `/legal/admin/templates`
- **Expected:** `LegalAccessDenied` page (never silent redirect).

### SEC-R-003 · Legacy `/legal/workbench/legacy` — redirects to `/legal/lg/dashboard`

### SEC-R-004 · Legacy `/legal/tasks` — redirects to `/legal/lg/tasks`

### SEC-R-005 · Legacy `/legal-final/*` — all 10 redirect to canonical Legal V1

---

## 3. Server-side (defence-in-depth) tests

### SEC-S-001 · Assistant calls acceptReferral via devtools
- **Expected:** Service throws `PermissionError`; audit records denial.

### SEC-S-002 · Handler calls closeCase via devtools
- **Expected:** State machine rejects transition.

### SEC-S-003 · Reviewer calls publishOrder
- **Expected:** `lgOrderStateMachine` rejects.

### SEC-S-004 · Read-only calls uploadDocument
- **Expected:** 403.

---

## 4. Data-scope tests

### SEC-D-001 · Confidential documents redacted for Handler
- **Test data:** matter with `confidentiality_level=RESTRICTED` doc.

### SEC-D-002 · PII masking on Case 360
- **Roles:** Read-only, Assistant → masked. Reviewer+ → visible.

### SEC-D-003 · PII unlock logged
- **Expected:** `pii_unlock_logs` row per reveal.

### SEC-D-004 · Admin override recorded
- **Expected:** `legal_admin_audit` row on any override.

---

## 5. Execution

For each row: log Pass/Fail, screenshot of denial or success, and note the enforcement layer verified.
