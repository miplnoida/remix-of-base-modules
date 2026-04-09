

# BIMA Badge Replacement & Payment Resync Implementation

## Summary

Two changes across all three C3 Details screens (C3 Contribution, NW Director, Self-Employed):

1. **Replace BIMA badge** with a subtle Info icon + tooltip ("Data sourced from SSB Admin")
2. **Add Resync button** for records where payment succeeded but sync to BIMA failed

---

## Impacted Files

| File | Change |
|---|---|
| `src/components/c3/BIMASourceIndicator.tsx` | **New** — reusable Info icon + tooltip component |
| `src/services/wizC3DetailsService.ts` | Add `has_sync_error` and `sync_error_message` to all 3 record interfaces; add `resyncPayment()` function |
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Replace BIMA badge with new payment cell logic |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Same replacement |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Same replacement |

---

## Change 1: BIMASourceIndicator Component

Create `src/components/c3/BIMASourceIndicator.tsx` — a 14px `Info` icon (lucide-react) in `text-muted-foreground` wrapped in a Tooltip reading "Data sourced from SSB Admin". Includes `aria-label` and `tabIndex={0}` for accessibility.

---

## Change 2: Payment Cell Logic

In all 3 list components, replace the current BIMA badge rendering with a priority-based decision:

```text
if (has_sync_error)       → Show orange "Resync" button (RefreshCw icon)
else if (is_imported_from_bema) → Show Payment button + BIMASourceIndicator
else                      → Show Payment button (existing logic)
```

`has_sync_error` takes precedence over `is_imported_from_bema`.

---

## Change 3: Resync API Integration

Add to `wizC3DetailsService.ts`:

```typescript
export async function resyncPayment(paymentId: number) {
  const res = await fetch(WIZ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': WIZ_ADMIN_API_KEY,
    },
    body: JSON.stringify({ action: 'resync_payment', payment_id: paymentId }),
  });
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.error);
  return data;
}
```

---

## Change 4: Resync Click Flow

Each list component gets a `handleResync` function:

1. User clicks Resync → confirmation dialog appears ("Retry syncing payment #X to SSB Admin?")
2. On confirm → call `resyncPayment(record.payment_id)`
3. On success → success toast + refresh list data
4. On failure → error toast with `sync_error_message` details

---

## Type Updates

Add to all 3 interfaces (`ContributionRecord`, `NwdContributionRecord`, `SeContributionRecord`):

```typescript
has_sync_error?: boolean;
sync_error_message?: string | null;
```

---

## Assumptions

- The C3-Wizard API already returns `has_sync_error` and `sync_error_message` in list responses — no backend changes needed
- The `resync_payment` action is already deployed on the wizard side
- Existing payment flow (Partial, $ Pay, Paid badges) remains unchanged
- The resync confirmation dialog uses the existing `Dialog` component pattern already in these files

