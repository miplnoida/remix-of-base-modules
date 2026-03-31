
Goal

Unblock publish by fixing the real first failing database migration in the ER/SE RPC chain.

What I re-checked

- The publish error is still the same PostgreSQL default-parameter conflict:
  `cannot remove parameter defaults from existing function`
- I traced every migration that touches these two RPCs:
  - `20260330094856` creates the original 1-parameter functions
  - `20260330105738` recreates them with `p_email TEXT DEFAULT NULL`
  - `20260330122507` keeps `DEFAULT NULL`
  - `20260330153501` drops both forms and recreates with `DEFAULT NULL`
  - `20260331061827` drops both forms and recreates with `DEFAULT NULL`
  - `20260331110159` recreates strict 2-parameter versions, but only drops `(TEXT, TEXT)`
  - `20260331135011` and `20260331142631` already defensively drop both callable forms before recreating
- The current repo still shows `20260331110159` in the unsafe state, so that migration is still the first blocker.
- I did not find another ER/SE RPC migration after that which would block publish before this one is fixed.

Root cause

`20260331110159_a034a2be-5015-4c23-a9c5-9762e0b6792f.sql` still tries to switch from the older defaulted signature to the strict 2-parameter signature without fully clearing the prior callable form first.

Even though later migrations already contain the defensive drop logic, Live never reaches them because publish stops at `20260331110159`.

Required fix

Edit this file:

`supabase/migrations/20260331110159_a034a2be-5015-4c23-a9c5-9762e0b6792f.sql`

Change the top of the file from:

```sql
-- Drop existing functions to allow recreation with updated return fields
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
```

to:

```sql
-- Drop existing functions (all callable forms) to allow recreation with updated return fields
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
```

What not to change

- Do not change the function bodies in `20260331110159`
- Do not change the later fix migrations `20260331135011` or `20260331142631`
- Do not change the edge function or frontend contract; they already expect identifier + email

Why this is the correct publish fix

- This is the earliest migration in the chain that attempts to remove the defaulted parameter behavior
- Fixing later migrations is not enough, because publish never reaches them
- The later migrations are already consistent with the final desired state
- I did not find any other ER/SE signature conflict in the repo that would block publish before this one

Expected outcome

After updating `20260331110159` as above:

- publish should get past the current `cannot remove parameter defaults` failure
- Live can continue through the later repair migrations
- both RPCs should converge to the latest strict 2-parameter contract already used by the app

Technical details

```text
First real blocker:
  20260331110159_a034a2be-5015-4c23-a9c5-9762e0b6792f.sql

Required SQL at top:
  DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
  DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
  DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);
  DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);

No additional ER/SE publish blockers found in later migrations.
```
