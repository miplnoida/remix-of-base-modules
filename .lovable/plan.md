
# Update Employer Application Detail Page for External API

## Problem
The Employer Application Detail page shows empty/blank fields because the external API returns different field names than what the UI expects. For example:
- API returns `trade_name` but UI looks for `employer_name`
- API returns `hq_address1` but UI looks for `address_line1`
- API returns `contact_telephone` but UI looks for `phone`
- API returns `total_employees` but UI looks for `employee_count`
- Additional fields like `officials`, `owners`, `locations`, `declaration_*` are not displayed at all

## Solution Overview
Update `useEmployerApplicationDetail.ts` to normalize API responses and update `EmployerApplicationDetailPage.tsx` to display all fields organized by the provided groupings.

---

## Files to Change

### 1. `src/hooks/useEmployerApplicationDetail.ts`

**Changes:**
- Expand `EmployerApplicationDetail` interface to include ALL API fields from the documentation
- Add new sub-interfaces for `Official`, `Owner`, `Location`, `Document`
- Add a `normalizeEmployerDetail()` function that maps external API field names to the interface

**New/Updated Interface Fields:**
```text
// Pre-Registration
contact_name, email, mobile, mobile_country, mobile_dial_code, country, country_code

// Step 1: Employer Profile
date_incorporated, is_acquired, date_acquired, previous_owner, previous_owner_reg_no
ownership_code, ownership_name, sector_code, sector_name
parent_reg_no, office_code, office_name, industry_code, industry_name

// Step 2: Basic Details
legal_name, trade_name, employer_email
hq_address1, hq_address2, hq_country, hq_country_code
mailing_address1, mailing_address2
application_date, wages_first_paid_date
male_count, female_count, total_employees

// Step 3: Key Officials
activity_type, activity_type_name, officials[]

// Step 4: Contact & Reach
contact_telephone, contact_telephone_country, contact_telephone_dial_code
contact_fax, contact_fax_country, contact_fax_dial_code

// Step 5: Owners/Partners/Directors
owners[]

// Step 6: Locations
locations[]

// Step 7: Documents
documents[]

// Step 8: Notes
notes

// Step 9: Declaration
declaration_accepted, declaration_date, signatory_name, signatory_title

// Metadata
submitted_at, created_at, updated_at, is_deleted
total_owners, total_locations, total_documents
```

**Normalizer Function Logic:**
```typescript
function normalizeEmployerDetail(raw: Record<string, unknown>): EmployerApplicationDetail {
  return {
    // Core identifiers
    id: raw.id,
    reference_number: raw.id, // API uses id as reference
    registration_id: raw.registration_id,
    status: raw.status,
    current_step: raw.current_step,
    
    // Contact Person (Pre-Registration)
    contact_name: raw.contact_name,
    email: raw.email,
    mobile: raw.mobile,
    mobile_country: raw.mobile_country,
    mobile_dial_code: raw.mobile_dial_code,
    country: raw.country,
    country_code: raw.country_code,
    
    // Business Identity - map legal_name/trade_name to employer_name
    employer_name: raw.legal_name || raw.trade_name,
    trading_name: raw.trade_name,
    employer_email: raw.employer_email,
    
    // Business Profile
    date_incorporated: raw.date_incorporated,
    is_acquired: raw.is_acquired,
    date_acquired: raw.date_acquired,
    previous_owner: raw.previous_owner,
    previous_owner_reg_no: raw.previous_owner_reg_no,
    
    // Classification
    ownership_code: raw.ownership_code,
    ownership_name: raw.ownership_name,
    sector_code: raw.sector_code,
    sector_name: raw.sector_name,
    parent_reg_no: raw.parent_reg_no,
    office_code: raw.office_code,
    office_name: raw.office_name,
    industry_code: raw.industry_code,
    industry_name: raw.industry_name,
    
    // HQ Address - map hq_address1 to address_line1
    address_line1: raw.hq_address1,
    address_line2: raw.hq_address2,
    hq_country: raw.hq_country,
    hq_country_code: raw.hq_country_code,
    
    // Mailing Address - map mailing_address1 to mailing_address_line1
    mailing_address_line1: raw.mailing_address1,
    mailing_address_line2: raw.mailing_address2,
    
    // Employment
    application_date: raw.application_date,
    wages_first_paid_date: raw.wages_first_paid_date,
    male_count: raw.male_count,
    female_count: raw.female_count,
    employee_count: raw.total_employees,
    
    // Contact Details - map contact_telephone to phone
    phone: raw.contact_telephone,
    phone_country: raw.contact_telephone_country,
    phone_dial_code: raw.contact_telephone_dial_code,
    fax: raw.contact_fax,
    fax_country: raw.contact_fax_country,
    fax_dial_code: raw.contact_fax_dial_code,
    
    // Officials, Owners, Locations, Documents
    activity_type: raw.activity_type,
    activity_type_name: raw.activity_type_name,
    officials: raw.officials || [],
    owners: raw.owners || [],
    locations: raw.locations || [],
    documents: normalizeDocuments(raw.documents),
    
    // Notes & Declaration
    remarks: raw.notes,
    declaration_accepted: raw.declaration_accepted,
    declaration_date: raw.declaration_date,
    signatory_name: raw.signatory_name,
    signatory_title: raw.signatory_title,
    
    // Timestamps
    submitted_at: raw.submitted_at,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    
    // Counts
    total_owners: raw.total_owners,
    total_locations: raw.total_locations,
    total_documents: raw.total_documents,
  };
}
```

---

### 2. `src/pages/online-applications/EmployerApplicationDetailPage.tsx`

**Changes:**
- Add new tabs for: "Profile", "Officials", "Owners", "Locations", "Declaration"
- Reorganize existing tabs to match the API groupings
- Display all new fields with proper labels

**Updated Tab Structure:**
1. **Business** - Employer Name, Trade Name, Ownership Type, Sector, Industry, Office, Registration Date, Parent Reg No
2. **Profile** (new) - Date Incorporated, Is Acquired, Previous Owner details
3. **Contact** - Contact Person, Email, Mobile, Phone, Fax
4. **Address** - HQ Address, Mailing Address, Country
5. **Workforce** (new) - Application Date, Wages First Paid, Male/Female/Total Employees
6. **Officials** (new) - Key Officials table (name, title, phone, email, SSN)
7. **Owners** (new) - Owners/Partners/Directors table
8. **Locations** (new) - Business Locations table
9. **Documents** - Uploaded documents
10. **Declaration** (new) - Signatory Name, Title, Declaration Accepted, Declaration Date

**Summary Card Updates:**
- Display `trade_name` as primary name (since `legal_name` is often null)
- Show country from `country` field
- Show `mobile` with proper dial code formatting

---

## Field Mapping Reference

| API Field | UI Label | Tab |
|-----------|----------|-----|
| `trade_name` | Trade Name / Employer Name | Business |
| `legal_name` | Legal Name | Business |
| `ownership_name` | Ownership Type | Business |
| `sector_name` | Sector | Business |
| `industry_name` | Industry | Business |
| `office_name` | Office | Business |
| `parent_reg_no` | Parent Reg. No. | Business |
| `date_incorporated` | Date Incorporated | Profile |
| `is_acquired` | Acquired Business | Profile |
| `date_acquired` | Acquisition Date | Profile |
| `previous_owner` | Previous Owner | Profile |
| `previous_owner_reg_no` | Previous Owner SSB Reg. No. | Profile |
| `contact_name` | Contact Person | Contact |
| `email` | Email | Contact |
| `mobile` + `mobile_dial_code` | Mobile | Contact |
| `contact_telephone` + `dial_code` | Phone | Contact |
| `contact_fax` + `dial_code` | Fax | Contact |
| `signatory_title` | Contact Title | Contact |
| `hq_address1` | HQ Address 1 | Address |
| `hq_address2` | HQ Address 2 | Address |
| `hq_country` | HQ Country | Address |
| `mailing_address1` | Mailing Address 1 | Address |
| `mailing_address2` | Mailing Address 2 | Address |
| `application_date` | Application Date | Workforce |
| `wages_first_paid_date` | Wages First Paid | Workforce |
| `male_count` | Male Employees | Workforce |
| `female_count` | Female Employees | Workforce |
| `total_employees` | Total Employees | Workforce |
| `officials[]` | Key Officials | Officials |
| `owners[]` | Owners/Partners | Owners |
| `locations[]` | Business Locations | Locations |
| `documents[]` | Documents | Documents |
| `notes` | Remarks | Declaration |
| `signatory_name` | Signatory Name | Declaration |
| `signatory_title` | Signatory Title | Declaration |
| `declaration_accepted` | Declaration Accepted | Declaration |
| `declaration_date` | Declaration Date | Declaration |

---

## Expected Result

After these changes, the detail page at `/online-applications/employer/ER-2026-877111` will display:
- **Employer Name**: "Palm Coast Wholesale" (from `trade_name`)
- **Contact Name**: "Kelvin Andre Thomas"
- **Email**: "mipl.student+kelvin.thomas@gmail.com"
- **Mobile**: "(+1) 8696694412"
- **Phone**: "(+1) 8694658800"
- **HQ Address**: "Central Bay Road, Unit 7A"
- **Total Employees**: 48 (Male: 22, Female: 26)
- **Country**: "Saint Kitts and Nevis"
- **Previous Owner**: "Island Heritage Services Ltd"
- **Officials**: 2 officials with names, titles, phones, emails
- **Declaration Status**: Not accepted (false)

---

## Verification Steps
1. Navigate to `/online-applications/employer/ER-2026-877111`
2. Verify Business tab shows Trade Name, Ownership, Sector, Industry, Office
3. Verify Profile tab shows acquisition history
4. Verify Contact tab shows contact person with phone numbers
5. Verify Address tab shows HQ and Mailing addresses
6. Verify Workforce tab shows employee counts
7. Verify Officials tab shows the 2 key officials
8. Verify Declaration tab shows signatory info and status
