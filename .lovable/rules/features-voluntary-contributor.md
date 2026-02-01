# Voluntary Contributor Registration - Knowledge Base

## Overview
The Voluntary Contributor (VC) registration feature allows eligible Insured Persons to register for voluntary social security contributions when they are not actively employed.

## Eligibility Criteria (ALL must pass)

1. **Residency**: `place_of_residence_code` in `ip_master` must be 'STK' or 'NEV'
2. **Age**: Between 16 and 62 years (configurable via `tb_vc_contrib_rate`)
3. **Employment Status**: No active employment (no record in `ip_employer` where `term_end_date IS NULL`)
4. **Assistance Pensioner**: `asp_num` in `ip_master` must NOT be 'Y'
5. **Termination Timeline**: If previously employed, registration must occur within 13 weeks (configurable) from employment termination date

## Key Tables

### tb_vc_contrib_rate
Configuration table for VC parameters:
- `vc_contrib_pct`: Contribution percentage (default 10%)
- `min_age` / `max_age`: Age eligibility range
- `termination_grace_weeks`: Grace period after employment ends
- `wage_history_months`: Months to look back for wage calculation (default 24)
- `weeks_per_year`: Weeks per year for calculations (default 52)

### ip_vol_contrib
Stores voluntary contributor registrations:
- Primary key: (ssn, date_registered)
- `date_ceased` is NULL for active contributors
- Only one active record allowed per SSN

## Database Functions

1. `check_vc_eligibility(p_ssn)` - Validates all eligibility criteria
2. `calculate_vc_avg_weekly_wage(p_ssn, p_date_registered)` - Calculates average weekly wage from 24-month history
3. `register_voluntary_contributor(...)` - Performs registration
4. `cease_voluntary_contributor(p_ssn, p_reason)` - Ceases VC status

## Automatic Cessation

A database trigger (`trigger_check_vc_residency`) automatically ceases VC status when:
- `place_of_residence_code` changes to a value other than 'STK' or 'NEV'

## UI Components

- `VCEligibilityCheck`: Displays eligibility status and registration button
- `VCRegistrationDialog`: Form for completing registration

## Configuration (C3 Calculation Config)

All VC parameters are manageable via `/admin/c3-calculation-config` under the "Voluntary Contributor" tab:
- vc_contrib_pct
- vc_min_age / vc_max_age
- vc_termination_grace_weeks
- vc_wage_history_months
- vc_weeks_per_year
- vc_duration_weeks
- vc_min_contrib_weeks

## Usage in IP Registration

Add the `VCEligibilityCheck` component to display VC status:

```tsx
import { VCEligibilityCheck } from '@/components/ip-registration';

<VCEligibilityCheck ssn={ipRecord.ssn} personName={ipRecord.name} />
```
