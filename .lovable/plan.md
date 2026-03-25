
1. Confirmed root cause
- The page error is not from the API sync itself. It is caused by two live database functions with the same name and same overall argument types:
```text
get_c3_records_filtered(text,text,text,text,text,integer,integer,text,text,integer,boolean,integer,integer)
get_c3_records_filtered(text,text,text,text,text,integer,integer,text,text,integer,integer,integer,boolean)
```
- They differ only by parameter order near the end:
```text
original: p_schedule_no, p_exclude_deleted, p_page, p_page_size
duplicate: p_schedule_no, p_page, p_page_size, p_exclude_deleted
```
- Because the app calls the RPC with named arguments, the backend cannot choose between them, which is why the Manage page still fails.

2. What the data visibility should be
- In the current “as before” behavior, `/c3-management/manage` shows only `DFT` and `PEN` by default.
- The API sync flow marks synced/submitted records as `VAC` (`verified_by = 'API'` in the backend logic).
- So: yes, that data belongs to the same C3 domain, but no, it is not expected to appear in the default Manage list after reverting to the old behavior. It should only appear when filtering for Verified/Approved (or in other pages that load that record directly).

3. Revert plan
- Revert only the changes introduced for the “show API-synced data by default” attempt.
- Keep the original intended behavior:
  - default Manage page filter = `DFT` + `PEN`
  - only one canonical `get_c3_records_filtered` function
  - original parameter order preserved

4. Implementation steps
- Create one cleanup migration that:
  - drops both conflicting `get_c3_records_filtered` signatures explicitly
  - recreates only the original canonical signature:
```text
(p_payer_type, p_payer_id, p_status, p_entered_by, p_verified_by,
 p_period_month, p_period_year, p_date_received, p_date_entered,
 p_schedule_no, p_exclude_deleted, p_page, p_page_size)
```
  - restores the default status condition to:
```sql
(p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
```
- Do not change the frontend RPC call, since it already matches the original canonical argument naming.

5. Validation after fix
- Verify `/c3-management/manage` loads without the candidate-function error.
- Verify default results exclude `VAC` records.
- Verify selecting a Verified/Approved status filter returns the API-synced record.
- Verify no other C3 search filters break (payer, period, date, schedule no, entered by, verified by, pagination).

6. Expected outcome
- The runtime error disappears.
- The Manage page returns to its pre-change behavior.
- The API-synced record remains in the database but is not shown by default because it is `VAC`, which matches your requested revert.
