
Goal: make Live publish-safe by reconciling the ER/SE validation RPCs to the latest 2-parameter contract.

What I found
- Test already has the latest signatures:
  - `public_api_er_master_details(p_reg_no text, p_email text)`
  - `public_api_se_master_details(p_ssn text, p_email text)`
- Live is still on older definitions with `DEFAULT NULL` on `p_email`.
- The public API edge function already enforces `/{identifier},{email}` and always calls both params, so the 1-parameter form is not used by the app.
- Generated client types also expect both params as required.

Root cause
- There is schema drift between Test and Live for these two RPCs.
- Recent changes removed `DEFAULT NULL` from `p_email`, but Live still has the older defaulted definitions.
- PostgreSQL is strict about function signature/default changes; the safest way to converge Live is a clean drop + recreate using the latest function bodies.
- Because these functions evolved across older 1-param and later defaulted 2-param versions, a defensive migration should remove both callable forms before recreating the final 2-param version.

Implementation plan
1. Create one new forward-only migration after the existing RPC migrations.
2. In that migration, for both ER and SE functions:
   - drop `(...TEXT)`
   - drop `(...TEXT, TEXT)`
   - recreate only the latest 2-parameter version without defaults
3. Use the latest function bodies already present in the repo, including:
   - ER: `mobile` from `er_master.mobile`, `fax`, `country`
   - SE: `mobile` from `ip_master.phone_mobile`, `country`, `selfRefNo`, `city`, `wageCategory`
4. Do not change the edge function or frontend:
   - the edge function already requires email
   - current code already matches the 2-parameter contract
5. Publish after the migration is added so Live gets the same RPC definitions as Test.

Why this is the safest publish fix
- It avoids editing historical migrations that may already differ across environments.
- It aligns Live to the actual current contract used by code.
- It removes ambiguity from older callable forms and prevents the default-parameter conflict from blocking publish again.

Technical details
```text
New migration actions:

DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);

DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_api_er_master_details(
  p_reg_no TEXT,
  p_email TEXT
) ...

CREATE OR REPLACE FUNCTION public.public_api_se_master_details(
  p_ssn TEXT,
  p_email TEXT
) ...
```

Expected outcome
- Live and Test will both use the same latest 2-parameter RPC signatures.
- Publish should no longer fail because of these ER/SE function definitions.
- C3-Wizard-facing responses will remain on the latest field mapping already prepared in the current repo.
