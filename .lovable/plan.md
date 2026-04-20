
User wants ONE single file containing everything (DB schema + edge functions + everything needed for EC2 deploy). Edge functions are Deno/TS code — they cannot literally execute inside a `.sql` file, but I can embed them as **here-doc payloads inside a single shell script** that, when run, both applies the SQL and writes out every edge function file ready for `supabase functions deploy`.

So the deliverable becomes ONE file: a self-extracting bash installer.

### The single file: `/mnt/documents/ec2_full_deploy.sh`

Structure (one file, ~5–10 MB):
```
#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Section 1: Banner + arg parsing (DB URL, project ref)
# Section 2: Pre-flight checks (psql, supabase CLI present)
# Section 3: Apply consolidated SQL schema (heredoc → psql)
# Section 4: Apply storage buckets SQL (heredoc → psql)
# Section 5: Extract edge functions (each as a heredoc → file)
#            └── functions/<name>/index.ts written to disk
# Section 6: Write supabase/config.toml (heredoc)
# Section 7: Print required-secrets checklist (Deno.env.get scan)
# Section 8: Optional: run `supabase functions deploy` for each
# Section 9: Post-deploy verification queries
```

### How it's built (read-only scan + assemble)

1. Reuse `consolidated_schema.sql` (already generated, idempotent) — embed as heredoc in Section 3.
2. Scan `supabase/migrations/` for `storage.buckets` inserts → embed in Section 4.
3. Walk `supabase/functions/*/index.ts` → for each, emit:
   ```bash
   mkdir -p functions/<name>
   cat > functions/<name>/index.ts <<'LOVABLE_EOF_<name>'
   <verbatim file contents>
   LOVABLE_EOF_<name>
   ```
   Unique sentinel per function avoids any heredoc collision with function source.
4. Embed `supabase/config.toml` verbatim.
5. Scan all `Deno.env.get("...")` → dedupe → emit Section 7 as a printed checklist with `supabase secrets set` template lines.
6. Section 8 runs `for fn in functions/*/; do supabase functions deploy ...; done` (gated by `--deploy-functions` flag so user can opt-in).

### Usage on EC2

```bash
chmod +x ec2_full_deploy.sh
./ec2_full_deploy.sh \
  --db-url "postgresql://postgres:pwd@localhost:5432/postgres" \
  --project-ref "<self-hosted-ref>" \
  --deploy-functions
```

### Idempotency
- SQL section already idempotent (CREATE IF NOT EXISTS / OR REPLACE / DO-block guards).
- File extraction overwrites edge function files (safe — they're target-side).
- Function deploy is naturally idempotent (Supabase CLI updates in place).
- Re-running the script is safe end-to-end.

### What's in / what's out
- IN: schema, storage buckets, all edge functions, config.toml, secret checklist, optional auto-deploy.
- OUT: actual secret values (never copied — only names listed), business data (no row exports), reserved-schema modifications beyond the documented `auth.users` trigger and `storage.buckets` inserts.

### Single deliverable
- `/mnt/documents/ec2_full_deploy.sh` — one file, everything inside it.
- (Optional companion: `/mnt/documents/ec2_full_deploy_README.md` with usage examples — say no if you truly want only one file.)

Pure read-only scan + bundle generation. ~60s runtime. Approve and I'll build the single file.
