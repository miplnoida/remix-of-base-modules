

## Diagnosis

The Wizard's `c3_site_settings` table has at least one column defined as `varchar(4)`. Our payload sends `environment = "Production"` (10 chars) which overflows. All 10 rows fail in the same batch (likely due to transactional rollback on their side, which is why even the `Dev` rows show the same error).

**Confirmed sent values:**
- `environment`: `"Dev"` (3) and `"Production"` (10)  ← **Production overflows varchar(4)**
- `setting_type`: `URL` / `INBOUND_AUTH` / `OUTBOUND_AUTH` (also potentially > 4 but unrelated to error message — error wording matches `environment`)

## Fix (our side, minimal, zero impact)

**Rename `Production` → `Prod` everywhere** so it fits in `varchar(4)` and matches the `Dev`/`Prod` convention. No code change needed in resolvers because they match strings exactly.

### Step 1 — Data migration (UPDATE via insert tool)
```sql
UPDATE c3_site_settings
SET environment = 'Prod', is_synced = false, sync_error = null
WHERE environment = 'Production';
```

### Step 2 — Verify resolver compatibility
- `src/lib/wizApiConfig.ts` reads `ACTIVE_ENVIRONMENT` value verbatim and looks up rows where `environment = <that value>`. Currently `ACTIVE_ENVIRONMENT = "Dev"`, so nothing breaks immediately. When the user later flips to live, they'll set it to `Prod` (not `Production`).
- `supabase/functions/_shared/wizConfig.ts` — same, no code change required.
- `SettingsConfiguration.tsx` "C3-Wizard Integration" tab groups rows by `environment` field — will now show `Dev` and `Prod` groups. Already environment-agnostic, no code change.

### Step 3 — User flow
1. Apply UPDATE migration.
2. User clicks **Publish All** again on the C3-Wizard Integration tab → all 10 rows should sync (assuming Wizard accepts `Prod`).
3. If Wizard now reports a different `varchar` overflow on another column (e.g. `setting_type` = `OUTBOUND_AUTH` = 13 chars), we'll see a clearer per-row error pointing to that column and can ask the Wizard team to widen it (their schema, not ours).

### Optional follow-up message to C3-Wizard team (only if step 2 surfaces a new column overflow)
> Heads up — your `c3_site_settings` schema has `varchar(4)` columns that are too narrow for the new credential rows. We've shortened `Production` → `Prod` on our side to fit the `environment` column. Please confirm `setting_type` accepts values up to ~16 chars (`OUTBOUND_AUTH`, `INBOUND_AUTH`) — if it's also `varchar(4)`, please widen it (e.g. `varchar(20)`).

### Verification
1. C3-Wizard Integration tab shows 5 rows under `Dev` and 5 under `Prod` (relabelled).
2. Publish All → response shows `synced: 10, failed: 0` (or surfaces a different, more specific error if another column is too narrow).
3. Existing `ACTIVE_ENVIRONMENT = "Dev"` flow is unaffected — all client services and edge functions continue to resolve credentials from the `Dev` rows exactly as before.
4. No frontend code change, no edge function redeploy needed.

