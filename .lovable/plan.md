# Fix: ER & SE Validation APIs — Return Complete Registration Data

## Problem

Comparing the C3-Wizard registration form fields (screenshots) with the current API responses reveals several missing or incorrectly mapped fields.

### ER Endpoint Gaps (`getERMasterDetails`)


| Registration Form Field | Current API Response                    | Issue                                                                                                       |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Contact Person**      | `contactPerson` = `name` (company name) | Wrong — should be a contact person, but `er_master` has no dedicated column. Current mapping is misleading. |
| **Mobile Number**       | `mobile` = `fax`                        | Wrong — `er_master` has a `mobile` column; should use that instead of `fax`                                 |
| **Name of Company**     | `companyName` = `name`                  | Correct                                                                                                     |
| **Is Levy Exempt**      | Hardcoded `false`                       | No source column exists — acceptable default                                                                |
| **Country**             | Not returned                            | Missing — needs to be added (default "St. Kitts and Nevis" or derive from `village_code`)                   |
| **Postal Code**         | Returns `''`                            | No source column — acceptable                                                                               |
| **City**                | Returns `''`                            | Could derive from `village_code`                                                                            |


### SE Endpoint Gaps (`getSEMasterDetails`)


| Registration Form Field | Current API Response              | Issue                                                     |
| ----------------------- | --------------------------------- | --------------------------------------------------------- |
| **Date of Birth**       | `dateOfBirth` ✓                   | Correct                                                   |
| **Wage Category**       | `wageCategory` ✓                  | Correct                                                   |
| **Mobile Number**       | `mobile` = `''`                   | Missing — should use `ip_master.phone_mobile`             |
| **Phone Number**        | `phone` = `ip_self_employ.phone`  | Correct                                                   |
| **TIN Number**          | `tin` = `''`                      | No source — acceptable                                    |
| **Country**             | Not returned                      | Missing — needs to be added                               |
| **Address fields**      | From `ip_master.resident_addr1/2` | Correct                                                   |
| **City**                | Returns `''`                      | Could derive from `ip_master.district`                    |
| **Self Ref No**         | Not returned                      | Missing — `ip_self_employ.self_ref_no` should be included |


## Plan

### Single Database Migration

Update both RPCs to fix the identified gaps:

#### 1. `public_api_er_master_details` fixes:

- `**mobile**`: Change from `v_rec.fax` → `v_rec.mobile` (use the actual mobile column)
- `**fax**`: Add as separate field using `v_rec.fax`
- `**country**`: Add field, default `'St. Kitts and Nevis'`
- `**contactPerson**`: Keep as company name (no better source exists) — document this

#### 2. `public_api_se_master_details` fixes:

- `**mobile**`: Change from `''` → `v_ip.phone_mobile`
- `**country**`: Add field, default `'St. Kitts and Nevis'`
- `**selfRefNo**`: Add field from `v_se.self_ref_no`
- `**city**`: Map from `v_ip.district` (return the district code; wizard can resolve)

### Files Changed

- **1 new migration**: Updates both RPC functions with corrected field mappings

### No Edge Function Changes

The `public-api/index.ts` passes through RPC JSON responses — no handler changes needed.  
  
Important note: After doing this, please create a proper message for the C3-wizard to do all the chnages required there by these changes in this project to make the c3-wizard working properly according to the changes in this project.  
  
Aslo, in the SE , wage category is not returning or showing , if error from myour side please fix it otherwise add this in the message to check from the C3-wizard side.