

# Employer Registration User Manual — Generation Plan

## What Will Be Produced

Two documents delivered to `/mnt/documents/`:
- `Employer_Registration_User_Manual.docx` (DOCX format)
- `Employer_Registration_User_Manual.pdf` (PDF converted from DOCX)

A comprehensive ~30-35 page user manual covering the end-to-end employer registration workflow.

## Document Structure

1. **Cover Page** — Title, version, date, document reference, SSB branding
2. **Table of Contents** — Auto-generated heading references
3. **Introduction & Purpose** — What the employer registration process is, who uses it, and why
4. **Process Overview / Workflow Diagram** — ASCII flow diagram showing: Online Application → Application Review → Schedule Meeting → Meeting Workbench → Accept/Reject → Employer Registration (Pending) → Approval Workflow → Registration Number Generated
5. **Screen 1: Online Employer Applications (`/online-applications/employer`)** — Filters (Status, Email, Search, Date Range, Sort), application table columns, View action, status indicators (Connected/Disconnected badge), pagination, refresh
6. **Screen 2: Application Detail & Review** — Summary card, 8 tabs (Employer Profile, Basic Details, Contact & Reach, Addresses, Ownership, Employment, Documents, Declaration), workflow action buttons (Accept, Reject, Schedule Meeting), meeting status badge
7. **Screen 3: Manage Meetings (`/meetings`)** — Stat cards, Active/Closed tabs, meeting groups by application reference, status filters (Scheduled, InProgress, Closed), date range filters, meeting detail view dialog, actions (Resume, View, Reschedule, Cancel)
8. **Screen 4: Meeting Workbench (`/meetings/start/:id`)** — Application data review, document verification tab, employer application edit form, approval/rejection flow with conversion to employer registration
9. **Screen 5: Employer Registration List (`/employer-registration`)** — 3 tabs (Pending Verification, Registered, Ceased/Suspended), filters, status badges (Draft Z, Pending P, Active A, Verified V), actions (View, Edit, Submit, Delete), workflow action buttons, export (Excel/PDF)
10. **Screen 6: Employer Registration Form (View/Edit)** — 8 tabs (Form Detail, Owners, Locations, Documents, Notes, Commence, Visits, Suits), Edit button in view mode, sub-steps in Form Detail (Entity Overview, Contact & Reach, Background Info, Tech & Finance), owner/location CRUD operations with validation
11. **Registration Number Generation** — How a temporary "T" number is assigned during conversion, how the final 6-digit permanent number is generated upon approval, where it is displayed, toast notifications
12. **Common Scenarios & Edge Cases** — Rejecting an application, rescheduling meetings multiple times, cancelling meetings, re-approving after rejection, duplicate applications
13. **Troubleshooting** — API disconnected, failed to load applications, meeting not appearing, workflow buttons not showing, registration number not generated
14. **Glossary** — Key terms (Registration Number, Workflow Instance, SLA, Meeting Workbench, Pending Verification, etc.)

## Technical Approach

- Generate DOCX using Node.js `docx` library with professional formatting
- US Letter format, consistent headers/footers with page numbers
- Tables for field descriptions, status codes, and action matrices
- Convert to PDF via LibreOffice for the second deliverable
- QA via image inspection of all pages

## Implementation Steps

1. Take screenshots of key screens using browser tools for inclusion
2. Write generation script to `/tmp/gen_er_manual.js`
3. Execute to produce DOCX at `/mnt/documents/Employer_Registration_User_Manual.docx`
4. Convert to PDF at `/mnt/documents/Employer_Registration_User_Manual.pdf`
5. QA both documents via image inspection
6. Deliver both artifacts

## Note on Screenshots

Since the document requests annotated screenshots, I will capture actual UI screenshots from the live preview and embed them in the document. Each screenshot will be accompanied by detailed textual descriptions and field-by-field tables to ensure clarity even without annotations.

