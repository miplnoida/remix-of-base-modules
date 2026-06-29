## Problem

On `/compliance/violations/:id`, the **Employer 360** button navigates to `/compliance/employer-360/${employer_id}`. That path is a legacy redirect (`AppRoutes.tsx:1475`) that sends the user to `/compliance/field/employer-statements` instead of the actual Employer 360 page, so no employer details ever render.

The real route is `/compliance/field/employer-360/:employerId` (`AppRoutes.tsx:1311` and `Routes.tsx:298`), and `ce_violations.employer_id` already stores the employer **regno** (verified: e.g. `663943`, `659685`), which is exactly what `Employer360.tsx` expects.

## Fix

Single-line change in `src/pages/compliance/violations/ViolationDetails.tsx` (line 410):

```diff
- onClick={() => navigate(`/compliance/employer-360/${v.employer_id}`)}
+ onClick={() => navigate(`/compliance/field/employer-360/${v.employer_id}`)}
```

No other call sites use the broken path. No schema or data changes required.

## Verification

- Open `/compliance/violations/6fba13a2-8fef-4abe-a1e6-aaaa48d5f98c` → click **Employer 360** → confirm it lands on `/compliance/field/employer-360/663943` (or matching regno) and renders the full Employer 360 view.
