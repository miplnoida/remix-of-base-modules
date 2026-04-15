

# Self-Hosted Supabase Migration Plan (AWS EC2)

## Scope

Your project contains **810 tables**, **604 migrations**, and **70 edge functions**. Manually assembling a single SQL file from 604 migration files would be error-prone and unnecessary. Instead, the correct approach is a **pg_dump-based export** from your live database combined with structured packaging of edge functions.

## Technical Approach

### Deliverable 1: Complete Schema + Data Export Script

Rather than concatenating 604 migrations (which contain incremental changes, some conflicting), I will create a **Python export script** that:

1. Connects to your current Supabase PostgreSQL database via `psql`/`pg_dump`
2. Generates a **single schema-only SQL file** (`schema.sql`) containing all 810 tables, views, functions, triggers, indexes, constraints — in correct dependency order
3. Generates a **seed data SQL file** (`seed.sql`) by querying only configuration/master tables (identified by naming patterns: `tb_*`, `*_config`, `*_master`, `*_status_*`, `app_modules`, `role_permissions`, `user_roles`, lookup tables, `ce_automation_jobs`, `ce_detection_rules`, `ce_calculation_rules`, `ce_escalation_rules`, `ce_risk_config`, etc.)
4. Strips Supabase-specific schema references (`auth.*`, `storage.*`, `realtime.*`, `supabase_functions.*`) and replaces with plain PostgreSQL equivalents where needed

**Output files** (written to `/mnt/documents/ec2-migration/`):
- `01_schema.sql` — full DDL in dependency order
- `02_seed_data.sql` — INSERT statements for master/config tables only
- `03_functions_and_triggers.sql` — all custom PL/pgSQL functions and triggers

### Deliverable 2: Edge Functions Package

Package all 70 edge functions into a structured directory with:
- Each function's `index.ts` preserved as-is (they already use standard Deno patterns)
- A `README.md` explaining how to deploy them with self-hosted Supabase
- Note: Edge functions using `LOVABLE_API_KEY` (like `compliance-intelligence`) will need the Lovable AI gateway replaced with a direct OpenAI/Google API call, or kept if you maintain Lovable AI access

### Deliverable 3: Environment Configuration

Generate a `.env.ec2` template file with all required variables:
```
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-jwt-secret-at-least-32-chars
ANON_KEY=generate-new-anon-key
SERVICE_ROLE_KEY=generate-new-service-role-key
SUPABASE_URL=http://your-ec2-ip:8000
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
SITE_URL=http://your-ec2-ip:3000
LOVABLE_API_KEY=keep-or-replace
MainAPIBaseURL=your-backend-api-url
```

### Deliverable 4: Deployment Guide (Markdown)

A step-by-step guide covering:
1. **Install Docker + Docker Compose** on EC2
2. **Clone supabase/supabase** docker setup
3. **Generate JWT keys** using `supabase` CLI or manually
4. **Apply schema**: `psql -f 01_schema.sql`
5. **Apply seed data**: `psql -f 02_seed_data.sql`
6. **Deploy edge functions**: Copy to `supabase/functions/` and restart
7. **Configure NGINX** for HTTPS (optional)
8. **Verify** connectivity from your frontend

## Implementation Steps

1. **Run pg_dump** against your live Supabase database to extract schema (using the read query tool for table enumeration, then building the DDL from the schema metadata)
2. **Query master/config tables** for seed data extraction
3. **Package edge functions** from `supabase/functions/`
4. **Generate .env template** and deployment guide
5. **Write all outputs** to `/mnt/documents/ec2-migration/`

## Important Notes

- Since we cannot run `pg_dump` directly from this sandbox, the schema export will be **reconstructed from the database metadata** (information_schema + pg_catalog queries) which produces equivalent results
- The first migration file (`20260112103840_remix_migration_from_pg_dump.sql`) appears to be the original pg_dump — this will be used as the base, with subsequent 603 migrations applied on top
- Edge functions using Supabase-specific features (auth, storage) will work as-is with self-hosted Supabase since it provides the same APIs
- No RLS policies need conversion — your project explicitly does not use RLS

## Output

All files delivered to `/mnt/documents/ec2-migration/`:
- `01_schema.sql`
- `02_seed_data.sql`  
- `03_functions_and_triggers.sql`
- `edge-functions/` (directory with all 70 functions)
- `.env.ec2`
- `DEPLOYMENT_GUIDE.md`

