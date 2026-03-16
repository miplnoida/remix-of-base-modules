# SSB Admin – Pay / Paid Button Workflow Implementation Guide

**Version**: 1.0  
**Date**: March 16, 2026  
**Purpose**: Complete implementation guide for the Pay/Paid button workflow in the C3 Details module (Employer, NWD, Self-Employed screens).

---

## ⚠️ CRITICAL RULE: NO DIRECT DATABASE ACCESS

Same rule as all SSB Admin guides — SSB Admin does NOT have C3 tables.  
All data comes from calling the `wiz-admin-api` Edge Function via HTTP POST.

---

## 1. Problem Statement

**Current (Incorrect) Behavior:**  
Clicking the "$ Pay" button in the C3 Details screens redirects to a Payment Details page.

**Correct (Legacy) Behavior:**  
Clicking "$ Pay" navigates to an **Offline Payment Page** with two collapsible sections:
1. **Report** — The SSB Statement of Wages and Contributions preview
2. **Payment** — A two-panel layout for recording offline payments via BIMA receipt lookup

---

## 2. Screens Where Pay Button Exists

| Screen | Route | Entity Type |
|--------|-------|-------------|
| C3 Contribution (Employer) | `/admin/c3-management/c3-contribution` | `employer` |
| Non-Working Director | `/admin/c3-management/nw-director` | `nwd` |
| Self-Employed | `/admin/c3-management/self-employed` | `self_employed` |

All three screens follow the **same payment workflow**.

---

## 3. Developer Flowchart

```
┌─────────────────────────────────────────────────────────────────────┐
│                    C3 Details List Screen                            │
│   (Employer / NWD / Self-Employed)                                  │
│                                                                     │
│   Payment Column shows one of:                                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │  $ Pay   │  │  Paid 🖨️ │  │  BEMA    │  │  (empty) │          │
│   │ (green)  │  │  (grey)  │  │  (grey)  │  │          │          │
│   │ clickable│  │ clickable│  │ disabled │  │          │          │
│   └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘          │
│        │              │                                              │
└────────┼──────────────┼──────────────────────────────────────────────┘
         │              │
         ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Offline Payment Page                                    │
│  Route: /admin/C3/offlineReport/{type}/{headerId}                   │
│  Breadcrumb: 🏠 Admin Dashboard  >  Offline Payment                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Report  (Collapsible — default: expanded for $ Pay,       │    │
│  │           collapsed for Paid)                      ▲/▼     │    │
│  │                                                             │    │
│  │  [Full SSB Statement of Wages and Contributions Preview]    │    │
│  │  (Same content as the Preview/Eye icon modal)               │    │
│  │                                                             │    │
│  │  ┌──────────┐  ┌───────────────┐           ┌───────────┐   │    │
│  │  │ 🖨 Print │  │ ⬇ Download PDF│           │ $ Payment │   │    │
│  │  │ (green)  │  │   (blue)      │           │  (green)  │   │    │
│  │  └──────────┘  └───────────────┘           └─────┬─────┘   │    │
│  └──────────────────────────────────────────────────┼──────────┘    │
│                                                      │              │
│                                            Click $ Payment          │
│                                                      │              │
│  ┌──────────────────────────────────────────────────▼──────────┐    │
│  │  Payment  (Collapsible — expands when $ Payment clicked)    │    │
│  │                                                      ▲/▼    │    │
│  │  ┌─────────────────────────┐ ┌─────────────────────────┐   │    │
│  │  │  BEMA Payment Details   │ │  C3 Payment Details     │   │    │
│  │  │                         │ │                          │   │    │
│  │  │  Receipt Number* [____] │ │  Period     Feb 2026    │   │    │
│  │  │                    [🔍] │ │  Creation   06-Mar-2026 │   │    │
│  │  │  Batch Number    MIT... │ │  Schedule   1           │   │    │
│  │  │  Payment Date   06-Jun │ │  Wages     $21,400.00   │   │    │
│  │  │  Payment Mode   Cash   │ │                          │   │    │
│  │  │                         │ │  🟢 SS Contributions     │   │    │
│  │  │  🟢 SS Contributions    │ │            $2,134.02    │   │    │
│  │  │              $200.00   │ │  🟢 LV Contributions     │   │    │
│  │  │  🟢 LV Contributions   │ │            $141.00      │   │    │
│  │  │              $100.00   │ │  🟢 PE Contributions     │   │    │
│  │  │  🟢 PE Contributions   │ │            $114.00      │   │    │
│  │  │              $300.00   │ │                          │   │    │
│  │  │                         │ │  Total     $2,389.02    │   │    │
│  │  │  Total        $600.00  │ │                          │   │    │
│  │  │                         │ │                          │   │    │
│  │  │ [← Back]    [$ Pay]    │ │                          │   │    │
│  │  └─────────────────────────┘ └─────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision Flow for $ Pay Button Click

```
User clicks "$ Pay" in BEMA Payment Details panel
         │
         ▼
┌─────────────────────────┐
│ Is Receipt Number empty? │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │ YES     │ NO
    ▼         ▼
 Show       ┌──────────────────────────────┐
 Error:     │ Call: search_bima_receipt      │
 "Enter     │   receipt_number, header_id,  │
 Receipt    │   entity_type                 │
 Number"    └──────────────┬───────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Receipt found? │
                  └───┬────────┬───┘
                  NO  │        │ YES
                      ▼        ▼
               Show Error   ┌─────────────────────────┐
               "Receipt     │ Multiple payments found? │
               not found"   └──────┬──────────┬────────┘
                              NO   │          │ YES
                                   ▼          ▼
                            Auto-fill     ┌──────────────────────┐
                            BEMA panel    │ Show "Select Payment" │
                                          │ Modal (grid of cards) │
                                          │                       │
                                          │ User clicks "Apply"   │
                                          │ on a payment card     │
                                          └───────────┬───────────┘
                                                      │
                                                      ▼
                                               Fill BEMA panel
                                               with selected data
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ Call: apply_offline_   │
                                          │   payment              │
                                          │   header_id,           │
                                          │   receipt_number,      │
                                          │   batch_number,        │
                                          │   payment_date,        │
                                          │   payment_mode,        │
                                          │   amount,              │
                                          │   ss_amount,           │
                                          │   lv_amount,           │
                                          │   pe_amount,           │
                                          │   entity_type          │
                                          └───────────┬───────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ Payment Recorded      │
                                          │ Status → "Paid"       │
                                          │ Show Receipt Screen   │
                                          └───────────────────────┘
```

---

## 4. Payment Column Logic (Recap from C3 Details Guide)

| Condition | Display | Click Action |
|-----------|---------|-------------|
| `payment_status === "Paid"` | Grey "Paid" badge with 🖨️ icon | Navigate to Offline Payment Page (Report collapsed, Payment expanded, read-only) |
| `payment_status === "$ Pay"` | Green bordered "$ Pay" button | Navigate to Offline Payment Page (Report expanded, Payment collapsed) |
| `payment_status === "BEMA"` | Grey bordered "BEMA" badge | **Non-clickable** — imported by SSB Admin, no payment action |
| `payment_status === ""` | Empty cell | No action — record not submitted |

### Navigation URL Pattern

```
/admin/C3/offlineReport/{entityType}/{headerId}

Examples:
  /admin/C3/offlineReport/employer/45
  /admin/C3/offlineReport/nwd/78
  /admin/C3/offlineReport/self_employed/15
```

---

## 5. Offline Payment Page Layout

### 5.1 Breadcrumb
```
🏠 Admin Dashboard  >  Offline Payment
```

### 5.2 Report Section (Collapsible)

Contains the **exact same SSB Statement of Wages and Contributions** preview as the Eye icon modal. Use the existing preview APIs:

| Entity Type | API Action |
|-------------|------------|
| `employer` | `get_contribution_preview` with `{ header_id, company_id }` |
| `nwd` | `get_nwd_contribution_preview` with `{ header_id, company_id }` |
| `self_employed` | `get_se_contribution_preview` with `{ contribution_id }` |

**Buttons at bottom of Report section:**
- **Print** (green, left) — Same print logic as preview modal
- **Download PDF** (blue, left) — Same PDF logic as preview modal
- **$ Payment** (green, right) — Scrolls down and expands Payment section

### 5.3 Payment Section (Collapsible)

Two-panel layout side by side:

#### Left Panel: BEMA Payment Details

| Element | Type | Description |
|---------|------|-------------|
| Title | Text | **"BEMA Payment Details"** |
| Description | Text | "Retrieve the payment details to enter the BEMA receipt number for the correct employer and C3 period." |
| Receipt Number * | Input + 🔍 Search | Required. User enters BIMA receipt number and clicks search icon |
| Batch Number | Read-only | Populated from BIMA search response |
| Payment Date | Read-only | Populated from BIMA search response. Format: `dd-MMM-yyyy` |
| Payment Mode | Read-only | Populated from BIMA search response (e.g., "Cash", "Online Payment") |
| 🟢 SS Contributions | Read-only | Amount from BIMA receipt |
| 🟢 LV Contributions | Read-only | Amount from BIMA receipt |
| 🟢 PE Contributions | Read-only | Amount from BIMA receipt |
| **Total** | Read-only (red) | Sum of SS + LV + PE |
| ← Back | Button (outlined) | Returns to C3 Details list |
| $ Pay | Button (green, outlined) | Submits the offline payment |

#### Right Panel: C3 Payment Details

| Element | Type | Description |
|---------|------|-------------|
| Title | Text | **"C3 Payment Details"** |
| Nil Return | Label | Only shown if `is_nil_return === true` |
| Period | Read-only | e.g., "February 2026" |
| Creation Date | Read-only | Format: `dd-MMM-yyyy` |
| Schedule | Read-only | Integer (only for Employer/NWD) |
| Wages | Read-only | Format: `$21,400.00` |
| 🟢 SS Contributions | Read-only | From C3 header totals |
| 🟢 LV Contributions | Read-only | From C3 header totals |
| 🟢 PE Contributions | Read-only | From C3 header totals |
| **Total** | Read-only (red) | Grand total from C3 header |

**NWD Difference:** Right panel shows:
- SS Nil Return (with checkbox icon, greyed)
- LV Nil Return (with checkbox icon, greyed)  
- LV Contributions (with amount)

(NWD only has Levy, no SS or PE contributions. "Nil Return" labels indicate zero values.)

---

## 6. "Select Payment" Modal

When `search_bima_receipt` returns **multiple payments** for the same employer and period, a modal appears:

### Modal Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Select Payment                                         ✕   │
│                                                             │
│  ⚠ There are XX C3 payments for [Month Year].              │
│  Please review the details below and click Apply            │
│  to confirm the correct payment.                            │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Period: Jan 2026     │  │ Period: Jan 2026     │        │
│  │                      │  │                      │        │
│  │ Receipt: 1234567     │  │ Receipt: 1234568     │        │
│  │ Mode: Online Payment │  │ Mode: Online Payment │        │
│  │ Batch: MIT060...     │  │ Batch: MIT060...     │        │
│  │ Date: 04-Jun-2026    │  │ Date: 04-Jun-2026    │        │
│  │                      │  │                      │        │
│  │ Payment Details      │  │ Payment Details      │        │
│  │ 🟢 SS    $2,936.38  │  │ 🟢 SS    $1,600.00  │        │
│  │ 🟢 LV     $395.40   │  │ 🟢 LV     $103.34   │        │
│  │ 🟢 PE     $193.90   │  │ 🟢 PE       $0.00   │        │
│  │                      │  │                      │        │
│  │ Total   $3,525.68    │  │ Total   $1,703.34    │        │
│  │                      │  │                      │        │
│  │ ⚠ "SS contributions  │  │                      │        │
│  │ couldn't be applied. │  │                      │        │
│  │ Please contact the   │  │                      │        │
│  │ current system for   │  │ ┌──────────┐        │        │
│  │ details in number."  │  │ │  Apply   │        │        │
│  │                      │  │ │ (green)  │        │        │
│  │ ┌──────────┐        │  │ └──────────┘        │        │
│  │ │ ✓ Applied │        │  │                      │        │
│  │ │ (grey)    │        │  │                      │        │
│  │ └──────────┘        │  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  (scrollable if many cards)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Card States
- **"Apply" (green):** Available for selection
- **"✓ Applied" (grey):** Already applied to this C3 record
- **Warning text (orange):** Validation mismatch — amounts don't match C3 totals

---

## 7. Paid State Behavior

When `payment_status === "Paid"` and user clicks the Paid badge:

1. Navigate to same Offline Payment Page
2. **Report section**: Collapsed by default
3. **Payment section**: Expanded by default
4. All fields are **read-only** (already populated with payment data)
5. **$ Pay button** is **hidden** (already paid)
6. Shows the applied BIMA receipt details

---

## 8. Receipt Screen

After successful payment application, show a receipt screen matching the legacy layout:

```
┌────────────────────────────────────────────┐
│           [SSB Logo]                        │
│     Social Security Board                   │
│                                             │
│  Head Office           Branch Office        │
│  Robert Llewellyn      Pinney's Commercial  │
│  Bradshaw Building     Site                 │
│  P.O. Box 79, Bay Rd  P.O. Box 667 Nevis   │
│  Basseterre, St. Kitts                      │
│  +1 (869) 465-2535     +1 (869) 469-5245    │
│  pubinfo@social        nevis@social         │
│  security.kn           security.kn          │
│                                             │
│  ┌─────────────────────────┐               │
│  │ RECEIPT# 9589990        │               │
│  └─────────────────────────┘               │
│                                             │
│  Reg No.          658864                    │
│  Customer Name    M & M Transportation...   │
│  Period           Feb-2026                  │
│  Batch Number     MIT060620251250           │
│  Payment Date     16-03-2026 10:36          │
│  Payment Mode     Cash                      │
│  Status           Offline Payment           │
│  SS Contributions $200.00                   │
│  LV Contribution  $100.00                   │
│  PE Contributions $300.00                   │
│  Amount           $600                      │
│                                             │
│    ┌──────────┐  ┌────────────────┐        │
│    │ Download │  │ Go To DashBoard│        │
│    │  (blue)  │  │   (outlined)   │        │
│    └──────────┘  └────────────────┘        │
└────────────────────────────────────────────┘
```

---

## 9. API Reference

### 9.1 `get_offline_payment_page`

Fetches all data needed for the Offline Payment Page (C3 details + existing payment if any).

```typescript
const result = await wizAdminApi('get_offline_payment_page', {
  header_id: 45,          // required — contribution header ID or SE contribution ID
  entity_type: 'employer', // required — 'employer' | 'nwd' | 'self_employed'
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "c3_details": {
      "period": "February 2026",
      "period_month": "2",
      "period_year": "2026",
      "creation_date": "2026-03-06T10:00:00Z",
      "schedule": 1,
      "is_nil_return": false,
      "wages": 21400.00,
      "ss_contributions": 2134.02,
      "lv_contributions": 141.00,
      "pe_contributions": 114.00,
      "ss_penalty": 0.00,
      "lv_penalty": 0.00,
      "pe_penalty": 0.00,
      "total": 2389.02,
      "company_id": 123,
      "company_name": "M & M Transportation Services Ltd",
      "registration_number": "658864",
      "trade_name": "M & M Transportation Services Ltd",
      "address": "P.O. Box 1120 Basseterre,"
    },
    "existing_payment": null,
    "is_paid": false
  }
}
```

**When already paid (`is_paid: true`):**
```json
{
  "status": "success",
  "data": {
    "c3_details": { ... },
    "existing_payment": {
      "payment_id": 99,
      "receipt_number": "9589990",
      "batch_number": "MIT060620251250",
      "payment_date": "2026-03-16T10:36:00Z",
      "payment_mode": "Cash",
      "ss_amount": 200.00,
      "lv_amount": 100.00,
      "pe_amount": 300.00,
      "total": 600.00,
      "payment_status": "Offline Payment",
      "bima_receipt_number": "9589990"
    },
    "is_paid": true
  }
}
```

---

### 9.2 `search_bima_receipt`

Searches BIMA for payment receipts matching a receipt number for the given employer/SE and period.

```typescript
const result = await wizAdminApi('search_bima_receipt', {
  receipt_number: '9589990',     // required
  header_id: 45,                 // required
  entity_type: 'employer',       // required — 'employer' | 'nwd' | 'self_employed'
});
```

**Response (single payment):**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "receipt_number": "9589990",
        "batch_number": "MIT060620251250",
        "payment_date": "2026-06-06",
        "payment_mode": "Cash",
        "ss_amount": 200.00,
        "lv_amount": 100.00,
        "pe_amount": 300.00,
        "total": 600.00,
        "is_applied": false,
        "validation_warnings": []
      }
    ],
    "multiple": false,
    "period": "January 2026"
  }
}
```

**Response (multiple payments):**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "receipt_number": "1234561",
        "batch_number": "MIT060620251250",
        "payment_date": "2026-06-04",
        "payment_mode": "Online Payment",
        "ss_amount": 2936.38,
        "lv_amount": 395.40,
        "pe_amount": 193.90,
        "total": 3525.68,
        "is_applied": true,
        "validation_warnings": [
          "SS contributions couldn't be applied. Please contact the current system for details in number."
        ]
      },
      {
        "receipt_number": "1234562",
        "batch_number": "MIT060620251250",
        "payment_date": "2026-06-04",
        "payment_mode": "Online Payment",
        "ss_amount": 1600.00,
        "lv_amount": 103.34,
        "pe_amount": 0.00,
        "total": 1703.34,
        "is_applied": false,
        "validation_warnings": []
      }
    ],
    "multiple": true,
    "period": "January 2026"
  }
}
```

---

### 9.3 `apply_offline_payment`

Records the offline payment, links the BIMA receipt to the C3 record, and updates the payment status.

```typescript
const result = await wizAdminApi('apply_offline_payment', {
  header_id: 45,                  // required
  entity_type: 'employer',        // required — 'employer' | 'nwd' | 'self_employed'
  receipt_number: '9589990',      // required — BIMA receipt number
  batch_number: 'MIT060620251250',// required
  payment_date: '2026-06-06',    // required — from BIMA search
  payment_mode: 'Cash',          // required — from BIMA search
  ss_amount: 200.00,             // required — SS contribution amount
  lv_amount: 100.00,             // required — LV contribution amount
  pe_amount: 300.00,             // required — PE contribution amount
  total_amount: 600.00,          // required — total payment amount
  admin_user_id: 1,              // required — admin user performing the action
  notes: '',                     // optional
});
```

**Response (success):**
```json
{
  "status": "success",
  "data": {
    "payment_id": 99,
    "receipt_number": "9589990",
    "message": "Offline payment recorded successfully",
    "receipt": {
      "receipt_number": "9589990",
      "reg_no": "658864",
      "customer_name": "M & M Transportation Services Ltd",
      "period": "Feb-2026",
      "batch_number": "MIT060620251250",
      "payment_date": "16-03-2026 10:36",
      "payment_mode": "Cash",
      "status": "Offline Payment",
      "ss_contributions": 200.00,
      "lv_contribution": 100.00,
      "pe_contributions": 300.00,
      "amount": 600.00
    }
  }
}
```

**Response (error):**
```json
{
  "status": "error",
  "message": "Payment already exists for this C3 record"
}
```

---

### 9.4 `get_period_payment_list`

Fetches all BIMA payments for a given employer/SE and period. Used when the "Select Payment" modal needs to show all available payments.

```typescript
const result = await wizAdminApi('get_period_payment_list', {
  header_id: 45,                 // required
  entity_type: 'employer',       // required
  registration_number: '658864', // required
  period_month: '1',             // required
  period_year: '2026',           // required
});
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "receipt_number": "1234561",
        "batch_number": "MIT060620251250",
        "payment_date": "2026-06-04",
        "payment_mode": "Online Payment",
        "ss_amount": 2936.38,
        "lv_amount": 395.40,
        "pe_amount": 193.90,
        "total": 3525.68,
        "is_applied": true,
        "applied_to_header_id": 45
      },
      {
        "receipt_number": "1234562",
        "batch_number": "MIT060620251260",
        "payment_date": "2026-06-04",
        "payment_mode": "Online Payment",
        "ss_amount": 1600.00,
        "lv_amount": 103.34,
        "pe_amount": 0.00,
        "total": 1703.34,
        "is_applied": false,
        "applied_to_header_id": null
      }
    ],
    "total_count": 2,
    "period": "January 2026"
  }
}
```

---

## 10. Payment Status Transitions

```
┌──────────────┐                    ┌──────────────┐
│  Submitted   │  Admin applies     │    Paid      │
│  ($ Pay)     │  offline payment   │  (Paid 🖨️)   │
│              │ ──────────────────>│              │
│ payment_     │  apply_offline_    │ payment_     │
│ status:      │  payment API       │ status:      │
│ "$ Pay"      │                    │ "Paid"       │
└──────────────┘                    └──────────────┘

┌──────────────┐
│  BEMA Import │  No payment action available
│  (BEMA)      │  (record imported by admin)
│              │
│ payment_     │
│ status:      │
│ "BEMA"       │
└──────────────┘
```

### Status Update Logic

When `apply_offline_payment` is called:

1. **Create payment record** in `c3_payments` with `payment_status = 'Offline Payment'`
2. **Update C3 header** notes to `"OFFLINE PAYMENT - Receipt: {receipt_number}"`
3. The `payment_status` field in the list API response changes from `"$ Pay"` → `"Paid"` because a payment now exists

**How `payment_status` is derived (in `get_contribution_list`):**

```
IF payment exists with status "AUTHORIZED" or "Offline Payment":
    payment_status = "Paid"
ELSE IF is_imported_from_bema = true:
    payment_status = "BEMA"
ELSE IF is_submitted = true:
    payment_status = "$ Pay"
ELSE:
    payment_status = ""
```

---

## 11. Online vs Offline Payment — Admin Context

### Important Distinction

In the **Admin context**, all payments are **offline payments**. The admin does not process credit card (CyberSource) payments.

| Payment Type | Who Processes | Context |
|-------------|--------------|---------|
| **Online (CyberSource)** | Employer / Self-Employed user | Via the C3 Wizard portals (Employer Portal, SE Portal) |
| **Offline (BIMA Receipt)** | SSB Admin | Via the Offline Payment Page in SSB Admin |

### Admin Offline Payment Workflow

The admin workflow is:
1. Payment is received externally (cash, check, bank transfer, journal voucher)
2. Payment is posted to BIMA (outside this system, or via the BIMA system)
3. BIMA generates a receipt number
4. Admin enters the BIMA receipt number in the Offline Payment Page
5. System looks up the BIMA receipt and retrieves payment details
6. Admin clicks "$ Pay" to link the BIMA receipt to the C3 record
7. C3 status changes to "Paid"

### When Online Payment Was Already Made

If an employer paid online via CyberSource:
1. Payment was already recorded in `c3_payments` with `payment_status = 'AUTHORIZED'`
2. The list API already shows `payment_status = "Paid"`
3. The admin can click "Paid 🖨️" to view the payment details
4. No further action is needed

---

## 12. NWD-Specific Behavior

For Non-Working Directors, the right panel (C3 Payment Details) shows different labels:

| Field | NWD Display |
|-------|-------------|
| SS Contributions | "SS Nil Return" (greyed, $0.00) — NWDs don't pay SS |
| LV Contributions | Shows both "LV Nil Return" ($0.00 if nil) and "LV Contributions" ($52.00) |
| PE Contributions | Not shown — NWDs don't pay PE/Severance |

---

## 13. Self-Employed Specific Behavior

For Self-Employed, the right panel shows:
- No "Schedule" row (SE records don't have schedule numbers)
- Contributions labeled as "SS Contributions" and "LV Contributions"
- No "PE Contributions" (SE contributions are combined into SS)

---

## 14. Error Handling

| Scenario | Error Message | UI Action |
|----------|--------------|-----------|
| Receipt number empty | "Please enter a receipt number" | Toast error |
| Receipt not found in BIMA | "Receipt number not found. Please verify and try again." | Toast error |
| Payment already exists | "Payment already exists for this C3 record" | Toast error, disable $ Pay |
| BIMA service unavailable | "Unable to connect to payment system. Please try again later." | Toast error |
| Amount mismatch warning | "SS contributions couldn't be applied..." | Warning text on payment card (orange) |

---

## 15. Complete Actions Reference (Updated)

| Action | Purpose | Key Params |
|--------|---------|------------|
| `get_offline_payment_page` | Full page data for Offline Payment | `header_id`, `entity_type` |
| `search_bima_receipt` | Search BIMA for receipt details | `receipt_number`, `header_id`, `entity_type` |
| `apply_offline_payment` | Record offline payment | `header_id`, `entity_type`, `receipt_number`, amounts, `admin_user_id` |
| `get_period_payment_list` | All payments for a period | `header_id`, `entity_type`, `registration_number`, period |

---

## 16. Implementation Checklist

- [ ] Create Offline Payment Page route: `/admin/C3/offlineReport/{type}/{id}`
- [ ] Implement "Report" collapsible section with SSB Statement preview
- [ ] Implement "Payment" collapsible section with two-panel layout
- [ ] Implement BEMA Receipt Number search (🔍 icon)
- [ ] Implement "Select Payment" modal for multiple receipts
- [ ] Implement "$ Pay" button with `apply_offline_payment` API call
- [ ] Implement Receipt screen after successful payment
- [ ] Update "$ Pay" column click handler to navigate to Offline Payment Page
- [ ] Update "Paid" column click handler to navigate to read-only Offline Payment Page
- [ ] Verify NWD-specific labels (SS Nil Return, LV Nil Return)
- [ ] Verify Self-Employed-specific layout (no Schedule, no PE)
- [ ] Test error handling (empty receipt, not found, duplicate payment)

---

**Last Updated**: March 16, 2026
