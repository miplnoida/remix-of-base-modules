

# Refactor: Internal Audit Engagement Planning Experience

## Summary

Upgrade the engagement editor dialog (`EditEngagementDialog.tsx`) from a manual form-driven experience to a guided, intelligent planning tool. Four specific areas are fixed: Inclusion Rationale, Expected Deliverables, Auditee Contact, and Schedule & Resources.

---

## Database Changes (1 migration)

Add 6 new columns to `ia_audit_engagements` for structured data, preserving existing free-text columns as fallback:

```sql
ALTER TABLE ia_audit_engagements
  ADD COLUMN IF NOT EXISTS inclusion_reason_codes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS inclusion_reason_notes TEXT,
  ADD COLUMN IF NOT EXISTS expected_deliverable_codes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS expected_deliverable_notes TEXT,
  ADD COLUMN IF NOT EXISTS primary_auditee_contact_id UUID,
  ADD COLUMN IF NOT EXISTS secondary_auditee_contact_ids JSONB DEFAULT '[]';
```

No columns are dropped. Old `inclusion_rationale`, `expected_deliverable`, and `auditee_contact` remain for backward compatibility and legacy data display.

---

## Fix 1: Inclusion Rationale (Identity & Coverage tab)

**Current**: Single free-text `<Input>` field.

**New**:
- **Primary Inclusion Reason** — multi-select (max 2) from 13 predefined options: High Risk Area, Regulatory/Compliance Requirement, Management Request, Previous Audit Findings, High Transaction Volume, Process Criticality, System/Process Change, Fraud Risk/Sensitive Area, Follow-up Audit, Board/Audit Committee Request, Rotational Coverage, Thematic Review, Other.
- **Additional Inclusion Notes** — optional `<Textarea>`, required if "Other" is selected.
- Stored in `inclusion_reason_codes` (JSONB array) and `inclusion_reason_notes` (text).
- On load for legacy records: if `inclusion_rationale` exists but `inclusion_reason_codes` is empty, display old text in the notes field.
- Validation: at least 1 reason required; if "Other" selected, notes required.

---

## Fix 2: Expected Deliverables (Planning Narrative tab)

**Current**: Single free-text `<Input>` labeled "Expected Deliverable".

**New**:
- **Expected Deliverables** — multi-select (required, at least 1) from 13 options: Audit Report, Detailed Findings Report, Management Action Plan, Process Improvement Recommendations, Control Gap Assessment, Compliance Assessment, Root Cause Analysis, Data Analytics Report, Risk Assessment Update, Follow-up Tracker, Executive Summary Memo, Board/Committee Summary, Other.
- **Additional Deliverables Notes** — optional `<Textarea>`, required if "Other" selected.
- Stored in `expected_deliverable_codes` (JSONB) and `expected_deliverable_notes` (text).
- Legacy: old `expected_deliverable` text mapped to notes on load.

---

## Fix 3: Auditee Contact (Team & Ownership tab)

**Current**: Single free-text `<Input>` for auditee contact.

**New**:
- When department is selected, query `ia_departments` for `head`, `head_profile_id` and query `ia_department_functions` for `responsible_person` to build a suggestion list.
- Also query `profiles` table for names/emails of suggested contacts.
- **Primary Auditee Contact** — `SearchableSelect` showing suggested contacts (with "Suggested from Department/Function" helper text), plus an "Other (manual entry)" option.
- **Secondary Auditee Contacts** — optional multi-select checkboxes from the same pool.
- **Manual fallback** — if "Other" selected or no suggestions exist, show a text input.
- Stored in `primary_auditee_contact_id` (UUID) and `secondary_auditee_contact_ids` (JSONB).
- Legacy: old `auditee_contact` text shown as fallback display if no structured contact exists.

---

## Fix 4: Schedule & Resources (Schedule tab)

**Current**: Manual entry for Quarter, Month, Estimated Weeks, Start Date, End Date, Estimated Days, Scheduling Notes. All independent.

**New smart derivation logic**:
- **Planned Start Date** + **Planned End Date**: primary inputs.
- **Estimated Days**: if start and end dates entered, auto-calculate working days (excludes weekends). User can override.
- **Estimated Hours**: derived as `estimated_days * 8` (standard 8hr day). Editable.
- **Quarter**: auto-derived from start date (read-only badge, editable via override toggle only if needed).
- **Month**: auto-derived from start date (read-only, editable via override).
- **Estimated Weeks**: removed as separate input — shown as derived read-only display (`Math.ceil(days / 5)`).
- If only Estimated Days entered without end date, system suggests end date.
- Validation: start <= end; dates within fiscal year (warning, not hard block); lead auditor required.

**Resource Intelligence Panel** (new sub-section):
- When Lead Auditor is selected, show:
  - Count of other engagements assigned to them in this plan.
  - Total planned days already assigned in the same quarter.
  - Overlap warning if date ranges intersect with other engagements.
- Data sourced from the same `useIAPlanEngagements` hook already loaded in `EngagementBuilder`.
- Displayed as a compact info card within the schedule tab.

---

## UI Components

**New shared helper**: `src/components/audit/engagement/MultiSelectChips.tsx`
- Reusable multi-select component with chip display for both Inclusion Rationale and Expected Deliverables.
- Renders as a bordered container with checkboxes and selected chips at top.

**New helper**: `src/components/audit/engagement/AuditeeContactSelector.tsx`
- Encapsulates the department-driven contact suggestion logic.

**New helper**: `src/components/audit/engagement/ScheduleIntelligence.tsx`
- Compact panel showing auditor workload hints and date derivations.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/audit/EditEngagementDialog.tsx` | Major refactor of all 4 tabs with new structured inputs, derivation logic, updated form state, validation, and payload |
| `src/components/audit/EngagementBuilder.tsx` | Pass engagements data to dialog for resource intelligence; update column display for new fields |
| `src/components/audit/BoardPackTab.tsx` | Update PDF to render structured rationale codes, deliverable codes, and resolved contact names |
| New migration SQL | Add 6 columns to `ia_audit_engagements` |

## New Files

| File | Purpose |
|------|---------|
| `src/components/audit/engagement/MultiSelectChips.tsx` | Reusable multi-select with chips |
| `src/components/audit/engagement/AuditeeContactSelector.tsx` | Department-driven contact suggestions |
| `src/components/audit/engagement/ScheduleIntelligence.tsx` | Auditor workload and date intelligence panel |

---

## Backward Compatibility

- No columns deleted; old text fields remain.
- Legacy records with only `inclusion_rationale` text: shown in notes field, codes array empty.
- Legacy records with only `expected_deliverable` text: shown in notes field.
- Legacy records with only `auditee_contact` text: shown as manual fallback display.
- All new columns are nullable with defaults, so existing records and RPCs are unaffected.
- `ia_persist_plan_engagements` RPC will pass through new JSONB fields naturally.

## Non-Impact Confirmation

Only audit-specific files are touched. No changes to: PageShell, DataTable, StandardModal, StatusBadge, MetricCard, global workflow engine, RBAC, non-audit routes, or any cashier/payment/registration modules.

