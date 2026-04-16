
# Plan: Reference Numbering Schemes – Manager Approval Document

## What I Found

### Screen Implementation (NumberTemplates.tsx)
- List view of all schemes with badges (applies_to, reset frequency, default)
- Add/Edit dialog with fields: Name, Description, Applies To, Reset Frequency, Prefix, Padding Length, Pattern, Is Default, Is Active
- Live preview of pattern with current date/sequence
- Duplicate name checking on save
- Soft-deactivate with confirmation dialog
- Toggle active/inactive via switch
- Audit fields (created_by, updated_by) injected automatically

### Database Schema
- `ce_number_templates`: 14 columns (id, name, template_pattern, description, applies_to, is_default, padding_length, prefix, reset_frequency, is_active, audit fields)
- `ce_number_sequences`: Tracks current_value per template_id+year+month (unique constraint)
- 6 seed schemes exist: Violation (VIO), Case (CASE), Inspection (INS), Notice (NOT), Legal (LGL), Waiver (WVR)
- 2 sequence rows exist for Violation template (year 2025: value 10, year 2026: value 7)

### Applies To Options
UI offers 7 types: Violation, Case, Inspection, Notice, Referral, Waiver, PaymentPlan
But seed data uses lowercase values: "violation", "case", "inspection", "notice", "legal", "waiver" (case mismatch with UI values like "Violation" vs "violation")

### Pattern Tokens
{YYYY}, {MM}, {NNNNN}, {NNNN}, {NNN}, {TERRITORY}

## Deliverable
A DOCX document with Misha Infotech branding on the cover page, containing all 10 sections as specified by the user, based entirely on the actual implementation analyzed above.

## Steps
1. Copy the Misha Infotech logo to /tmp
2. Generate the DOCX using docx-js with cover page (logo + company name), all sections
3. QA by converting to images
4. Deliver as artifact

## Technical Details
- Use `npm install -g docx` (already available) 
- Logo at `src/assets/misha-infotech-logo.png`
- Output to `/mnt/documents/Reference_Numbering_Schemes_Manager_Approval.docx`
