

# Fix Internal Audit Architecture: Remove Audit Universe, Automate Risk Assessment

## Current Problems Found

1. **`ia_risk_criteria`** contains employer-audit criteria ("Large employer >100 employees", "Financial institution") — wrong for internal audit
2. **`ia_risk_assessments`** links to `ia_audit_universe` (FK `audit_universe_id`) — should link to `ia_department_functions` instead
3. **`ia_risk_scoring_models`** and `ia_risk_criteria_weights`** tables exist but are empty — no configurable thresholds
4. **Audit Universe** duplicates Function Master — both represent auditable items under departments
5. **RiskAssessment.tsx** manually enters 6 hardcoded scoring factors — should use configurable criteria from DB
6. **ExecutiveDashboard.tsx** and **CommitteeReports.tsx** reference Audit Universe data

## Implementation Plan

### Phase 1: Database Changes

**Migration 1** — Add `function_id` FK to `ia_risk_assessments`:
```sql
ALTER TABLE ia_risk_assessments 
ADD COLUMN function_id uuid REFERENCES ia_department_functions(id);
```

**Data Update 1** — Replace employer-focused risk criteria with internal audit criteria:
- Delete existing 5 employer criteria
- Insert: Operational Criticality (20%), Financial Exposure (25%), Compliance Sensitivity (20%), Control Weakness (20%), Time Since Last Audit (15%)
- Each with numeric `weight` stored as percentage string and `max_score` of 100

**Data Update 2** — Create default risk scoring model in `ia_risk_scoring_models`:
- Model: "Default Internal Audit Model"
- Thresholds: Low < 50, Medium 50-74, High >= 75, Critical >= 90

**Data Update 3** — Populate `ia_risk_criteria_weights` with numeric weights linked to the model

### Phase 2: Rewire Risk Assessment Page

**`RiskAssessment.tsx`** — Complete rebuild:
- Replace Audit Universe dropdown with **Department** + **Function** cascading dropdowns
- Load criteria dynamically from `ia_risk_criteria_weights` (not hardcoded 6 factors)
- For each criterion: render a slider/input (0-100) with its label and weight shown
- Auto-calculate: `overall_score = Σ(criterion_score × weight%)`
- Auto-determine risk level from `ia_risk_scoring_models` thresholds
- Auto-suggest audit frequency based on configurable mapping
- Save `function_id` instead of `audit_universe_id`

### Phase 3: Enhanced Risk Configuration in AuditConfig

**`AuditConfig.tsx`** — Enhance the "Risk Criteria" tab:
- Show criteria with editable numeric weight (%) and max score
- Add/remove criteria capability
- Weights must sum to 100% (validation)
- Add "Risk Thresholds" section: configurable Low/Medium/High/Critical score boundaries
- Add "Audit Frequency Mapping" section: configurable risk-level-to-frequency rules (e.g., High → Annual, Medium → Bi-Annual, Low → Every 3 Years)

### Phase 4: Remove Audit Universe

- Set `FEATURE_AUDIT_UNIVERSE: false` in `auditRouteConfig.ts`
- Remove from sidebar navigation in `auditMenuItems.ts`
- Update **ExecutiveDashboard.tsx**: replace Audit Universe references with Function Master data
- Update **CommitteeReports.tsx**: replace Audit Universe references with Function Master data
- Keep `AuditUniverse.tsx` file but it will be inaccessible via feature flag

### Phase 5: Navigation Update

- Rename sidebar group "Audit Universe & Risk" → "Risk Assessment"
- Update `useDynamicNavigation.ts` to remove audit-universe route from the group

## Files Modified

| File | Change |
|------|--------|
| `src/pages/audit/RiskAssessment.tsx` | Rewire to Function Master, dynamic criteria, auto-calc |
| `src/pages/audit/AuditConfig.tsx` | Enhanced risk criteria config with weights, thresholds, frequency |
| `src/config/auditRouteConfig.ts` | Disable Audit Universe feature flag |
| `src/components/sidebar/menuItems/auditMenuItems.ts` | Remove Audit Universe nav item |
| `src/hooks/useDynamicNavigation.ts` | Update group name, remove universe route |
| `src/pages/audit/ExecutiveDashboard.tsx` | Replace universe refs with function master |
| `src/pages/audit/CommitteeReports.tsx` | Replace universe refs with function master |
| `src/hooks/useAuditConfigData.ts` | Add hooks for risk scoring models, criteria weights, frequency mapping |

