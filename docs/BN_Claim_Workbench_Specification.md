# BN Claim Workbench — Field-Level Specification

## 1. Business Purpose
The Claim Workbench is the primary operational screen for benefits officers to create, review, process, and manage claims throughout their lifecycle. It replaces the read-only Claim360 view with a full CRUD workbench that enforces workflow transitions, role-based editing, and audit integrity.

## 2. System Fit
- **Existing tables used**: `bn_claim`, `bn_claim_detail`, `bn_claim_event`, `bn_claim_evidence`, `bn_scheme`, `bn_branch`, `bn_benefit_type`, `ip_master` (via adapter), `er_master` (via adapter)
- **New orchestration tables**: `bn_claim_status_history`, `bn_entitlement`, `bn_payment_instruction`, `bn_calc_run`, `bn_calc_line`
- **Outbound payments**: `cl_cheques`, `cl_cheques_holding`, `cl_cheques_survivor` (read-only display)
- **Workflow**: Integrates with existing workflow engine; transitions governed by `CLAIM_TRANSITIONS` map
- **Notifications**: Triggers via existing notification process on status changes

## 3. Route
- **Primary**: `/bn/claims/:id` → `ClaimWorkbench`
- **Legacy fallback**: `/bn/claims/:id/legacy` → `Claim360` (read-only)

---

## 4. Section 1 — Claim Header

| Field ID | Label | Control | Req | Source | Validation | Editable Roles | Visible Statuses | Workflow Effect | Notification |
|----------|-------|---------|-----|--------|------------|----------------|------------------|-----------------|--------------|
| claim_number | Claim Number | Text (readonly) | Auto | bn_claim.claim_number | System-generated | None | All | — | — |
| status | Status | Badge | Auto | bn_claim.status | Enum | None | All | Drives all transitions | — |
| product_code | Product | Select | Required | bn_benefit_type.code | Must exist in catalog | claims_officer | INTAKE, REVIEW | Sets detail schema | — |
| scheme_id | Scheme | Select | Required | bn_scheme.id | Active scheme only | claims_officer | INTAKE, REVIEW | — | — |
| branch_id | Branch | Select | Required | bn_branch.id | Must belong to scheme | claims_officer | INTAKE, REVIEW | — | — |
| priority | Priority | Select | Optional | bn_claim.priority | LOW/MEDIUM/HIGH/URGENT | claims_officer, supervisor | All except CLOSED | Escalation trigger | Notify supervisor on URGENT |
| assigned_to | Assigned Officer | Select | Optional | bn_claim.assigned_to | Valid user | supervisor | All except CLOSED | Workbasket routing | Notify assignee |
| created_at | Created | DateTime (readonly) | Auto | bn_claim.created_at | — | None | All | — | — |
| effective_date | Effective Date | DatePicker | Required | bn_claim.effective_date | Cannot be future for some types | claims_officer | INTAKE, REVIEW | — | — |

---

## 5. Section 2 — Contributor & Claimant Details

| Field ID | Label | Control | Req | Source | Validation | Editable Roles | Visible Statuses | Workflow Effect | Notification |
|----------|-------|---------|-----|--------|------------|----------------|------------------|-----------------|--------------|
| ssn | SSN | Text (readonly) | Required | bn_claim.ssn → ip_master | Must exist in registry | None | All | — | — |
| contributor_name | Name | Text (readonly) | Auto | ip_master.firstname + surname | — | None | All | — | — |
| date_of_birth | Date of Birth | Text (readonly) | Auto | ip_master.date_of_birth | — | None | All | Age eligibility check | — |
| gender | Gender | Text (readonly) | Auto | ip_master.sex | M/F/N | None | All | Gender-specific benefit rules | — |
| contact_phone | Contact Phone | PhoneInput | Optional | bn_claim.detail_json.contact_phone | Phone mask per config | claims_officer | INTAKE, REVIEW | — | — |
| contact_email | Contact Email | Input | Optional | bn_claim.detail_json.contact_email | Email format | claims_officer | INTAKE, REVIEW | — | — |
| bank_account | Bank Account | Input | Conditional | bn_claim.detail_json.bank_account | Required for payment | claims_officer | INTAKE–APPROVED | — | — |
| bank_branch | Bank Branch | Select | Conditional | bn_claim.detail_json.bank_branch | Required if bank_account set | claims_officer | INTAKE–APPROVED | — | — |

---

## 6. Section 3 — Employer Context

| Field ID | Label | Control | Req | Source | Validation | Editable Roles | Visible Statuses |
|----------|-------|---------|-----|--------|------------|----------------|------------------|
| employer_ref | Employer Ref | Lookup | Conditional | bn_claim.employer_ref → er_master | Must exist if employment-based benefit | claims_officer | INTAKE, REVIEW |
| employer_name | Employer Name | Text (readonly) | Auto | er_master.employer_name | — | None | All |
| employer_status | Employer Status | Badge (readonly) | Auto | er_master.status | — | None | All |
| last_contribution_period | Last Contribution | Text (readonly) | Auto | Adapter: contribution summary | — | None | All |

---

## 7. Section 4 — Benefit Type & Claim Type

| Field ID | Label | Control | Req | Source | Validation | Editable Roles |
|----------|-------|---------|-----|--------|------------|----------------|
| benefit_category | Benefit Category | Select | Required | bn_benefit_type.category | SHORT_TERM/LONG_TERM/INJURY/GRANT/SURVIVOR/FUNERAL/MEDICAL/PENSION | claims_officer (INTAKE only) |
| claim_type | Claim Type | Select | Required | bn_claim.claim_type | NEW/RENEWAL/REVISION/APPEAL | claims_officer (INTAKE only) |
| parent_claim_id | Parent Claim | Lookup (readonly) | Conditional | bn_claim.parent_claim_id | Required for RENEWAL/REVISION | System-set |
| claim_family_ref | Claim Family | Text (readonly) | Auto | bn_claim.claim_family_ref | — | None |

---

## 8. Section 5 — Period & Event Details

| Field ID | Label | Control | Req | Source | Validation | Editable Roles |
|----------|-------|---------|-----|--------|------------|----------------|
| event_date | Event Date | DatePicker | Required | bn_claim.event_date | ≤ today; ≤ effective_date | claims_officer |
| period_from | Period From | DatePicker | Conditional | bn_claim.detail_json.period_from | Required for periodic benefits | claims_officer |
| period_to | Period To | DatePicker | Conditional | bn_claim.detail_json.period_to | ≥ period_from; max duration per product rules | claims_officer |
| waiting_days | Waiting Days | Number (readonly) | Auto | Calculated from product rules | — | None |
| benefit_duration_weeks | Duration (weeks) | Number (readonly) | Auto | Calculated | — | None |

---

## 9. Section 6 — Benefit-Specific Detail (Dynamic)

Rendered dynamically based on `benefit_category`. Uses `bn_claim_detail.detail_json` JSONB column.

### 9.1 SHORT_TERM (Sickness)
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| diagnosis_code | Diagnosis | Lookup | Required | Valid ICD code |
| doctor_name | Doctor Name | Input | Required | Max 100 chars |
| doctor_license | License No. | Input | Required | Format validation |
| incapacity_start | Incapacity Start | DatePicker | Required | ≤ today |
| incapacity_end | Incapacity End | DatePicker | Optional | ≥ incapacity_start |
| hospital_name | Hospital | Input | Optional | — |
| is_work_related | Work Related | Checkbox | Required | — |

### 9.2 LONG_TERM (Invalidity/Pension)
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| disability_percentage | Disability % | Number | Required | 0–100 |
| assessment_date | Assessment Date | DatePicker | Required | ≤ today |
| medical_board_ref | Medical Board Ref | Input | Optional | — |
| permanent | Permanent | Checkbox | Required | — |
| review_date | Next Review | DatePicker | Conditional | Required if !permanent |

### 9.3 INJURY (Work Injury)
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| injury_date | Date of Injury | DatePicker | Required | ≤ today |
| injury_description | Description | Textarea | Required | Max 500 |
| body_part | Body Part | Select | Required | Lookup |
| employer_report_date | Employer Report Date | DatePicker | Optional | — |
| witness_names | Witnesses | Textarea | Optional | — |

### 9.4 GRANT (Maternity/Educational)
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| expected_date | Expected Date | DatePicker | Conditional | Maternity only |
| actual_date | Actual Date | DatePicker | Optional | — |
| number_of_children | No. of Children | Number | Conditional | ≥ 1 for maternity |
| institution_name | Institution | Input | Conditional | Educational only |
| course_name | Course | Input | Conditional | Educational only |

### 9.5 SURVIVOR
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| deceased_ssn | Deceased SSN | Input | Required | Valid SSN |
| deceased_name | Deceased Name | Text (readonly) | Auto | Lookup |
| date_of_death | Date of Death | DatePicker | Required | ≤ today |
| relationship | Relationship | Select | Required | Lookup |
| death_certificate_no | Death Cert No. | Input | Required | — |

### 9.6 FUNERAL
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| deceased_ssn | Deceased SSN | Input | Required | Valid SSN |
| funeral_date | Funeral Date | DatePicker | Required | — |
| funeral_cost | Funeral Cost | Currency | Required | > 0 |
| applicant_relationship | Applicant Relationship | Select | Required | Lookup |

### 9.7 MEDICAL
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| treatment_type | Treatment Type | Select | Required | Lookup |
| provider_name | Provider | Input | Required | — |
| treatment_date | Treatment Date | DatePicker | Required | ≤ today |
| estimated_cost | Estimated Cost | Currency | Optional | — |
| pre_authorization | Pre-Auth Required | Checkbox | Auto | Per product rules |

### 9.8 PENSION (Age/Retirement)
| Field ID | Label | Control | Req | Validation |
|----------|-------|---------|-----|------------|
| retirement_date | Retirement Date | DatePicker | Required | — |
| contribution_weeks | Total Weeks | Number (readonly) | Auto | From contribution adapter |
| pension_type | Pension Type | Select | Required | FULL/REDUCED/DEFERRED |
| commutation_pct | Commutation % | Number | Optional | 0–25 per rules |

---

## 10. Section 7 — Evidence / Documents

| Field ID | Label | Control | Req | Source | Validation |
|----------|-------|---------|-----|--------|------------|
| evidence_list | Documents | DataTable | — | bn_claim_evidence | — |
| doc_type | Document Type | Select | Required | Lookup | Must match product checklist |
| file | File Upload | FileUpload | Required | Storage | Max 10MB; PDF/JPG/PNG |
| received_date | Received | DatePicker | Required | — | ≤ today |
| verified | Verified | Checkbox | — | — | Verifier role only |
| verified_by | Verified By | Text (readonly) | Auto | UserCode | — |

**Actions**: Upload, Verify, Reject, Download
**Audit**: `EVIDENCE_UPLOADED`, `EVIDENCE_VERIFIED`, `EVIDENCE_REJECTED`

---

## 11. Section 8 — Notes & Worklog

| Field ID | Label | Control | Source |
|----------|-------|---------|--------|
| notes_list | Notes | Timeline | bn_claim_event (type=NOTE) |
| note_text | New Note | Textarea + Submit | — |
| note_visibility | Visibility | Select | INTERNAL/CLAIMANT |

**Audit**: `NOTE_ADDED`

---

## 12. Section 9 — Linked Claims Panel

| Column | Source |
|--------|--------|
| Claim Number | bn_claim.claim_number |
| Type | bn_claim.claim_type |
| Status | bn_claim.status |
| Product | bn_benefit_type.name |
| Effective Date | bn_claim.effective_date |

**Filter**: Same SSN or same `claim_family_ref`
**Action**: Click navigates to that claim's workbench

---

## 13. Section 10 — Status History

| Column | Source |
|--------|--------|
| Timestamp | bn_claim_event.created_at |
| From Status | bn_claim_event.detail_json.from_status |
| To Status | bn_claim_event.detail_json.to_status |
| Action | bn_claim_event.event_type |
| By | bn_claim_event.user_code |
| Reason | bn_claim_event.detail_json.reason_code |
| Narrative | bn_claim_event.narrative |

---

## 14. Section 11 — Action Bar

| Action | Preconditions | From → To | Roles | Notification | Audit Event | Legacy Impact |
|--------|--------------|-----------|-------|--------------|-------------|---------------|
| Save Draft | Status = INTAKE | INTAKE → INTAKE | claims_officer | — | CLAIM_SAVED | bn_claim UPDATE |
| Submit | All required fields valid; evidence checklist complete | INTAKE → SUBMITTED | claims_officer | Notify supervisor | CLAIM_SUBMITTED | bn_claim UPDATE |
| Return for Info | Status = SUBMITTED/REVIEW | → PENDING_INFO | reviewer, supervisor | Notify officer | CLAIM_RETURNED | bn_claim UPDATE |
| Start Review | Status = SUBMITTED | SUBMITTED → REVIEW | reviewer | — | REVIEW_STARTED | bn_claim UPDATE |
| Approve | Status = REVIEW; calc complete | REVIEW → APPROVED | approver | Notify officer + claimant | CLAIM_APPROVED | bn_claim UPDATE |
| Deny | Status = REVIEW | REVIEW → DENIED | approver | Notify officer + claimant | CLAIM_DENIED | bn_claim UPDATE |
| Suspend | Status = APPROVED/ACTIVE | → SUSPENDED | supervisor | Notify officer | CLAIM_SUSPENDED | bn_claim UPDATE |
| Resume | Status = SUSPENDED | SUSPENDED → previous | supervisor | Notify officer | CLAIM_RESUMED | bn_claim UPDATE |
| Close | Status = APPROVED/DENIED/SUSPENDED | → CLOSED | supervisor | — | CLAIM_CLOSED | bn_claim UPDATE |
| Reopen | Status = CLOSED; < 90 days | CLOSED → REVIEW | supervisor | Notify officer | CLAIM_REOPENED | bn_claim UPDATE |
| Void | Status = INTAKE/SUBMITTED | → VOID | supervisor | — | CLAIM_VOIDED | bn_claim UPDATE |
| Escalate | Any open status | Priority → URGENT | claims_officer | Notify supervisor chain | CLAIM_ESCALATED | bn_claim UPDATE |
| Transfer | Any open status | assigned_to changes | supervisor | Notify new officer | CLAIM_TRANSFERRED | bn_claim UPDATE |

### Action Dialog Fields
- **narrative**: Required for DENY, SUSPEND, RETURN, VOID, REOPEN
- **reason_code**: Required for DENY, SUSPEND, VOID (from bn_reason_code lookup)
- **effective_date**: Optional override for APPROVE

---

## 15. Role Visibility Matrix

| Section | claims_officer | reviewer | approver | supervisor | auditor |
|---------|---------------|----------|----------|------------|---------|
| Claim Header | Edit (INTAKE) | Read | Read | Edit (priority/assign) | Read |
| Contributor | Edit (INTAKE) | Read | Read | Read | Read |
| Employer | Edit (INTAKE) | Read | Read | Read | Read |
| Benefit Detail | Edit (INTAKE/REVIEW) | Read | Read | Read | Read |
| Evidence | Upload/Edit | Verify | Read | Verify | Read |
| Notes | Add (INTERNAL) | Add | Add | Add | Read |
| Linked Claims | Read | Read | Read | Read | Read |
| Status History | Read | Read | Read | Read | Read |
| Action Bar | Save/Submit/Escalate | Review/Return | Approve/Deny | All | None |

---

## 16. Backward Compatibility Notes

1. **cl_head**: Not directly written by the workbench; the claim service creates a `cl_head` record via the legacy adapter when status transitions to APPROVED
2. **cl_detail_***: Benefit-specific data stored in `bn_claim_detail.detail_json`; the legacy adapter maps fields to the appropriate `cl_detail_*` table on approval
3. **cl_cheques**: Created by the payment batch process, not by the workbench; displayed read-only in the Disbursements tab
4. **Claim numbers**: Generated by `bn_claim` sequence; mapped to `cl_head.claim_number` on approval
5. **Legacy Claim360**: Preserved at `/bn/claims/:id/legacy` for reference during transition period

---

## 17. Workflow Integration

- All status transitions go through `executeClaimAction()` in `claimWorkbenchService.ts`
- Each transition validates preconditions, writes to `bn_claim_event`, updates `bn_claim.status`
- Generic workflow engine notified via domain event bus for SLA tracking
- Workbasket assignment updated on SUBMIT and TRANSFER actions

## 18. Notification Integration

- Uses existing notification process via adapter
- Trigger points: SUBMIT, APPROVE, DENY, SUSPEND, RETURN, ESCALATE, TRANSFER
- Channel: In-app + Email (configurable per product)
- Template: Resolved from `bn_notification_template` by event type + product

## 19. Audit Events

Every action writes an immutable record to `bn_claim_event` with:
- `event_type`: Action name
- `user_code`: Acting user
- `detail_json`: From/to status, reason code, narrative, snapshot of changed fields
- `created_at`: Server timestamp
- `ip_address`: Client IP (when available)
