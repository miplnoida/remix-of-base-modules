
-- Risk Policies table: versioned scoring configurations
CREATE TABLE IF NOT EXISTS ce_risk_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code varchar NOT NULL UNIQUE,
  policy_name varchar NOT NULL,
  description text,
  effective_from date NOT NULL,
  effective_to date,
  status varchar NOT NULL DEFAULT 'DRAFT',
  update_frequency varchar NOT NULL DEFAULT 'WEEKLY',
  applicable_zones text[],
  applicable_employer_types text[],
  activated_by varchar,
  activated_at timestamptz,
  created_by varchar,
  created_at timestamptz DEFAULT now(),
  updated_by varchar,
  updated_at timestamptz DEFAULT now()
);

-- Policy-Factor junction: which factors a policy uses with weight overrides
CREATE TABLE IF NOT EXISTS ce_risk_policy_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES ce_risk_policies(id) ON DELETE CASCADE,
  factor_id uuid NOT NULL REFERENCES ce_risk_config(id) ON DELETE CASCADE,
  weight_override numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (policy_id, factor_id)
);

-- Risk Bands: score ranges tied to a policy
CREATE TABLE IF NOT EXISTS ce_risk_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES ce_risk_policies(id) ON DELETE CASCADE,
  band_name varchar NOT NULL,
  score_range_min numeric(10,2) NOT NULL DEFAULT 0,
  score_range_max numeric(10,2) NOT NULL DEFAULT 100,
  color varchar DEFAULT '#6B7280',
  audit_frequency varchar DEFAULT 'RANDOM_3_YEAR',
  mandatory_audit boolean DEFAULT false,
  auto_select_enabled boolean DEFAULT false,
  auto_select_type varchar,
  auto_select_value numeric,
  follow_up_intensity varchar DEFAULT 'NORMAL',
  escalation_enabled boolean DEFAULT false,
  escalation_months_in_band integer DEFAULT 0,
  escalation_action varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (policy_id, band_name)
);
