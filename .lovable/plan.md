

## Plan: 6 targeted fixes across IP Registration, Meetings, and Online Applications

All changes are surgical (no architecture changes), use existing Supabase patterns (`document-proxy` edge function for signed access), and respect the **No Mock Data** + **No RLS** + **User Identity Tracking** rules.

### 1. Date Married ≥ Date of Birth — UI + DB validation

**Routes:** `/meetings/start/:id` (IP-Registration meeting type) & `/ip-registration/edit/:uniqueUuid`

**UI layer (both forms):**
- `src/pages/ip-registration/IPRegistrationForm.tsx` — extend the existing block at lines 407 / 701 (`marital_status === 'Married' | 'Common Law' && !date_married`) with a chronology check: if `date_married && dob && date_married < dob` → set `errors.date_married = 'Date Married cannot be earlier than Date of Birth'`. Block tab-next and Submit, push toast using the standard destructive-toast pattern from `ui/form-validation`.
- `src/pages/meetings/StartMeetingPage.tsx` — line 1308 `EditableField "Date Married"`: add inline error display + add the same rule to the personal-tab save handler (`handleSaveTab('ip-personal')`) and block save when violated. Show inline red text below the field per `ui/form-validation` standards.
- Apply the rule **only when the field is enabled** (i.e. `maritalStatus ∈ {M, Married, Common Law}`); when marital status changes back to Single the previously-set value is cleared as today.

**DB layer (defence-in-depth):**
- Migration: add a **validation trigger** on `ip_master` (and the staging table used by online applications) — *not* a CHECK constraint per memory rule (CHECK with date funcs cause issues). Trigger raises if `date_married IS NOT NULL AND dob IS NOT NULL AND date_married < dob`. Returns a clear error message that the shielded-error layer surfaces as a friendly toast.
- Same trigger logic added to whichever staging table the meetings flow writes to (likely `ip_application_*` / online application detail tables — confirmed during implementation by inspecting `useApplicationUpdate` / meeting save RPC).

### 2. "Confirm Accept" popup readability

**Root cause** (verified): `src/components/workflow/WorkflowActionButtons.tsx` line 359 applies the *outline-style* class `text-primary border-primary/30 hover:bg-primary/10` to the `<AlertDialogAction>` button inside the confirm dialog. `AlertDialogAction` already has a primary-background default → primary text on primary bg = invisible.

**Fix:**
- Split styling: keep the outline classes for the trigger `<Button>` (line 290), but for the dialog's `<AlertDialogAction>` use a **filled-button** class set per action type:
  - Approve: `bg-primary text-primary-foreground hover:bg-primary/90`
  - Reject: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
  - Send-back / default: leave as default `AlertDialogAction` styling
- Introduce a small `getDialogActionClassName()` helper alongside the existing `getActionClassName()` so trigger-button styling stays unchanged.
- This single fix covers every workflow Accept/Approve confirm popup across the app (IP Registration, Employer Registration, Online Applications, Meetings) — no per-page change required.

### 3. Header avatar pulls from "Photo" document when available

**Route:** `/online-applications/insured-person/:referenceNumber`  
**File:** `src/pages/online-applications/ApplicationDetailPage.tsx` (lines 311-316)

- Compute `headerPhotoUrl` with priority: `application.photoUrl` → first document where `documentType === 'Photo'` (case-insensitive) or `verificationType` matches photo → `undefined` (avatar fallback).
- For document-derived URLs, route through the existing `document-proxy` edge function to obtain a short-lived signed/streamable blob URL (mirrors the pattern in `ApplicationDocumentsTab.fetchDocBlob`). Wrap in `useEffect` + `URL.createObjectURL`, revoke on unmount.
- On any fetch failure → silently fall back to existing `AvatarFallback` initials. No error toasts (header is decorative).
- No DB change.

### 4. View button for PDF documents in Documents tab

**File:** `src/components/online-applications/ApplicationDocumentsTab.tsx` (lines 260-271)

Currently the "View" button only renders when `isImage`. Change:
- Render View for both `image` and `pdf` categories.
- `handleView` already exists and uses `document-proxy` with `action: 'stream'` — extend the early-return check at line 143 to allow `pdf` as well as `image`.
- Pass the resolved `category` ('pdf' | 'image') into `setPreviewDoc` so the existing `DocumentPreviewDialog` (already supports `category === 'pdf'` via `<object>` + `<iframe>` at lines 22-37 of `DocumentPreviewDialog.tsx`) renders it correctly.
- Loading state already wired (`loadingDocId` + `<Loader2/>`).
- No DB change. Secure access preserved (signed/proxied URLs only).

### 5. School Child + Invalid as independent checkboxes (IP edit)

**Investigation finding:** Both dependents UIs already use `<Checkbox>` (verified: `src/pages/ip-registration/tabs/DependentsTab.tsx` lines 557-574 and `src/components/ip-registration/DependentsTab.tsx` lines 259-275; meeting page lines 1735-1751). No radio buttons exist anywhere in the codebase. The user may have observed a styling artifact (the two boxes sit on a single horizontal row and can look like a radio pair).

**Fix to remove ambiguity & guarantee multi-select behaviour:**
- Add subtle visual grouping with an accessible legend so they read as two independent toggles: wrap in `<fieldset className="border rounded-md p-3"><legend className="text-xs px-1 text-muted-foreground">Dependent Status</legend>…</fieldset>` (both files).
- Confirm save logic stores `school_child` and `invalid` as independent `Y`/`N` chars (already true at lines 273-274 and 302-303 of the IP edit Dependents tab and via `useIPRegistration` lines 178-179). Add an explicit no-op assertion in the save path (comment + unit-style guard) ensuring no mutual-exclusion logic is introduced.
- **No schema change** — backward compatible. Existing `school_child VARCHAR(1)` + `invalid VARCHAR(1)` already permit both = 'Y'.

### 6. Same checkbox treatment in Meetings → Dependents

- `src/pages/meetings/StartMeetingPage.tsx` lines 1735-1751: apply the same `<fieldset>` grouping. Underlying state (`isSchoolChild`, `isInvalid` independent booleans, lines 1054, 1740, 1748) is already correct.
- Verify the dependant payload sent on save preserves both flags independently to whichever endpoint the meeting page uses (online-application update path).

### Files to modify (8)

1. `src/pages/ip-registration/IPRegistrationForm.tsx` — date_married chronology rule (2 spots)
2. `src/pages/meetings/StartMeetingPage.tsx` — inline date_married validation + fieldset grouping for dep checkboxes
3. `src/components/workflow/WorkflowActionButtons.tsx` — separate dialog-action class
4. `src/pages/online-applications/ApplicationDetailPage.tsx` — photo fallback from documents
5. `src/components/online-applications/ApplicationDocumentsTab.tsx` — View button for PDFs
6. `src/pages/ip-registration/tabs/DependentsTab.tsx` — fieldset grouping (visual only)
7. `src/components/ip-registration/DependentsTab.tsx` — fieldset grouping (visual only)
8. **DB migration** — `validate_date_married_ge_dob()` trigger on `ip_master` + the online-application detail table.

### Out of scope / unchanged
- No new routes, no permissions, no auth changes.
- Existing photo flow (`photoUrl` direct) stays as primary source — document fallback is additive.
- All other workflow buttons / approve flows untouched (single styling fix benefits everywhere).
- No data migration needed for dependents (school_child / invalid columns already independent).

### Verification (post-implementation)
- `/ip-registration/edit/<uuid>` Personal tab: set DOB = 2000-01-01, Marital = Married, Date Married = 1999-12-01 → inline error + Submit blocked + DB rejects the same payload via direct insert.
- `/meetings/start/<id>` Personal tab: same scenario blocks tab-save with toast.
- `/ip-registration` → Approve → confirm dialog: "Approve" button shows white text on primary background, fully readable; same for Reject (white on red).
- `/online-applications/insured-person/<ref>` with no `photoUrl` but a "Photo" document: header avatar renders the document image; remove the doc → header falls back to initials without console errors.
- Documents tab: PDF row shows View → opens in modal via `<object>` viewer; image rows still work; download unchanged.
- Dependents tab (both routes): tick both School Child + Invalid → save → reload → both still ticked; tick only one → other persists as N.
- Workflow regression sweep: Employer registration approve/reject still works (same component).

### Open question for the team
None — the only ambiguity (radio→checkbox for dependent status) was resolved by inspection; the controls are already checkboxes. If the user actually saw radios elsewhere (different screen), please point me to it and I'll patch that screen too.

