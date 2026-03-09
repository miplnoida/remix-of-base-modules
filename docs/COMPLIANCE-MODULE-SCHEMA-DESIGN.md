# Compliance Module — Database Schema Design Document

> **Status**: Draft for Review  
> **Date**: 2026-03-09  
> **Module**: Compliance & Enforcement  
> **Prefix**: `ce_` (Compliance Enforcement)

---

## 1. Design Principles

- **No RLS** — Authorization enforced at application/edge-function layer via role-based security.
- **No duplication** — Financial parameters (grace period, penalty rate, interest rate, arrears threshold) are **NOT** stored here; they live in `c3_config_details` and are referenced dynamically.
- **Audit trail** — Every table includes `created_by`, `created_at`, `updated_by`, `updated_at`.
- **Soft deletes** — `is_deleted` boolean + `deleted_at` timestamp where applicable.
- **Fund separation** — Violations and cases track fund type (`SS`, `LV`, `PE`) and support both fund-specific and consolidated employer views.

---

## 2. Table Inventory

| # | Table Name | Purpose |
|---|---|---|
| 1 | `ce_violation_types` | Configurable violation type definitions |
| 2 | `ce_number_templates` | Violation number template engine |
| 3 | `ce_number_sequences` | Auto-increment sequences per template |
| 4 | `ce_detection_rules` | Rule engine — detection rules |
| 5 | `ce_calculation_rules` | Rule engine — calculation rules |
| 6 | `ce_escalation_rules` | Rule engine — escalation rules |
| 7 | `ce_violations` | Core violations ledger |
| 8 | `ce_violation_history` | Violation status change audit trail |
| 9 | `ce_cases` | Compliance case management |
| 10 | `ce_case_history` | Case lifecycle audit trail |
| 11 | `ce_case_violations` | Many-to-many: cases ↔ violations |
| 12 | `ce_risk_profiles` | Employer risk scores and bands |
| 13 | `ce_risk_score_history` | Risk score change history |
| 14 | `ce_risk_config` | Risk scoring weights and thresholds |
| 15 | `ce_inspections` | Field inspection records |
| 16 | `ce_inspection_findings` | Findings from inspections |
| 17 | `ce_payment_arrangements` | Installment arrangements |
| 18 | `ce_installments` | Individual installment records |
| 19 | `ce_arrangement_breaches` | Automatic breach detection records |
| 20 | `ce_legal_escalations` | Legal workflow stages |
| 21 | `ce_legal_documents` | Documents generated per legal stage |
| 22 | `ce_notices` | Notice records (warning, demand, final, etc.) |
| 23 | `ce_waivers` | Waiver/override requests with approval workflow |
| 24 | `ce_automation_jobs` | Job definitions (daily scan, weekly review, etc.) |
| 25 | `ce_automation_runs` | Job execution history |
| 26 | `ce_settings` | Module-level key-value settings |
| 27 | `ce_audit_log` | Comprehensive audit log for all compliance actions |

---

## 3. Detailed Schema

### 3.1 `ce_violation_types`

Configurable violation types replacing the hardcoded enum.

```sql
CREATE TABLE ce_violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,        -- e.g. 'LATE_FILING', 'NON_PAYMENT'
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50),                     -- 'filing', 'payment', 'declaration', 'legal'
  fund_type VARCHAR(10),                    -- 'SS', 'LV', 'PE', NULL = all funds
  severity_default VARCHAR(20) DEFAULT 'Medium', -- Low/Medium/High/Critical
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed values**: Late Filing, Non Filing, Partial Payment, Non Payment, Under Declaration, Levy/Severance Omission, Repeat Default, Arrangement Default, Legal Default.

---

### 3.2 `ce_number_templates`

Configurable violation number template engine.

```sql
CREATE TABLE ce_number_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  template_pattern VARCHAR(100) NOT NULL,  -- e.g. 'COMP-{YYYY}-{NNNNN}'
  description TEXT,
  applies_to VARCHAR(50) DEFAULT 'violation', -- 'violation', 'case', 'inspection', 'notice'
  is_default BOOLEAN DEFAULT false,
  padding_length INTEGER DEFAULT 5,         -- for {NNNNN}
  prefix VARCHAR(20),                        -- static prefix if any
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 `ce_number_sequences`

```sql
CREATE TABLE ce_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES ce_number_templates(id),
  year INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  UNIQUE(template_id, year)
);
```

---

### 3.4–3.6 Rule Engine Tables

#### `ce_detection_rules`

```sql
CREATE TABLE ce_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  violation_type_id UUID REFERENCES ce_violation_types(id),
  trigger_event VARCHAR(100) NOT NULL,      -- 'c3_deadline_passed', 'payment_not_received', etc.
  condition_expression TEXT,                 -- JSON or expression for evaluation
  parameters JSONB DEFAULT '{}',            -- configurable thresholds
  auto_create_violation BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `ce_calculation_rules`

```sql
CREATE TABLE ce_calculation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  applies_to VARCHAR(50) NOT NULL,           -- 'penalty', 'interest', 'fine'
  fund_type VARCHAR(10),                     -- 'SS', 'LV', 'PE', NULL = all
  formula_expression TEXT NOT NULL,          -- expression or reference to C3 config
  source_config VARCHAR(100),               -- 'c3_config_details' field name to read from
  parameters JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `ce_escalation_rules`

```sql
CREATE TABLE ce_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  condition_expression TEXT,                 -- e.g. 'days_open > 30'
  days_threshold INTEGER,
  amount_threshold NUMERIC(15,2),
  auto_escalate BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  notification_template_id UUID,
  is_enabled BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.7 `ce_violations`

Core violations table — replaces the mock service.

```sql
CREATE TABLE ce_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20),
  employer_name VARCHAR(200),
  territory VARCHAR(20),                     -- 'St Kitts', 'Nevis'
  violation_type_id UUID REFERENCES ce_violation_types(id),
  fund_type VARCHAR(10),                     -- 'SS', 'LV', 'PE'
  status VARCHAR(30) DEFAULT 'OPEN',
  priority VARCHAR(20) DEFAULT 'Medium',
  severity VARCHAR(20) DEFAULT 'Medium',
  summary TEXT NOT NULL,
  description TEXT,
  -- Financial
  principal_amount NUMERIC(15,2) DEFAULT 0,
  penalty_amount NUMERIC(15,2) DEFAULT 0,
  interest_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  -- Source references
  source_type VARCHAR(50),                   -- 'detection_rule', 'inspection', 'manual', 'scouting'
  source_rule_id UUID,
  inspection_id UUID,
  c3_submission_id UUID,
  -- Scouting (unlinked)
  is_unlinked BOOLEAN DEFAULT false,
  candidate_business_name VARCHAR(200),
  candidate_location VARCHAR(200),
  candidate_activity_type VARCHAR(100),
  estimated_employees INTEGER,
  -- Assignment
  assigned_to_user_id VARCHAR(10),
  assigned_to_name VARCHAR(100),
  assigned_at TIMESTAMPTZ,
  -- Dates
  discovered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discovered_by VARCHAR(10),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(10),
  resolution_notes TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_to VARCHAR(100),
  -- Period reference
  period_from VARCHAR(7),                    -- YYYY-MM
  period_to VARCHAR(7),
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
```

### 3.8 `ce_violation_history`

```sql
CREATE TABLE ce_violation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID REFERENCES ce_violations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,               -- 'status_change', 'assigned', 'escalated'
  from_value VARCHAR(100),
  to_value VARCHAR(100),
  notes TEXT,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.9 `ce_cases`

Compliance Case Management with full lifecycle.

```sql
CREATE TABLE ce_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  status VARCHAR(50) DEFAULT 'OPEN',
  -- Status options: OPEN, UNDER_REVIEW, NOTICE_ISSUED, AWAITING_RESPONSE,
  --   PAYMENT_ARRANGEMENT, INSPECTION_SCHEDULED, LEGAL_REVIEW,
  --   COURT_ACTION, JUDGMENT_MONITORING, ENFORCEMENT_IN_PROGRESS,
  --   RESOLVED, CLOSED
  priority VARCHAR(20) DEFAULT 'Medium',
  case_type VARCHAR(50),                     -- 'fund_specific', 'consolidated'
  fund_type VARCHAR(10),                     -- NULL for consolidated
  summary TEXT,
  -- Financial summary
  total_principal NUMERIC(15,2) DEFAULT 0,
  total_penalties NUMERIC(15,2) DEFAULT 0,
  total_interest NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  amount_collected NUMERIC(15,2) DEFAULT 0,
  -- Assignment
  assigned_officer_id VARCHAR(10),
  assigned_officer_name VARCHAR(100),
  -- Risk
  risk_band VARCHAR(20),                     -- 'Low', 'Medium', 'High', 'Critical'
  risk_score NUMERIC(5,2),
  -- Dates
  opened_date DATE DEFAULT CURRENT_DATE,
  target_resolution_date DATE,
  closed_date DATE,
  closure_reason TEXT,
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
```

### 3.10 `ce_case_history`

```sql
CREATE TABLE ce_case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES ce_cases(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  notes TEXT,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.11 `ce_case_violations`

```sql
CREATE TABLE ce_case_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES ce_cases(id) ON DELETE CASCADE,
  violation_id UUID REFERENCES ce_violations(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by VARCHAR(10),
  UNIQUE(case_id, violation_id)
);
```

---

### 3.12 `ce_risk_profiles`

```sql
CREATE TABLE ce_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id VARCHAR(20) UNIQUE NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  -- Score components
  arrears_score NUMERIC(5,2) DEFAULT 0,
  violation_score NUMERIC(5,2) DEFAULT 0,
  filing_score NUMERIC(5,2) DEFAULT 0,
  legal_history_score NUMERIC(5,2) DEFAULT 0,
  payment_behavior_score NUMERIC(5,2) DEFAULT 0,
  -- Aggregate
  total_score NUMERIC(5,2) DEFAULT 0,
  risk_band VARCHAR(20) DEFAULT 'Low',       -- Low/Medium/High/Critical
  -- Metadata
  last_calculated_at TIMESTAMPTZ,
  next_review_date DATE,
  override_band VARCHAR(20),                  -- manual override if any
  override_reason TEXT,
  override_by VARCHAR(10),
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.13 `ce_risk_score_history`

```sql
CREATE TABLE ce_risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_profile_id UUID REFERENCES ce_risk_profiles(id) ON DELETE CASCADE,
  previous_score NUMERIC(5,2),
  new_score NUMERIC(5,2),
  previous_band VARCHAR(20),
  new_band VARCHAR(20),
  calculation_details JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by VARCHAR(10)
);
```

### 3.14 `ce_risk_config`

```sql
CREATE TABLE ce_risk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_code VARCHAR(50) UNIQUE NOT NULL,
  factor_name VARCHAR(150) NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score NUMERIC(5,2) DEFAULT 100,
  scoring_method VARCHAR(50),                -- 'linear', 'threshold', 'tiered'
  thresholds JSONB,                          -- band thresholds config
  is_enabled BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.15 `ce_inspections`

```sql
CREATE TABLE ce_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  case_id UUID REFERENCES ce_cases(id),
  inspection_type VARCHAR(50),               -- 'routine', 'targeted', 'follow_up', 'complaint'
  status VARCHAR(30) DEFAULT 'SCHEDULED',    -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  -- Assignment
  inspector_id VARCHAR(10),
  inspector_name VARCHAR(100),
  -- Schedule
  scheduled_date DATE,
  scheduled_time TIME,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  -- Location
  location_address TEXT,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  -- Results
  findings_summary TEXT,
  wage_books_reviewed BOOLEAN DEFAULT false,
  employees_interviewed INTEGER DEFAULT 0,
  documents_collected JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  employer_signature_data TEXT,
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.16 `ce_inspection_findings`

```sql
CREATE TABLE ce_inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES ce_inspections(id) ON DELETE CASCADE,
  finding_type VARCHAR(50),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'Medium',
  violation_created BOOLEAN DEFAULT false,
  violation_id UUID REFERENCES ce_violations(id),
  evidence_documents JSONB DEFAULT '[]',
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.17 `ce_payment_arrangements`

```sql
CREATE TABLE ce_payment_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  case_id UUID REFERENCES ce_cases(id),
  status VARCHAR(30) DEFAULT 'DRAFT',        -- DRAFT, ACTIVE, COMPLETED, DEFAULTED, CANCELLED
  -- Terms
  total_debt NUMERIC(15,2) NOT NULL,
  down_payment NUMERIC(15,2) DEFAULT 0,
  installment_amount NUMERIC(15,2) NOT NULL,
  number_of_installments INTEGER NOT NULL,
  frequency VARCHAR(20) DEFAULT 'monthly',   -- weekly, fortnightly, monthly
  start_date DATE NOT NULL,
  end_date DATE,
  -- Tracking
  total_paid NUMERIC(15,2) DEFAULT 0,
  installments_paid INTEGER DEFAULT 0,
  next_due_date DATE,
  missed_payments INTEGER DEFAULT 0,
  -- Agreement
  terms_text TEXT,
  conditions JSONB DEFAULT '[]',
  agreement_document_url TEXT,
  agreement_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  -- Breach config
  max_missed_before_breach INTEGER DEFAULT 2,
  breach_detected BOOLEAN DEFAULT false,
  breach_date DATE,
  breach_reason TEXT,
  -- Approval
  approved_by VARCHAR(10),
  approved_at TIMESTAMPTZ,
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.18 `ce_installments`

```sql
CREATE TABLE ce_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID REFERENCES ce_payment_arrangements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  paid_date DATE,
  payment_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING',      -- PENDING, PAID, PARTIAL, OVERDUE, WAIVED
  is_overdue BOOLEAN DEFAULT false,
  overdue_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.19 `ce_arrangement_breaches`

```sql
CREATE TABLE ce_arrangement_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID REFERENCES ce_payment_arrangements(id) ON DELETE CASCADE,
  breach_type VARCHAR(50),                   -- 'missed_payment', 'insufficient_payment', 'terms_violation'
  description TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  detected_by VARCHAR(20),                   -- 'system' or user code
  resolution VARCHAR(50),                    -- 'reinstated', 'escalated', 'waived'
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(10),
  resolution_notes TEXT
);
```

---

### 3.20 `ce_legal_escalations`

```sql
CREATE TABLE ce_legal_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_number VARCHAR(50) UNIQUE NOT NULL,
  case_id UUID REFERENCES ce_cases(id),
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  current_stage VARCHAR(50) DEFAULT 'WARNING_NOTICE',
  -- Stages: WARNING_NOTICE, DEMAND_NOTICE, FINAL_DEMAND,
  --   LEGAL_ACTION_REQUISITION, SUMMONS, JUDGMENT_SUMMONS,
  --   WRIT_OF_EXECUTION, COMMITMENT_JDS, RECOVERY_MONITORING
  amount_in_dispute NUMERIC(15,2),
  -- Court details
  court_name VARCHAR(200),
  court_case_number VARCHAR(100),
  hearing_date DATE,
  judgment_amount NUMERIC(15,2),
  judgment_date DATE,
  -- Assignment
  legal_officer_id VARCHAR(10),
  legal_officer_name VARCHAR(100),
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.21 `ce_legal_documents`

```sql
CREATE TABLE ce_legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID REFERENCES ce_legal_escalations(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,        -- matches stage names
  document_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by VARCHAR(10),
  sent_at TIMESTAMPTZ,
  sent_method VARCHAR(30),                   -- 'email', 'post', 'hand_delivered'
  acknowledged_at TIMESTAMPTZ,
  notes TEXT
);
```

### 3.22 `ce_notices`

```sql
CREATE TABLE ce_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  case_id UUID REFERENCES ce_cases(id),
  violation_id UUID REFERENCES ce_violations(id),
  notice_type VARCHAR(50) NOT NULL,          -- 'reminder', 'warning', 'demand', 'final_demand'
  status VARCHAR(30) DEFAULT 'DRAFT',        -- DRAFT, SENT, DELIVERED, ACKNOWLEDGED, EXPIRED
  subject VARCHAR(200),
  body TEXT,
  template_id UUID,
  delivery_method VARCHAR(30),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  due_response_date DATE,
  response_received BOOLEAN DEFAULT false,
  response_date DATE,
  response_notes TEXT,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.23 `ce_waivers`

```sql
CREATE TABLE ce_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  case_id UUID REFERENCES ce_cases(id),
  waiver_type VARCHAR(50) NOT NULL,          -- 'penalty_waiver', 'interest_waiver', 'override', 'exception'
  status VARCHAR(30) DEFAULT 'PENDING',      -- PENDING, APPROVED, REJECTED, CANCELLED
  amount_requested NUMERIC(15,2),
  amount_approved NUMERIC(15,2),
  justification TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]',
  -- Approval chain
  requested_by VARCHAR(10),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewer_id VARCHAR(10),
  reviewer_decision VARCHAR(20),
  reviewer_comments TEXT,
  reviewed_at TIMESTAMPTZ,
  approver_id VARCHAR(10),
  approver_decision VARCHAR(20),
  approver_comments TEXT,
  approved_at TIMESTAMPTZ,
  -- Audit
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.24 `ce_automation_jobs`

```sql
CREATE TABLE ce_automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  job_type VARCHAR(50) NOT NULL,
  -- Types: 'daily_violation_scan', 'weekly_escalation_review',
  --   'monthly_penalty_recalc', 'monthly_risk_reclass', 'notice_generation'
  schedule_cron VARCHAR(50),                 -- cron expression
  frequency VARCHAR(30),                     -- 'daily', 'weekly', 'monthly'
  is_enabled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  next_scheduled_at TIMESTAMPTZ,
  parameters JSONB DEFAULT '{}',
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.25 `ce_automation_runs`

```sql
CREATE TABLE ce_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES ce_automation_jobs(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'RUNNING',      -- RUNNING, COMPLETED, FAILED, CANCELLED
  records_processed INTEGER DEFAULT 0,
  records_affected INTEGER DEFAULT 0,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]',
  triggered_by VARCHAR(20) DEFAULT 'system'  -- 'system' or user code
);
```

---

### 3.26 `ce_settings`

```sql
CREATE TABLE ce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20) DEFAULT 'string',    -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  category VARCHAR(50),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.27 `ce_audit_log`

```sql
CREATE TABLE ce_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,          -- 'violation', 'case', 'inspection', etc.
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now(),
  ip_address VARCHAR(50),
  user_agent TEXT
);
```

---

## 4. Enums / Status Values

### Violation Statuses
`OPEN`, `UNDER_REVIEW`, `ESCALATED`, `LEGAL`, `RESOLVED`, `CLOSED`, `CANCELLED`

### Case Lifecycle Statuses
`OPEN`, `UNDER_REVIEW`, `NOTICE_ISSUED`, `AWAITING_RESPONSE`, `PAYMENT_ARRANGEMENT`, `INSPECTION_SCHEDULED`, `LEGAL_REVIEW`, `COURT_ACTION`, `JUDGMENT_MONITORING`, `ENFORCEMENT_IN_PROGRESS`, `RESOLVED`, `CLOSED`

### Legal Escalation Stages
`WARNING_NOTICE`, `DEMAND_NOTICE`, `FINAL_DEMAND`, `LEGAL_ACTION_REQUISITION`, `SUMMONS`, `JUDGMENT_SUMMONS`, `WRIT_OF_EXECUTION`, `COMMITMENT_JDS`, `RECOVERY_MONITORING`

### Risk Bands
`Low` (0–25), `Medium` (26–50), `High` (51–75), `Critical` (76–100)

### Arrangement Status
`DRAFT`, `ACTIVE`, `COMPLETED`, `DEFAULTED`, `CANCELLED`

---

## 5. Cross-References

| This Module | References | From Table |
|---|---|---|
| Financial Rates | `c3_config_details` | penalty rate, interest rate, grace period |
| Employer Data | External API / `er_master` | employer details |
| C3 Submissions | `cn_c3_reported` / `ip_wages` | filing compliance checks |
| Workflow Approvals | `workflow_definitions` | waiver/closure approval flows |

---

## 6. Indexes (Recommended)

```sql
-- High-frequency queries
CREATE INDEX idx_ce_violations_employer ON ce_violations(employer_id);
CREATE INDEX idx_ce_violations_status ON ce_violations(status);
CREATE INDEX idx_ce_violations_type ON ce_violations(violation_type_id);
CREATE INDEX idx_ce_cases_employer ON ce_cases(employer_id);
CREATE INDEX idx_ce_cases_status ON ce_cases(status);
CREATE INDEX idx_ce_risk_profiles_band ON ce_risk_profiles(risk_band);
CREATE INDEX idx_ce_inspections_inspector ON ce_inspections(inspector_id);
CREATE INDEX idx_ce_installments_due ON ce_installments(due_date, status);
CREATE INDEX idx_ce_audit_log_entity ON ce_audit_log(entity_type, entity_id);
```

---

## 7. Next Steps

1. ✅ Review this schema design
2. ⬜ Approve table creation (phased per feature)
3. ⬜ Create seed data for violation types, number templates, risk config
4. ⬜ Build RPCs for violation number generation, risk calculation, breach detection
5. ⬜ Wire UI pages to database
