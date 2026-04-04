# BN Enterprise Data Model

## Preserved Tables (Unchanged)

| Table | Purpose |
|---|---|
| `ip_master` | Contributor/insured person registry |
| `er_master` | Employer registry |
| `ip_wages` | Contribution/wage history |
| `cl_head` | Legacy claim header |
| `cl_detail_*` | Benefit-specific claim details |
| `cl_cheques` | Issued outbound payments (PRIMARY) |
| `cl_cheques_holding` | Holding payments |
| `cl_cheques_survivor` | Survivor benefit payments |
| `cl_wages_credited` | Post-issue wage credits |
| `tb_postal_reg` | Postal delivery registration |
| `cn_payment*` | Incoming collections ONLY |
| `cn_receipt` | Incoming receipts ONLY |
| `cn_refund` | Refunds ONLY |
| `cn_return_payment` | Returned payments ONLY |

---

## Modernization Tables

### 1. bn_claim
- **Purpose**: Modern claim orchestration header
- **PK**: `id` (UUID)
- **Logical Keys**: `claim_number` (unique), `ssn` (→ ip_master), `employer_regno` (→ er_master)
- **Relationship**: Soft join to `cl_head` via `claim_number`/`legacy_claim_ref`
- **Major Columns**: `claim_number`, `ssn`, `product_id`, `product_version_id`, `status`, `claim_date`, `submission_date`, `decision_date`, `assigned_to`, `priority`, `source`, `parent_claim_id`, `claim_family_ref`, `declaration`, `digital_signature`, `bank_account`, `bank_routing_number`, `workflow_instance_id`
- **Statuses**: DRAFT, SUBMITTED, REGISTERED, VERIFIED, IN_DETERMINATION, DECISION, APPROVED, DENIED, SUSPENDED, IN_PAYMENT, CLOSED, WITHDRAWN, CANCELLED
- **Indexes**: `ssn`, `claim_number`, `status`, `product_id`, `assigned_to`
- **Audit**: `entered_by`, `entered_at`, `modified_by`, `modified_at`
- **Workflow**: `workflow_instance_id` links to platform workflow
- **Compatibility**: `legacy_claim_ref`, `legacy_benefit_type` preserve references

### 2. bn_claim_detail (JSONB)
- **Purpose**: Product-specific extensible claim data
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Relationship**: One-to-one with `bn_claim`; parallels `cl_detail_*` pattern
- **Major Columns**: `claim_id`, `detail_data` (JSONB), `product_schema_version`
- **Compatibility**: Legacy `cl_detail_*` tables remain authoritative for existing claims

### 3. bn_claim_decision (Immutable)
- **Purpose**: Record every status transition with full context
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Major Columns**: `claim_id`, `action_code`, `from_status`, `to_status`, `performed_by`, `performed_at`, `narrative`, `reason_code_id`, `effective_date`, `evidence_snapshot`, `calculation_snapshot_id`, `eligibility_snapshot_id`, `workflow_task_id`, `ip_address`
- **Indexes**: `claim_id`, `performed_at`
- **Audit**: Immutable — no UPDATE or DELETE

### 4. bn_claim_event
- **Purpose**: Comprehensive event log for all claim-related actions
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Major Columns**: `claim_id`, `event_type`, `entity_type`, `entity_id`, `description`, `actor_id`, `actor_name`, `metadata` (JSONB), `timestamp`
- **Indexes**: `claim_id`, `event_type`, `timestamp`

### 5. bn_claim_evidence
- **Purpose**: Track required and submitted evidence documents
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Major Columns**: `claim_id`, `doc_type`, `doc_category`, `status`, `file_name`, `storage_url`, `file_size`, `mime_type`, `checksum`, `uploaded_by`, `uploaded_at`, `verified_by`, `verified_at`, `rejection_reason`, `required`
- **Statuses**: PENDING, UPLOADED, VERIFIED, REJECTED, WAIVED

### 6. bn_calc_run
- **Purpose**: Benefit calculation execution record
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`, `product_version_id` → `bn_product_version`
- **Major Columns**: `claim_id`, `product_version_id`, `run_mode` (OFFICIAL/SIMULATION/COMPARISON), `run_status`, `weekly_rate`, `monthly_rate`, `annual_amount`, `lump_sum`, `eligibility_passed`, `eligibility_results` (JSONB), `wage_summary` (JSONB), `contribution_window` (JSONB), `payment_schedule` (JSONB), `variables_snapshot` (JSONB), `errors` (JSONB), `warnings` (JSONB), `override_applied`
- **Statuses**: RUNNING, COMPLETED, FAILED

### 7. bn_calc_trace
- **Purpose**: Step-by-step calculation audit trail
- **PK**: `id` (UUID)
- **FK**: `calc_run_id` → `bn_calc_run`
- **Major Columns**: `calc_run_id`, `step_number`, `step_code`, `step_label`, `engine_layer`, `rule_code`, `formula_expression`, `inputs` (JSONB), `output_value`, `output_text`, `passed`, `message`, `severity`, `duration_ms`

### 8. bn_entitlement
- **Purpose**: Approved benefit rights (what claimant is entitled to receive)
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Major Columns**: `claim_id`, `entitlement_type`, `status`, `effective_date`, `end_date`, `weekly_rate`, `monthly_rate`, `annual_rate`, `lump_sum`, `payment_frequency`, `payment_method`, `calc_run_id`, `total_installments`, `installments_paid`, `total_paid`, `remaining_amount`, `suspended_at`, `suspended_reason`, `terminated_at`, `terminated_reason`
- **Statuses**: ACTIVE, SUSPENDED, EXHAUSTED, TERMINATED, CANCELLED
- **Indexes**: `claim_id`, `status`

### 9. bn_payment_instruction
- **Purpose**: Individual payable instruction generated from entitlement
- **PK**: `id` (UUID)
- **FK**: `entitlement_id` → `bn_entitlement`, `batch_id` → `bn_payment_batch`
- **Major Columns**: `entitlement_id`, `claim_id`, `ssn`, `instruction_type`, `status`, `amount`, `net_amount`, `deductions` (JSONB), `period_start`, `period_end`, `payment_method`, `bank_account`, `bank_routing`, `payee_name`, `batch_id`, `cl_cheque_no`, `issued_at`, `blocked_reason`, `released_by`
- **Statuses**: PENDING, READY, BLOCKED, BATCHED, ISSUING, ISSUED, FAILED, CANCELLED, VOID
- **Indexes**: `entitlement_id`, `batch_id`, `status`, `cl_cheque_no`

### 10. bn_payment_schedule
- **Purpose**: Planned disbursement timeline for entitlements
- **PK**: `id` (UUID)
- **FK**: `entitlement_id` → `bn_entitlement`
- **Major Columns**: `entitlement_id`, `claim_id`, `schedule_type`, `frequency`, `installments` (JSONB array), `total_amount`, `next_due_date`, `generated_by`, `generated_at`
- **Indexes**: `entitlement_id`

### 11. bn_payment_batch
- **Purpose**: Controlled grouping of payment instructions for issuance
- **PK**: `id` (UUID)
- **Major Columns**: `batch_number`, `batch_type`, `status`, `payment_method`, `total_instructions`, `total_amount`, `created_by`, `created_at`, `submitted_by`, `submitted_at`, `approved_by`, `approved_at`, `issued_by`, `issued_at`, `completed_at`
- **Statuses**: OPEN, SUBMITTED, APPROVED, REJECTED, ISSUING, COMPLETED, FAILED, CANCELLED
- **Indexes**: `batch_number`, `status`

### 12. bn_payment_exception
- **Purpose**: Record payment failures and reconciliation issues
- **PK**: `id` (UUID)
- **FK**: `instruction_id` → `bn_payment_instruction`, `batch_id` → `bn_payment_batch`
- **Major Columns**: `instruction_id`, `batch_id`, `claim_id`, `exception_type`, `severity`, `description`, `error_details` (JSONB), `resolution_status`, `resolved_by`, `resolved_at`, `resolution_notes`
- **Statuses**: OPEN, INVESTIGATING, RESOLVED, ESCALATED, WRITTEN_OFF
- **Indexes**: `batch_id`, `resolution_status`

### 13. bn_post_issue_task
- **Purpose**: Track post-payment side-effect execution
- **PK**: `id` (UUID)
- **FK**: `instruction_id` → `bn_payment_instruction`
- **Major Columns**: `instruction_id`, `claim_id`, `task_type`, `status`, `is_mandatory`, `target_table`, `target_field`, `expected_value`, `actual_value`, `retry_count`, `max_retries`, `error_message`, `executed_by`, `executed_at`, `skipped_by`, `skipped_at`, `skip_reason`
- **Task Types**: CL_HEAD_UPDATE, CLAIM_CLOSURE, WAGES_CREDITED, POSTAL_REG_UPDATE, PENSION_SUPPORT, SURVIVOR_FOLLOW_UP, HOLDING_FOLLOW_UP, ENTITLEMENT_UPDATE, SEQUENCE_UPDATE, LINKED_CLAIM_UPDATE, AUDIT_COMPLETION, NOTIFICATION_SEND
- **Statuses**: PENDING, EXECUTING, COMPLETED, FAILED, SKIPPED, DEFERRED

### 14. bn_rule_version (via bn_product_version)
- **Purpose**: Version governance for benefit rules
- **Note**: Uses existing `bn_product_version` table with status lifecycle: Draft → Pending → Approved → Active → Retired
- **Governance Columns**: `status`, `effective_date`, `expiry_date`, `change_notes`, `entered_by`, `modified_by`

### 15. bn_approval_request
- **Purpose**: Track approval requests with maker-checker enforcement
- **PK**: `id` (UUID)
- **FK**: `claim_id` → `bn_claim`
- **Major Columns**: `claim_id`, `request_type`, `status`, `requested_by`, `requested_at`, `assigned_to`, `decision`, `decided_by`, `decided_at`, `comments`, `evidence_complete`, `calc_complete`, `eligibility_passed`
- **Statuses**: PENDING, APPROVED, REJECTED, ESCALATED, WITHDRAWN
