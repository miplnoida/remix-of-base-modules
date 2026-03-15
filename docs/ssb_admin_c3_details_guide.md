# SSB Admin – C3 Details Screens Implementation Guide

## ⚠️ CRITICAL RULE: NO DIRECT DATABASE ACCESS

Same rule as the main SSB Admin guide — SSB Admin does NOT have C3 tables.
All data comes from calling the `wiz-admin-api` Edge Function via HTTP POST.

---

## Architecture Overview

```
┌──────────────┐         POST /functions/v1/wiz-admin-api        ┌──────────────────┐
│  SSB Admin   │  ─────────────────────────────────────────────>  │  C3-Wizard       │
│  (Frontend)  │  <─────────────────────────────────────────────  │  (Edge Function) │
│              │         JSON { action, params }                  │                  │
│  NO c3_*     │         JSON { status, data }                    │  ↕ c3_contrib_   │
│  tables here │                                                  │    headers       │
│              │                                                  │  ↕ c3_self_emp_  │
│              │                                                  │    contributions │
│              │                                                  │  ↕ c3_payments   │
└──────────────┘                                                  └──────────────────┘
```

---

## Screens Overview

### Screen 1: C3 Contribution (Employer – Regular Employees)
- **Route**: `/admin/c3-management/c3-contribution`
- **Purpose**: View all C3 contribution records submitted by employers for regular employees (not directors)
- **Legacy Equivalent**: Admin Dashboard > C3 Details > C3 Contribution

### Screen 2: Non-Working Director
- **Route**: `/admin/c3-management/nw-director`
- **Purpose**: View NW Director contribution records (levy-only, no SS/severance)
- **Legacy Equivalent**: Admin Dashboard > C3 Details > NW Director

### Screen 3: Self-Employed
- **Route**: `/admin/c3-management/self-employed`
- **Purpose**: View Self-Employed contribution records
- **Legacy Equivalent**: Admin Dashboard > C3 Details > Self Employed

---

## API Reference

### Authentication

Every request MUST include:
```
x-admin-api-key: <value of WIZ_ADMIN_API_KEY secret>
```

### Helper Function

Use the existing `wizAdminApi()` helper from `src/services/wizAdminApi.ts`.

---

## Screen 1: C3 Contribution (Employer)

### Filters
- **Select Employer**: Dropdown populated by `get_companies_dropdown` → displays `company_name (registration_number)`
- **Period From**: `MMM-YYYY` format (e.g., "Jan-2026")
- **Period To**: `MMM-YYYY` format
- **Search Button**: Triggers data fetch

### API: `get_contribution_list`

```typescript
const result = await wizAdminApi('get_contribution_list', {
  company_id: 123,               // required
  period_from: 'Jan-2026',       // optional, MMM-YYYY
  period_to: 'Dec-2026',         // optional, MMM-YYYY
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "contributions": [
      {
        "header_id": 45,
        "month": "January",
        "month_number": 1,
        "year": "2026",
        "wages": 21000.00,
        "social_security": 2255.00,
        "levy": 1327.50,
        "fines_and_penalties": 0.00,
        "severance": 210.00,
        "total": 3792.50,
        "creation_date": "2026-02-06T...",
        "schedule": 1,
        "is_nil": false,
        "notes": "",
        "is_submitted": true,
        "is_finalized": false,
        "is_imported_from_bema": false,
        "payment_status": "$ Pay",
        "payment_id": null
      }
    ],
    "total_records": 9
  }
}
```

### Table Columns (Left to Right)

| Column | Source Field | Notes |
|---|---|---|
| Month | `month` | Displayed as green badge with check icon (e.g., ✅ January) |
| Year | `year` | |
| Wages | `wages` | Format: `$21,000.00` |
| Social Security | `social_security` | Format: `$2,255.00` |
| Levy | `levy` | Format: `$1,327.50` |
| Fines and Penalties | `fines_and_penalties` | Format: `$0.00` |
| Severance | `severance` | Format: `$210.00` |
| Total | `total` | Format: `$3,792.50` |
| Creation Date | `creation_date` | Format: `dd-MMM-yyyy` |
| Schedule | `schedule` | Integer |
| Is Nil | `is_nil` | ✅ (green check) or ❌ (red X) |
| Notes | `notes` | Text |
| Is Submitted | `is_submitted` | Toggle switch: green "Yes" if true, grey if false. **Read-only in admin.** |
| Preview | — | Eye icon button → opens C3 Preview modal (call `get_contribution_preview`) |
| Delete | — | Trash icon button → confirmation dialog → `delete_contribution` |
| Payment | `payment_status` | See Payment Column Logic below |

### Payment Column Logic

| Condition | Display |
|---|---|
| `payment_status === "Paid"` | Grey "Paid" badge with printer icon 🖨️ |
| `payment_status === "$ Pay"` | Green bordered "$ Pay" button (clickable → navigates to payment flow) |
| `payment_status === "BEMA"` | Grey bordered "BEMA" badge (non-clickable, imported by SSB Admin) |
| `payment_status === ""` | Empty (not submitted yet) |

### Is Submitted Toggle Behavior

- **Green "Yes" toggle**: Record is submitted and editable/payable
- **Grey "Yes" toggle (inactive)**: Record is submitted AND paid — toggle is read-only/disabled
- The toggle is **always read-only in admin** — admin cannot change submission status from this screen

### Month Badge

Each month cell displays with a green circle/check icon prefix (e.g., `🟢 January`). This indicates the record exists for that period.

### Delete API: `delete_contribution`

```typescript
await wizAdminApi('delete_contribution', {
  header_id: 45,
  type: 'employer',  // 'employer' for C3, 'nwd' for NW Director
});
```

---

## Screen 2: Non-Working Director

### Filters
- **Select Non Working Director**: Same as Select Employer – use `get_companies_dropdown`
- **Period From / Period To**: `MMM-YYYY`

### API: `get_nwd_contribution_list`

```typescript
const result = await wizAdminApi('get_nwd_contribution_list', {
  company_id: 123,
  period_from: 'Jan-2026',
  period_to: 'Dec-2026',
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "contributions": [
      {
        "header_id": 78,
        "month": "January",
        "month_number": 1,
        "year": "2026",
        "wages": 650.00,
        "levy": 52.00,
        "fines_and_penalties": 0.00,
        "total": 52.00,
        "creation_date": "2026-02-12T...",
        "schedule": 1,
        "is_nil": false,
        "notes": "",
        "is_submitted": true,
        "is_finalized": false,
        "is_imported_from_bema": false,
        "payment_status": "$ Pay",
        "payment_id": null
      }
    ],
    "total_records": 3
  }
}
```

### Table Columns (Left to Right)

| Column | Source Field |
|---|---|
| Month | `month` |
| Year | `year` |
| Wages | `wages` |
| Levy | `levy` |
| Fines and Penalties | `fines_and_penalties` |
| Total | `total` |
| Creation Date | `creation_date` |
| Schedule | `schedule` |
| Is Nil | `is_nil` |
| Notes | `notes` |
| Is Submitted | `is_submitted` |
| Preview | Eye icon |
| Delete | Trash icon |
| Payment | `payment_status` |

**Key Difference from C3 Contribution:** No "Social Security" or "Severance" columns. NW Directors only pay Levy.

### Delete

```typescript
await wizAdminApi('delete_contribution', { header_id: 78, type: 'nwd' });
```

---

## Screen 3: Self-Employed

### Filters
- **Select Self Employee**: Dropdown populated by `get_self_employed_dropdown`
  - Displays: `FirstName LastName (SSN)` e.g., "Franklyn Tyson (187587)"
- **Period From / Period To**: `MMM-YYYY`

### API: `get_self_employed_dropdown`

```typescript
const result = await wizAdminApi('get_self_employed_dropdown', {});
// result.data.self_employed = [{ id, social_security_number, name, display }]
```

### API: `get_se_contribution_list`

```typescript
const result = await wizAdminApi('get_se_contribution_list', {
  self_employed_id: 42,           // required
  period_from: 'Sep-2025',       // optional
  period_to: 'Oct-2025',        // optional
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "contributions": [
      {
        "contribution_id": 15,
        "month": "October",
        "month_number": 10,
        "year": "2025",
        "wages": 2400.00,
        "fine": 0.00,
        "total": 240.00,
        "creation_date": "2025-10-15T...",
        "notes": "",
        "is_submitted": true,
        "is_finalized": false,
        "is_imported_from_bema": true,
        "is_paid": false,
        "payment_status": "BEMA",
        "payment_id": null
      }
    ],
    "total_records": 2
  }
}
```

### Table Columns (Left to Right)

| Column | Source Field |
|---|---|
| Month | `month` |
| Year | `year` |
| Wages | `wages` |
| Fine | `fine` |
| Total | `total` |
| Creation Date | `creation_date` |
| Notes | `notes` |
| Is Submitted | `is_submitted` |
| Preview | Eye icon |
| Delete | Trash icon |
| Payment | `payment_status` |

**Key Differences from C3 Contribution:**
- No Social Security, Levy, Severance, Schedule, Is Nil columns
- Uses `self_employed_id` instead of `company_id`
- "Fine" instead of "Fines and Penalties"

### Delete

```typescript
await wizAdminApi('delete_contribution', { header_id: 15, type: 'self_employed' });
```

---

## Data Flow Explanation

### How C3 Submissions Are Stored

1. **Employer C3 (Regular):**
   - User submits via C3 Wizard → `c3_contribution_headers` (is_for_director=false) + `c3_contribution_details`
   - BIMA import → same tables with `is_imported_from_bema=true`

2. **NW Director C3:**
   - Same as Employer but `is_for_director=true` in `c3_contribution_headers`
   - Only levy is calculated (no SS, no severance)

3. **Self-Employed C3:**
   - User submits via SE portal → `c3_self_employed_contributions`
   - BIMA import → same table with `is_imported_from_bema=true`

4. **Payments:**
   - Online payments → `c3_payments` with `contribution_header_id` (employer/NWD) or `self_employed_contribution_id` (SE)
   - `payment_status = "AUTHORIZED"` means paid

### Database Tables (DO NOT query directly)

| Table | Contains |
|---|---|
| `c3_contribution_headers` | Employer + NWD C3 headers (distinguished by `is_for_director`) |
| `c3_contribution_details` | Line items for each header (one per employee) |
| `c3_self_employed_contributions` | Self-Employed C3 records (flat, no details table) |
| `c3_payments` | Payment records linked to headers or SE contributions |
| `c3_companies` | Employer companies (for dropdown) |
| `c3_self_employed` | Self-employed profiles (for dropdown) |

### Field Mapping: Legacy UI → API Response

#### C3 Contribution

| Legacy UI Field | API Response Field | DB Column |
|---|---|---|
| Month | `month` | `period_month` (mapped from "1"→"January") |
| Year | `year` | `period_year` |
| Wages | `wages` | `total_wages` |
| Social Security | `social_security` | `total_social_security` (or sum of ee+er) |
| Levy | `levy` | `total_levy_employee + total_levy_employer` |
| Fines and Penalties | `fines_and_penalties` | `total_ss_penalty + total_levy_penalty + total_pe_penalty` |
| Severance | `severance` | `total_severance` |
| Total | `total` | `grand_total` |
| Creation Date | `creation_date` | `created_at` |
| Schedule | `schedule` | `schedule_number` |
| Is Nil | `is_nil` | `is_nil_return` |
| Notes | `notes` | `notes` |
| Is Submitted | `is_submitted` | `is_submitted` |

#### Self-Employed

| Legacy UI Field | API Response Field | DB Column |
|---|---|---|
| Month | `month` | `period_month` |
| Year | `year` | `period_year` |
| Wages | `wages` | `declared_income` |
| Fine | `fine` | `fine_amount` |
| Total | `total` | `total_contribution` |
| Creation Date | `creation_date` | `created_at` |
| Notes | `notes` | `notes` |
| Is Submitted | `is_submitted` | `is_submitted` |

---

## Sidebar Navigation Structure

Under the existing **C3 DETAILS** menu (expandable):
```
$ C3 DETAILS  ˅
    C3 CONTRIBUTION
    NW DIRECTOR
    SELF EMPLOYED
```

---

## Error Handling

```typescript
try {
  const result = await wizAdminApi('get_contribution_list', params);
  // success
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' });
}
```

---

## Preview API Reference

### API: `get_contribution_preview` (Employer C3)

Called when user clicks the Eye icon on any row in the C3 Contribution screen.

```typescript
const result = await wizAdminApi('get_contribution_preview', {
  header_id: 45,    // required
  company_id: 123,  // required
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "companyName": "M & M Transportation Services Ltd",
    "tradeName": "M&M Transport",
    "registrationNumber": "658864",
    "address": "123 Main St, Georgetown, Demerara",
    "periodMonth": "January",
    "periodYear": "2026",
    "periodLabel": "January 2026",
    "scheduleNumber": 1,
    "isNilReturn": false,
    "isSubmitted": true,
    "isFinalized": false,
    "employees": [
      {
        "ssn": "220562",
        "name": "Fontain, Nazio",
        "week1": 1500, "week2": 1500, "week3": 1500, "week4": 1500, "week5": 0,
        "totalWages": 6000,
        "holidayPay": 0,
        "bonus": 0,
        "directorWage": 0,
        "ssEmployee": 330, "ssEmployer": 495, "ssTotal": 825,
        "eiEmployee": 0, "eiEmployer": 0,
        "levyEmployee": 60, "levyEmployer": 60,
        "peEmployee": 30, "peEmployer": 30
      }
    ],
    "employeeCount": 1,
    "totals": {
      "totalWages": 6000, "totalHolidayPay": 0, "totalBonus": 0,
      "ssEmployee": 330, "ssEmployer": 495, "ssTotal": 825, "ssPenalty": 0,
      "eiEmployee": 0, "eiEmployer": 0, "eiTotal": 0,
      "levyEmployee": 60, "levyEmployer": 60, "levyTotal": 120, "levyPenalty": 0,
      "peEmployee": 30, "peEmployer": 30, "peTotal": 60, "pePenalty": 0,
      "totalEmployee": 420, "totalEmployer": 585, "totalPenalty": 0,
      "grandTotal": 1005
    },
    "accountantGeneral": {
      "socialSecurity": 825,
      "employmentInsurance": 0
    },
    "socialSecurityBoard": {
      "levy": 120,
      "severance": 60
    }
  }
}
```

**Preview Modal Layout (SSB Statement of Wages and Contributions):**
- **Header**: Company Name, Trade Name, Registration Number, Period, Schedule
- **Grid Columns**: SSN, Name, Wk1–Wk5 wages, Holiday Pay, Bonus, Total Wages, Levy (EE+ER), Social Security (total)
- **Footer Summary**: Accountant General (SS + EI totals), Social Security Board (Levy + Severance totals)

---

### API: `get_nwd_contribution_preview` (NW Director)

Called when user clicks the Eye icon on any row in the NW Director screen.

```typescript
const result = await wizAdminApi('get_nwd_contribution_preview', {
  header_id: 78,    // required
  company_id: 123,  // required
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "companyName": "M & M Transportation Services Ltd",
    "tradeName": "M&M Transport",
    "registrationNumber": "658864",
    "address": "123 Main St, Georgetown",
    "periodMonth": "January",
    "periodYear": "2026",
    "periodLabel": "January 2026",
    "scheduleNumber": 1,
    "isNilReturn": false,
    "isSubmitted": true,
    "isFinalized": false,
    "directors": [
      {
        "ssn": "220562",
        "name": "Fontain, Nazio",
        "week1": 650, "week2": 0, "week3": 0, "week4": 0, "week5": 0,
        "totalWages": 650,
        "holidayPay": 0,
        "bonus": 0,
        "directorWage": 650,
        "levyEmployee": 26, "levyEmployer": 26
      }
    ],
    "directorCount": 1,
    "totals": {
      "totalWages": 650,
      "levyEmployee": 26, "levyEmployer": 26, "levyTotal": 52, "levyPenalty": 0,
      "grandTotal": 52
    }
  }
}
```

**Key Difference**: NWD preview only shows Levy (no SS, EI, Severance). Uses `directors` array instead of `employees`.

---

### API: `get_se_contribution_preview` (Self-Employed)

Called when user clicks the Eye icon on any row in the Self-Employed screen.

```typescript
const result = await wizAdminApi('get_se_contribution_preview', {
  contribution_id: 15,  // required (the contribution_id from the list)
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "name": "Franklyn Tyson",
    "socialSecurityNumber": "187587",
    "dateOfBirth": "1980-05-15",
    "address": "45 Vlissengen Rd, Georgetown",
    "occupation": "Contractor",
    "periodMonth": "October",
    "periodYear": "2025",
    "periodLabel": "October 2025",
    "registrationNumber": "",
    "declaredIncome": 2400.00,
    "socialSecurityContribution": 168.00,
    "levyContribution": 48.00,
    "fineAmount": 0.00,
    "penaltyAmount": 0.00,
    "totalContribution": 240.00,
    "wageCategory": {
      "name": "Category B",
      "minWage": 2000,
      "maxWage": 3000,
      "rate": 0.10
    },
    "isSubmitted": true,
    "isFinalized": false,
    "isPaid": false,
    "isImportedFromBema": true
  }
}
```

**Key Difference**: SE preview is a single record (no employee grid). Shows personal details, declared income, contribution breakdown, and wage category.

---

## Complete Actions Reference

| Action | Purpose | Key Params |
|---|---|---|
| `get_contribution_list` | Employer C3 list | `company_id`, `period_from?`, `period_to?` |
| `get_nwd_contribution_list` | NW Director C3 list | `company_id`, `period_from?`, `period_to?` |
| `get_se_contribution_list` | Self-Employed C3 list | `self_employed_id`, `period_from?`, `period_to?` |
| `get_contribution_preview` | Employer C3 preview (SSB Statement) | `header_id`, `company_id` |
| `get_nwd_contribution_preview` | NW Director C3 preview | `header_id`, `company_id` |
| `get_se_contribution_preview` | Self-Employed C3 preview | `contribution_id` |
| `get_self_employed_dropdown` | SE profiles for dropdown | (none) |
| `delete_contribution` | Soft-delete a C3 record | `header_id`, `type` ("employer"\|"nwd"\|"self_employed") |

---

**Last Updated**: March 15, 2026
