# SSB Admin → C3-Wizard Team: API Response Field Mapping Update

> **From:** SSB Admin Team (Modern BIMA)  
> **To:** C3-Wizard Team  
> **Date:** 2026-03-31  
> **Re:** Updated field mappings for ER & SE Validation APIs  
> **Status:** Deployed to Test — C3-Wizard changes required

---

## Summary

We have updated both validation API responses to include additional fields required by the C3-Wizard registration form. The APIs now return **more complete data** for auto-fill. Please update your registration flow to consume the new fields.

---

## 🔵 ER Endpoint Changes (`getERMasterDetails`)

**Endpoint:** `GET /Employer/getERMasterDetails/{regNo},{email}`

### New Fields Added

| Field | Type | Value | Notes |
|---|---|---|---|
| `country` | string | `"St. Kitts and Nevis"` | Default country — always returned |
| `fax` | string | `"8694651002"` | Fax number from `er_master.fax` |

### Field Fix

| Field | Old Value (WRONG) | New Value (CORRECT) |
|---|---|---|
| `mobile` | Was returning `fax` number | Now returns actual `mobile` from `er_master.mobile` |

### Unchanged Fields (Confirmed Correct)

| Field | Source | Example |
|---|---|---|
| `companyName` | `er_master.name` | `"Caribbean Sugar Mills Ltd"` |
| `tradeName` | `er_master.trade_name` | `"CSM Ltd"` |
| `contactPerson` | `er_master.name` (company name — no dedicated contact column exists) | `"Caribbean Sugar Mills Ltd"` |
| `address1` | `er_master.hq_addr1` | `"Old Road Industrial Est"` |
| `address2` | `er_master.hq_addr2` | `"Old Road Town"` |
| `city` | `""` (no source column) | `""` |
| `postalCode` | `""` (no source column) | `""` |
| `phone` | `er_master.phone` | `"8694651001"` |
| `email` | `er_master.email` | `"csm@mishainfotech.com"` |
| `dateRegistered` | `er_master.registration_date` | `"15/03/2018"` |
| `officeCode` | `er_master.office_code` | `"STK"` |
| `isLevyExempt` | Hardcoded `false` | `false` |
| `regNo` | `er_master.regno` | `"100001"` |
| `prntRegNo` | `er_master.parent_regno` | `""` |
| `statusCode` | `"A"` (only active returned) | `"A"` |
| `employerType` | `"ER"` | `"ER"` |

### Full ER Response Example

```json
{
  "companyName": "Caribbean Sugar Mills Ltd",
  "tradeName": "CSM Ltd",
  "contactPerson": "Caribbean Sugar Mills Ltd",
  "address1": "Old Road Industrial Est",
  "address2": "Old Road Town",
  "city": "",
  "postalCode": "",
  "country": "St. Kitts and Nevis",
  "phone": "8694651001",
  "mobile": "8694651003",
  "fax": "8694651002",
  "email": "csm@mishainfotech.com",
  "dateRegistered": "15/03/2018",
  "officeCode": "STK",
  "isLevyExempt": false,
  "c3RegnStatusCode": "D",
  "c3RegnStatusText": "Not Registered",
  "statusCode": "A",
  "statusText": "Active",
  "employerType": "ER",
  "isActive": "true",
  "prntRegNo": "",
  "firstName": "",
  "lastName": "",
  "regNo": "100001"
}
```

---

## 🔵 SE Endpoint Changes (`getSEMasterDetails`)

**Endpoint:** `GET /Employer/getSEMasterDetails/{ssn},{email}`

### New Fields Added

| Field | Type | Value | Notes |
|---|---|---|---|
| `country` | string | `"St. Kitts and Nevis"` | Default country — always returned |
| `selfRefNo` | string | `"000002"` | Self-Employment reference number from `ip_self_employ.self_ref_no` |

### Field Fixes

| Field | Old Value (WRONG) | New Value (CORRECT) |
|---|---|---|
| `mobile` | Was returning `""` (empty) | Now returns `ip_master.phone_mobile` |
| `city` | Was returning `""` (empty) | Now returns `ip_master.district` (district code) |

### Unchanged Fields (Confirmed Correct)

| Field | Source | Example |
|---|---|---|
| `name` | `firstname + surname` | `"John Doe"` |
| `firstName` | `ip_master.firstname` | `"John"` |
| `lastName` | `ip_master.surname` | `"Doe"` |
| `tradeName` | `ip_self_employ.self_paddr1` | `""` |
| `address1` | `ip_master.resident_addr1` | `"Res Address 1"` |
| `address2` | `ip_master.resident_addr2` | `"Res Address 2"` |
| `postalCode` | `""` (no source) | `""` |
| `phone` | `ip_self_employ.phone` or `ip_master.phone` | `"9589458959"` |
| `email` | `ip_master.email_addr` | `"bharatd+test1@mishainfotech.com"` |
| `gender` | `ip_master.sex` | `"M"` |
| `dateOfBirth` | `ip_master.dob` | `"05/03/2026"` |
| `dateRegistered` | `ip_self_employ.date_commenced` | `"25/03/2026"` |
| `officeCode` | `ip_self_employ.office_code` | `"STK"` |
| `wageCategory` | `ip_self_category.wage_category` | `"300.00"` |
| `tin` | `""` (no source) | `""` |
| `ssn` | `ip_master.ssn` | `"100039"` |

### Full SE Response Example

```json
{
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "tradeName": "",
  "selfRefNo": "000002",
  "address1": "Res Address 1",
  "address2": "Res Address 2",
  "city": "CAY",
  "postalCode": "",
  "country": "St. Kitts and Nevis",
  "phone": "9589458959",
  "mobile": "8696693447",
  "email": "bharatd+test1@mishainfotech.com",
  "gender": "M",
  "dateOfBirth": "05/03/2026",
  "dateRegistered": "25/03/2026",
  "officeCode": "STK",
  "wageCategory": "300.00",
  "tin": "",
  "userName": "",
  "ssn": "100039",
  "statusCode": "A",
  "statusText": "Active",
  "isActive": "true"
}
```

---

## ⚠️ ACTION REQUIRED — C3-Wizard Team

### Must Do

| # | Action | Details |
|---|---|---|
| 1 | **Map `country` field** (ER & SE) | New field — use for country auto-fill on registration form |
| 2 | **Map `fax` field** (ER only) | New field — use for fax number auto-fill if applicable |
| 3 | **Map `selfRefNo` field** (SE only) | New field — Self-Employment reference number |
| 4 | **Update `mobile` mapping** (ER) | Previously returned fax number; now returns actual mobile |
| 5 | **Update `mobile` mapping** (SE) | Previously empty; now returns `ip_master.phone_mobile` |
| 6 | **Update `city` mapping** (SE) | Previously empty; now returns district code from `ip_master.district` |

### Please Verify

| # | Item | Details |
|---|---|---|
| 7 | **`wageCategory` display** | API now returns `"300.00"` — please verify this is being consumed and displayed correctly on the SE registration form. If it shows empty, the issue is on the Wizard side. |
| 8 | **`contactPerson` for ER** | Returns company name (no dedicated contact person column exists in `er_master`). Confirm this is acceptable for your form. |

---

## 🧪 Test Data

### Employer (ER)
```
RegNo: 100001 | Email: csm@mishainfotech.com
```

### Self-Employed (SE)
```
SSN: 100039 | Email: bharatd+test1@mishainfotech.com
```

---

*End of Field Mapping Update — SSB Admin Team*
