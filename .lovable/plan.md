

# Risk Control Matrix Enhancement & Risk Scoring Automation

## Current State

1. **Audit Universe**: Already disabled via feature flag (`FEATURE_AUDIT_UNIVERSE: false`), not in sidebar. Route still exists in `AppRoutes.tsx` but gated. The `ia_risk_assessments` table still has an `audit_universe_id` FK column (unused).

2. **RCM exists** (`ia_rcm_processes` → `ia_rcm_risks` → `ia_rcm_controls` → `ia_rcm_tests`): Has `department_id` FK on processes, basic `likelihood × impact = risk_score` on risks, but:
   - No `function_id` link to Function Master
   - No residual risk calculation (no control effectiveness reduction)
   - No configurable likelihood/impact/effectiveness scales
   - No risk classification on RCM records

3. **Risk Assessment page**: Uses weighted criteria sliders (Operational Criticality, Financial Exposure, etc.) — a different model than the RCM's `Likelihood × Impact` approach. These are two separate risk concepts that should coexist:
   - **RCM**: Operational risk per process/function (Likelihood × Impact − Control Effectiveness)
   - **Risk Assessment**: Strategic risk scoring for audit planning

4. **AuditConfig.tsx**: Has Risk Criteria Weights, Thresholds, and Frequency Mapping — but no Likelihood/Impact/Control Effectiveness configuration tables.

## Plan

### Phase 1: Database — Add Configuration Tables & Enhance RCM

**Migration**: Add 3 new config tables and enhance `ia_rcm_risks`/`ia_rcm_controls`:

```sql
-- Likelihood configuration
CREATE TABLE public.ia_risk_likelihood_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Impact configuration
CREATE TABLE public.ia_risk_impact_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Control effectiveness configuration
CREATE TABLE public.ia_control_effectiveness_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  reduction_percentage INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Risk classification thresholds
CREATE TABLE public.ia_risk_classification_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  color TEXT DEFAULT '#gray',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Add function_id and residual risk columns to ia_rcm_processes
ALTER TABLE public.ia_rcm_processes ADD COLUMN function_id UUID REFERENCES public.ia_department_functions(id);

-- Add residual risk columns to ia_rcm_risks
ALTER TABLE public.ia_rcm_risks ADD COLUMN inherent_risk_score NUMERIC;
ALTER TABLE public.ia_rcm_risks ADD COLUMN residual_risk_score NUMERIC;
ALTER TABLE public.ia_rcm_risks ADD COLUMN risk_level TEXT;

-- Add effectiveness reduction to ia_rcm_controls
ALTER TABLE public.ia_rcm_controls ADD COLUMN effectiveness_reduction INTEGER DEFAULT 0;
```

**Seed data** (via insert tool):
- Likelihood: Very Low(1), Low(2), Medium(3), High(4), Very High(5)
- Impact: Minor(1), Moderate(2), Major(3), Critical(4), Extreme(5)
- Control Effectiveness: Strong(70%), Moderate(40%), Weak(10%)
- Risk Classification: Low(0-5), Medium(6-12), High(13-20), Critical(21-25)

### Phase 2: Add Configuration Hooks

**`src/hooks/useAuditConfigData.ts`** — Add hooks:
- `useIALikelihoodLevels()` — CRUD for `ia_risk_likelihood_levels`
- `useIAImpactLevels()` — CRUD for `ia_risk_impact_levels`
- `useIAControlEffectivenessLevels()` — CRUD for `ia_control_effectiveness_levels`
- `useIARiskClassificationThresholds()` — CRUD for `ia_risk_classification_thresholds`

### Phase 3: Enhance AuditConfig — "Risk Management" Tab

**`src/pages/audit/AuditConfig.tsx`** — Add a new "Risk Management" tab with 4 configurable sections:
1. **Likelihood Levels**: Editable table (Label, Score, Description) + Add/Remove
2. **Impact Levels**: Editable table (Label, Score, Description) + Add/Remove
3. **Control Effectiveness**: Editable table (Label, Reduction %, Description) + Add/Remove
4. **Risk Classification Thresholds**: Editable table (Label, Min Score, Max Score, Color)

### Phase 4: Rebuild RCM Page with Full Risk Scoring

**`src/pages/audit/RiskControlMatrix.tsx`** — Major enhancement:
- Add **Department** + **Function** cascading dropdowns when creating a process (link to Function Master)
- Risk form: Replace free-text Likelihood/Impact with **dropdown selects** from configured levels
- Auto-calculate: `Inherent Risk = Likelihood Score × Impact Score`
- Control form: Replace free-text Effectiveness with **dropdown select** from configured levels, auto-populate `effectiveness_reduction`
- Auto-calculate: `Residual Risk = Inherent Risk × (1 − max(Control Effectiveness Reduction%))`
- Auto-classify risk level from `ia_risk_classification_thresholds`
- Display risk level badge on each risk row
- Add summary metrics: Total Risks, High/Critical count, Average Residual Score

### Phase 5: Clean Up Audit Universe References

- Remove the route entry from `AppRoutes.tsx`
- Remove `FEATURE_AUDIT_UNIVERSE` flag from `auditRouteConfig.ts`
- Remove the route config entry for 'universe'
- Remove `AUDIT_UNIVERSE_SCHEMA` from `moduleFieldSchemas.ts`
- Keep `AuditUniverse.tsx` file but it becomes dead code (safe to delete later)

## Files Modified

| File | Change |
|------|--------|
| Database migration | New config tables, ALTER RCM tables |
| `src/hooks/useAuditConfigData.ts` | Add 4 new config hooks |
| `src/pages/audit/AuditConfig.tsx` | Add "Risk Management" tab |
| `src/pages/audit/RiskControlMatrix.tsx` | Full rebuild with automated scoring |
| `src/config/auditRouteConfig.ts` | Remove universe flag & route |
| `src/components/routing/AppRoutes.tsx` | Remove universe route |
| `src/config/moduleFieldSchemas.ts` | Remove AUDIT_UNIVERSE_SCHEMA |

