

# Fix: App-Assets Upload Without RLS Policies

## Problem
Uploading logos to the `app-assets` storage bucket fails with "new row violates row-level security policy" because `storage.objects` (a Supabase-managed table) has RLS enabled by default and no policies exist for this bucket.

## Approach
Since we cannot create RLS policies per project rules, we will create a **backend function** (`upload-app-asset`) that uses the **service role key** to bypass storage RLS entirely. The frontend components will call this function instead of uploading directly via the Supabase client.

## Changes

### 1. New Backend Function: `upload-app-asset`
**`supabase/functions/upload-app-asset/index.ts`**

- Accepts multipart form data (file + `folder` param like `logos`)
- Authenticates the caller via JWT (ensures logged-in user)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to create a service-role client
- Uploads to `app-assets` bucket using the service client (bypasses storage RLS)
- Returns the public URL of the uploaded file
- Validates file type (PNG, JPG, SVG, WebP) and size (max 2MB)

### 2. Update `AppLogoUploadSection.tsx`
Replace direct `supabase.storage.upload()` call with:
```typescript
const { data } = await supabase.functions.invoke('upload-app-asset', {
  body: formData,
});
const publicUrl = data.publicUrl;
```

### 3. Update `ReceiptInvoiceLogoUpload.tsx`
Same change — replace direct storage upload with the edge function call.

### Files
| Action | File |
|--------|------|
| Create | `supabase/functions/upload-app-asset/index.ts` |
| Modify | `src/components/admin/AppLogoUploadSection.tsx` |
| Modify | `src/components/payments/ReceiptInvoiceLogoUpload.tsx` |

No migrations. No RLS policies. No storage schema changes.

