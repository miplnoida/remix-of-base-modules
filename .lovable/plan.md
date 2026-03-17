

## Why the Missing Data Wasn't Detected

The "Analyze Differences" function uses a hardcoded list of ~35 tables (`DEFAULT_TABLES` in `supabase/functions/data-migration-analyze/index.ts`, lines 29-65). The table `security_policy_config` is **not in this list**, so the analysis never compares it between Test and Live.

The current list covers config, master data, and workflow tables but omits security-related tables like:
- `security_policy_config`
- `ip_access_rules`
- `security_ip_blocks`
- `app_lockdown_state`
- `unauthorized_access_logs`

## Fix

Add the missing security tables to the `DEFAULT_TABLES` array in `supabase/functions/data-migration-analyze/index.ts`:

```
"security_policy_config",
"ip_access_rules",
"app_lockdown_state",
```

This ensures future "Analyze Differences" runs will detect discrepancies in security configuration between Test and Live environments.

No other files need to change — the sync function (`data-migration-sync`) already handles arbitrary tables dynamically.

