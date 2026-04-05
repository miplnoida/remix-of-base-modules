

## Plan: Editable Employer Application Details in Meeting Workflow

### Problem

The current `EmployerEditForm` in `StartMeetingPage.tsx` (lines 1568-1643) is a minimal placeholder with only 4 tabs, ~12 generic fields (`businessName`, `tradeName`, `taxId`, etc.) that do **not** map to the actual `EmployerApplicationDetail` data structure returned by the external API. Meanwhile, the read-only view at `/online-applications/employer/:id` (`EmployerApplicationDetailPage.tsx`) has 8 fully-populated tabs with ~60+ fields, code-resolved lookups, owners, locations, documents, and notes.

There is also no employer conversion RPC — unlike IP Registration which has `convert_application_to_ip`, there is no equivalent `convert_application_to_employer` function.

### What will be built

1. **Full editable employer form** matching all 8 tabs from `EmployerApplicationDetailPage`
2. **Employer conversion RPC** to atomically create an `er_master` + `er_owner` + `er_locations` + `er_notes` record on approval
3. **Client-side conversion hook** following the same pattern as `useConvertToIPRegistration`
4. **Approval flow integration** in `StartMeetingPage` for `Employer-Registration` meetings

---

### Step 1: Create `EmployerApplicationEditForm` component

New file: `src/components/meetings/EmployerApplicationEditForm.tsx`

This will be a comprehensive editable form component with the same 8 tabs as `EmployerApplicationDetailPage`:
- **Employer Profile** — Previous Owner fields, Acquisition/Incorporated dates, Ownership/Sector selects (using `useERLookups`), Parent Reg No, Office/Industry selects
- **Basic Details** — Employer Name, Trade Name, Business Email, HQ Address (1/2/country), Mailing Address (1/2), Dates (application, wages first paid), Male/Female employee counts
- **Contact & Reach** — Contact telephone/fax (with dial codes), Contact Name, Mobile, Email, Country, Village select, Activity Type select, Inspector select
- **Tech & Finance** — Computer Payroll (Y/N toggle), Make/Model
- **Owners** — Editable table with Add/Edit/Delete for owners (name, title, phone, email, SSN)
- **Locations** — Editable table with Add/Edit/Delete for locations (trade name, address, activity type)
- **Documents** — Read-only document list with View/Download (same as detail page)
- **Notes** — Read-only display of remarks/notes

All code dropdowns (ownership, sector, office, industry, village, activity, inspector) will use `useERLookups` with `SearchableSelect` pattern for consistency.

The component receives `data` and `onChange` props matching the existing `ApplicationEditForm` interface.

---

### Step 2: Create `convert_application_to_employer` Supabase RPC

New migration creating a PL/pgSQL function that:

1. Generates a temp `regno` via `generate_temp_er_regno()`
2. Inserts into `er_master` mapping all fields from the online application:
   - `name` ← employer_name
   - `trade_name` ← trade_name
   - `hq_addr1/2` ← hq_address1/2
   - `maddr1/2` ← mailing_address1/2
   - `phone` ← contact_telephone
   - `fax` ← contact_fax
   - `email` ← email/business_email
   - `mobile` ← mobile
   - `ownership_code`, `sector_code`, `office_code`, `industrial_code`, `village_code`, `activity_type`, `inspector_code` ← direct code mappings
   - `males_employed/females_employed` ← male_count/female_count
   - `date_wages_first_paid`, `application_date`, `date_incorporated`, `date_of_acquisition`
   - `previous_owner`, `prev_owner_addr1/2`
   - `computer_payroll`, `make_model`
   - `acquired_code` ← is_acquired (Y/N)
   - `status` = 'P' (Pending)
   - `entered_by` ← user_code
   - `date_of_entry` ← now()
3. Inserts owners into `er_owner` from the owners JSON array
4. Inserts locations into `er_locations` from the locations JSON array
5. Inserts notes into `er_notes` from the remarks JSON array
6. Returns `{ success, regno, message }`
7. Wraps everything in a transaction — rolls back entirely on failure
8. Checks for duplicate `application_reference` to prevent double conversion

---

### Step 3: Create `useConvertToEmployerRegistration` hook

New file: `src/hooks/useConvertToEmployerRegistration.ts`

Following the IP conversion pattern:
- Client-side preflight validation (employer_name required, at least one of phone/email required)
- Field length truncation/sanitization matching `er_master` column constraints
- Calls the `convert_application_to_employer` RPC
- Returns `{ success, regno, message }` result
- Includes `validateEmployerApplicationForConversion()` export for blocking approval on errors

---

### Step 4: Wire up approval flow in `StartMeetingPage`

Modify `StartMeetingPage.tsx`:

**a)** Replace the current `EmployerEditForm` reference (line 721) with the new `EmployerApplicationEditForm`

**b)** Extend `handleApprove()` to handle `Employer-Registration` meetings:
```text
if (meetingType === 'Employer-Registration' && applicationData) {
  → merge editedData
  → call convertToEmployer(...)
  → if failed, return (block approval)
  → toast success with regno
  → close meeting as approved
  → navigate to /meetings/manage
}
```

**c)** Add employer-specific validation blocking on the Accept button (same pattern as IP validation)

**d)** Update the confirmation dialog text for employer meetings

---

### Step 5: Audit trail integration

The `convert_application_to_employer` RPC will:
- Record `entered_by` with the user_code performing approval
- The existing database audit trigger (`fn_audit_row_change`) on `er_master` will automatically capture the before/after for all inserts

For field-level edit tracking during the meeting:
- Edits are tracked in-memory via the existing `editedData` / `hasChanges` state
- On approval, the edited data (not original) is used for conversion, preserving original data in the external API
- The meeting closure (`useCloseMeetingWithApproval`) already stores `applicationData` changes in the meeting record metadata

---

### Files to create/modify

| File | Action |
|------|--------|
| `src/components/meetings/EmployerApplicationEditForm.tsx` | **Create** — Full 8-tab editable form |
| `src/hooks/useConvertToEmployerRegistration.ts` | **Create** — Conversion hook + validation |
| `supabase/migrations/...` | **Create** — `convert_application_to_employer` RPC |
| `src/pages/meetings/StartMeetingPage.tsx` | **Modify** — Wire new form + employer approval flow |

### No impact on existing workflows

- The `InsuredPersonEditForm` and `DoctorEditForm` remain untouched
- The `ApplicationEditForm` router (line 716-733) branches by `meetingType`, so only `Employer-Registration` meetings are affected
- The `handleApprove` function already branches by `meetingType` — the new employer block is added alongside the existing IP block

