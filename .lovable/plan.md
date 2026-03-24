

# Fix: React Error #31 — Remarks Object Rendered as React Child

## Root Cause

On `/online-applications/employer/:id`, the API returns `remarks` as an **array of objects** (each with `{id, application_id, seq_no, note_date, note, created_at, updated_at, created_by, updated_by, is_deleted}`), but the code treats it as a plain string. This causes React error #31 ("Objects are not valid as a React child") when the Notes tab renders `{application.remarks}` directly inside a `<p>` tag.

## Changes

### 1. `src/hooks/useEmployerApplicationDetail.ts` — Fix type + normalization

**Type change** (line ~180): Change `remarks` from `string | null` to an array type:
```typescript
remarks: Array<{ id: number; seq_no: number; note_date: string; note: string; created_by: string | null; created_at: string }> | null;
```

**Normalization** (line ~396): Instead of casting to string, keep the array:
```typescript
remarks: Array.isArray(raw.remarks) ? raw.remarks : (Array.isArray(raw.notes) ? raw.notes : null),
```

### 2. `src/pages/online-applications/EmployerApplicationDetailPage.tsx` — Render remarks array

Replace lines 684–692 (the remarks rendering block) to iterate over the array instead of rendering a single string:

```tsx
{application.remarks && application.remarks.length > 0 ? (
  <div className="space-y-3">
    {application.remarks.map((remark, idx) => (
      <div key={remark.id || idx} className="rounded-lg bg-muted/50 border p-4 space-y-1">
        <p className="text-sm whitespace-pre-wrap">{remark.note}</p>
        <p className="text-xs text-muted-foreground">
          {remark.note_date ? new Date(remark.note_date).toLocaleDateString() : ''}
        </p>
      </div>
    ))}
  </div>
) : (
  <div className="text-center py-8 text-muted-foreground">
    <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
    <p className="text-sm">No notes added</p>
  </div>
)}
```

### Files Modified
| File | Change |
|------|--------|
| `src/hooks/useEmployerApplicationDetail.ts` | Update `remarks` type to array, fix normalization |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Render remarks as list of note objects |

