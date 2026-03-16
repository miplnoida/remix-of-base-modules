# SSB Admin Migration Guide: Reconciliation & CyberSource Settings

> **For:** SSB Admin Development Team  
> **Source of Truth:** Legacy C3 Wizard System  
> **Date:** March 16, 2026  
> **Status:** All APIs deployed and functional

---

## Table of Contents

1. [CyberSource Settings Screen](#1-cybersource-settings-screen)
2. [Reconciliation Screen](#2-reconciliation-screen)
3. [Database Tables (Backend-Managed)](#3-database-tables-backend-managed)
4. [API Reference (12 Actions)](#4-api-reference-12-actions)
5. [Implementation Checklist](#5-implementation-checklist)

---

## 1. CyberSource Settings Screen

### 1.1 Purpose

The CyberSource Settings screen allows administrators to manage payment gateway credentials used for processing online payments. Credentials are stored in a **database table** (`c3_site_settings`) so the system can dynamically select the active environment at runtime.

### 1.2 Data Storage

CyberSource credentials are stored in `c3_site_settings` (the same table used for other system settings). Each CyberSource environment is a row with:

- `setting_key`: `"CYBERSOURCE_Production"` or `"CYBERSOURCE_Test (Sandbox)"`
- `setting_type`: `"PAYMENT_GATEWAY"`
- `setting_value`: JSON string containing `{ merchant_id, key_id, secret_key, base_url, environment }`
- `is_deleted`: `false` = **active**, `true` = **inactive** (mutual exclusion: only one row is active at a time)

**Existing seed data (already in database):**

| id | setting_key | is_deleted (=inactive) |
|----|-------------|----------------------|
| 1 | CYBERSOURCE_Production | true (inactive) |
| 2 | CYBERSOURCE_Test (Sandbox) | false (active) |

### 1.3 UI Layout (Match Screenshot)

The screen displays a **table** (NOT a form) with the following columns:

| Column Header | Field | Display Logic |
|---------------|-------|---------------|
| Id | `id` | Plain number |
| Environment | Parsed from JSON `environment` | Text: "Production" or "Test (Sandbox)" |
| MerchantId | Parsed from JSON `merchant_id` | Masked: `****` + last 8 chars |
| KeyId | Parsed from JSON `key_id` | Masked: `****` + last 8 chars |
| SecretKey | — | Always `****••••` |
| BaseUrl | Parsed from JSON `base_url` | Full URL displayed as link |
| IsActive | `!is_deleted` | Toggle switch showing "Active" (green) / "Inactive" (gray) |
| Edit | — | Edit icon button → navigates to edit form |

**Page Header:** "Payments Settings" with breadcrumb: `Admin Dashboard > CyberSource Settings`

### 1.4 Actions & Workflows

#### 1.4.1 Load Settings List

On page load, call `get_cybersource_settings`. Credentials are pre-masked server-side.

#### 1.4.2 Toggle Active/Inactive (IsActive Toggle)

1. A **Confirm Action modal** appears with: `UserId` + `Password` inputs
2. **Password validation:** Required, min 6 chars, must contain uppercase, lowercase, digit, special character
3. **SSB Admin validates credentials locally** against its own Supabase Auth (NOT the C3-Wizard database)
4. If local validation fails → show error on SSB Admin side, do NOT call the API
5. If local validation succeeds → Call `toggle_cybersource_status` with **only `{ id }`** (no credentials sent)
6. The selected row becomes active, all others become inactive

#### 1.4.3 Edit Settings

1. Navigate to an **edit form** page with: `merchantId`, `keyId`, `secretKey` inputs
2. All three fields required (non-empty after trim)
3. On submit: Call `update_cybersource_settings`
4. Updated row automatically becomes active; other rows become inactive
5. Success toast: "Cyber Source Settings updated"

### 1.5 How Payment Uses These Settings

At payment time, the backend queries `c3_site_settings` for the active (`is_deleted = false`) PAYMENT_GATEWAY row and uses its JSON credentials to construct the CyberSource API request.

---

## 2. Reconciliation Screen

### 2.1 Purpose

The Reconciliation screen allows SSB administrators to:

1. **Import** CyberSource transaction reports (CSV files)
2. **Compare** imported transactions against internal payment records (`c3_payments`)
3. **Mark** transactions as Reconciled or Unreconciled with audit notes
4. **Export** reconciliation data as CSV or Excel
5. **Customize** which columns are visible per user

### 2.2 Data Architecture

> **All database tables are already created and managed in the backend project.** The existing tables are:
>
> | Table | Purpose |
> |-------|---------|
> | `c3_payments` | Payment records with reconciliation fields (`is_reconciled`, `reconciled_by`, `reconciled_at`, `notes`, `cardholder_name`, billing fields, etc.) |
> | `c3_reconciliation_records` | Imported CSV data linkage (stores `bank_reference` = CyberSource `request_id`, `bank_amount`, `system_amount`, `variance`) |
> | `c3_reconciliation_columns` | Per-user column visibility preferences |
> | `c3_reconciliation_payment_details` | Payment detail linkage for reconciliation audit |
>
> **Matching Logic:** CyberSource CSV `request_id` is matched against `c3_payments.payment_gateway_transaction_id`.
>
> **SSB-Admin does NOT need to create or modify any tables.** Simply consume the APIs documented in Section 4.

### 2.3 UI Layout (Match Screenshot)

#### 2.3.1 Page Header

**Breadcrumb:** `Dashboard > Administration > Reconciliation`

#### 2.3.2 Top Section (Row 1)

| Left Side | Right Side |
|-----------|------------|
| File input (`accept=".csv"`) + "Upload CSV File" button | "Reconciliation" button + "Customize Column" button |

#### 2.3.3 Filter Section (Row 2 — inside card header)

| Filter | Type | Options |
|--------|------|---------|
| Reconcile Status | Dropdown | "Reconciled", "Not Reconciled" (maps to "Pending") |
| Card Holder Name | Dropdown | Populated from `get_card_holder_names` API |
| From Date | DatePicker | Format: `dd-MMM-yyyy` |
| To Date | DatePicker | Format: `dd-MMM-yyyy`, min = From Date |

Plus a **Search** button.

#### 2.3.4 Table Columns

**Fixed columns (always visible):**

| # | Column | Response Field | Notes |
|---|--------|----------------|-------|
| 1 | Status (checkbox) | — | Checked + disabled if Reconciled. Clickable if Pending. |
| 2 | Payment Transaction ID | `PaymentGatewayTransactionID` | From `c3_payments.payment_gateway_transaction_id` |
| 3 | Transaction Date | `TransactionDate` | Format: `YYYY-MMM-DD` |
| 4 | Payment Amount | `PaymentAmount` | Format: `$X.XX` |
| 5 | Payment Status | `PaymentStatus` | Green check + "AUTHORIZED" or Red X + status text |
| 6 | Reconciled By Name | `ReconciledByName` | Name of user who reconciled |
| 7 | Reconciled By Date | `ReconciledDate` | Format: `DD-MMM-YYYY` |
| 8 | Notes | `Notes` | Shows latest note + "…" icon to view history |

**Dynamic columns (user-configurable via Customize Column):**

Fields like `CyberSourceMerchantID`, `RequestID`, `Amount`, `Currency`, `FirstName`, `LastName`, `AuthorizationCode`, `BillingAddress1`, etc. Visibility controlled per-user via `get_cybersource_columns` / `save_cybersource_columns`.

**Last column:**

| # | Column | Display |
|---|--------|---------|
| Last | Reconciliation | Toggle switch: "Yes" (green) / "No" (default). Clicking opens a confirm modal. |

#### 2.3.5 Pagination

Standard pagination with page controls (Back / Next) and record count.

### 2.4 Actions & Workflows

#### 2.4.1 Upload CSV File

**Trigger:** Select a `.csv` file and click "Upload CSV File"

**Process:**
1. Read file content as text
2. Call `upload_cybersource_csv` with `{ csv_content: fileText, user_id: currentUserId }`
3. Backend parses CSV, deduplicates by `request_id`, inserts into `c3_reconciliation_records`
4. Backend auto-reconciles: matches `request_id` against `c3_payments.payment_gateway_transaction_id`
5. Refresh the reconciliation list

**Error handling:**
- All duplicates → "No new records found (possibly all duplicates)"
- No valid records → "No valid records found in CSV"

#### 2.4.2 Search / Filter

**Trigger:** Click "Search" button

Call `get_reconciliation_list` with filter params. Validation: if `toDate < fromDate` → show error.

#### 2.4.3 Reconciliation Button (Bulk Action)

1. Select one or more Pending records via checkboxes
2. Click "Reconciliation" button → opens modal with Notes textarea (required)
3. Call `update_reconciliation_data` with `{ id: [selectedIds], reasons_for_reconciliation: notes, user_id: currentUserId }`
4. Refresh list

#### 2.4.4 Reconciliation Toggle (Per-Row)

1. Click the Yes/No toggle → opens Confirm Action Modal with Notes textarea
2. Call `update_reconciliation_notes` with `{ id: paymentId, status: true/false, notes: reason, user_id: currentUserId }`
3. `status = true` → Reconciled; `status = false/null` → Unreconciled (Pending)
4. Refresh list

#### 2.4.5 Notes History (Show More)

1. Click "…" icon in Notes column
2. Call `get_reconciliation_notes` with `{ id: paymentId }`
3. Display in scrollable modal, sorted by date descending
4. Note format: `"dd/MMM/yyyy, by {Username}, {OldStatus} ---> {NewStatus}, {Reason}"`

#### 2.4.6 Customize Column

1. Call `get_cybersource_columns` with `{ user_id: currentUserId }`
2. Display modal with checkboxes for each column
3. On "Apply": Call `save_cybersource_columns` with updated preferences
4. Refresh table to show/hide columns

#### 2.4.7 Export as CSV / Export as Excel

1. Call `get_reconciliation_export` (unpaginated, respects current filters)
2. Generate CSV/Excel from response data
3. Download as `Reconciliation_Data.csv` or `Reconciliation_Data.xlsx`

### 2.5 Developer Flowchart

```
┌─────────────────────────────────────────────────────────┐
│                   PAGE LOAD                             │
│  1. get_reconciliation_list (page 0, size 10)           │
│  2. get_cybersource_columns (for user)                  │
│  3. get_reconciliation_export (for export data)         │
│  4. get_card_holder_names (for filter dropdown)         │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────────────┐
    ▼                ▼                        ▼
┌──────────┐  ┌──────────────┐  ┌─────────────────────┐
│ UPLOAD   │  │   SEARCH     │  │  RECONCILIATION     │
│ CSV FILE │  │   FILTER     │  │  ACTIONS            │
└────┬─────┘  └──────┬───────┘  └──────────┬──────────┘
     │               │                     │
     ▼               ▼                     │
┌──────────────┐ ┌───────────────┐         │
│ Parse CSV    │ │ Apply filters │    ┌────┴─────────┐
│ send to API  │ │ pageNumber=0  │    │              │
│ upload_      │ │ Refresh list  │    ▼              ▼
│ cybersource_ │ └───────────────┘ ┌────────┐  ┌─────────┐
│ csv          │                   │ BULK   │  │ TOGGLE  │
│ Auto-match   │                   │ RECON  │  │ PER-ROW │
│ Refresh list │                   └───┬────┘  └────┬────┘
└──────────────┘                       │            │
                                       ▼            ▼
                                ┌──────────────────────────┐
                                │    RECONCILE MODAL       │
                                │  - Enter Notes (required)│
                                │  - Submit                │
                                └────────┬─────────────────┘
                                         │
                                         ▼
                                ┌──────────────────────────┐
                                │  UPDATE c3_payments      │
                                │  - is_reconciled         │
                                │  - reconciled_by         │
                                │  - reconciled_at         │
                                │  - Append to notes       │
                                │  REFRESH LIST            │
                                └──────────────────────────┘
```

### 2.6 Expected CyberSource CSV Headers

The system supports TWO header sets (Test/Sandbox vs Production have minor spelling differences):

**Test/Sandbox headers:**
```
CyberSource Merchant ID, Date and Time, Request ID, Merchant Reference Number,
Retrieval Reference Number, Instalment Identifier, Last Name, First Name, Email,
Amount, Currency, Account Prefix, Account Suffix, Applications, Payment Method,
Payment Solution, Transaction Reference Number, Authorisation Indicator, ...
```

**Production headers (differences):**
- `Installment Identifier` (vs `Instalment`)
- `Authorization Indicator` (vs `Authorisation`)
- `Authorization Code` (vs `Authorisation Code`)
- `Billing State` (vs `Billing County/Region`)

The import logic accepts EITHER header set and maps correctly. Only key fields are extracted for matching: `request_id`, `amount`, `merchant_reference_number`, `first_name`, `last_name`, `currency`, `transaction_date`.

---

## 3. Database Tables (Backend-Managed)

> **⚠️ SSB-Admin team does NOT need to create, modify, or migrate any tables.**
> All tables listed below already exist in the backend and are managed by the EmployerSocialC3 project.

### 3.1 Table Map (Legacy → Current)

| Legacy MS SQL Table | Current Table | Purpose |
|---------------------|---------------|---------|
| `SiteSettings` | `c3_site_settings` | CyberSource credentials (JSON in `setting_value`) |
| `OnlinePayments` | `c3_payments` | Payment records with reconciliation fields |
| `Reconciliation_Cyber_Space` | `c3_reconciliation_records` | Imported CSV data linkage & matching |
| `Reconciliation_Cyber_Space_Column` | `c3_reconciliation_columns` | Per-user column visibility |
| `ReconciliationPayment_Details` | `c3_reconciliation_payment_details` | Payment detail linkage |

### 3.2 Key Columns in `c3_payments` (Used for Reconciliation)

| Column | Type | Purpose |
|--------|------|---------|
| `payment_gateway_transaction_id` | VARCHAR | Matches CyberSource `request_id` |
| `is_reconciled` | BOOLEAN | `true` = Reconciled, `null/false` = Pending |
| `reconciled_by` | INTEGER | User ID who reconciled |
| `reconciled_at` | TIMESTAMPTZ | When reconciled |
| `notes` | TEXT | Audit trail (comma-separated entries) |
| `cardholder_name` | VARCHAR | For filter dropdown |
| `amount` | NUMERIC | Payment amount |
| `payment_status` | VARCHAR | "AUTHORIZED", "Offline Payment", etc. |
| `billing_address_line1`, `billing_city`, `billing_country` | VARCHAR/TEXT | Billing info |
| `authorization_code` | VARCHAR | CyberSource authorization code |
| `card_last_four` | VARCHAR | Last 4 digits of card |

### 3.3 Key Columns in `c3_reconciliation_records` (CSV Import Tracking)

| Column | Type | Purpose |
|--------|------|---------|
| `bank_reference` | VARCHAR | CyberSource `request_id` (dedup key) |
| `bank_amount` | NUMERIC | Amount from CSV |
| `system_amount` | NUMERIC | Matched amount from `c3_payments` |
| `variance` | NUMERIC | `system_amount - bank_amount` |
| `reconciliation_status` | VARCHAR | "Matched" or "Unmatched" |
| `payment_id` | INTEGER | FK to `c3_payments.id` (if matched) |
| `notes` | TEXT | Additional CSV metadata (JSON) |

---

## 4. API Reference (12 Actions)

All APIs are exposed through the `wiz-admin-api` Edge Function.

**Authentication:** Every request requires:
- Header: `x-admin-api-key: <WIZ_ADMIN_API_KEY>`
- Header: `Authorization: Bearer <supabase_token>`
- Header: `Content-Type: application/json`

**Request format:**
```json
{
  "action": "action_name",
  "params": { ... }
}
```

---

### 4.1 CyberSource Settings APIs (3 Actions)

#### `get_cybersource_settings`

Fetch all CyberSource configuration rows with masked credentials.

```json
// Request
{ "action": "get_cybersource_settings" }

// Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "environment": "Production",
      "merchant_id": "****security1",
      "key_id": "****ad2dd9",
      "secret_key": "****••••",
      "base_url": "https://api.cybersource.com",
      "is_active": false
    },
    {
      "id": 2,
      "environment": "Test (Sandbox)",
      "merchant_id": "****security",
      "key_id": "****3c727",
      "secret_key": "****••••",
      "base_url": "https://apitest.cybersource.com",
      "is_active": true
    }
  ]
}
```

---

#### `update_cybersource_settings`

Update credentials for a specific environment. Updated row becomes active; others become inactive.

```json
// Request
{
  "action": "update_cybersource_settings",
  "params": {
    "id": 2,
    "merchant_id": "new_merchant_id",
    "key_id": "new_key_id",
    "secret_key": "new_secret_key"
  }
}

// Response
{ "success": true, "message": "Cyber Source Settings updated" }
```

---

#### `toggle_cybersource_status`

Toggle active/inactive status. **User credential validation is handled by SSB Admin locally — this API accepts only `{ id }`.**

```json
// Request
{
  "action": "toggle_cybersource_status",
  "params": {
    "id": 1
  }
}

// Response (success)
{
  "success": true,
  "message": "CyberSource status toggled successfully",
  "data": { "id": 1, "is_active": true }
}

// Response (not found)
{ "success": false, "error": "Setting not found for id: 1" }
```

---

### 4.2 Reconciliation APIs (9 Actions)

#### `get_reconciliation_list`

Fetch paginated reconciliation data from `c3_payments`. All filter params are optional.

```json
// Request
{
  "action": "get_reconciliation_list",
  "params": {
    "page_number": 0,
    "page_size": 10,
    "from_date": "2025-01-01",
    "to_date": "2025-12-31",
    "status": "Reconciled",
    "card_holder_name": "John Doe"
  }
}

// Response
{
  "success": true,
  "data": {
    "total_records": 150,
    "page_number": 0,
    "page_size": 10,
    "total_pages": 15,
    "records": [
      {
        "id": 1,
        "PaymentGatewayTransactionID": "7029...",
        "TransactionDate": "2025-03-15T10:30:00Z",
        "PaymentAmount": 1500.00,
        "PaymentStatus": "AUTHORIZED",
        "ReconciledByName": "Admin User",
        "ReconciledDate": "2025-03-16T09:00:00Z",
        "Notes": "16/Mar/2025, by Admin User, Unreconciled ---> Reconciled, Verified",
        "ReconciliationStatus": "Reconciled",
        "CyberSourceMerchantID": null,
        "DateandTime": "2025-03-15T10:30:00Z",
        "RequestID": "7029...",
        "MerchantReferenceNumber": "REF123",
        "Amount": "1500.00",
        "Currency": "XCD",
        "FirstName": "John",
        "LastName": "Doe",
        "AccountSuffix": "1234",
        "PaymentMethod": "VISA",
        "AuthorizationCode": "831000",
        "BillingAddress1": "123 Main St",
        "BillingCity": "Roseau",
        "BillingCountry": "DM",
        "ReasonCode": "100",
        "BankReference": "7029...",
        "BankAmount": 1500.00,
        "Variance": 0.00
      }
    ]
  }
}
```

**`status` filter values:** `"Reconciled"` or `"Pending"` / `"Not Reconciled"`

---

#### `get_reconciliation_export`

Fetch ALL records (no pagination) for CSV/Excel export. Same filters as `get_reconciliation_list`.

```json
// Request
{
  "action": "get_reconciliation_export",
  "params": {
    "from_date": "2025-01-01",
    "to_date": "2025-12-31",
    "status": "Reconciled",
    "card_holder_name": null
  }
}

// Response
{ "success": true, "data": { "records": [ ... ] } }
```

---

#### `upload_cybersource_csv`

Upload and process a CyberSource CSV file. Deduplicates, inserts into `c3_reconciliation_records`, and auto-reconciles matching payments.

```json
// Request
{
  "action": "upload_cybersource_csv",
  "params": {
    "csv_content": "CyberSource Merchant ID,Date and Time,Request ID,...\nmerchant1,2025-03-15,REQ123,...",
    "user_id": 5
  }
}

// Response (success)
{
  "success": true,
  "message": "Successfully Saved.",
  "data": {
    "inserted_count": 25,
    "skipped_duplicates": 3,
    "auto_reconciled": 20
  }
}

// Response (all duplicates)
{ "success": false, "message": "No new records found (possibly all duplicates)." }
```

---

#### `update_reconciliation_data`

Bulk reconcile selected payment records.

```json
// Request
{
  "action": "update_reconciliation_data",
  "params": {
    "id": [101, 102, 103],
    "reasons_for_reconciliation": "Verified against bank statement",
    "user_id": 5
  }
}

// Response
{ "success": true, "message": "Updated Successfully." }
```

**Audit note format:** `"{dd/MMM/yyyy}, by {username}, {oldStatus} ---> Reconciled, {reason}"`

---

#### `update_reconciliation_notes`

Toggle individual record's reconciliation status with audit notes.

```json
// Request
{
  "action": "update_reconciliation_notes",
  "params": {
    "id": 101,
    "status": true,
    "notes": "Confirmed with finance team",
    "user_id": 5
  }
}

// Response
{ "success": true, "message": "Updated Successfully.", "data": { /* updated record */ } }
```

- `status = true` → Reconciled
- `status = false/null` → Unreconciled (Pending, sets `is_reconciled = null`)

---

#### `get_reconciliation_notes`

Fetch full note history for a specific payment record.

```json
// Request
{ "action": "get_reconciliation_notes", "params": { "id": 101 } }

// Response
{
  "success": true,
  "data": [
    "16/Mar/2025, by Admin User, Unreconciled ---> Reconciled, Verified against bank",
    "15/Mar/2025, by Finance User, Reconciled ---> Unreconciled, Needs review"
  ]
}
```

Notes are sorted by date descending (most recent first).

---

#### `get_card_holder_names`

Fetch distinct cardholder names for the filter dropdown.

```json
// Request
{ "action": "get_card_holder_names" }

// Response
{
  "success": true,
  "data": [
    { "cardHolderName": "Jane Smith" },
    { "cardHolderName": "John Doe" }
  ]
}
```

---

#### `get_cybersource_columns`

Get user's column visibility preferences. Returns defaults (all hidden) if user has no saved preferences.

```json
// Request
{ "action": "get_cybersource_columns", "params": { "user_id": 5 } }

// Response
{
  "success": true,
  "data": [
    { "id": 1, "field": "CyberSourceMerchantID", "status": true },
    { "id": 2, "field": "DateandTime", "status": false },
    { "id": 3, "field": "RequestID", "status": true }
  ]
}
```

---

#### `save_cybersource_columns`

Save user's column visibility preferences (replaces all existing preferences).

```json
// Request
{
  "action": "save_cybersource_columns",
  "params": {
    "columns": [
      { "field": "CyberSourceMerchantID", "status": true, "user_id": 5 },
      { "field": "DateandTime", "status": false, "user_id": 5 },
      { "field": "RequestID", "status": true, "user_id": 5 }
    ]
  }
}

// Response
{ "success": true, "message": "Columns updated successfully" }
```

---

## 5. Implementation Checklist

### CyberSource Settings (UI Only — APIs are ready)
- [ ] Implement list page with masked credentials table → `get_cybersource_settings`
- [ ] Implement IsActive toggle with local credential verification modal + `toggle_cybersource_status` (sends only `{ id }`, no credentials)
- [ ] Implement edit form for updating credentials → `update_cybersource_settings`
- [ ] Ensure mutual exclusion display (only one active row shown as green)

### Reconciliation (UI Only — APIs & DB are ready)
- [ ] Implement CSV upload UI → `upload_cybersource_csv`
- [ ] Implement search/filter with pagination → `get_reconciliation_list`
- [ ] Implement bulk reconciliation — checkbox + button + modal → `update_reconciliation_data`
- [ ] Implement per-row toggle reconciliation with modal → `update_reconciliation_notes`
- [ ] Implement notes history modal → `get_reconciliation_notes`
- [ ] Implement column customization modal → `get_cybersource_columns` / `save_cybersource_columns`
- [ ] Implement CSV and Excel export → `get_reconciliation_export`
- [ ] Implement card holder name dropdown → `get_card_holder_names`
- [ ] Match all UI elements to legacy screenshots

> **Note:** All database tables and migrations are managed in the backend (EmployerSocialC3). No DB work is needed on SSB-Admin side. All 12 API actions are deployed and functional.
