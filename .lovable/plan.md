
# Internal Audit Architecture — Completed

## Changes Implemented

### Phase 1: Database Changes ✅
- Added `function_id` FK column to `ia_risk_assessments` → `ia_department_functions`
- Replaced 5 employer-focused risk criteria with internal audit criteria: Operational Criticality (20%), Financial Exposure (25%), Compliance Sensitivity (20%), Control Weakness (20%), Time Since Last Audit (15%)
- Seeded default risk scoring model with thresholds: Critical ≥90, High ≥75, Medium ≥50, Low <50
- Populated `ia_risk_criteria_weights` with matching weights
- Added `risk_frequency` audit settings: Critical=6mo, High=12mo, Medium=24mo, Low=36mo

### Phase 2: Risk Assessment Page ✅
- Replaced Audit Universe dropdown with Department → Function cascading selectors
- Dynamic criteria loaded from `ia_risk_criteria_weights` with slider inputs
- Auto-calculates `overall_score = Σ(score × weight%)`
- Auto-determines risk level from scoring model thresholds
- Auto-suggests audit frequency from configurable mapping

### Phase 3: Enhanced Risk Configuration ✅
- AuditConfig "Risk Assessment" tab with:
  - Editable criteria weights table with add/remove
  - Weight sum validation (must = 100%)
  - Configurable risk level thresholds (Critical/High/Medium)
  - Audit frequency mapping (months per risk level)

### Phase 4: Audit Universe Disabled ✅
- `FEATURE_AUDIT_UNIVERSE: false` in auditRouteConfig.ts
- Removed from sidebar navigation
- ExecutiveDashboard: "High-Risk Entities" → "High-Risk Functions" using Function Master
- CommitteeReports: same replacement

### Phase 5: Navigation Updated ✅
- Sidebar group renamed "Audit Universe & Risk" → "Risk Assessment"
- Removed `/audit/audit-universe` from navigation routes
