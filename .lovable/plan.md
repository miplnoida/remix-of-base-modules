## Publish failure repair plan

### What I found
- The hosted Live backend is healthy.
- Recent backend logs do not show the earlier `pgmq.q_auth_emails` error anymore.
- The real current mismatch is the migration ledger:
  - Test has **500** migration records.
  - Live has **1,042** migration records.
  - Live has **693 placeholder records**, including old local migrations from Jan/Feb/early Mar that are not present in Test.
- Publish likely still fails because the deployment pipeline validates Test → Live migration history, and Live now contains many extra migration versions that Test does not contain.

### Fix
1. Generate a Live-only cleanup SQL script that removes only the placeholder rows from `supabase_migrations.schema_migrations` where that version does **not** exist in Test.
2. Keep all real Live migration records and the valid placeholders needed for Test parity.
3. Include verification queries in the script:
   - Live total migration count before/after
   - Extra Live placeholder count before/after
   - Max Live version remains `20260513163056`
   - Email queue tables and cron job remain intact
4. Have you run the script in **Cloud View → Run SQL → Live selected**.
5. Re-query Live after execution and confirm:
   - Live and Test migration histories match.
   - The previous email queue repair is still present.
6. Then retry **Publish → Update**.

### Technical details
- This will only modify Lovable Cloud migration bookkeeping rows, not business tables or user data.
- The cleanup must target only rows named `placeholder_synced_via_schema_script` and only versions not present in Test, so it does not delete real applied migration records.
- No app code changes are needed unless a new publish error appears after the ledger alignment is fixed.