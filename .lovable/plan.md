## Problem

In the meeting Documents tab (`/meetings/start/:id`), the **Document Selection** step has two pieces of state per category:

1. **Verify selection** — the main document type (e.g. Passport `P`, Birth Certificate `B`).
2. **Supportive selection** — required when the main code is in `CODES_REQUIRING_SUPPORTIVE = ['B','V']` (e.g. an ID Card `I` to support a Birth Certificate).

When a reviewer:
- picks a supportive type,
- uploads the supportive file in **Upload Documents**,
- and leaves the page,

the upload itself persists correctly to `meeting_uploaded_documents` (with `is_supportive=true`, `supportive_doc_type=<code>`). On returning, the file shows in the Upload section, but the **supportive dropdown in the Selection step is empty again**, so the form looks invalid and the reviewer is forced to re-pick it.

## Root Cause

In `src/hooks/useDocumentVerification.ts`, the `fetchDocuments` callback derives `platformOverrides` only for **non-supportive** rows (line 217 explicitly filters `!doc.is_supportive`) and uses them to rehydrate `verifySelections`. There is **no equivalent rehydration for `supportiveSelections`** — that state starts empty on every mount and is only ever set by user clicks.

So `verifySelections` survives a page reload (because it is rebuilt from saved docs via `platformOverrides`), but `supportiveSelections` does not.

## Fix

Add a parallel derivation in `fetchDocuments` that rebuilds the supportive selections from persisted rows, and merge it into `supportiveSelections` the same way `platformOverrides` is merged into `verifySelections` — while still letting an in-session user override win.

### Changes

**`src/hooks/useDocumentVerification.ts`**

1. Add a new state slice:
   ```ts
   const [supportivePlatformOverrides, setSupportivePlatformOverrides] = useState<Record<string,string>>({});
   const userSupportiveSelectionsRef = useRef<Record<string,string>>({});
   ```

2. In `fetchDocuments`, after building `overrides`, also build:
   ```ts
   const supOverrides: Record<string,string> = {};
   for (const doc of docs) {
     if (
       doc.is_active &&
       doc.is_supportive &&
       doc.verification_category &&
       (doc.supportive_doc_type || doc.doc_code) &&
       doc.source === 'platform'
     ) {
       supOverrides[doc.verification_category] =
         (doc.supportive_doc_type || doc.doc_code)!;
     }
   }
   setSupportivePlatformOverrides(supOverrides);
   // Clear in-session user selections that match what is now persisted
   for (const [catId, code] of Object.entries(userSupportiveSelectionsRef.current)) {
     if (supOverrides[catId] === code) delete userSupportiveSelectionsRef.current[catId];
   }
   ```

3. Add a hydration effect (mirroring the one at lines 58–73):
   ```ts
   useEffect(() => {
     if (Object.keys(supportivePlatformOverrides).length === 0) return;
     setSupportiveSelections(prev => {
       const next = { ...prev };
       for (const [catId, code] of Object.entries(supportivePlatformOverrides)) {
         // Only fill if the matching verify code still requires a supportive doc
         next[catId] = next[catId] || code;
       }
       for (const [catId, code] of Object.entries(userSupportiveSelectionsRef.current)) {
         next[catId] = code;
       }
       return next;
     });
   }, [supportivePlatformOverrides]);
   ```

4. Update `MeetingDocumentVerificationTab.tsx` (and the IP-registration tab consumer if needed) — its `onSupportiveChange` should also record the user choice:
   ```ts
   onSupportiveChange={(catId, code) => {
     hook.recordSupportiveSelection?.(catId, code); // new helper
     hook.setSupportiveSelections(prev => ({ ...prev, [catId]: code }));
   }}
   ```
   Or expose a `handleSupportiveChange` from the hook that updates both the ref and the state, mirroring `handleVerificationChange`. Preferred — single source of truth.

5. Guard against stale supportive selections: if the main verify code no longer requires a supportive doc (e.g. user changed Birth Certificate to Passport), the existing `handleVerificationChange` already clears `supportiveSelections[cat.id]`. Also clear `userSupportiveSelectionsRef.current[cat.id]` in that branch so the rehydration effect does not put the old code back on the next fetch.

### Out of scope

- No schema changes. `meeting_uploaded_documents.supportive_doc_type` already stores the code we need.
- No change to upload, deletion, or DMS queue flow.
- No change to the resolver RPCs — this is purely a client-side rehydration gap.

## Verification

1. Open a meeting with an IP application that has Birth Status set to `B` (Birth Certificate).
2. In Document Selection, choose `I` (ID Card) as the supportive doc.
3. Switch to Upload Documents and upload the supportive file.
4. Navigate away (e.g. back to the meeting list), then re-open the meeting.
5. Open Documents tab → Document Selection: the supportive dropdown for Birth must show `I` again, and the green/persisted indicator must be present.
6. Repeat the test for Baptism Certificate (`V`) which also requires a supportive doc.
7. Regression: change Birth from `B` to `P` (Passport). Supportive dropdown should clear and stay clear after a refresh (no re-hydration of the orphaned supportive code).
