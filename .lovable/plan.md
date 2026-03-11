

## Plan: Create Edge Function to Expose Database Connection Details

### What
Create a temporary edge function that returns the database connection parameters (host, port, database, user) derived from the `SUPABASE_URL` and `SUPABASE_DB_URL` environment variables available inside edge functions.

### How

**Single edge function: `get-db-connection-info`**

- Reads `SUPABASE_URL` and `SUPABASE_DB_URL` from `Deno.env`
- Returns whatever connection-related environment variables are available (host, port, user, database)
- No authentication required (temporary function — user will delete it after use)
- Set `verify_jwt = false` in config.toml

**Important note**: The database **password** is not stored in any environment variable accessible to edge functions. The function will return what it can (URL, host, pooler details), but the password must be reset via the Cloud panel if unknown.

### Security
- This is a **temporary diagnostic function** — the user explicitly stated they will delete it afterward
- No password will be exposed (it's not available in edge function env vars)

