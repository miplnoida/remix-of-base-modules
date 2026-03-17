# C3-Wizard Admin API — Required Report Actions

## Overview

The **SSB Admin** application consumes report data exclusively from the **C3-Wizard** edge function deployed at:

```
POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api
```

**Request format** (all actions):
```json
{
  "action": "<action_name>",
  "params": { ... }
}
```

**Headers:**
| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-admin-api-key` | `<configured_api_key>` |
| `Authorization` | `Bearer <supabase_access_token>` (optional, for session-bound calls) |

**Standard success response:**
```json
{
  "status": "success",
  "data": { ... },
  "total_records": 123
}
```

**Standard error response:**
```json
{
  "status": "error",
  "error": "Descriptive error message"
}
```

---

## Report 1: Employer History

### Action: `get_employer_report`

Paginated list of registered employers.

**Request params:**
```json
{
  "search": "string | undefined",       // Search by company_name or registration_number
  "sort_col": "string | undefined",      // One of: registration_number, registration_date, contact_person, company_name, email
  "sort_dir": "'asc' | 'desc'",          // Default: asc
  "page_offset": "number | undefined",   // Default: 0
  "page_limit": "number | undefined"     // Default: 10
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "employers": [
      {
        "id": 1,
        "registration_number": "ER-001",
        "registration_date": "2024-01-15T00:00:00Z",
        "contact_person": "John Doe",
        "company_name": "Acme Corp",
        "mobile": "+18691234567",
        "email": "john@acme.com"
      }
    ]
  },
  "total_records": 150,
  "page_offset": 0,
  "page_limit": 10
}
```

---

### Action: `get_employer_report_dropdown`

Returns a lightweight list for dropdown/search use.

**Request params:** `{}` (none)

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "companies": [
      { "id": 1, "company_name": "Acme Corp", "registration_number": "ER-001" }
    ]
  }
}
```

---

### Action: `export_employer_report`

Returns ALL matching employers (no pagination) for Excel export.

**Request params:**
```json
{
  "search": "string | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "employers": [ /* same shape as get_employer_report */ ]
  }
}
```

---

## Report 2: Self-Employed History

### Action: `get_self_employed_report`

Paginated list of self-employed registrants.

**Request params:**
```json
{
  "search": "string | undefined",       // Search by name or social_security_number
  "sort_col": "string | undefined",      // One of: social_security_number, created_at, name, email
  "sort_dir": "'asc' | 'desc'",
  "page_offset": "number | undefined",
  "page_limit": "number | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "self_employed": [
      {
        "id": 1,
        "social_security_number": "123456",
        "created_at": "2024-03-01T00:00:00Z",
        "name": "Jane Smith",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "mobile": "+18695551234"
      }
    ]
  },
  "total_records": 75
}
```

---

### Action: `get_self_employed_report_dropdown`

Lightweight list for dropdown/search use.

**Request params:** `{}` (none)

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "self_employed": [
      { "id": 1, "first_name": "Jane Smith", "social_security_number": "123456" }
    ]
  }
}
```

---

### Action: `export_self_employed_report`

Returns ALL matching records for Excel export.

**Request params:**
```json
{
  "search": "string | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "self_employed": [ /* same shape as get_self_employed_report */ ]
  }
}
```

---

## Report 3: Payment History

### Action: `get_payment_report`

Paginated payment records with filters.

**Request params:**
```json
{
  "payment_status": "string | undefined",    // e.g. "AUTHORIZED", "DECLINED", "INVALID_REQUEST"
  "types": "string | undefined",             // "Company" or "SelfEmployee"
  "company_id": "number | null",             // Filter by specific company
  "user_id": "number | null",                // Filter by specific user within company
  "from_date": "string | undefined",         // Format: yyyy-MM-dd
  "to_date": "string | undefined",           // Format: yyyy-MM-dd
  "page_offset": "number | undefined",
  "page_limit": "number | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "records": [
      {
        "header_id": 101,
        "user_id": 5,
        "reg_no": "ER-001",
        "period_month": "April",
        "period_year": "2025",
        "total_wages": 3000.00,
        "total_ss_contributions": 330.00,
        "total_levy": 285.00,
        "total_fines_penalties": 264.00,
        "total_severance": 30.00,
        "is_submitted": true,
        "is_finalized": true,
        "schedule_no": 1,
        "creation_date": "2026-06-03T00:00:00Z",
        "pay_details": [
          {
            "transaction_id": "TXN-2026-001",
            "transaction_date": "2026-06-03T10:30:00Z",
            "transaction_status": "AUTHORIZED",
            "payment_amount": 909.00
          }
        ]
      }
    ],
    "total_records": 250
  }
}
```

**IMPORTANT:** The `pay_details` array is critical — it provides Transaction ID, Transaction Date, Payment Amount, and Status for the last 3 columns in the table. If this array is empty or missing, those columns will show dashes.

---

### Action: `export_payment_report`

Returns ALL matching payment records for Excel export.

**Request params:**
```json
{
  "payment_status": "string | undefined",
  "types": "string | undefined",
  "company_id": "number | null",
  "user_id": "number | null"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "records": [ /* same shape as get_payment_report */ ]
  }
}
```

---

## Report 4: Reconciliation History

### Action: `get_reconciliation_report`

Paginated reconciliation records.

**Request params:**
```json
{
  "status": "string | null",                // "Reconciled" or "Pending"
  "card_holder_name": "string | null",       // Filter by card holder
  "from_date": "string | null",              // Format: yyyy-MM-dd
  "to_date": "string | null",                // Format: yyyy-MM-dd
  "page_offset": "number | undefined",
  "page_limit": "number | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "payment_transaction_id": "TXN-2026-001",
        "transaction_date": "2026-03-10T00:00:00Z",
        "payment_amount": 1500.00,
        "payment_status": "Reconciled",
        "reconciled_by_name": "Admin User",
        "reconciled_by_date": "2026-03-12T14:00:00Z",
        "notes": "Verified against bank statement"
      }
    ],
    "total_records": 45
  }
}
```

---

### Action: `get_reconciliation_card_holders`

Returns distinct card holder names for dropdown filter.

**Request params:** `{}` (none)

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "card_holders": [
      { "card_holder_name": "John Doe" },
      { "card_holder_name": "Jane Smith" }
    ]
  }
}
```

---

### Action: `export_reconciliation_report`

Returns ALL matching reconciliation records for Excel export.

**Request params:**
```json
{
  "status": "string | null",
  "card_holder_name": "string | null"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": {
    "records": [ /* same shape as get_reconciliation_report */ ]
  }
}
```

---

## Report 5: Users History

### Action: `get_company_users_report`

Paginated company user list grouped by role.

**Request params:**
```json
{
  "search": "string | undefined",           // Search by name, email, or username
  "company_id": "number | null",             // Filter by company
  "role_id": "number | null",                // Filter by role
  "sort_column": "string | undefined",       // One of: first_name, username, email
  "sort_direction": "'asc' | 'desc'",
  "page": "number | undefined",             // 1-based page number
  "page_size": "number | undefined"          // Default: 50
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "middle_name": null,
      "username": "johnd",
      "email": "john@acme.com",
      "role_id": 2,
      "role_name": "Company Admin",
      "company_id": 1,
      "company_name": "Acme Corp",
      "registration_number": "ER-001",
      "is_locked": false,
      "last_login_at": "2026-03-15T10:00:00Z",
      "created_at": "2024-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 120,
    "total_pages": 3
  }
}
```

---

### Action: `get_self_employed_users_report`

Paginated self-employed user list grouped by role.

**Request params:**
```json
{
  "search": "string | undefined",
  "role_id": "number | null",
  "sort_column": "string | undefined",
  "sort_direction": "'asc' | 'desc'",
  "page": "number | undefined",
  "page_size": "number | undefined"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": [
    {
      "user_id": 10,
      "first_name": "Jane",
      "last_name": "Smith",
      "middle_name": null,
      "username": "janes",
      "email": "jane@example.com",
      "role_id": 5,
      "role_name": "Self Employed User",
      "self_employed_id": 3,
      "ssn": "123456",
      "is_locked": false,
      "last_login_at": "2026-03-14T08:00:00Z",
      "created_at": "2024-06-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 30,
    "total_pages": 1
  }
}
```

---

### Action: `get_users_report_roles`

Returns available roles for the filter dropdown.

**Request params:**
```json
{
  "category": "string | null"   // "Company" or "SelfEmployee"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "role_name": "Company Admin", "role_code": "CA", "role_category": "Company" },
    { "id": 2, "role_name": "Company User", "role_code": "CU", "role_category": "Company" }
  ]
}
```

---

### Action: `export_users_report`

Returns ALL matching user records for Excel export.

**Request params:**
```json
{
  "category": "string",                     // Required: "Company" or "SelfEmployee"
  "search": "string | undefined",
  "company_id": "number | null",
  "role_id": "number | null"
}
```

**Expected response:**
```json
{
  "status": "success",
  "data": [ /* same shape as respective get_ action */ ]
}
```

---

## Summary Table

| # | Action | Pagination | Filters | Date Range |
|---|--------|-----------|---------|------------|
| 1 | `get_employer_report` | offset/limit | search, sort | No |
| 2 | `get_employer_report_dropdown` | None | None | No |
| 3 | `export_employer_report` | None | search | No |
| 4 | `get_self_employed_report` | offset/limit | search, sort | No |
| 5 | `get_self_employed_report_dropdown` | None | None | No |
| 6 | `export_self_employed_report` | None | search | No |
| 7 | `get_payment_report` | offset/limit | status, type, company, user | **Yes** |
| 8 | `export_payment_report` | None | status, type, company, user | No |
| 9 | `get_reconciliation_report` | offset/limit | status, card_holder | **Yes** |
| 10 | `get_reconciliation_card_holders` | None | None | No |
| 11 | `export_reconciliation_report` | None | status, card_holder | No |
| 12 | `get_company_users_report` | page/page_size | search, company, role, sort | No |
| 13 | `get_self_employed_users_report` | page/page_size | search, role, sort | No |
| 14 | `get_users_report_roles` | None | category | No |
| 15 | `export_users_report` | None | category, search, company, role | No |

---

## Notes for C3-Wizard Team

1. **Date format**: All `from_date`/`to_date` params use `yyyy-MM-dd` (e.g., `2026-03-17`).
2. **Pagination styles**: Reports 1–11 use `page_offset`/`page_limit` (0-based offset). Reports 12–15 use `page`/`page_size` (1-based page).
3. **Payment `pay_details`**: The `pay_details` array within each payment record is essential — it populates the Transaction ID, Transaction Date, and Status columns. Empty arrays cause those columns to display dashes.
4. **Export actions** should return the same data shape as their paginated counterparts but without pagination limits.
5. **Error handling**: All actions should return `{ "status": "error", "error": "message" }` on failure with appropriate HTTP status codes.
