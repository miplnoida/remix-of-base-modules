
Goal: fully fix the “duplicate key value violates unique constraint `pk_cn_payment_header`” error on `/cashier/payment-data-entry` and verify new payment + receipt generation works reliably through real backend logic.

What I found
- The current fix did improve `payment_id` generation, but it does not address the real failing constraint.
- I checked the actual database schema and found:
  - `cn_payment_header` columns include `payer_id`, `payer_type`, `payment_id`, `batch_number`, etc.
  - The index/constraint named `pk_cn_payment_header` is currently defined on `payer_id`, not on `payment_id`.
  - That means inserting a second payment for the same payer will always fail, even if `payment_id` is generated correctly.
- So the root cause is: `cn_payment_header` is enforcing uniqueness on the wrong column. This is a schema problem first, not just an ID-generation problem.

Implementation plan

1. Fix the database schema on `cn_payment_header`
- Replace the incorrect unique/PK definition on `payer_id`.
- Make `payment_id` the real unique key / primary key for the table.
- Add a normal non-unique index on `payer_id` afterward so payer lookups remain fast.
- Before changing the constraint, verify there are no foreign keys depending on the broken key name and no duplicate `payment_id` values already in data.

2. Harden payment header creation RPC
- Keep header creation fully atomic in the backend.
- Update `create_payment_header_with_next_id` to:
  - acquire a transaction-scoped advisory lock
  - compute `MAX(payment_id) + 1`
  - insert the header in the same function
  - return the inserted `payment_id`
- This protects against concurrent cashier activity and removes race conditions during real receipt generation.

3. Align the payment-data-entry screen to the corrected backend flow
- Keep `/cashier/payment-data-entry` using the RPC only for header creation.
- Confirm there is no fallback path on this screen that inserts directly into `cn_payment_header`.
- Keep detail rows and receipt creation chained only after the header RPC succeeds.

4. Review shared hooks for accidental direct insert usage
- Inspect `usePaymentEntry` and related payment flows for any remaining direct `cn_payment_header.insert(...)` usage that could bypass the safe RPC.
- If shared code is still exposed, route new-header creation through the RPC globally so the fix applies everywhere, not only on this screen.

5. Verify receipt generation end-to-end
- Test a brand new payment entry and receipt generation.
- Test another new payment for the same payer to confirm the old duplicate error is gone.
- Test repeated receipt creation attempts across different payers and batches.
- Verify that after header creation succeeds:
  - detail rows insert into `cn_payment`
  - receipt inserts into `cn_receipt`
  - original print log inserts into `cn_receipt_prints`

Technical details
- Current real issue:
```text
pk_cn_payment_header => UNIQUE INDEX ON (payer_id)
```
- Expected behavior:
```text
payment_id must be the unique key
payer_id must be reusable across many payments
```
- Recommended backend pattern:
```text
pg_advisory_xact_lock(...)
-> select max(payment_id)+1
-> insert cn_payment_header
-> return payment_id
```

Files likely to change
- `supabase/migrations/...`  
  - fix `cn_payment_header` key/index structure
  - harden `create_payment_header_with_next_id`
- `src/pages/cashier/PaymentDataEntry.tsx`
  - confirm screen uses only the safe RPC path
- `src/hooks/usePaymentEntry.ts`
  - remove or refactor any direct header insert path that can recreate the same bug
- `src/integrations/supabase/types.ts`
  - refresh generated types after backend change

Verification checklist
- Confirm `ip_self_employ` and previous UI fixes remain unaffected.
- Generate receipt for a payer with no previous payments.
- Generate another receipt for the same payer.
- Confirm no `pk_cn_payment_header` duplicate error appears.
- Confirm `payment_id` increases to the next highest value each time.
- Confirm receipt row and print-log row are created for each successful generation.

Conclusion
- Yes, I now know what the issue is.
- The persistent error is caused by the database key being defined on `payer_id`, so the current `payment_id` RPC fix could never fully solve it.
- The correct fix is to repair the table constraint/index and then keep the atomic RPC for safe `payment_id` generation.
