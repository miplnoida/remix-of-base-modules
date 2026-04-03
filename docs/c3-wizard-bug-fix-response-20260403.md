# SSB Admin → C3-Wizard Team: Bug Fix Response

> **From:** SSB Admin Team  
> **To:** C3-Wizard Team  
> **Date:** 2026-04-03  
> **Re:** Bug fixes for SE Detail API (SSN 100039) and Employer Employee API (658852)  
> **Status:** ✅ Fixed and deployed to Test environment

---

## 🔧 Bug 1: SE SSN 100039 — Detail API `NOT_FOUND` (FIXED)

**Issue Reported:** The Detail API returned `{"status":"error","error":{"code":"NOT_FOUND","message":"C3 not found"}}` for SSN 100039 even though the Range API confirmed the record exists (March 2026, seq 1).

**Root Cause:** A date-matching inconsistency in the Detail API. The SE record was stored with `period = 2026-03-31` (last day of month), but the Detail API constructed `2026-03-01` (first of month) and did an exact match. Since `2026-03-31 ≠ 2026-03-01`, it returned NOT_FOUND.

**Fix Applied:** Updated the Detail API (`public_api_c3_detail`) to use **month-range matching** instead of exact date matching, consistent with how the Range API already works. The same fix was applied to `public_api_employees_by_last_c3` and `public_api_c3_last_submitted` for consistency.

**Preventive Fix:** SE and VC C3 saves now normalize the period to the first of the month (`YYYY-MM-01`) to prevent future mismatches.

**No action required from C3-Wizard team** — the API contract and response format remain unchanged.

---

## 🔧 Bug 2: Employer 658852 — Empty `ipWages` and `employeesByLastC3` (FIXED)

**Issue Reported:** The Detail API returned `ipWages: []` (empty) for employer 658852, and the `employeesByLastC3` endpoint also returned `[]`.

**Root Cause:** This was a **data status inconsistency**. The `cn_c3_reported` headers for 658852 were correctly at `VAC` (Accepted) status, but the corresponding wage detail rows (`ip_wages`) were at `DEL` (Deleted) status. Since the APIs filter for `posting_status = 'VAC'`, no wage data was returned.

**Fix Applied:** Promoted all `ip_wages` rows for employer 658852 to `VAC` status where the parent C3 header was already at `VAC`. This is a data correction; no API logic was changed.

**No action required from C3-Wizard team.**

---

## 📋 Requested API Response Samples

### 1. Range API — SE SSN 100039

**Request:**
```
GET /api/v1/C3/100039/C3Submitted/SE/range/012026/042026,EE
```

**Response:**
```json
[
  {
    "month": 3,
    "year": 2026,
    "seqNo": 1,
    "payerType": "SE",
    "c3Type": "EE"
  }
]
```

---

### 2. Detail API — SE SSN 100039

**Request:**
```
GET /api/v1/C3/100039/C3Submitted/3,2026,1,SE,EE
```

**Response:**
```json
{
  "c3Header": {
    "c3Status": "S",
    "numberEmployed": 1,
    "calcEmpSsAmt": 120.00,
    "calcEmpLevyAmt": 0.00,
    "calcEmpPeAmt": 0.00,
    "totalEmpSsFines": 0.00,
    "totalEmpLevyPenalty": 0.00,
    "totalEmpPePenalty": 0.00,
    "dateReceived": "2026-04-02",
    "receivedBy": "SAdmin",
    "submittedByName": "SAdmin",
    "submittedByEmail": "",
    "nilReturn": 0
  },
  "ipWages": [
    {
      "ssn": "100039",
      "firstName": "John",
      "surName": "Doe",
      "birthDate": "2026-03-05",
      "payPeriod": "1",
      "paidCode1": "1",
      "paidCode2": "1",
      "paidCode3": "1",
      "paidCode4": "1",
      "paidCode5": "0",
      "paidCode6": "0",
      "paidCode7": "0",
      "wagesPaid1": 300.00,
      "wagesPaid2": 300.00,
      "wagesPaid3": 300.00,
      "wagesPaid4": 300.00,
      "wagesPaid5": 0,
      "wagesPaid6": 0,
      "wagesPaid7": 0,
      "ipSsAmt": 0,
      "erSsAmt": 0,
      "ipLevyAmt": 0,
      "erLevyAmt": 0,
      "ipPeAmt": 0,
      "erEiAmt": 0,
      "startDate": "2026-04-02",
      "endDate": "",
      "wageType": null
    }
  ]
}
```

---

### 3. Employees by Last C3 — Employer 658852

**Request:**
```
GET /api/v1/Employee/employeesByLastC3/658852
```

**Response:**
```json
[
  {
    "socialSecurityNumber": "205343",
    "firstName": "",
    "surName": "",
    "middleName": "",
    "birthDate": "",
    "payPeriod": "M",
    "startDate": "2026-03-26",
    "endDate": "2026-03-26",
    "wages": 0
  },
  {
    "socialSecurityNumber": "210183",
    "firstName": "",
    "surName": "",
    "middleName": "",
    "birthDate": "",
    "payPeriod": "M",
    "startDate": "2026-03-26",
    "endDate": "2026-03-26",
    "wages": 0
  },
  {
    "socialSecurityNumber": "214631",
    "firstName": "",
    "surName": "",
    "middleName": "",
    "birthDate": "",
    "payPeriod": "M",
    "startDate": "2026-03-26",
    "endDate": "2026-03-26",
    "wages": 0
  },
  {
    "socialSecurityNumber": "219865",
    "firstName": "",
    "surName": "",
    "middleName": "",
    "birthDate": "",
    "payPeriod": "M",
    "startDate": "2026-03-26",
    "endDate": "2026-03-26",
    "wages": 0
  }
]
```

> **Note:** The `firstName`, `surName`, `birthDate` fields are empty for these employees because their records do not yet exist in `ip_master`. Once SSN master data is populated, these fields will be resolved automatically — no API change needed.

---

## 📖 Field Name / Value Reference

| Field | Type | Description | Example Values |
|---|---|---|---|
| `payerType` | String | Payer classification | `"ER"` (Employer), `"SE"` (Self-Employed), `"VC"` (Voluntary) |
| `month` | Integer | Calendar month (1–12) | `3` for March |
| `year` | Integer | Calendar year | `2026` |
| `seqNo` | Integer | Sequence/schedule number within a period | `1`, `2`, `5` |
| `c3Status` | String | Submission status in Detail response | `"S"` = Submitted/Accepted |
| `receivedBy` | String | User code of the person who received the C3 | `"SAdmin"`, `"SYSTEM"` |
| `c3Type` | String | C3 category for the request | `"EE"` for SE/VC types |

### Employee Data Availability

- **Detail API `ipWages`**: Contains employee-level wage breakdown when the C3 has wage detail rows (all payer types: ER, SE, VC)
- **`employeesByLastC3`**: Returns employee list from the **most recent VAC C3** for ER payers only. If this endpoint returns `[]` but the Detail `ipWages` has data, it means:
  - The employer's latest C3 period has wage records but they may have been in a non-VAC state (now fixed for 658852)
  - Or the employer has no C3 at all
- **When `employeesByLastC3` returns empty**, the C3-Wizard should fall back to the Detail API's `ipWages` array for the specific period being filed. Both sources provide the same employee data; `employeesByLastC3` is a convenience shortcut.

---

## ✅ Summary of Changes

| # | Item | Status |
|---|---|---|
| 1 | Detail API period matching (SE SSN 100039) | ✅ Fixed — month-range matching |
| 2 | Employer 658852 wage data promoted to VAC | ✅ Fixed — data correction |
| 3 | `employeesByLastC3` now returns 4 employees for 658852 | ✅ Verified |
| 4 | SE/VC period normalization (preventive) | ✅ Applied |

**Test Environment Base URL:**
```
https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/public-api/api/v1/
```

All fixes are live on the **Test** environment. Please re-test and confirm.

---

*End of Bug Fix Response — SSB Admin Team*
