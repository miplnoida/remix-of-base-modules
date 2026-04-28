## Problem

On `/meetings/start/:id` → **Documents** tab, the **Attached Documents** card (rendered by `ApplicationDocumentsTab` near the bottom of the tab) only lists 3 documents even though more files have been uploaded in the **Upload Documents** section above.

### Root cause

`StartMeetingPage.tsx` (lines ~1830–1852) renders the bottom `ApplicationDocumentsTab` from **only the external API docs** (`data.documents`), and then **filters out any external doc whose `verificationType` belongs to a category that already has a platform-uploaded doc** (`replacedDocCategories`):

```ts
const filteredDocs = data.documents.filter((doc) => {
  const category = VERIFY_TYPE_TO_CATEGORY[doc.verificationType];
  if (!category) return true;
  return !replacedDocCategories?.has(category);   // ⬅ hides the externals
});
```

The platform uploads from `meeting_uploaded_documents` are **never added back** to that list. For meeting `a76e0ba2-…`, the user uploaded 1 birth, 1 birth-supportive, and 1 marital, which marks `birth` and `marital` as replaced, removing all external docs in those categories. The 3 rows still showing are simply the remaining unrelated externals (and possibly the photo).

The Upload Documents section above works correctly because `useDocumentVerification` merges externals + platform docs via `mergeDocuments`. The Attached Documents card was never given that merged list.

## Fix

Make the bottom **Attached Documents** card show the complete, valid set of documents = (externals not replaced) + (active platform uploads).

### Changes

1. **`src/pages/meetings/StartMeetingPage.tsx`** (Documents tab, ~lines 1829–1852)
   - Fetch active platform docs for this meeting (`meeting_uploaded_documents` where `meeting_id`, `application_reference`, `is_active = true`) via a small `useQuery` hook (or reuse one if already exposed).
   - Map those rows to the `ExternalDocument` shape expected by `ApplicationDocumentsTab` (id, fileName, documentType, mimeType, signedUrl/url from `storage_url`, fileSize, uploadedAt, verificationType derived from `verification_category` via `CATEGORY_TO_VERIFY_TYPE`).
   - Merge: `[...filteredExternals, ...mappedPlatformDocs]` and pass to `ApplicationDocumentsTab`.
   - Keep the existing `replacedDocCategories` filter on externals so we don't show stale externals that were superseded.
   - Render the card whenever the merged list is non-empty (drop the `data.documents.length > 0` short-circuit so platform-only uploads still surface here).

2. **`src/components/online-applications/ApplicationDocumentsTab.tsx`** — no behavioral change required. The merged list will flow through the existing table; the count badge will reflect the true total.

3. **Optional polish**: tag platform-uploaded rows with a small "Uploaded in meeting" badge (reuse the existing `Source` styling pattern from `DocumentUploadStep`) so reviewers can distinguish them from external API docs. Low-risk and purely visual.

### Out of scope

- No schema or RPC changes.
- No change to the Upload Documents section logic or `useDocumentVerification`.
- No change to the read-only `ApplicationDocumentsTab` rendered when there is no `meetingId` (used outside meetings).

### Verification

For meeting `a76e0ba2-…` (3 platform uploads: birth, birth-supportive, marital):
- Attached Documents count badge increases from 3 to 3 externals (non-replaced) + 3 platform = total visible matches what was uploaded.
- Deleting a platform doc from the upload section refetches and the row disappears from Attached Documents.
- Replacing an external (uploading a new birth doc) keeps the new platform doc visible and hides the old external — current behavior preserved.
