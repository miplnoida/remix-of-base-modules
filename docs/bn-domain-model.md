# Benefit Management Module — Full Domain Model & Data Architecture

**Version:** 1.0  
**Date:** 2026-04-04  
**Status:** Approved Architecture  

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Entity Classification](#2-entity-classification)
3. [Core Domain Entities](#3-core-domain-entities)
4. [Configuration Entities](#4-configuration-entities)
5. [Transaction Entities](#5-transaction-entities)
6. [Service Case Entities](#6-service-case-entities)
7. [Audit & Trace Entities](#7-audit--trace-entities)
8. [Legacy Integration Entities](#8-legacy-integration-entities)
9. [Effective Dating & Versioning Model](#9-effective-dating--versioning-model)
10. [Legacy / New Coexistence Strategy](#10-legacy--new-coexistence-strategy)
11. [Text ERD](#11-text-erd)
12. [Table-by-Table Specification](#12-table-by-table-specification)
13. [Migration Safety Rules](#13-migration-safety-rules)

---

## 1. Design Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **Configuration-driven** | No benefit logic hardcoded in screens. All rules stored in versioned configuration tables. |
| 2 | **Country-extensible** | Every configuration entity scoped by `country_code`. SKN is the first country pack. |
| 3 | **Effective-dated** | Product versions, rules, rates — all carry `effective_from` / `effective_to`. Claim processing resolves the version active at `claim_date`. |
| 4 | **Legacy-safe** | Old data stays in old tables (`ip_wages`, `ip_master`, `er_master`, `cn_*`). New module reads but never writes to legacy tables. |
| 5 | **Audit-first** | Every `bn_*` table has `entered_by`, `modified_by`, `entered_at`, `modified_at`. Event tables capture all state transitions. |
| 6 | **No RLS** | Per project architecture rule. Authorization via role-based permissions at app/backend layer. |
| 7 | **Modular prefix** | All tables use `bn_` prefix for clear namespace separation. |
| 8 | **JSONB for extensibility** | Benefit-specific detail, rule definitions, calculation formulas stored as JSONB to avoid per-product child tables. |

---

## 2. Entity Classification

```
┌─────────────────────────────────────────────────────────────────────┐
│  REFERENCE / CORE            │  CONFIGURATION                       │
│  ─────────────────           │  ─────────────────                    │
│  bn_scheme                   │  bn_product_version                   │
│  bn_country                  │  bn_rule_group                        │
│  bn_product                  │  bn_eligibility_rule                  │
│  bn_branch                   │  bn_calculation_rule                  │
│                              │  bn_formula_template                  │
│                              │  bn_timeline_rule                     │
│                              │  bn_interaction_rule                  │
│                              │  bn_override_policy                   │
│                              │  bn_document_profile                  │
│                              │  bn_document_rule                     │
│                              │  bn_workflow_template                 │
│                              │  bn_screen_template                   │
│                              │  bn_field_metadata                    │
├──────────────────────────────┼───────────────────────────────────────┤
│  TRANSACTION                 │  SERVICE CASE                         │
│  ─────────────────           │  ─────────────────                    │
│  bn_claim                    │  bn_service_case_type                 │
│  bn_claim_participant        │  bn_service_case                      │
│  bn_claim_detail             │  bn_service_case_event                │
│  bn_claim_event              │  bn_service_case_document             │
│  bn_claim_eligibility        │                                       │
│  bn_claim_calculation        │                                       │
│  bn_claim_note               │                                       │
│  bn_document_submission      │                                       │
│  bn_award                    │                                       │
│  bn_award_beneficiary        │                                       │
│  bn_award_review             │                                       │
│  bn_payment_schedule         │                                       │
│  bn_payment_instruction      │                                       │
│  bn_payment_batch            │                                       │
│  bn_overpayment              │                                       │
│  bn_medical_referral         │                                       │
│  bn_medical_assessment       │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│  AUDIT & TRACE               │  LEGACY INTEGRATION                   │
│  ─────────────────           │  ─────────────────                    │
│  bn_calculation_trace        │  bn_legacy_mapping_profile            │
│  bn_workflow_event           │  bn_claim_shell                       │
│  bn_claim_event (shared)     │  (ip_master — read-only)              │
│  system_audit_trail (shared) │  (ip_wages — read-only)               │
│                              │  (er_master — read-only)              │
│                              │  (cn_receipt — read for payments)     │
└──────────────────────────────┴───────────────────────────────────────┘
```

---

## 3. Core Domain Entities

### 3.1 `bn_scheme`
The top-level organizational container. A scheme represents a social security programme (e.g., "National Insurance Scheme", "Workers Compensation Fund").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `scheme_code` | VARCHAR(20) | UNIQUE NOT NULL | e.g., `NIS`, `WCF` |
| `scheme_name` | VARCHAR(200) | NOT NULL | Full display name |
| `description` | TEXT | | |
| `country_code` | VARCHAR(3) | NOT NULL, FK → `bn_country` | ISO 3166-1 alpha-2/3 |
| `governing_legislation` | TEXT | | Act/regulation reference |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `'ACTIVE'` | `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `sort_order` | INT | DEFAULT 0 | |
| `entered_by` | VARCHAR(50) | | user_code |
| `modified_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |
| `modified_at` | TIMESTAMPTZ | DEFAULT `now()` | |

### 3.2 `bn_country`
Country registry for multi-country support. Stores country-specific parameters (currency, fiscal calendar, contribution ceilings).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `country_code` | VARCHAR(3) | PK | ISO code |
| `country_name` | VARCHAR(100) | NOT NULL | |
| `currency_code` | VARCHAR(3) | NOT NULL | e.g., `XCD` |
| `currency_symbol` | VARCHAR(5) | | e.g., `EC$` |
| `fiscal_year_start_month` | INT | DEFAULT 1 | 1=Jan |
| `contribution_ceiling_weekly` | NUMERIC(12,2) | | Max insurable earnings/week |
| `contribution_ceiling_annual` | NUMERIC(14,2) | | Max insurable earnings/year |
| `default_retirement_age` | INT | DEFAULT 62 | |
| `parameters` | JSONB | DEFAULT `'{}'` | Country-wide parameters |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |
| `modified_by` | VARCHAR(50) | | |
| `modified_at` | TIMESTAMPTZ | DEFAULT `now()` | |

### 3.3 `bn_branch`
A benefit branch groups related products (e.g., "Short-Term Benefits", "Long-Term Benefits", "Employment Injury").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `scheme_id` | UUID | FK → `bn_scheme` | |
| `branch_code` | VARCHAR(20) | UNIQUE NOT NULL | e.g., `STB`, `LTB`, `EI` |
| `branch_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `sort_order` | INT | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |

### 3.4 `bn_product`
A specific benefit type (Sickness, Maternity, Age Pension, Invalidity, etc.). This is the existing table enhanced with scheme/branch linkage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `scheme_id` | UUID | FK → `bn_scheme` | |
| `branch_id` | UUID | FK → `bn_branch` | |
| `benefit_code` | VARCHAR(20) | UNIQUE NOT NULL | e.g., `SICK`, `MAT`, `AGE` |
| `benefit_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `category` | VARCHAR(30) | NOT NULL | `SHORT_TERM`, `LONG_TERM`, `NON_CONTRIBUTORY`, `GRANT` |
| `payment_type` | VARCHAR(20) | NOT NULL | `PERIODIC`, `LUMP_SUM`, `BOTH` |
| `country_code` | VARCHAR(3) | FK → `bn_country` | |
| `status` | VARCHAR(20) | DEFAULT `'DRAFT'` | `DRAFT`, `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `sort_order` | INT | DEFAULT 0 | |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

---

## 4. Configuration Entities

### 4.1 `bn_product_version`
Effective-dated version of a product's configuration. All rules hang off a specific version.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `product_id` | UUID | FK → `bn_product` | |
| `version_number` | INT | NOT NULL | Sequential per product |
| `effective_from` | DATE | NOT NULL | |
| `effective_to` | DATE | NULLABLE | NULL = current/open-ended |
| `description` | TEXT | | Version description / amendment reference |
| `eligibility_config` | JSONB | DEFAULT `'{}'` | High-level eligibility parameters |
| `calculation_config` | JSONB | DEFAULT `'{}'` | High-level calculation parameters |
| `timeline_config` | JSONB | DEFAULT `'{}'` | Waiting periods, max duration |
| `workflow_template_id` | UUID | FK → `bn_workflow_template` | Claim workflow for this version |
| `document_profile_id` | UUID | FK → `bn_document_profile` | Required documents |
| `screen_template_id` | UUID | FK → `bn_screen_template` | Intake form layout |
| `requires_employer_verification` | BOOLEAN | DEFAULT FALSE | |
| `requires_medical_board_review` | BOOLEAN | DEFAULT FALSE | |
| `requires_means_test` | BOOLEAN | DEFAULT FALSE | |
| `max_concurrent_claims` | INT | DEFAULT 1 | |
| `status` | VARCHAR(20) | DEFAULT `'DRAFT'` | `DRAFT`, `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

**Unique constraint:** `(product_id, version_number)`

### 4.2 `bn_rule_group`
Groups rules logically (e.g., "Contribution Requirements", "Age Requirements", "Employment Status"). Allows reuse across products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `group_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `CONTRIB_REQ`, `AGE_REQ` |
| `group_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `country_code` | VARCHAR(3) | FK → `bn_country` | Scoped to country |
| `sort_order` | INT | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.3 `bn_eligibility_rule`
Individual eligibility check rule attached to a product version.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `product_version_id` | UUID | FK → `bn_product_version` | |
| `rule_group_id` | UUID | FK → `bn_rule_group`, NULLABLE | |
| `rule_code` | VARCHAR(30) | NOT NULL | e.g., `MIN_CONTRIB_WEEKS` |
| `rule_name` | VARCHAR(200) | NOT NULL | |
| `rule_type` | VARCHAR(30) | NOT NULL | `CONTRIBUTION`, `AGE`, `EMPLOYMENT`, `RESIDENCY`, `CUSTOM` |
| `rule_definition` | JSONB | NOT NULL | `{"operator":">=","field":"total_weeks","value":26}` |
| `data_source` | VARCHAR(50) | | `ip_wages`, `ip_master`, `er_master`, `claim_detail` |
| `fail_message` | TEXT | | Human-readable failure message |
| `fail_action` | VARCHAR(20) | DEFAULT `'REJECT'` | `REJECT`, `WARN`, `REFER` |
| `sort_order` | INT | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.4 `bn_calculation_rule`
Defines how benefit amounts are computed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `product_version_id` | UUID | FK → `bn_product_version` | |
| `rule_code` | VARCHAR(30) | NOT NULL | e.g., `BASE_RATE`, `CEILING_CAP` |
| `rule_name` | VARCHAR(200) | NOT NULL | |
| `calc_type` | VARCHAR(30) | NOT NULL | `FORMULA`, `TIER_TABLE`, `FLAT_RATE`, `PERCENTAGE`, `LOOKUP` |
| `formula_template_id` | UUID | FK → `bn_formula_template`, NULLABLE | |
| `formula_definition` | JSONB | NOT NULL | Formula/tier/rate definition |
| `variables` | JSONB | DEFAULT `'[]'` | Variable definitions with data sources |
| `limits` | JSONB | DEFAULT `'{}'` | `{"min":0,"max":500,"ceiling":"contribution_ceiling_weekly"}` |
| `rounding_rule` | VARCHAR(20) | DEFAULT `'HALF_UP'` | `HALF_UP`, `FLOOR`, `CEIL`, `NONE` |
| `sort_order` | INT | | Execution sequence |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.5 `bn_formula_template`
Reusable formula templates that can be shared across calculation rules and products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `template_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `PCT_AVG_WAGE` |
| `template_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `formula_expression` | TEXT | NOT NULL | e.g., `avg_weekly_wages * rate / 100` |
| `input_variables` | JSONB | NOT NULL | `[{"name":"avg_weekly_wages","type":"NUMERIC","source":"ip_wages"}]` |
| `output_type` | VARCHAR(20) | DEFAULT `'NUMERIC'` | |
| `country_code` | VARCHAR(3) | FK → `bn_country` | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.6 `bn_timeline_rule`
Defines temporal constraints (waiting periods, max durations, filing deadlines).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `product_version_id` | UUID | FK → `bn_product_version` | |
| `rule_code` | VARCHAR(30) | NOT NULL | e.g., `WAITING_PERIOD`, `MAX_DURATION` |
| `rule_name` | VARCHAR(200) | NOT NULL | |
| `timeline_type` | VARCHAR(30) | NOT NULL | `WAITING_PERIOD`, `MAX_DURATION`, `FILING_DEADLINE`, `REVIEW_INTERVAL` |
| `days_value` | INT | | |
| `weeks_value` | INT | | |
| `months_value` | INT | | |
| `calendar_type` | VARCHAR(20) | DEFAULT `'CALENDAR'` | `CALENDAR`, `BUSINESS` |
| `description` | TEXT | | |
| `sort_order` | INT | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.7 `bn_interaction_rule`
Defines how concurrent or sequential claims for different products interact (e.g., sickness suspends pension, maternity cannot overlap sickness).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `primary_product_id` | UUID | FK → `bn_product` | |
| `related_product_id` | UUID | FK → `bn_product` | |
| `interaction_type` | VARCHAR(30) | NOT NULL | `SUSPENDS`, `BLOCKS`, `OFFSETS`, `SUPPLEMENTS`, `REPLACES` |
| `rule_definition` | JSONB | DEFAULT `'{}'` | Additional conditions |
| `effective_from` | DATE | NOT NULL | |
| `effective_to` | DATE | | |
| `description` | TEXT | | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.8 `bn_override_policy`
Defines what fields/decisions can be overridden by which roles, under what conditions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `product_id` | UUID | FK → `bn_product`, NULLABLE | NULL = global |
| `override_target` | VARCHAR(30) | NOT NULL | `ELIGIBILITY`, `CALCULATION`, `TIMELINE`, `PAYMENT` |
| `field_path` | VARCHAR(100) | | Specific field or `*` for any |
| `allowed_role` | VARCHAR(50) | NOT NULL | Role that can override |
| `requires_justification` | BOOLEAN | DEFAULT TRUE | |
| `requires_maker_checker` | BOOLEAN | DEFAULT TRUE | |
| `max_override_amount` | NUMERIC(14,2) | | Financial limit |
| `effective_from` | DATE | NOT NULL | |
| `effective_to` | DATE | | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.9 `bn_document_profile`
Groups document requirements into a named profile that is assigned to a product version.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `profile_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `STB_DOCS`, `LTB_DOCS` |
| `profile_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `country_code` | VARCHAR(3) | FK → `bn_country` | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.10 `bn_document_rule`
Individual document requirement within a profile.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `document_profile_id` | UUID | FK → `bn_document_profile` | |
| `product_id` | UUID | FK → `bn_product`, NULLABLE | Override at product level |
| `document_type_code` | VARCHAR(30) | NOT NULL | Links to `tb_verify.code` |
| `document_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `is_mandatory` | BOOLEAN | DEFAULT TRUE | |
| `stage` | VARCHAR(30) | DEFAULT `'INTAKE'` | `INTAKE`, `EVIDENCE`, `REVIEW`, `AWARD` |
| `allowed_extensions` | TEXT[] | | `{'.pdf','.jpg','.png'}` |
| `max_file_size_mb` | NUMERIC(5,1) | DEFAULT 10 | |
| `sort_order` | INT | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.11 `bn_workflow_template`
Defines the workflow pattern for processing claims of a specific product version.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `template_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `WF_STB_CLAIM` |
| `template_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `workflow_definition_id` | UUID | FK → `workflow_definitions`, NULLABLE | Links to existing engine |
| `steps_config` | JSONB | DEFAULT `'[]'` | Ordered step definitions |
| `sla_config` | JSONB | DEFAULT `'{}'` | SLA per step |
| `escalation_config` | JSONB | DEFAULT `'{}'` | Escalation rules |
| `country_code` | VARCHAR(3) | FK → `bn_country` | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.12 `bn_screen_template`
Defines the intake/claim form layout for a product. The UI renders dynamically based on this configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `template_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `FORM_SICKNESS` |
| `template_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `sections` | JSONB | NOT NULL | `[{"code":"PERSONAL","label":"Personal Details","fields":["ssn","dob"]}]` |
| `layout_type` | VARCHAR(20) | DEFAULT `'WIZARD'` | `WIZARD`, `TABBED`, `SINGLE_PAGE` |
| `country_code` | VARCHAR(3) | FK → `bn_country` | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 4.13 `bn_field_metadata`
Metadata for dynamic form fields. Defines validation, rendering hints, and data source mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `screen_template_id` | UUID | FK → `bn_screen_template` | |
| `field_code` | VARCHAR(50) | NOT NULL | e.g., `date_of_incapacity` |
| `field_label` | VARCHAR(200) | NOT NULL | |
| `field_type` | VARCHAR(20) | NOT NULL | `TEXT`, `DATE`, `NUMBER`, `SELECT`, `CHECKBOX`, `TEXTAREA`, `SSN_LOOKUP` |
| `section_code` | VARCHAR(30) | NOT NULL | Must match a section in `bn_screen_template.sections` |
| `is_required` | BOOLEAN | DEFAULT FALSE | |
| `validation_rules` | JSONB | DEFAULT `'{}'` | `{"min":0,"max":999,"pattern":"^\\d{6}$"}` |
| `options_source` | VARCHAR(100) | | Lookup table or API path for SELECT fields |
| `default_value` | TEXT | | |
| `help_text` | TEXT | | |
| `sort_order` | INT | DEFAULT 0 | Within section |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

**Unique constraint:** `(screen_template_id, field_code)`

---

## 5. Transaction Entities

### 5.1 `bn_claim`
The central transaction record. One claim per benefit application.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_number` | VARCHAR(30) | UNIQUE | Auto-generated: `BN-{YYYY}-{SEQ:06}` |
| `ssn` | VARCHAR(20) | NOT NULL | FK-like to `ip_master.ssn` (no hard FK) |
| `product_id` | UUID | FK → `bn_product` | |
| `product_version_id` | UUID | FK → `bn_product_version`, NULLABLE | Resolved at submission |
| `scheme_id` | UUID | FK → `bn_scheme` | Denormalized for query performance |
| `employer_regno` | VARCHAR(20) | | FK-like to `er_master.regno` |
| `status` | VARCHAR(30) | NOT NULL DEFAULT `'DRAFT'` | See status enum below |
| `priority` | VARCHAR(10) | DEFAULT `'NORMAL'` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `source` | VARCHAR(20) | DEFAULT `'WALK_IN'` | `WALK_IN`, `PAPER`, `ONLINE`, `LEGACY`, `BATCH` |
| `claim_date` | DATE | NOT NULL | Date of claim (drives version resolution) |
| `submission_date` | DATE | | When formally submitted |
| `decision_date` | DATE | | When approved/denied |
| `effective_date` | DATE | | When benefit starts |
| `end_date` | DATE | | When benefit ends (if known) |
| `legacy_claim_ref` | TEXT | | Reference to legacy system claim |
| `workflow_instance_id` | UUID | FK → `workflow_instances`, NULLABLE | |
| `assigned_to` | VARCHAR(50) | | Current officer user_code |
| `assigned_team` | VARCHAR(50) | | Team/unit assignment |
| `contact_phone` | VARCHAR(30) | | |
| `contact_email` | VARCHAR(200) | | |
| `bank_account` | VARCHAR(50) | | |
| `bank_routing_number` | VARCHAR(30) | | |
| `bank_name` | VARCHAR(100) | | |
| `payment_method` | VARCHAR(20) | DEFAULT `'CHEQUE'` | `CHEQUE`, `BANK_TRANSFER`, `CASH` |
| `declaration` | BOOLEAN | DEFAULT FALSE | Applicant declaration |
| `digital_signature` | TEXT | | |
| `detail_json` | JSONB | DEFAULT `'{}'` | **Benefit-specific fields** |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

**Claim Status Enum:**
`DRAFT` → `SUBMITTED` → `INTAKE_REVIEW` → `ELIGIBILITY_CHECK` → `EVIDENCE_REVIEW` → `CALCULATION` → `DECISION` → `APPROVED` / `DENIED` → `AWARD_SETUP` → `PAYMENT_QUEUE` → `IN_PAYMENT` → `CLOSED`
Side states: `PENDING_INFO`, `SUSPENDED`, `WITHDRAWN`

### 5.2 `bn_claim_participant`
People associated with a claim beyond the primary claimant (dependents, beneficiaries, employers, representatives, medical practitioners).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `participant_role` | VARCHAR(30) | NOT NULL | `CLAIMANT`, `DEPENDENT`, `BENEFICIARY`, `EMPLOYER`, `REPRESENTATIVE`, `DOCTOR`, `WITNESS` |
| `ssn` | VARCHAR(20) | | If registered person |
| `registration_number` | VARCHAR(30) | | If employer/doctor |
| `full_name` | VARCHAR(200) | NOT NULL | |
| `relationship` | VARCHAR(30) | | e.g., `SPOUSE`, `CHILD`, `PARENT` |
| `date_of_birth` | DATE | | |
| `gender` | VARCHAR(1) | | `M`, `F`, `N` |
| `contact_phone` | VARCHAR(30) | | |
| `contact_email` | VARCHAR(200) | | |
| `address` | TEXT | | |
| `share_percentage` | NUMERIC(5,2) | | For beneficiary split |
| `is_primary` | BOOLEAN | DEFAULT FALSE | |
| `participant_data` | JSONB | DEFAULT `'{}'` | Role-specific extra data |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.3 `bn_claim_detail`
Stores benefit-specific data as JSONB. Schema is driven by `bn_screen_template` / `bn_field_metadata`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim`, UNIQUE | One detail record per claim |
| `detail_json` | JSONB | NOT NULL DEFAULT `'{}'` | All product-specific fields |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

> **Note:** `detail_json` could contain fields like `{"date_of_incapacity":"2026-03-15","diagnosis_code":"J11","treating_doctor_ssn":"123456","employer_last_day":"2026-03-14"}` for a Sickness claim, or `{"funeral_date":"2026-02-01","deceased_ssn":"654321","relationship_to_deceased":"SPOUSE"}` for a Funeral Grant.

### 5.4 `bn_document_submission`
Documents submitted for a claim. Replaces `bn_claim_document` with richer metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `service_case_id` | UUID | FK → `bn_service_case`, NULLABLE | If submitted for a service case |
| `document_rule_id` | UUID | FK → `bn_document_rule`, NULLABLE | Which requirement this fulfills |
| `document_type_code` | VARCHAR(30) | NOT NULL | Links to `tb_verify.code` |
| `document_name` | VARCHAR(200) | | |
| `file_name` | VARCHAR(500) | | |
| `file_path` | TEXT | | Storage path |
| `file_size` | BIGINT | | Bytes |
| `mime_type` | VARCHAR(100) | | |
| `storage_bucket` | VARCHAR(50) | DEFAULT `'bn-documents'` | |
| `checksum` | VARCHAR(64) | | SHA-256 for integrity |
| `status` | VARCHAR(20) | DEFAULT `'PENDING'` | `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED` |
| `verified` | BOOLEAN | DEFAULT FALSE | |
| `verified_by` | VARCHAR(50) | | |
| `verified_at` | TIMESTAMPTZ | | |
| `rejection_reason` | TEXT | | |
| `expiry_date` | DATE | | For time-limited documents |
| `notes` | TEXT | | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.5 `bn_claim_event`
Immutable event log for claim lifecycle. Every status change, action, and decision is recorded.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `event_type` | VARCHAR(30) | NOT NULL | `STATUS_CHANGE`, `ASSIGNMENT`, `NOTE`, `OVERRIDE`, `DOCUMENT`, `ELIGIBILITY_CHECK`, `CALCULATION`, `DECISION`, `ESCALATION` |
| `from_status` | VARCHAR(30) | | |
| `to_status` | VARCHAR(30) | | |
| `notes` | TEXT | | |
| `performed_by` | VARCHAR(50) | NOT NULL | user_code |
| `performed_at` | TIMESTAMPTZ | DEFAULT `now()` | |
| `metadata` | JSONB | DEFAULT `'{}'` | Event-specific data |

### 5.6 `bn_claim_eligibility`
Snapshot of eligibility check results. Preserved for audit trail — never overwritten, new records created on re-check.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `product_version_id` | UUID | FK → `bn_product_version` | |
| `check_date` | TIMESTAMPTZ | DEFAULT `now()` | |
| `check_number` | INT | DEFAULT 1 | Increments on re-check |
| `overall_result` | BOOLEAN | NOT NULL | |
| `rule_results` | JSONB | NOT NULL | `[{"rule_code":"MIN_WEEKS","passed":true,"actual":52,"required":26,"message":"..."}]` |
| `contribution_summary` | JSONB | DEFAULT `'{}'` | Snapshot of contribution data used |
| `data_snapshot` | JSONB | DEFAULT `'{}'` | All input data used for the check |
| `override_applied` | BOOLEAN | DEFAULT FALSE | |
| `override_by` | VARCHAR(50) | | |
| `override_reason` | TEXT | | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.7 `bn_claim_calculation`
Snapshot of benefit calculation. Like eligibility, never overwritten.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `product_version_id` | UUID | FK → `bn_product_version` | |
| `calc_date` | TIMESTAMPTZ | DEFAULT `now()` | |
| `calc_number` | INT | DEFAULT 1 | |
| `weekly_rate` | NUMERIC(12,2) | | |
| `monthly_rate` | NUMERIC(12,2) | | |
| `daily_rate` | NUMERIC(12,2) | | |
| `lump_sum` | NUMERIC(14,2) | | |
| `calculation_steps` | JSONB | NOT NULL | See Calculation Trace (§7) |
| `variables_used` | JSONB | DEFAULT `'{}'` | All variables and their values |
| `data_snapshot` | JSONB | DEFAULT `'{}'` | Input data snapshot |
| `override_applied` | BOOLEAN | DEFAULT FALSE | |
| `override_by` | VARCHAR(50) | | |
| `override_reason` | TEXT | | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.8 `bn_claim_note`
Officer notes, correspondence log, internal memos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `note_type` | VARCHAR(20) | DEFAULT `'GENERAL'` | `GENERAL`, `DECISION`, `CORRESPONDENCE`, `INTERNAL`, `SYSTEM` |
| `subject` | VARCHAR(200) | | |
| `body` | TEXT | NOT NULL | |
| `is_internal` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | NOT NULL | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |

### 5.9 `bn_award`
Created when a claim is approved. Represents the active benefit entitlement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `award_number` | VARCHAR(30) | UNIQUE | Auto-generated |
| `claim_id` | UUID | FK → `bn_claim` | |
| `product_id` | UUID | FK → `bn_product` | |
| `ssn` | VARCHAR(20) | NOT NULL | Denormalized |
| `status` | VARCHAR(20) | DEFAULT `'ACTIVE'` | `ACTIVE`, `SUSPENDED`, `CEASED`, `EXHAUSTED`, `CLOSED` |
| `award_date` | DATE | NOT NULL | Date award was granted |
| `effective_from` | DATE | NOT NULL | Payment start date |
| `effective_to` | DATE | | Expected end (NULL = ongoing for pensions) |
| `weekly_rate` | NUMERIC(12,2) | | |
| `monthly_rate` | NUMERIC(12,2) | | |
| `lump_sum` | NUMERIC(14,2) | | |
| `payment_method` | VARCHAR(20) | | |
| `bank_account` | VARCHAR(50) | | |
| `bank_routing_number` | VARCHAR(30) | | |
| `suspension_reason` | TEXT | | |
| `suspension_date` | DATE | | |
| `cessation_reason` | TEXT | | |
| `cessation_date` | DATE | | |
| `last_payment_date` | DATE | | |
| `next_review_date` | DATE | | |
| `cola_adjustment_pct` | NUMERIC(5,2) | DEFAULT 0 | |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

### 5.10 `bn_award_beneficiary`
Beneficiaries on an award (for survivor benefits, funeral grants, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `award_id` | UUID | FK → `bn_award` | |
| `participant_id` | UUID | FK → `bn_claim_participant`, NULLABLE | |
| `ssn` | VARCHAR(20) | | |
| `full_name` | VARCHAR(200) | NOT NULL | |
| `relationship` | VARCHAR(30) | | |
| `share_percentage` | NUMERIC(5,2) | NOT NULL | |
| `payment_method` | VARCHAR(20) | | |
| `bank_account` | VARCHAR(50) | | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.11 `bn_award_review`
Scheduled reviews for active awards (medical reviews, proof-of-life, student certifications).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `award_id` | UUID | FK → `bn_award` | |
| `review_type` | VARCHAR(30) | NOT NULL | `MEDICAL`, `PROOF_OF_LIFE`, `STUDENT_CERT`, `INCOME_TEST`, `PERIODIC` |
| `scheduled_date` | DATE | NOT NULL | |
| `completed_date` | DATE | | |
| `outcome` | VARCHAR(20) | | `CONTINUE`, `SUSPEND`, `CEASE`, `ADJUST` |
| `notes` | TEXT | | |
| `performed_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |

### 5.12 `bn_payment_schedule`
Defines the payment schedule derived from an award. One row per expected payment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `award_id` | UUID | FK → `bn_award` | |
| `schedule_number` | INT | NOT NULL | Sequential |
| `period_from` | DATE | NOT NULL | |
| `period_to` | DATE | NOT NULL | |
| `due_date` | DATE | NOT NULL | |
| `gross_amount` | NUMERIC(12,2) | NOT NULL | |
| `deductions` | NUMERIC(12,2) | DEFAULT 0 | |
| `net_amount` | NUMERIC(12,2) | NOT NULL | |
| `status` | VARCHAR(20) | DEFAULT `'SCHEDULED'` | `SCHEDULED`, `APPROVED`, `PAID`, `HELD`, `CANCELLED` |
| `payment_instruction_id` | UUID | FK → `bn_payment_instruction`, NULLABLE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.13 `bn_payment_instruction`
Individual payment record. Links to `cn_receipt` for actual settlement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `batch_id` | UUID | FK → `bn_payment_batch` | |
| `award_id` | UUID | FK → `bn_award` | |
| `ssn` | VARCHAR(20) | NOT NULL | |
| `amount` | NUMERIC(12,2) | NOT NULL | |
| `payment_method` | VARCHAR(20) | | |
| `bank_account` | VARCHAR(50) | | |
| `bank_routing_number` | VARCHAR(30) | | |
| `status` | VARCHAR(20) | DEFAULT `'PENDING'` | `PENDING`, `APPROVED`, `SENT`, `PAID`, `FAILED`, `CANCELLED` |
| `cn_receipt_id` | UUID | FK → `cn_receipt`, NULLABLE | Link to cashier module |
| `payment_date` | DATE | | |
| `reference_number` | VARCHAR(50) | | Bank/cheque reference |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.14 `bn_payment_batch`
Groups payment instructions for batch processing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `batch_number` | VARCHAR(30) | UNIQUE | Auto-generated |
| `batch_date` | DATE | NOT NULL | |
| `product_id` | UUID | FK → `bn_product`, NULLABLE | NULL = multi-product batch |
| `total_instructions` | INT | DEFAULT 0 | |
| `total_amount` | NUMERIC(14,2) | DEFAULT 0 | |
| `status` | VARCHAR(20) | DEFAULT `'DRAFT'` | `DRAFT`, `APPROVED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `approved_by` | VARCHAR(50) | | |
| `approved_at` | TIMESTAMPTZ | | |
| `processed_at` | TIMESTAMPTZ | | |
| `bank_file_path` | TEXT | | Export file path |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.15 `bn_overpayment`
Tracks overpayments and recovery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `award_id` | UUID | FK → `bn_award` | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `ssn` | VARCHAR(20) | NOT NULL | |
| `overpayment_amount` | NUMERIC(12,2) | NOT NULL | |
| `recovered_amount` | NUMERIC(12,2) | DEFAULT 0 | |
| `outstanding_amount` | NUMERIC(12,2) | GENERATED | `overpayment_amount - recovered_amount` |
| `reason` | TEXT | NOT NULL | |
| `discovery_date` | DATE | NOT NULL | |
| `recovery_method` | VARCHAR(30) | | `DEDUCTION`, `LUMP_REPAYMENT`, `PAYMENT_PLAN`, `WRITE_OFF` |
| `recovery_rate_pct` | NUMERIC(5,2) | | % of future payments |
| `status` | VARCHAR(20) | DEFAULT `'ACTIVE'` | `ACTIVE`, `RECOVERING`, `RECOVERED`, `WRITTEN_OFF` |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 5.16 `bn_medical_referral` / `bn_medical_assessment`

| Entity | Key Columns |
|--------|-------------|
| `bn_medical_referral` | `id`, `claim_id`, `referral_type` (`INITIAL`, `REVIEW`, `APPEAL`), `referred_by`, `referred_at`, `scheduled_date`, `board_type`, `status`, `notes` |
| `bn_medical_assessment` | `id`, `referral_id` FK, `assessment_date`, `panel_members` JSONB, `disability_percentage`, `diagnosis_codes` JSONB, `prognosis`, `work_capacity`, `review_date`, `recommendations` TEXT, `outcome` (`FIT`, `PARTIAL`, `UNFIT`, `PERMANENT`), `entered_by` |

---

## 6. Service Case Entities

### 6.1 `bn_service_case_type`
Configurable types of service cases.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `type_code` | VARCHAR(30) | UNIQUE NOT NULL | e.g., `INQUIRY`, `COMPLAINT`, `APPEAL`, `CHANGE_REQUEST`, `REVIEW` |
| `type_name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | | |
| `default_priority` | VARCHAR(10) | DEFAULT `'NORMAL'` | |
| `sla_days` | INT | | |
| `workflow_template_id` | UUID | FK → `bn_workflow_template`, NULLABLE | |
| `requires_claim_link` | BOOLEAN | DEFAULT FALSE | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 6.2 `bn_service_case`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `case_number` | VARCHAR(30) | UNIQUE | Auto-generated |
| `case_type_id` | UUID | FK → `bn_service_case_type` | |
| `claim_id` | UUID | FK → `bn_claim`, NULLABLE | |
| `award_id` | UUID | FK → `bn_award`, NULLABLE | |
| `ssn` | VARCHAR(20) | | |
| `subject` | VARCHAR(300) | NOT NULL | |
| `description` | TEXT | | |
| `priority` | VARCHAR(10) | DEFAULT `'NORMAL'` | |
| `status` | VARCHAR(20) | DEFAULT `'OPEN'` | `OPEN`, `IN_PROGRESS`, `PENDING_INFO`, `RESOLVED`, `CLOSED`, `ESCALATED` |
| `assigned_to` | VARCHAR(50) | | |
| `resolution` | TEXT | | |
| `resolved_at` | TIMESTAMPTZ | | |
| `sla_due_date` | DATE | | |
| `entered_by` / `modified_by` | VARCHAR(50) | | |
| `entered_at` / `modified_at` | TIMESTAMPTZ | | |

### 6.3 `bn_service_case_event`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `service_case_id` | UUID | FK → `bn_service_case` | |
| `event_type` | VARCHAR(30) | NOT NULL | `STATUS_CHANGE`, `NOTE`, `ASSIGNMENT`, `ESCALATION`, `RESOLUTION` |
| `from_status` | VARCHAR(20) | | |
| `to_status` | VARCHAR(20) | | |
| `notes` | TEXT | | |
| `performed_by` | VARCHAR(50) | NOT NULL | |
| `performed_at` | TIMESTAMPTZ | DEFAULT `now()` | |
| `metadata` | JSONB | DEFAULT `'{}'` | |

---

## 7. Audit & Trace Entities

### 7.1 Calculation Trace (embedded in `bn_claim_calculation.calculation_steps`)

The `calculation_steps` JSONB field stores a full explainable trace:

```json
[
  {
    "step_number": 1,
    "rule_code": "AVG_WEEKLY_WAGE",
    "description": "Calculate average weekly insurable wages over best 13 of last 26 weeks",
    "formula": "SUM(best_13_wages) / 13",
    "inputs": {
      "wage_weeks": [450, 440, 460, 430, ...],
      "qualifying_weeks": 26,
      "best_n": 13
    },
    "intermediate_result": 5850,
    "result": 450.00,
    "source_table": "ip_wages",
    "source_query_params": {"ssn": "123456", "from": "2025-10-01", "to": "2026-03-31"}
  },
  {
    "step_number": 2,
    "rule_code": "BENEFIT_RATE",
    "description": "Apply 60% benefit rate to average weekly wage",
    "formula": "avg_weekly_wage * 0.60",
    "inputs": {"avg_weekly_wage": 450.00, "rate_pct": 60},
    "result": 270.00
  },
  {
    "step_number": 3,
    "rule_code": "CEILING_CAP",
    "description": "Cap at weekly contribution ceiling",
    "formula": "MIN(benefit_rate, ceiling)",
    "inputs": {"benefit_rate": 270.00, "ceiling": 500.00},
    "result": 270.00,
    "note": "Below ceiling, no cap applied"
  }
]
```

### 7.2 `bn_workflow_event`
Workflow-specific events that complement the generic `workflow_logs` table with benefit-context.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `claim_id` | UUID | FK → `bn_claim` | |
| `workflow_instance_id` | UUID | FK → `workflow_instances`, NULLABLE | |
| `step_code` | VARCHAR(30) | | Workflow step code |
| `event_type` | VARCHAR(30) | NOT NULL | `STEP_STARTED`, `STEP_COMPLETED`, `STEP_SKIPPED`, `SLA_WARNING`, `SLA_BREACH`, `ESCALATED`, `RETURNED` |
| `from_step` | VARCHAR(30) | | |
| `to_step` | VARCHAR(30) | | |
| `decision` | VARCHAR(20) | | `APPROVE`, `REJECT`, `RETURN`, `ESCALATE`, `DEFER` |
| `decision_reason` | TEXT | | |
| `assigned_from` | VARCHAR(50) | | |
| `assigned_to` | VARCHAR(50) | | |
| `sla_target` | TIMESTAMPTZ | | |
| `completed_at` | TIMESTAMPTZ | | |
| `performed_by` | VARCHAR(50) | NOT NULL | |
| `performed_at` | TIMESTAMPTZ | DEFAULT `now()` | |
| `metadata` | JSONB | DEFAULT `'{}'` | |

### 7.3 Database Audit Triggers

All `bn_*` tables will have the existing `fn_audit_row_change` trigger attached:

```sql
CREATE TRIGGER trg_audit_bn_claim
  AFTER INSERT OR UPDATE OR DELETE ON bn_claim
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();
```

This writes to `system_audit_trail` with full before/after snapshots — no custom audit tables needed.

---

## 8. Legacy Integration Entities

### 8.1 `bn_legacy_mapping_profile`
Maps between legacy system identifiers and new module entities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `profile_name` | VARCHAR(200) | NOT NULL | e.g., "SKN Legacy MSSQL Import" |
| `source_system` | VARCHAR(50) | NOT NULL | e.g., `MSSQL_LEGACY`, `PAPER_ARCHIVE` |
| `entity_type` | VARCHAR(30) | NOT NULL | `CLAIM`, `AWARD`, `PAYMENT` |
| `field_mappings` | JSONB | NOT NULL | `{"legacy_field":"new_field"}` |
| `transformation_rules` | JSONB | DEFAULT `'{}'` | Data transformations |
| `default_values` | JSONB | DEFAULT `'{}'` | Defaults for unmapped fields |
| `status_mapping` | JSONB | DEFAULT `'{}'` | Legacy status → new status |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `entered_by` | VARCHAR(50) | | |
| `entered_at` | TIMESTAMPTZ | | |

### 8.2 `bn_claim_shell`
Lightweight reference record for legacy claims that haven't been fully imported. Allows the system to display legacy claim references without full data migration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `legacy_system` | VARCHAR(50) | NOT NULL | Source system identifier |
| `legacy_claim_ref` | VARCHAR(100) | NOT NULL | Original claim reference |
| `ssn` | VARCHAR(20) | NOT NULL | |
| `product_code` | VARCHAR(20) | | Best-effort product mapping |
| `claim_date` | DATE | | |
| `status` | VARCHAR(30) | | Current known status |
| `summary_json` | JSONB | DEFAULT `'{}'` | Whatever data was extractable |
| `imported_to_claim_id` | UUID | FK → `bn_claim`, NULLABLE | Set when fully imported |
| `import_date` | TIMESTAMPTZ | | |
| `entered_at` | TIMESTAMPTZ | DEFAULT `now()` | |

**Unique constraint:** `(legacy_system, legacy_claim_ref)`

### 8.3 Legacy Table Usage (Read-Only from BN module)

| Legacy Table | BN Usage | Join Key |
|---|---|---|
| `ip_master` | Contributor lookup, demographics, DOB, gender, status | `ssn` |
| `ip_wages` | Contribution history for eligibility and calculation | `ssn` + `week_ending` |
| `ip_employer` | Employment history | `ssn` |
| `ip_depend` | Existing dependents | `ssn` |
| `er_master` | Employer verification | `regno` |
| `er_commence` | Employer registration dates | `regno` |
| `cn_receipt` | Payment settlement / reconciliation | `receipt_id` |
| `cn_batch` | Payment batch integration | `batch_id` |
| `cn_payer` | Payer identification | `payer_id` |
| `workflow_definitions` | Workflow engine | `definition_id` |
| `workflow_instances` | Active workflow tracking | `instance_id` |
| `workflow_steps` | Step definitions | `step_id` |
| `system_audit_trail` | Audit logging (shared) | — |
| `notification_templates` | Email/SMS notifications | `template_code` |
| `module_doc_config` | Document configuration (optional integration) | `module_name` |

---

## 9. Effective Dating & Versioning Model

### Version Resolution Algorithm

```
Given: claim_date (DATE)

1. Find bn_product by product_id
2. Find bn_product_version WHERE:
     product_id = claim.product_id
     AND effective_from <= claim_date
     AND (effective_to IS NULL OR effective_to >= claim_date)
     AND status = 'ACTIVE'
   ORDER BY version_number DESC
   LIMIT 1

3. Using resolved version_id:
   - Load bn_eligibility_rule WHERE product_version_id = version_id AND is_active
   - Load bn_calculation_rule WHERE product_version_id = version_id AND is_active
   - Load bn_timeline_rule WHERE product_version_id = version_id AND is_active
   - Load document_profile via bn_product_version.document_profile_id
   - Load screen_template via bn_product_version.screen_template_id
   - Load workflow_template via bn_product_version.workflow_template_id
```

### Versioning Rules

| Rule | Description |
|------|-------------|
| **No overlap** | Two active versions of the same product cannot have overlapping `effective_from` / `effective_to` ranges |
| **Gap allowed** | Gaps between versions are allowed (product not available during gap) |
| **Immutable after use** | Once a version has been used to process any claim, it cannot be modified — only superseded by a new version |
| **Draft versions** | New versions start as `DRAFT`, can be edited freely until activated |
| **Activation** | Activating a version closes the `effective_to` of the prior active version to `effective_from - 1 day` |

### Effective Dating on Other Entities

| Entity | Effective Dating | Purpose |
|--------|-----------------|---------|
| `bn_interaction_rule` | `effective_from` / `effective_to` | Rules can change with legislation |
| `bn_override_policy` | `effective_from` / `effective_to` | Override permissions can be time-bound |
| `bn_country.parameters` | Versioned inside JSONB with date keys | Country parameters change annually |

---

## 10. Legacy / New Coexistence Strategy

### Phase 1: Parallel Operation

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 DATA FLOW                         │
│                                                              │
│  LEGACY TABLES (read-only from BN)     NEW BN TABLES         │
│  ────────────────────────────          ──────────────         │
│  ip_master ──────────────────────────→ bn_claim.ssn          │
│  ip_wages ───────────────────────────→ bn_claim_eligibility  │
│  er_master ──────────────────────────→ bn_claim.employer     │
│  cn_receipt ─────────────────────────→ bn_payment_instruction│
│  workflow_instances ─────────────────→ bn_claim.workflow_id  │
│                                                              │
│  ip_master continues to be updated by Registration module    │
│  ip_wages continues to be updated by C3 module               │
│  cn_receipt continues to be managed by Cashier module        │
│                                                              │
│  BN module READS from legacy, WRITES only to bn_* tables     │
└─────────────────────────────────────────────────────────────┘
```

### Key Coexistence Rules

| Rule | Description |
|------|-------------|
| **No FK to `auth.users`** | `entered_by` / `modified_by` store `user_code` (VARCHAR 50), not UUID |
| **No hard FK to legacy** | `bn_claim.ssn` is a logical reference to `ip_master.ssn`, not a database FK constraint. This allows claims for SSNs that might be in `tmp_ip_master` or pending registration. |
| **No writes to legacy** | BN module never inserts/updates `ip_master`, `ip_wages`, `er_master`, or `cn_*` tables |
| **Dual-read pattern** | For contributor lookup, query `ip_master` first; if not found, query `tmp_ip_master` |
| **Claim shells** | Legacy claims referenced via `bn_claim_shell` without full import |
| **Payment bridge** | `bn_payment_instruction.cn_receipt_id` links to `cn_receipt` after payment is settled through the cashier module |

### Phase 2+: Gradual Consolidation

- Legacy claim data imported via `bn_claim_shell` → `bn_claim` with `source = 'LEGACY'`
- Contribution queries may evolve from direct `ip_wages` reads to RPCs that abstract the source
- Payment processing may shift from `cn_*` integration to standalone `bn_payment_batch` with bank file export

---

## 11. Text ERD

```
bn_country ─────────────────┬───────────────────────────────────────────┐
  │                          │                                           │
  │                    bn_scheme                                   bn_rule_group
  │                      │                                              │
  │                    bn_branch                                        │
  │                      │                                              │
  │                    bn_product ──────────────── bn_interaction_rule   │
  │                      │         ──────────────── bn_override_policy   │
  │                      │                                              │
  │               bn_product_version ───────── bn_workflow_template      │
  │                 │    │    │                                          │
  │                 │    │    └──── bn_screen_template                   │
  │                 │    │           └──── bn_field_metadata             │
  │                 │    │                                              │
  │                 │    └──── bn_document_profile                      │
  │                 │           └──── bn_document_rule                  │
  │                 │                                                   │
  │          ┌──────┼───────────────┐                                   │
  │          │      │               │                                   │
  │   bn_eligibility_rule    bn_calculation_rule ── bn_formula_template │
  │          │                      │                                   │
  │          └──────────────────────┘                                   │
  │                 │                                                   │
  │     ════════════╪═══════════════════════════                        │
  │     ║  TRANSACTION LAYER  ║                                        │
  │     ════════════╪═══════════════════════════                        │
  │                 │                                                   │
  │              bn_claim ─────────────────── (ip_master.ssn)           │
  │                 │                          (er_master.regno)         │
  │        ┌────────┼────────┬──────────┐     (workflow_instances)      │
  │        │        │        │          │                               │
  │  bn_claim_   bn_claim_  bn_claim_  bn_claim_note                   │
  │  participant detail     event                                      │
  │        │                                                           │
  │  bn_claim_eligibility                                              │
  │  bn_claim_calculation ── (calculation_steps = trace)                │
  │  bn_document_submission                                            │
  │  bn_medical_referral ── bn_medical_assessment                      │
  │        │                                                           │
  │     bn_award ──────────── bn_award_beneficiary                     │
  │        │                  bn_award_review                          │
  │        │                                                           │
  │     bn_payment_schedule                                            │
  │        │                                                           │
  │     bn_payment_instruction ──── (cn_receipt)                       │
  │        │                                                           │
  │     bn_payment_batch                                               │
  │        │                                                           │
  │     bn_overpayment                                                 │
  │                                                                    │
  │     ════════════════════════════════════                            │
  │     ║  SERVICE CASES  ║                                            │
  │     ════════════════════════════════════                            │
  │                                                                    │
  │     bn_service_case_type                                           │
  │        │                                                           │
  │     bn_service_case ──── bn_service_case_event                     │
  │        │                 bn_service_case_document (→ doc_submission)│
  │                                                                    │
  │     ════════════════════════════════════                            │
  │     ║  LEGACY INTEGRATION  ║                                       │
  │     ════════════════════════════════════                            │
  │                                                                    │
  │     bn_legacy_mapping_profile                                      │
  │     bn_claim_shell ──── (optional link to bn_claim)                │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘

  SHARED INFRASTRUCTURE (not bn_ prefixed):
  ├── system_audit_trail (fn_audit_row_change triggers on all bn_* tables)
  ├── workflow_definitions / workflow_instances / workflow_steps
  ├── notification_templates
  ├── module_doc_config / module_doc_child_docs
  └── user_roles / role_permissions / app_modules
```

---

## 12. Table-by-Table Specification

### Summary: 37 Total Entities

| # | Table | Layer | Phase | PK | Key FKs |
|---|-------|-------|-------|----|----|
| 1 | `bn_country` | Core | 1 | `country_code` (natural) | — |
| 2 | `bn_scheme` | Core | 1 | `id` UUID | `country_code` |
| 3 | `bn_branch` | Core | 1 | `id` UUID | `scheme_id` |
| 4 | `bn_product` | Core | 1 | `id` UUID | `scheme_id`, `branch_id`, `country_code` |
| 5 | `bn_product_version` | Config | 1 | `id` UUID | `product_id`, `workflow_template_id`, `document_profile_id`, `screen_template_id` |
| 6 | `bn_rule_group` | Config | 1 | `id` UUID | `country_code` |
| 7 | `bn_eligibility_rule` | Config | 1 | `id` UUID | `product_version_id`, `rule_group_id` |
| 8 | `bn_calculation_rule` | Config | 1 | `id` UUID | `product_version_id`, `formula_template_id` |
| 9 | `bn_formula_template` | Config | 1 | `id` UUID | `country_code` |
| 10 | `bn_timeline_rule` | Config | 1 | `id` UUID | `product_version_id` |
| 11 | `bn_interaction_rule` | Config | 2 | `id` UUID | `primary_product_id`, `related_product_id` |
| 12 | `bn_override_policy` | Config | 2 | `id` UUID | `product_id` |
| 13 | `bn_document_profile` | Config | 1 | `id` UUID | `country_code` |
| 14 | `bn_document_rule` | Config | 1 | `id` UUID | `document_profile_id`, `product_id` |
| 15 | `bn_workflow_template` | Config | 1 | `id` UUID | `workflow_definition_id`, `country_code` |
| 16 | `bn_screen_template` | Config | 2 | `id` UUID | `country_code` |
| 17 | `bn_field_metadata` | Config | 2 | `id` UUID | `screen_template_id` |
| 18 | `bn_claim` | Transaction | 1 | `id` UUID | `product_id`, `product_version_id`, `scheme_id`, `workflow_instance_id` |
| 19 | `bn_claim_participant` | Transaction | 1 | `id` UUID | `claim_id` |
| 20 | `bn_claim_detail` | Transaction | 1 | `id` UUID | `claim_id` (UNIQUE) |
| 21 | `bn_claim_event` | Transaction | 1 | `id` UUID | `claim_id` |
| 22 | `bn_claim_eligibility` | Transaction | 1 | `id` UUID | `claim_id`, `product_version_id` |
| 23 | `bn_claim_calculation` | Transaction | 1 | `id` UUID | `claim_id`, `product_version_id` |
| 24 | `bn_claim_note` | Transaction | 1 | `id` UUID | `claim_id` |
| 25 | `bn_document_submission` | Transaction | 1 | `id` UUID | `claim_id`, `service_case_id`, `document_rule_id` |
| 26 | `bn_award` | Transaction | 2 | `id` UUID | `claim_id`, `product_id` |
| 27 | `bn_award_beneficiary` | Transaction | 2 | `id` UUID | `award_id`, `participant_id` |
| 28 | `bn_award_review` | Transaction | 2 | `id` UUID | `award_id` |
| 29 | `bn_payment_schedule` | Transaction | 2 | `id` UUID | `award_id`, `payment_instruction_id` |
| 30 | `bn_payment_instruction` | Transaction | 2 | `id` UUID | `batch_id`, `award_id`, `cn_receipt_id` |
| 31 | `bn_payment_batch` | Transaction | 2 | `id` UUID | `product_id` |
| 32 | `bn_overpayment` | Transaction | 3 | `id` UUID | `award_id`, `claim_id` |
| 33 | `bn_medical_referral` | Transaction | 2 | `id` UUID | `claim_id` |
| 34 | `bn_medical_assessment` | Transaction | 2 | `id` UUID | `referral_id` |
| 35 | `bn_service_case_type` | Service | 3 | `id` UUID | `workflow_template_id` |
| 36 | `bn_service_case` | Service | 3 | `id` UUID | `case_type_id`, `claim_id`, `award_id` |
| 37 | `bn_service_case_event` | Service | 3 | `id` UUID | `service_case_id` |
| — | `bn_legacy_mapping_profile` | Legacy | 1 | `id` UUID | — |
| — | `bn_claim_shell` | Legacy | 1 | `id` UUID | `imported_to_claim_id` |
| — | `bn_workflow_event` | Audit | 1 | `id` UUID | `claim_id`, `workflow_instance_id` |

### What Stays Legacy vs New

| Data Domain | Legacy Table | New Table | Strategy |
|---|---|---|---|
| **Person** | `ip_master` | — | Stays in `ip_master`. BN reads via SSN. No duplication. |
| **Wages/Contributions** | `ip_wages` | — | Stays in `ip_wages`. BN reads for eligibility/calculation. |
| **Employer** | `er_master` | — | Stays. BN reads via `regno`. |
| **Employment** | `ip_employer` | — | Stays. BN reads for employment verification. |
| **Dependents** | `ip_depend` | `bn_claim_participant` | Legacy dependents stay. New claim participants created per-claim. |
| **Claims** | *(none — all mock)* | `bn_claim` + children | All new. Legacy imports via `bn_claim_shell`. |
| **Awards** | *(none)* | `bn_award` | All new. |
| **Payments** | `cn_receipt`, `cn_batch` | `bn_payment_*` | BN creates payment instructions. Settlement via `cn_receipt` or standalone. |
| **Workflows** | `workflow_*` | `bn_workflow_event` | Existing engine reused. BN adds benefit-context events. |
| **Audit** | `system_audit_trail` | *(shared)* | Existing triggers used on all `bn_*` tables. |
| **Documents** | `module_doc_config` | `bn_document_profile` + `bn_document_rule` | BN has its own config. Can optionally integrate with existing doc system. |
| **Benefit Config** | *(none — all mock)* | `bn_product` + children | All new. |

---

## 13. Migration Safety Rules

| Rule | Description |
|------|-------------|
| **Additive only** | Phase 1 creates new `bn_*` tables. No modifications to existing tables. |
| **No hard FKs to legacy** | Use soft/logical references (SSN, regno) not database FK constraints. |
| **No triggers on legacy** | Never attach triggers to `ip_master`, `ip_wages`, `er_master`, `cn_*`. |
| **Shared triggers OK** | `fn_audit_row_change` is safe to attach to new `bn_*` tables. |
| **Version-safe RPCs** | New RPCs prefixed with `bn_` (e.g., `bn_get_contribution_summary`). |
| **Rollback-safe** | All `bn_*` tables can be dropped without affecting any existing functionality. |
| **No data loss** | Legacy data is never modified, moved, or deleted by the BN module. |
| **Schema isolation** | All in `public` schema with `bn_` prefix — clear namespace. |
