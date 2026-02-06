# Employer C3 Submission Form - Developer Guide

> **Route**: `/c3-management/manage`  
> **Primary Component**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Form Modes](#form-modes)
4. [Form State Management](#form-state-management)
5. [Employer Validation](#employer-validation)
6. [Period Selection & Schedule Number](#period-selection--schedule-number)
7. [Nil Return Functionality](#nil-return-functionality)
8. [Employee Management](#employee-management)
9. [Wage Entry Rules](#wage-entry-rules)
10. [Calculation Engine](#calculation-engine)
11. [Payments & Balance Calculation](#payments--balance-calculation)
12. [Penalty Calculations](#penalty-calculations)
13. [Save & Submit Workflow](#save--submit-workflow)
14. [Database Tables](#database-tables)
15. [Related Hooks](#related-hooks)
16. [Configuration Tables](#configuration-tables)
17. [UI Components](#ui-components)
18. [Key Business Rules Summary](#key-business-rules-summary)

---

## Overview

The Employer C3 Form is used by employers to report monthly employee wages and calculate Social Security, Levy, and Severance contributions. The form supports:

- **Add Mode**: Create new C3 submissions
- **Edit Mode**: Modify draft/pending submissions
- **View Mode**: Read-only view of submitted records

All calculations are **configuration-driven** and performed **server-side** via PostgreSQL RPC functions, ensuring regulatory compliance and auditability.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EmployerC3Form.tsx                           │
│  (Main Form Component)                                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ useEmployer     │  │ useC3Server     │  │ useC3Payments   │
│ Validation      │  │ Calculations    │  │ (Hook)          │
│ (Hook)          │  │ (Hook)          │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ er_master       │  │ calculate_c3_   │  │ cn_payment      │
│ (DB Table)      │  │ contributions   │  │ cn_receipt      │
│                 │  │ (RPC)           │  │ cn_payment_     │
│                 │  │                 │  │ header          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/pages/c3Management/forms/EmployerC3Form.tsx` | Main form component |
| `src/components/c3/EmployeeModal.tsx` | Employee wage entry modal |
| `src/hooks/useC3ServerCalculations.ts` | Server-side calculation hook |
| `src/hooks/useC3EmployeeCalculation.ts` | Real-time employee calculation hook |
| `src/hooks/useC3Payments.ts` | Payments query and balance calculation |
| `src/hooks/useEmployerValidation.ts` | Employer/Employee validation |
| `src/hooks/useC3Submit.ts` | Submission and workflow trigger |
| `src/utils/weekCalculations.ts` | Monday counting and week logic |

---

## Form Modes

### Add Mode (`mode === 'add'`)
- All fields editable
- Date Received defaults to current date
- Received By defaults to logged-in user
- Schedule number auto-calculated
- Empty employee list

### Edit Mode (`mode === 'edit'`)
- Fields editable except Employer ID (once validated)
- Can modify employees and wages
- Only available for Draft (DFT) status

### View Mode (`mode === 'view'`)
- All fields read-only
- Uses `PreviewField` component for display
- Actions (Save, Submit) hidden

---

## Form State Management

### Primary Form State

```typescript
const [formData, setFormData] = useState({
  employerId: "",           // Employer registration number
  period: null,             // { year: number; month: number }
  dateReceived: "",         // ISO date string
  receivedBy: "",           // UserCode of receiver
  schedule: "",             // Auto-calculated schedule number
  employerName: "",         // Auto-populated from er_master
  address: "",              // Auto-populated from er_master
  numberOfEmployees: "0",   // Auto-updated from employees array length
  status: "Draft",          // Current record status
  nilReturn: false          // Nil return flag
});
```

### Employee State

```typescript
const [employees, setEmployees] = useState<EmployeeData[]>([]);

interface EmployeeData {
  ssn: string;              // 6-digit SSN
  name: string;             // Auto-populated from ip_master
  days: boolean[];          // Week checkbox states [7 items]
  weeklyWages: number[];    // Wage amounts [7 items: W1-W5, Bonus, Holiday]
  termStartDate?: string;   // Employee's employment start date
  payPeriod?: string;       // 'Weekly' | 'Bi-Weekly' | 'Monthly' | '2 Monthly'
  dateOfBirth?: string;     // For age-based exemption checks
  // Calculated fields
  employeeSS?: number;
  employeeLevy?: number;
  employerSS?: number;
  employerLevy?: number;
  employerSeverance?: number;
  periodGross?: number;
}
```

---

## Employer Validation

### Validation Flow

1. User enters Employer ID
2. On blur, `handleEmployerBlur()` is triggered
3. Calls `validateEmployer(regNo)` from `useEmployerValidation`
4. Queries `er_master` table for matching `regno`

### Validation Rules

| Check | Criteria | Error Message |
|-------|----------|---------------|
| Required | Non-empty value | "Employer ID is required" |
| Exists | Record in `er_master` | "Please enter a valid employer registration number" |
| Active | `status` = 'A' or 'V' | "This employer is not active" |

### Auto-Population

On successful validation:
- `employerName` ← `er_master.name`
- `address` ← Concatenation of `maddr1`, `maddr2`, `hq_addr1`, `hq_addr2`

---

## Period Selection & Schedule Number

### Period Selection

Uses `MonthYearPicker` component. Period is stored as:
```typescript
{ year: number; month: number }  // month is 0-indexed
```

### Schedule Number Calculation

The schedule number is a **sequential counter** per Employer + Period combination:

```typescript
const scheduleNo = await getScheduleNumber(employerId, 'ER', periodStr);
```

This calls the RPC function `get_next_c3_schedule_no` which:
1. Counts existing records for the same `payer_id`, `payer_type`, and `period`
2. Returns `count + 1`

**Recalculation Triggers**:
- Employer ID validated
- Period changed

---

## Nil Return Functionality

When `nilReturn` is checked:

1. Employee Details section is **hidden**
2. Employees array is **cleared** on save
3. Calculations show **zero** values
4. Submission allowed without employee data

```typescript
{!formData.nilReturn && (
  <>
    {/* Employee Details Section */}
  </>
)}
```

---

## Employee Management

### Adding Employees

1. Click "Add Employee" button (requires validated employer)
2. Opens `EmployeeModal` in add mode
3. Enter SSN → Auto-validates against `ip_master`
4. Select Pay Period
5. Enter wages for enabled weeks
6. View real-time calculation summary
7. Save → Employee added to list

### SSN Validation

```typescript
const validateEmployee = async (ssn: string): Promise<EmployeeValidationResult>
```

Validates against `ip_master` table and retrieves:
- Full name
- Date of birth (for age calculations)
- Term start date (for bi-weekly week determination)

### Editing Employees

- Click edit icon in employee table
- Opens modal with pre-populated data
- SSN field is **read-only** when editing
- Changes recalculate contributions

### Deleting Employees

- Remove from `employees` array
- Triggers overall recalculation

---

## Wage Entry Rules

### Week Array Structure

```typescript
weeklyWages: [
  0,  // Index 0: Week 1
  1,  // Index 1: Week 2
  2,  // Index 2: Week 3
  3,  // Index 3: Week 4
  4,  // Index 4: Week 5
  5,  // Index 5: Bonus Pay
  6   // Index 6: Holiday Pay
]
```

### Monday Count Logic

Weeks 1-5 availability depends on the number of Mondays in the month:

```typescript
const mondayCount = getMondayCount(year, month);
const enabledWeekCheckboxes = [true, true, true, true, mondayCount >= 5];
```

### Pay Period Rules

| Pay Period | Enabled Weeks |
|------------|---------------|
| **Monthly** | Only the last Monday's week |
| **Weekly** | All weeks (up to Monday count) |
| **Bi-Weekly** | Even-numbered weeks from term start date |
| **2 Monthly** | Weeks 2 and 4 only |

### Pay Period Change Confirmation

If wages are already entered and user changes Pay Period:
1. Confirmation dialog appears
2. On confirm: All wages and checkboxes reset
3. On cancel: Revert to previous pay period

---

## Calculation Engine

### Server-Side Calculations

The form uses **debounced server-side calculations** via `useC3ServerCalculations`:

```typescript
await calculateServerSide(
  formData.period.year,
  formData.period.month,
  formData.dateReceived,
  employees
);
```

### Calculation RPC

Calls `calculate_c3_contributions` PostgreSQL function which:
1. Fetches configuration for the period
2. Calculates contributions for each employee
3. Aggregates totals
4. Calculates penalties based on days late

### Wage Totals

| Total | Formula |
|-------|---------|
| **Total Wages** | Week1 + Week2 + Week3 + Week4 + Week5 + Holiday + Bonus |
| **Taxable Wages** | Week1 + Week2 + Week3 + Week4 + Week5 + Holiday (NO bonus) |

### Employee Contributions

| Contribution | Formula |
|--------------|---------|
| **Employee SS** | `employeeSSRate × min(TaxableWages, ssMaxWage)` |
| **Employee Levy** | Slab-based calculation (see below) |

### Employer Contributions

| Contribution | Formula |
|--------------|---------|
| **Employer SS** | `employerSSRate × min(TaxableWages, ssMaxWage)` |
| **Employer EIB** | `employerEIBRate × min(TaxableWages, ssMaxWage)` |
| **Employer Levy** | `employerLevyRate × TaxableWages` |
| **Employer Severance** | `employerSeveranceRate × TaxableWages` |

### Employee Levy Calculation (Slab-Based)

The levy is calculated using tiered slabs from `tb_levy_slab_details`:

```typescript
function calculateSlabLevy(amount: number, slabDetails: LevySlabDetail[]): number {
  for (const slab of slabDetails) {
    if (amount > slab.overAmt) {
      return slab.baseAmt + ((amount - slab.overAmt + 0.01) * slab.taxRate);
    }
  }
  return 0;
}
```

### Monthly Levy Switching

If enabled in configuration and total wages (Week1-6) exceed threshold:

```typescript
if (levyUseMonthlyWhenExceeded && totalWeek1To6 > levyMonthlyThreshold) {
  // Calculate using monthly slabs on combined total
  totalLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
}
```

### Age-Based Exemptions

| Contribution | Age Range |
|--------------|-----------|
| Social Security | `minAgeSS` to `maxAgeSS` (default: 16-62) |
| Levy | `minAgeLevy` to `maxAgeLevy` (default: 16-62) |

Employees outside these ranges are **exempt** from the respective contribution.

---

## Payments & Balance Calculation

### Payments Query

The `useC3Payments` hook queries existing payments for the employer and period:

```typescript
const { totalPayments, isLoading, error, refetch } = useC3Payments({
  payerId: formData.employerId,
  payerType: 'ER',
  periodYear: formData.period?.year ?? null,
  periodMonth: formData.period?.month ?? null
});
```

### Payment Query Logic

```sql
SELECT SUM(COALESCE(payment_amount, 0))
FROM cn_payment p
INNER JOIN cn_payment_header h ON p.payment_id = h.payment_id
INNER JOIN cn_receipt r ON p.payment_id = r.payment_id
WHERE r.status != 'C'  -- Not cancelled
  AND p.period BETWEEN :periodStart AND :periodEnd
  AND h.payer_id = :employerId
  AND h.payer_type = 'ER'
  AND p.payment_code IN ('CON', 'LVC', 'LVF', 'PEC', 'PEF', 
                          'SSE', 'SEF', 'SSC', 'SSF', 'VOC', 'VOL')
```

### Allowed Payment Codes

| Code | Description |
|------|-------------|
| CON | Contribution |
| LVC/LVF | Levy (Calculated) |
| PEC/PEF | PE Contribution (Calculated) |
| SSE/SEF | Social Security (Employee) |
| SSC/SSF | Social Security (Calculated) |
| VOC/VOL | Voluntary (Calculated) |

### Balance Calculation

```typescript
const ssContributionDue = employeeSS + employerSS + ssFine;
const totalDueToAG = employeeLevy + employerLevy + employerSeverance 
                   + levyPenalty + severancePenalty;

const balance = (ssContributionDue + totalDueToAG) - totalPayments;
```

### Display

- **Payments**: Displayed in gray summary section with loading indicator
- **Balance**: Displayed with conditional red styling for negative values

---

## Penalty Calculations

Penalties are calculated based on **days late** from the submission due date:

### Due Date

The due date is typically the 14th of the month following the contribution period.

### Penalty Rates (from configuration)

| Penalty | Initial Rate | Subsequent Rate |
|---------|--------------|-----------------|
| Levy Penalty | 10% | 1% per additional month |
| Severance Penalty | 10% | 1% per additional month |
| SS Fine | 5% per month | 5% per month |

### Calculation Logic

```typescript
// If late (daysLate > 0):
const monthsLate = Math.ceil(daysLate / 30);
const additional30DayPeriods = Math.max(0, monthsLate - 1);

levyPenalty = (employerLevy * initialRate) 
            + (employerLevy * subsequentRate * additional30DayPeriods);

severancePenalty = (employerSeverance * initialRate) 
                 + (employerSeverance * subsequentRate * additional30DayPeriods);

ssFine = (employeeSS + employerSS) * monthsLate * ssFineRate;
```

---

## Save & Submit Workflow

### Save Process

1. Validate employer (unless Nil Return)
2. Format period for storage: `YYYY-MM-01`
3. Build save payload including:
   - Form data
   - Employees array (empty if Nil Return)
   - Calculated totals
4. Call `onSave(formDataToSave)`
5. Parent component persists to `cn_c3_reported` and `ip_wages`

### Submit Process

Only available when:
- Record has been saved (`initialData?.id` exists)
- Status is 'DFT' (Draft) or 'Z'

```typescript
const handleSubmit = async () => {
  const result = await submitC3Record(initialData.id, 'ER', recordName);
  
  if (result.success) {
    toast({ title: "Record Submitted" });
    onSubmit?.(initialData.id);
  }
};
```

### Workflow Integration

On submit, `useC3Submit` hook:
1. Calls `submit_c3_record` RPC (transitions status from DFT to PEN)
2. Looks up workflow trigger for module
3. Creates workflow instance if configured
4. Creates first workflow task
5. Notifies approvers via edge function

---

## Database Tables

### Primary Tables

| Table | Purpose |
|-------|---------|
| `cn_c3_reported` | C3 header records |
| `ip_wages` | Employee wage details |
| `er_master` | Employer registry |
| `ip_master` | Insured person registry |

### Payment Tables

| Table | Purpose |
|-------|---------|
| `cn_payment` | Individual payment transactions |
| `cn_payment_header` | Payment batch headers |
| `cn_receipt` | Receipt status tracking |

### Configuration Tables

| Table | Purpose |
|-------|---------|
| `c3_config_periods` | Configuration period definitions |
| `c3_config_details` | Rates, limits, thresholds |
| `tb_levy_slabs` | Levy slab definitions |
| `tb_levy_slab_details` | Levy slab brackets |
| `c3_bonus_levy_exemptions` | Bonus exemption periods |

---

## Related Hooks

### useEmployerValidation

```typescript
const { validateEmployer, validateEmployee, getScheduleNumber, isValidating } 
  = useEmployerValidation();
```

### useC3ServerCalculations

```typescript
const { calculate, isCalculating, calculationResult, error, clearCalculation } 
  = useC3ServerCalculations();
```

### useC3EmployeeCalculation

Used in EmployeeModal for real-time preview:

```typescript
const { config, isLoading, error, calculate } 
  = useC3EmployeeCalculation(periodYear, periodMonth);
```

### useC3Payments

```typescript
const { totalPayments, isLoading, error, refetch } 
  = useC3Payments({ payerId, payerType, periodYear, periodMonth });
```

### useC3Submit

```typescript
const { submitC3Record, isSubmitting } = useC3Submit();
```

### useUserCode

```typescript
const { userCode, userId } = useUserCode();
```

---

## Configuration Tables

### c3_config_periods

Defines configuration validity periods:

| Column | Purpose |
|--------|---------|
| `id` | Primary key |
| `start_date` | Configuration start date |
| `end_date` | Configuration end date (null = current) |
| `is_active` | Active flag |

### c3_config_details

Contains all calculation parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `min_age_ss` | 16 | Minimum SS age |
| `max_age_ss` | 62 | Maximum SS age |
| `employee_ss_rate` | 0.05 | 5% employee SS rate |
| `employee_ss_max_wage` | 6500 | SS wage cap |
| `employer_ss_rate` | 0.05 | 5% employer SS rate |
| `employer_eib_rate` | 0.01 | 1% EIB rate |
| `employer_levy_rate` | 0.03 | 3% employer levy rate |
| `employer_severance_rate` | 0.01 | 1% severance rate |
| `levy_monthly_threshold` | 6500 | Monthly switching threshold |
| `levy_use_monthly_when_exceeded` | false | Enable monthly switching |
| `bonus_exempt_from_levy` | varies | Period-specific exemption |
| `levy_penalty_initial_rate` | 0.10 | 10% initial penalty |
| `levy_penalty_subsequent_rate` | 0.01 | 1% subsequent penalty |

---

## UI Components

### MonthYearPicker

Custom date picker for month/year selection only.

### ReceivedBySelect

Dropdown bound to `profiles` table, defaults to logged-in user.

### EmployeeModal

Modal dialog for employee wage entry with:
- SSN validation
- Pay period selection
- Week checkbox/amount entry
- Real-time calculation summary
- Age exemption alerts

### DataTable

Generic table component for employee list display.

---

## Key Business Rules Summary

1. **Employer ID must be validated** before adding employees
2. **Schedule number is auto-calculated** per Employer + Period
3. **Nil Return bypasses** employee requirements
4. **Age exemptions** apply to SS (16-62) and Levy (16-62)
5. **Weekly wage availability** depends on Monday count in month
6. **Pay period changes** reset all entered wages (with confirmation)
7. **Levy uses slab-based calculation** with optional monthly switching
8. **Penalties apply** for late submissions (days after due date)
9. **Balance = (SS Due + AG Due) - Payments**
10. **Submissions trigger workflow** if configured
11. **Maker-checker policy** applies to verification

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-06 | 1.0 | Initial documentation |

---

## Related Documentation

- [C3 Payments and Balance Calculation](./C3_PAYMENTS_BALANCE_CALCULATION.md)
- [C3 Configuration Dashboard](./C3_CONFIGURATION_ADMIN.md)
- [Workflow Engine Integration](./WORKFLOW_ENGINE.md)
