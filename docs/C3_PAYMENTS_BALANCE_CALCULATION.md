# C3 Payments and Balance Calculation

## Overview

This document describes the implementation of the Payments and Balance calculation logic for the Employer C3 form. These values are automatically calculated and displayed in the gray summary section of the form.

## Payments Calculation

### Data Source

The Payments value is calculated by querying the database to sum all valid payment amounts for the selected employer and C3 period.

### Database Query Logic

The calculation follows this SQL logic (adapted for Supabase):

```sql
SELECT SUM(COALESCE(payment_amount, 0)) as total_payments
FROM cn_payment p
INNER JOIN cn_payment_header h ON p.payment_id = h.payment_id
INNER JOIN cn_receipt r ON p.payment_id = r.payment_id
WHERE r.status != 'C'  -- Not cancelled
  AND EXTRACT(MONTH FROM p.period) = :period_month
  AND EXTRACT(YEAR FROM p.period) = :period_year
  AND h.payer_id = :employer_registration_number
  AND h.payer_type = :payer_type
  AND p.payment_code IN ('CON', 'LVC', 'LVF', 'PEC', 'PEF', 'SSE', 'SEF', 'SSC', 'SSF', 'VOC', 'VOL')
```

### Allowed Payment Codes

| Code | Description |
|------|-------------|
| CON | Contribution |
| LVC | Levy (Calculated) |
| LVF | Levy (Calculated) |
| PEC | PE Contribution (Calculated) |
| PEF | PE Contribution (Calculated) |
| SSE | Social Security (Employee) |
| SEF | Social Security (Employee) |
| SSC | Social Security (Calculated) |
| SSF | Social Security (Calculated) |
| VOC | Voluntary (Calculated) |
| VOL | Voluntary (Calculated) |

### Implementation

The `useC3Payments` hook in `src/hooks/useC3Payments.ts` implements this logic:

```typescript
import { useC3Payments } from "@/hooks/useC3Payments";

const { totalPayments, isLoading, error, refetch } = useC3Payments({
  payerId: employerId,
  payerType: 'ER', // Employer type
  periodYear: period.year,
  periodMonth: period.month // 0-indexed (0 = January)
});
```

### Behavior

- Automatically fetches when the component mounts
- Refetches when `payerId`, `payerType`, `periodYear`, or `periodMonth` changes
- Returns 0 if any required parameter is missing
- Treats NULL payment_amount values as 0
- Excludes cancelled receipts (status = 'C')

## Balance Calculation

### Formula

```
Balance = (SS Contribution due for the month + Total due to Accountant General) - Payments
```

Where:

- **SS Contribution due for the month** = Employee SS + Employer SS + SS Fine
- **Total due to Accountant General** = Employee Levy + Employer Levy + Severance + Levy Penalty + Severance Penalty
- **Payments** = Total payments from database (as calculated above)

### Implementation

The `calculateC3Balance` function in `src/hooks/useC3Payments.ts`:

```typescript
import { calculateC3Balance } from "@/hooks/useC3Payments";

const balance = calculateC3Balance(ssContributionDue, totalDueToAG, totalPayments);
```

### Real-time Updates

The Balance automatically updates when:
- C3 calculation amounts change (employee wages, contributions, penalties)
- Payments are recorded or modified in the database
- The selected period or employer changes

## Display

Both values are displayed read-only in the gray summary section:

- **Payments**: Shows loading spinner while fetching, then displays the formatted amount
- **Balance**: Shows "Calculating..." while payments load, then displays the calculated amount
- Negative balance values are highlighted in red (destructive color)

## Database Tables

### cn_payment

Stores individual payment transactions.

| Column | Description |
|--------|-------------|
| payment_sequence_no | Primary key (auto-generated) |
| payment_code | Payment type code |
| payment_id | Links to cn_payment_header |
| payment_amount | Amount paid |
| period | Payment period (for month/year filtering) |

### cn_payment_header

Stores payment header information linking to payers.

| Column | Description |
|--------|-------------|
| payer_id | Employer registration number |
| payer_type | Type of payer (ER for Employer) |
| payment_id | Unique payment identifier |

### cn_receipt

Stores receipt information with status.

| Column | Description |
|--------|-------------|
| receipt_id | Receipt identifier |
| payment_id | Links to payment |
| status | Receipt status ('C' = Cancelled) |

## Error Handling

- Database query errors are logged to console
- Error state is exposed via the hook for UI display
- Missing or partial data results in 0 payments
- The form continues to function even if payments query fails

## Future Enhancements

When modifying C3 calculations, ensure:

1. The `useC3Payments` hook continues to filter by the correct payment codes
2. The balance formula remains: `(SS Contribution + AG Total) - Payments`
3. All penalty and contribution types are included in the appropriate category
4. NULL handling is preserved for payment amounts
