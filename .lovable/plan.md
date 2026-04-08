

# Fix: "Is Submitted" Column Always Shows "Yes"

## Root Cause

All three contribution list components (Self Employed, NW Director, C3 Contribution) have the same bug: the `is_submitted` column text is **hardcoded to "Yes"**. The ternary only controls the badge color (green vs gray) but never changes the label to "No".

This is why the screenshot shows "Yes" in gray — the styling correctly reflects `is_submitted: false` (gray badge), but the text still says "Yes".

## Fix

In all three files, change the hardcoded "Yes" to `{c.is_submitted ? 'Yes' : 'No'}`:

| File | Line(s) |
|------|---------|
| `SelfEmployedContributionList.tsx` | 241 |
| `NwDirectorList.tsx` | 239 |
| `C3ContributionList.tsx` | 283 |

**Before:**
```tsx
<span className={`... ${c.is_submitted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
  Yes
</span>
```

**After:**
```tsx
<span className={`... ${c.is_submitted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
  {c.is_submitted ? 'Yes' : 'No'}
</span>
```

No other changes needed. Three lines fixed across three files.

