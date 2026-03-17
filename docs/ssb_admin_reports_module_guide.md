# SSB Admin – Reports Module Implementation Guide

## ⚠️ CRITICAL RULE: NO DIRECT DATABASE ACCESS

**SSB Admin does NOT have C3 tables.** All data comes from the `wiz-admin-api` Edge Function hosted on C3-Wizard.

```typescript
// CORRECT - Always use wizAdminApi helper
const result = await wizAdminApi('get_employer_report', { ... });
```

---

## Architecture Overview

```
┌──────────────┐         POST /functions/v1/wiz-admin-api        ┌──────────────────┐
│  SSB Admin   │  ────────────────────────────────────────────>  │  C3-Wizard       │
│  Reports UI  │  <────────────────────────────────────────────  │  (wiz-admin-api) │
│              │         JSON { action, params }                  │  ↕ c3_companies   │
│  5 Report    │         JSON { status, data }                    │  ↕ c3_users       │
│  Pages       │                                                  │  ↕ c3_payments    │
└──────────────┘                                                  └──────────────────┘
```

The Reports module consists of **5 pages** under the REPORTS sidebar section:
1. **Employer History** (`/admin/reports/employer-history`)
2. **Self Employed History** (`/admin/reports/self-employed-history`)
3. **Payments History** (`/admin/reports/payments-history`)
4. **Reconciliation History** (`/admin/reports/reconciliation-history`)
5. **Users History** (`/admin/reports/users-history`)

---

## Report 1: Employer History

### UI Requirements (Screenshot: image-308)

**Breadcrumb:** `Admin Dashboard > Employers History`

**Header Section:**
- Title: "Employer History" with user icon (left)
- Searchable dropdown: "Search by employer name or reg number" (center-right)
  - Dropdown shows: `{companyName} ({regNumber})` for each option
  - Clearable, searchable (react-select style)
- "Export Excel" button (green outline, right)

**Table Columns:**
| Column | Sortable | Sort Key | Description |
|--------|----------|----------|-------------|
| Registration No. ↑ | ✅ | `registration_number` | Company reg number |
| C3 Reg. Date | ✅ | `registration_date` | Format: `DD-MMM-YYYY` |
| Contact Person | ✅ | `contact_person` | Primary contact |
| Employer Name | ✅ | `company_name` | Company name |
| Mobile No | ❌ | — | Mobile number |
| Email Id | ✅ | `email` | Company email |

**Pagination:** `1-10 of 877` with numbered pages + Back/Next

### Legacy Data Source

- **Backend:** `GET /Auth/GetAllCompany?pageNumber={n}&pageSize={s}&empName={name}&orderName={asc|desc}&keyName={key}`
- **Data:** `MasterCompanies` table (maps to `c3_companies`)
- **Filter:** By company name match (case-insensitive) or reg number
- **Sort keys:** `ssn` → `registration_number`, `insertedOn` → `registration_date`, `contactperson` → `contact_person`, `name` → `company_name`, `email` → `email`
- **Dropdown data:** `GET /Auth/GetAllCompanyData` returns all companies for dropdown (separate from paginated list)

### API Design

#### Action: `get_employer_report`
```typescript
const result = await wizAdminApi('get_employer_report', {
  search: '',                    // optional, filter by company_name or registration_number (ILIKE)
  sort_col: 'registration_number', // registration_number | registration_date | contact_person | company_name | email
  sort_dir: 'asc',              // asc | desc
  page_offset: 0,               // 0-based pagination offset
  page_limit: 10,               // max 100
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "employers": [
      {
        "id": 123,
        "registration_number": "100001",
        "registration_date": "2025-05-05",
        "contact_person": "C3Wizard APIs Support Team",
        "company_name": "SSB_APIs",
        "mobile": null,
        "email": "pubinfo@socialsecurity.kn"
      }
    ]
  },
  "total_records": 877,
  "page_offset": 0,
  "page_limit": 10
}
```

#### Action: `get_employer_report_dropdown`
```typescript
const result = await wizAdminApi('get_employer_report_dropdown', {});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "companies": [
      { "id": 1, "company_name": "SSB_APIs", "registration_number": "100001" }
    ]
  }
}
```

#### Action: `export_employer_report`
```typescript
const result = await wizAdminApi('export_employer_report', {
  search: '',  // same filter as list
});
```

**Response:** Returns ALL matching records (no pagination) for client-side Excel generation.

### Data Mapping

| Legacy Field | Optimized Schema | Table |
|---|---|---|
| `CompanyId` | `id` | `c3_companies` |
| `RegNumber` | `registration_number` | `c3_companies` |
| `InsertedOn` | `registration_date` | `c3_companies` |
| `ContactPerson` | `contact_person` | `c3_companies` |
| `CompanyName` | `company_name` | `c3_companies` |
| `Mobile` | `mobile` | `c3_companies` |
| `Email` | `email` | `c3_companies` |

### Backend Implementation

```sql
-- Query for get_employer_report
SELECT
  id,
  registration_number,
  registration_date,
  contact_person,
  company_name,
  mobile,
  email
FROM c3_companies
WHERE is_deleted IS NOT TRUE
  AND (p_search IS NULL OR
       company_name ILIKE '%' || p_search || '%' OR
       registration_number ILIKE '%' || p_search || '%')
ORDER BY {sort_col} {sort_dir}
OFFSET p_offset LIMIT p_limit;
```

---

## Report 2: Self Employed History

### UI Requirements (Screenshot: image-309)

**Breadcrumb:** `Admin Dashboard > Self Employee History`

**Header Section:**
- Title: "Self Employed History" with user icon
- Searchable dropdown: "Search by self employer name or SSN"
  - Shows: `{firstName} ({socSecNum})` per option
  - Clearable, searchable
- "Export Excel" button (green outline)

**Table Columns:**
| Column | Sortable | Sort Key | Description |
|--------|----------|----------|-------------|
| SSN ↑ | ✅ | `social_security_number` | Social Security Number |
| C3 Reg. Date | ✅ | `created_at` | Format: `DD-MMM-YYYY` |
| Name | ✅ | `name` | Full name (first_name + last_name) |
| Email | ✅ | `email` | Email address |
| Mobile | ❌ | — | Mobile number |

**Pagination:** `1-NaN of undefined` (BUG in legacy – must fix: show proper `1-10 of {total}`)

### Legacy Data Source

- **Backend:** `GET /Auth/GetAllEmployersSelf?userid=0&roleid=1&pageNumber={n}&pageSize={s}&empName={name}&orderName={dir}&keyName={key}`
- **Data:** `BLSelfEmployed.SelfEmployedCollectionnew(0)` → maps to `c3_self_employed` + `c3_users`
- **Filter:** By `firstName` match (case-insensitive) or `socSecNum` exact match
- **Sort keys:** `ssn` → `social_security_number`, `name` → first/last name, `email` → `email`, `insertedOn` → `created_at`

### API Design

#### Action: `get_self_employed_report`
```typescript
const result = await wizAdminApi('get_self_employed_report', {
  search: '',                         // optional, filter by name or SSN
  sort_col: 'social_security_number', // social_security_number | created_at | name | email
  sort_dir: 'asc',                    // asc | desc
  page_offset: 0,
  page_limit: 10,
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "self_employed": [
      {
        "id": 1,
        "social_security_number": "164312",
        "created_at": "2025-06-19",
        "name": "Cleo Hanley-Walters",
        "first_name": "Cleo",
        "last_name": "Hanley-Walters",
        "email": "oscar840@hotmail.com",
        "mobile": "+1869 - 6673728"
      }
    ]
  },
  "total_records": 150,
  "page_offset": 0,
  "page_limit": 10
}
```

#### Action: `get_self_employed_report_dropdown`
```typescript
const result = await wizAdminApi('get_self_employed_report_dropdown', {});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "self_employed": [
      { "id": 1, "first_name": "Cleo", "social_security_number": "164312" }
    ]
  }
}
```

#### Action: `export_self_employed_report`
Same as list but returns all matching records without pagination.

### Data Mapping

| Legacy Field | Optimized Schema | Table |
|---|---|---|
| `EmployeeID` | `id` | `c3_self_employed` |
| `SocSecNum` | `social_security_number` | `c3_self_employed` |
| `InsertedOn` | `created_at` | `c3_self_employed` |
| `FullName` | `first_name` + `last_name` | `c3_self_employed` |
| `Email` | `email` | `c3_self_employed` / `c3_users` |
| `Mobile` | `mobile` | `c3_self_employed` |

### Backend Implementation

```sql
-- Query for get_self_employed_report
SELECT
  se.id,
  se.social_security_number,
  se.created_at,
  COALESCE(se.first_name, '') || ' ' || COALESCE(se.last_name, '') AS name,
  se.first_name,
  se.last_name,
  COALESCE(u.email, se.email) AS email,
  se.mobile
FROM c3_self_employed se
LEFT JOIN c3_users u ON u.self_employed_id = se.id AND u.is_deleted IS NOT TRUE
WHERE se.is_deleted IS NOT TRUE
  AND (p_search IS NULL OR
       se.first_name ILIKE '%' || p_search || '%' OR
       se.last_name ILIKE '%' || p_search || '%' OR
       se.social_security_number = p_search)
ORDER BY {sort_col} {sort_dir}
OFFSET p_offset LIMIT p_limit;
```

---

## Report 3: Payments History

### UI Requirements (Screenshot: image-310)

**Breadcrumb:** `Admin Dashboard > Payment History`

**Filter Section (top card):**
- **Select Payment Status** – Dropdown with options: `All Status`, `INVALID_REQUEST`, `AUTHORIZED`, `DECLINED`
- **Select Type** – Dropdown: `Employer`, `Self Employed`
  - If `Employer` selected: Show **Select Employer** dropdown → then **Select User** dropdown (cascading)
  - If `Self Employed` selected: Show **Select Self Employee** dropdown
- **Export Excel** button (green outline, right)

**Table Section – "Payment History":**
| Column | Description |
|--------|-------------|
| Month | With green ✅ (submitted) or red ❌ (not submitted) icon prefix |
| Year | Period year |
| Wages | `$` formatted, 2 decimals |
| Social Security / Contribution* | *"Contribution" when Self Employed type is selected* |
| Levy | *Hidden when Self Employed type* |
| Fines and Penalties | Sum of all penalty fields |
| Severance | *Hidden when Self Employed type* |
| Payment Amount | From `payDetails[0].paymentAmount` |
| Creation Date | Format: `DD-MMM-YYYY` |
| Schedule | Badge (blue) with schedule number |
| Transaction ID | May have multiple per row (stacked) |
| Transaction Date | Format: `DD-MMM-YYYY` (stacked with Transaction ID) |
| Status | `AUTHORIZED` with green icon |

**No pagination in screenshot** – but legacy uses `pageNumber/pageSize` params.

### Legacy Data Source

- **Backend:** `POST /Payment/AdminTranactionHistory?PaymentStatus={}&FromDate={}&ToDate={}&CompanyId={}&UserId={}&types={}&pageNumber={}&pageSize={}`
- **Stored Procedure:** `Get_TransactionHistory` with params: `@PaymentStatus`, `@FromDate`, `@ToDate`, `@CompanyId`, `@UserId`, `@types`
- **Types:** `Company` (for employers), `SelfEmployee`, `SSB` (returns both)
- **Response structure:** `data.transactionList.records[]` with nested `payDetails[]`

**Key Business Logic:**
1. When `types = 'SSB'`, stored procedure returns BOTH company + self-employed results merged
2. When `types = 'Company'`, returns only company/director C3 headers
3. When `types = 'SelfEmployee'`, returns only self-employed contribution headers
4. Payment details are nested JSON from `PaymentHistory` column
5. Fines = `TOTALSSPENALTY` (for self-employed) or `TOTALPEPENALTY + TOTALSSPENALTY + TOTALLEVYEEPENALTY` (for employer)
6. Columns `Levy` and `Severance` are **hidden** for Self Employed type

### API Design

#### Action: `get_payment_report`
```typescript
const result = await wizAdminApi('get_payment_report', {
  payment_status: '',           // optional: 'AUTHORIZED' | 'DECLINED' | 'INVALID_REQUEST' | '' (all)
  from_date: '',                // optional: 'MM-dd-yyyy' format
  to_date: '',                  // optional: 'MM-dd-yyyy' format
  company_id: null,             // optional: company ID filter
  user_id: null,                // optional: user ID filter
  types: 'Company',             // 'Company' | 'SelfEmployee' | 'SSB'
  page_offset: 0,
  page_limit: 10,
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "records": [
      {
        "header_id": 123,
        "user_id": 45,
        "reg_no": "100001",
        "period_month": "November",
        "period_year": "2025",
        "total_wages": 21000.00,
        "total_ss_contributions": 2255.00,
        "total_levy": 697.50,
        "total_fines_penalties": 225.50,
        "total_severance": 210.00,
        "is_submitted": true,
        "is_finalized": true,
        "schedule_no": 1,
        "creation_date": "13-Feb-2026",
        "pay_details": [
          {
            "transaction_id": "7732124236416373804805",
            "transaction_date": "2026-03-11",
            "transaction_status": "AUTHORIZED",
            "payment_amount": 4183.60
          }
        ]
      }
    ],
    "total_records": 50,
    "page_offset": 0,
    "page_limit": 10
  }
}
```

#### Action: `get_payment_report_companies`
Returns companies for the "Select Employer" dropdown (reuse `get_companies_dropdown`).

#### Action: `get_payment_report_users`
Returns users for a given company (reuse `get_company_users`).

#### Action: `get_payment_report_self_employed`
Returns self-employed users for dropdown (reuse `get_self_employed_report_dropdown`).

#### Action: `export_payment_report`
Same as `get_payment_report` but returns all records without pagination.

### Data Mapping

| Legacy Field | Optimized Schema | Source |
|---|---|---|
| `C3HEADERID` | `id` | `c3_contribution_headers` |
| `UserId` | `user_id` | `c3_contribution_headers.created_by` |
| `RegNo` | `registration_number` | `c3_companies.registration_number` |
| `PERIODD_MONTH` | `period_month` | `c3_contribution_headers.period_month` |
| `PERIOD_YEAR` | `period_year` | `c3_contribution_headers.period_year` |
| `TOTAL_WAGES` | `total_wages` | `c3_contribution_headers.total_wages` |
| `TOTAL_SSCONTRIBUTIONS` | `total_social_security` | `c3_contribution_headers.total_social_security` |
| `TOTAL_LEVYEEEMPLOYEE` | total levy | `c3_contribution_headers.total_levy_employee + total_levy_employer` |
| `TOTAL_SERVAYANCE` | `total_severance` | `c3_contribution_headers.total_severance` |
| `TOTAL_SSPENALTY` + `TOTAL_PEPENALTY` + `TOTAL_LEVYEEPENALTY` | penalties | `c3_contribution_headers.total_ss_penalty + total_pe_penalty + total_levy_penalty` |
| `Insert_Datetimeinfo` | `created_at` | `c3_contribution_headers.created_at` |
| `Is_submitted` | `is_submitted` | `c3_contribution_headers.is_submitted` |
| `Schedule_NO` | `schedule_number` | `c3_contribution_headers.schedule_number` |
| `PaymentHistory` (JSON) | — | `c3_payments` joined to header |

### Backend Implementation

The backend must replicate the `Get_TransactionHistory` stored procedure logic:

1. **For `types = 'Company'`:**
   - Query `c3_contribution_headers` joined with `c3_companies` and `c3_payments`
   - Filter by `company_id`, `user_id`, payment status, date range
   - Include both regular C3 (is_for_director = false) and director C3 (is_for_director = true)

2. **For `types = 'SelfEmployee'`:**
   - Query `c3_se_contribution_headers` joined with `c3_self_employed` and `c3_payments`
   - Return: wages, contribution (not SS), fines (no levy/severance)

3. **For `types = 'SSB'`:**
   - Merge both company and self-employed results

4. **Payment details:** Join `c3_payments` to get `transaction_id`, `transaction_date`, `transaction_status`, `payment_amount`

---

## Report 4: Reconciliation History

### UI Requirements (Screenshot: image-311)

**Breadcrumb:** `Dashboard > Administration > Reconciliation History`

**Filter Section:**
- **Reconcile Status** – Dropdown: `Reconciled`, `Not Reconciled` (default: `Not Reconciled`)
  - Clearable
- **Card Holder Name** – Dropdown of card holder names from existing data
- **Search** button (green outline) – Triggers search with current filters
- **Export Excel** button (green outline)

**Table – "Reconciliation History":**
| Column | Description |
|--------|-------------|
| Payment Transaction ID | CyberSource transaction ID |
| Transaction Date | Format: `DD-MMM-YYYY` |
| Payment Amount | `$` formatted |
| Payment Status | `Reconciled` / `Not Reconciled` |
| Reconciled By Name | User who reconciled |
| Reconciled By Date | Format: `DD-MMM-YYYY` |
| Notes | Audit trail of reconciliation actions |

**Pagination:** `0` count + `Back`/`Next`

**Key Behavior:**
- Data loads with default filters on page load (NOT after explicit search in some versions)
- The "Search" button applies current filter state
- Reconciliation itself is done on the main Reconciliation page, not here

### Legacy Data Source

- **Backend:** `GET /Payment/GetReconciliationDataCyber?pageNumber={}&pageSize={}&fromDate={}&toDate={}&status={}&cardHolderName={}`
- **Stored Procedure:** `GetdataReconciliationPaymentCyberSource` with params: `@FromDate`, `@ToDate`, `@Status`, `@CardHolderName`
- **Card Holder Dropdown:** `GET /Payment/getCardHolderName`
- **Export Data:** `GET /Payment/GetReconciliationDataCyberData` (all records for Excel)

**Important:** This is a READ-ONLY history view. It does NOT perform reconciliation actions (those are on the main Reconciliation page which already exists in SSB Admin).

### API Design

#### Action: `get_reconciliation_report`
```typescript
const result = await wizAdminApi('get_reconciliation_report', {
  status: 'Pending',            // 'Reconciled' | 'Pending' (Not Reconciled) | null (all)
  card_holder_name: null,       // optional: filter by card holder
  from_date: null,              // optional: 'yyyy-MM-dd'
  to_date: null,                // optional: 'yyyy-MM-dd'
  page_offset: 0,
  page_limit: 10,
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "payment_transaction_id": "7732124236416373804805",
        "transaction_date": "2026-03-11",
        "payment_amount": 4183.60,
        "payment_status": "Reconciled",
        "reconciled_by_name": "Admin User",
        "reconciled_by_date": "2026-03-12",
        "notes": "12/Mar/2026, by Admin User, Unreconciled ---> Reconciled, Verified payment"
      }
    ],
    "total_records": 0,
    "page_offset": 0,
    "page_limit": 10
  }
}
```

#### Action: `get_reconciliation_card_holders`
```typescript
const result = await wizAdminApi('get_reconciliation_card_holders', {});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "card_holders": [
      { "card_holder_name": "John Doe" }
    ]
  }
}
```

#### Action: `export_reconciliation_report`
Same as `get_reconciliation_report` but returns all records without pagination for Excel export.

### Data Mapping

| Legacy Field | Optimized Schema | Table |
|---|---|---|
| `requestId` | `request_id` | `c3_reconciliation_records` |
| `transactionDate` | `transaction_date` | `c3_reconciliation_records` / `c3_payments` |
| `paymentAmount` | `payment_amount` | `c3_reconciliation_records` |
| `isReconciled` | `is_reconciled` | `c3_reconciliation_records` |
| `reconciledBy` (user_id) | `reconciled_by` → join `c3_users` for name | `c3_reconciliation_records` |
| `reconciledOn` | `reconciled_at` | `c3_reconciliation_records` |
| `notes` | `notes` | `c3_reconciliation_records` |
| `cardHolderName` | `card_holder_name` | From CyberSource data in reconciliation |

### Backend Implementation

```sql
-- Query for reconciliation report
SELECT
  r.id,
  r.request_id AS payment_transaction_id,
  r.transaction_date,
  r.payment_amount,
  CASE WHEN r.is_reconciled = true THEN 'Reconciled' ELSE 'Not Reconciled' END AS payment_status,
  COALESCE(u.first_name || ' ' || u.last_name, '') AS reconciled_by_name,
  r.reconciled_at AS reconciled_by_date,
  r.notes
FROM c3_reconciliation_records r
LEFT JOIN c3_users u ON u.id = r.reconciled_by
WHERE (p_status IS NULL OR
       (p_status = 'Reconciled' AND r.is_reconciled = true) OR
       (p_status = 'Pending' AND (r.is_reconciled IS NULL OR r.is_reconciled = false)))
  AND (p_card_holder IS NULL OR r.card_holder_name ILIKE '%' || p_card_holder || '%')
  AND (p_from_date IS NULL OR r.transaction_date >= p_from_date)
  AND (p_to_date IS NULL OR r.transaction_date <= p_to_date)
ORDER BY r.transaction_date DESC
OFFSET p_offset LIMIT p_limit;
```

---

## Report 5: Users History (Company & Self-Employed Only)

### ⚠️ SCOPE: Only Company & Self-Employed Users

**SSB Admin already manages Compliance, Administrative, and Finance roles globally.** This API exposes **only Company and Self-Employed** user history data. SSB Admin should combine its own SSB user data with these API results if a unified view is needed.

### UI Requirements (Screenshot: image-312)

**Breadcrumb:** `Admin Dashboard > User History`

**Header Section:**
- Title: "User History" with user icon
- **Category Tabs** – Toggle between `Company Users` and `Self Employed Users`
- **Role Filter** – Dropdown populated from `get_users_report_roles` action
- **Search** – Text input: "Search Name, Email or Login ID..."
- **Export Excel** – Green outline button

**Table Columns (Company Users):**
| Column | Sortable | Sort Key | Description |
|--------|----------|----------|-------------|
| Name | ✅ | `first_name` | First + Last name |
| Username / Login ID | ✅ | `username` | User's login identifier |
| Role | ❌ | - | Role name (Company, Company User) |
| Email | ✅ | `email` | User's email |
| Company | ❌ | - | `{company_name} - {registration_number}` |
| Last Login | ✅ | `last_login_at` | Last login timestamp |

**Table Columns (Self-Employed Users):**
| Column | Sortable | Sort Key | Description |
|--------|----------|----------|-------------|
| Name | ✅ | `first_name` | First + Last name |
| Username / Login ID | ✅ | `username` | User's login identifier |
| Role | ❌ | - | Role name (Self Employed) |
| Email | ✅ | `email` | User's email |
| SSN | ❌ | - | Social security number from `c3_self_employed` |
| Last Login | ✅ | `last_login_at` | Last login timestamp |

**Pagination:** Server-side, default 50 records per page.

### API Design

#### Action 1: `get_company_users_report`
```typescript
const result = await wizAdminApi('get_company_users_report', {
  search: '',              // optional: ILIKE on first_name, last_name, username, email
  company_id: null,        // optional: filter by specific company
  role_id: null,           // optional: filter by specific role
  sort_column: 'first_name', // first_name | last_name | username | email | created_at | last_login_at
  sort_direction: 'asc',  // asc | desc
  page: 1,
  page_size: 50,
});
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": 20,
      "first_name": "KEISHA",
      "last_name": "DICKENSON",
      "middle_name": null,
      "username": "KDickenson",
      "email": "keishadickenson@odbrisbane.com",
      "role_id": 15,
      "role_name": "Company",
      "company_id": 5,
      "company_name": "Brisbane, O.D. & Sons (Trading) Ltd.",
      "registration_number": "654355",
      "is_locked": false,
      "last_login_at": "2026-01-15T10:30:00Z",
      "created_at": "2025-06-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 987,
    "total_pages": 20
  }
}
```

#### Action 2: `get_self_employed_users_report`
```typescript
const result = await wizAdminApi('get_self_employed_users_report', {
  search: '',              // optional: ILIKE on first_name, last_name, username, email
  role_id: null,           // optional: filter by specific role
  sort_column: 'first_name',
  sort_direction: 'asc',
  page: 1,
  page_size: 50,
});
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": 10,
      "first_name": "Cleo",
      "last_name": "Hanley-Walters",
      "middle_name": null,
      "username": "cleo",
      "email": "oscar840@hotmail.com",
      "role_id": 17,
      "role_name": "Self Employed",
      "self_employed_id": 3,
      "ssn": "164312",
      "is_locked": false,
      "last_login_at": "2026-02-10T14:00:00Z",
      "created_at": "2025-07-01T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 19,
    "total_pages": 1
  }
}
```

#### Action 3: `get_users_report_roles`
```typescript
const roles = await wizAdminApi('get_users_report_roles', {
  category: 'Company',       // 'Company' | 'SelfEmployee' | null (both)
});
```

**Response:**
```json
{
  "status": "success",
  "data": [
    { "id": 15, "role_name": "Company", "role_code": "Company_3", "role_category": "Company" },
    { "id": 16, "role_name": "Company User", "role_code": "Company User_4", "role_category": "Company" },
    { "id": 17, "role_name": "Self Employed", "role_code": "Self Employed_5", "role_category": "SelfEmployee" }
  ]
}
```

#### Action 4: `export_users_report`
```typescript
const result = await wizAdminApi('export_users_report', {
  category: 'Company',       // 'Company' | 'SelfEmployee' (REQUIRED)
  search: '',                // optional
  company_id: null,          // optional (Company only)
  role_id: null,             // optional
});
```

**Response:** Flattened array (max 5000 records) with fields: `name`, `username`, `email`, `role`, `company`, `registration_number`, `ssn`, `last_login`, `created`.

### Data Mapping

| Category | Filter Condition | Company Name Format |
|----------|-----------------|-------------------|
| Company | `c3_roles.role_category = 'Company'` | `{company_name} - {registration_number}` from `c3_companies` |
| Self Employed | `c3_roles.role_category = 'SelfEmployee'` | `{first_name} {last_name} - {SSN}` from `c3_self_employed` |

### Role Category Values (c3_roles.role_category)

| role_category | Roles | Managed By |
|--------------|-------|------------|
| `SSB` | Administrative, Inspector, Cashiers, Test Payment | **SSB Admin** (already managed) |
| `Company` | Company, Company User | **This API** |
| `SelfEmployee` | Self Employed | **This API** |

---

## Complete Actions Summary

| # | Action | Report | Purpose |
|---|--------|--------|---------|
| 1 | `get_employer_report` | Employer History | Paginated employer list |
| 2 | `get_employer_report_dropdown` | Employer History | Company dropdown for search |
| 3 | `export_employer_report` | Employer History | All records for Excel |
| 4 | `get_self_employed_report` | Self Employed History | Paginated SE list |
| 5 | `get_self_employed_report_dropdown` | Self Employed History | SE dropdown for search |
| 6 | `export_self_employed_report` | Self Employed History | All records for Excel |
| 7 | `get_payment_report` | Payments History | Payment transaction history |
| 8 | `export_payment_report` | Payments History | All records for Excel |
| 9 | `get_reconciliation_report` | Reconciliation History | Reconciliation records |
| 10 | `get_reconciliation_card_holders` | Reconciliation History | Card holder dropdown |
| 11 | `export_reconciliation_report` | Reconciliation History | All records for Excel |
| 12 | `get_company_users_report` | Users History | Company users with pagination |
| 13 | `get_self_employed_users_report` | Users History | Self-employed users with pagination |
| 14 | `get_users_report_roles` | Users History | Role dropdown (Company + SelfEmployee) |
| 15 | `export_users_report` | Users History | Flattened export by category |

---

## Excel Export Pattern (All Reports)

All reports use the same client-side export pattern:

```typescript
// SSB Admin will call the export action, receive all records, and generate Excel client-side
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const exportToExcel = (data: any[], filename: string, columns: { header: string; key: string }[]) => {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => columns.reduce((acc, col) => ({ ...acc, [col.header]: row[col.key] }), {}))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `${filename}.xlsx`);
};
```

---

## Date Formatting

All dates displayed in reports use: **`DD-MMM-YYYY`** (e.g., `05-May-2025`, `19-Jun-2025`)

---

## Error Handling

```typescript
try {
  const result = await wizAdminApi('get_employer_report', params);
  // Handle success
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' });
}
```

---

## Implementation Checklist

### Backend (C3-Wizard wiz-admin-api)
- [ ] Add `get_employer_report` action
- [ ] Add `get_employer_report_dropdown` action
- [ ] Add `export_employer_report` action
- [ ] Add `get_self_employed_report` action
- [ ] Add `get_self_employed_report_dropdown` action
- [ ] Add `export_self_employed_report` action
- [ ] Add `get_payment_report` action (replicate `Get_TransactionHistory` SP logic)
- [ ] Add `export_payment_report` action
- [ ] Add `get_reconciliation_report` action
- [ ] Add `get_reconciliation_card_holders` action
- [ ] Add `export_reconciliation_report` action
- [ ] Add `get_all_users_report` action (with role grouping)
- [ ] Add `export_users_report` action

### Frontend (SSB Admin)
- [ ] Create Employer History page with table, search dropdown, sort, pagination, export
- [ ] Create Self Employed History page with table, search dropdown, sort, pagination, export
- [ ] Create Payments History page with filter dropdowns, cascading selectors, payment table
- [ ] Create Reconciliation History page with status/card holder filters, search button, table
- [ ] Create Users History page with role filter dropdown, search input, grouped table
- [ ] Add routes for all 5 report pages under REPORTS sidebar section
- [ ] Integrate RBAC permission checks per existing SSB Admin system

**Last Updated**: March 17, 2026
