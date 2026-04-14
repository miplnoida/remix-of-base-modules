
Root cause confirmed:

- The current Live publish failure is no longer the earlier `ce_reconcile_result` issue.
- The new blocker is that Live is missing these planning objects:
  - `public.ce_v_plan_employer_facts`
  - `public.ce_v_plan_candidates_v2`
  - `public.fn_ce_score_candidates_batch`
- Test already has all 3 objects.
- Live already has all base tables those objects depend on:
  - `ce_risk_profiles`
  - `ce_inspections`
  - `ce_violations`
  - `ce_follow_up_actions`
  - `ce_notices`
  - `ce_payment_arrangements`
  - `ce_scouting_leads`
  - `ce_weekly_plan_items`
  - `ce_weekly_plans`
- So this is a dependency-ordering problem during publish-to-Live, not a missing-source-table problem.

Implementation plan:

1. Immediate Live unblock
- Run the exact SQL from `supabase/migrations/20260414043550_0a43d10b-63d8-492b-97d8-60b64de51b2e.sql` on Live, in this order:
  1. `CREATE OR REPLACE VIEW public.ce_v_plan_employer_facts`
  2. `CREATE OR REPLACE VIEW public.ce_v_plan_candidates_v2`
  3. `CREATE OR REPLACE FUNCTION public.fn_ce_score_candidates_batch`
- This will align Live with Test and remove the missing `ce_v_plan_employer_facts` relation error.

2. Durable repo fix
- Add one new repair migration instead of editing old applied migrations.
- The new migration will re-declare the same 3 objects in dependency-safe order:
  - base view first
  - dependent view second
  - dependent function last
- This makes the schema self-healing for future environment alignment.

3. Validation
- Verify both Test and Live contain:
  - `ce_v_plan_employer_facts`
  - `ce_v_plan_candidates_v2`
  - `fn_ce_score_candidates_batch`
- Re-publish after Live alignment.
- If publish still fails, inspect the next missing object in the same way.

Files involved:
- Existing source of truth:
  - `supabase/migrations/20260414043550_0a43d10b-63d8-492b-97d8-60b64de51b2e.sql`
- New migration to add:
  - `supabase/migrations/<new_timestamp>_repair_ce_planning_views.sql`

What stays unchanged:
- Frontend code
- Existing employer/compliance data
- Earlier financial bootstrap migration

Technical note:
- Publish applies schema changes to Live via a generated diff, and that diff can create dependent objects in the wrong order even when the original migration file was written correctly.
- Views/functions with cross-object dependencies are especially prone to this, which is why Live now needs an explicit alignment step.
