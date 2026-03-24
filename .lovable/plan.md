

# Fix Plan: C3 Management Issues (4 Items)

## Issue 1: Employer Users — Red Labels (UI Fix)
**File**: `src/pages/c3Management/employers/WizCompanyUsers.tsx`

Lines 222-249: All field labels in the edit view use `className="text-destructive"` which renders them in red. Change to standard label text with a red asterisk span, matching the SE edit page pattern:
```
<Label>First Name <span className="text-destructive">*</span></Label>
```
Apply to: First Name, Last Name, Email, User Name, User Role, Select Company labels.

## Issue 2: Employer Users — Profile Upload Not Working
**File**: `src/pages/c3Management/employers/WizCompanyUsers.tsx`

The edit view (line 213-218) shows a static placeholder with "Change Profile Photo" text but no upload logic. Implement a working profile image upload using the same pattern as `WizSelfEmployedUserEdit.tsx`:
- Add a hidden file input and `useRef`
- Add `uploading` state
- Call `uploadCompanyLogo` (already exists in `wizAdminApiService.ts`) when a file is selected, converting to base64
- Display the uploaded image in the avatar circle
- Need to also fetch current profile image — the `getUserDetails` response doesn't include one, but `uploadCompanyLogo` returns `logo_url`. Store and display from the upload response or from user data if available.

Since the C3-Wizard API has `uploadCompanyLogo` for company logos (not user profile photos), and there's no user-level profile image API for employer users, we'll add a `upload_user_profile_image` service function similar to SE's `uploadSelfEmployedProfileImage`, calling the same wiz-admin-api. If this action doesn't exist on the C3-Wizard side, we'll document it for their team.

**Alternative approach**: Add the upload call using `upload_user_profile_image` action. If the API doesn't support it yet, we'll prepare a message for the C3-Wizard team.

## Issue 3: SE User Edit — Cancel Goes to Wrong Page
**File**: `src/pages/c3Management/selfEmployed/WizSelfEmployedUserEdit.tsx`

Line 166: Cancel navigates to `/c3-management/self-employed-details` but users may come from `/c3-management/users/self-employed` (Manage Users module). Fix by using `navigate(-1)` to go back to wherever the user came from.

## Issue 4: SE Details Edit — Category Type Not Updating
**File**: `src/pages/c3Management/selfEmployed/WizSelfEmployedDetailsEdit.tsx`

**Root cause**: The save payload converts `category_Type` from category code (e.g. `"B"`) to wizard category_id (number) via `wizCategoryMap`. But the C3-Wizard API's `update_self_employed` handler expects `category_Type` as the category code string directly (it writes `wage_category_code: d.category_Type`).

**Fix** (line 184): Change from:
```typescript
category_Type: form.category_Type ? (wizCategoryMap.get(form.category_Type) ?? Number(form.category_Type)) : null,
```
To:
```typescript
category_Type: form.category_Type || null,
```

This sends the category code string (`"B"`, `"S"`, etc.) directly, which is what the API expects.

## Issue 5: Reset Password — Already Fixed by C3-Wizard Team

The C3-Wizard team confirmed they've fixed the `reset_password` handler to now dispatch emails via `send-email`. The SSB-Admin UI code is already correct — `resetPassword(userId)` calls the `reset_password` action. No changes needed on our side. Will verify this works after deployment.

## Message for C3-Wizard Team (if profile upload needs backend support)

If `upload_user_profile_image` action doesn't exist:

> **Request**: Please add an `upload_user_profile_image` action to `wiz-admin-api` that accepts `{ user_id, image_base64, file_name }` and stores the profile image in Supabase Storage under `profile-images/{user_id}/`, returning `{ profileImage: <public_url> }`. This is needed for employer user profile photo uploads from the SSB-Admin portal (route `/c3-management/employer-users/:companyId`). The SE user equivalent (`upload_self_employed_profile_image`) already works — we need the same for employer/company users.

## Files Modified
- `src/pages/c3Management/employers/WizCompanyUsers.tsx` — Fix red labels, add profile upload
- `src/pages/c3Management/selfEmployed/WizSelfEmployedUserEdit.tsx` — Fix cancel navigation
- `src/pages/c3Management/selfEmployed/WizSelfEmployedDetailsEdit.tsx` — Fix category_Type payload
- `src/services/wizAdminApiService.ts` — Add `uploadUserProfileImage` function (if API exists)

