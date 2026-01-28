# Database Connection Guide

## Overview

This application uses **Supabase** (PostgreSQL) as its database. The connection is managed through the Supabase client library, which provides both REST API access and real-time capabilities.

## Current Configuration

### Environment Variables (`.env`)

The application uses the following environment variables for database connection:

```env
VITE_SUPABASE_PROJECT_ID="pruvbfejdpodpalqafcu"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydXZiZmVqZHBvZHBhbHFhZmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMDE1OTMsImV4cCI6MjA4Mzc3NzU5M30.jSZG9oUWDLZGRmaseN-1sfWPFhc6tc_pw41kR7Wr8cg"
VITE_SUPABASE_URL="https://pruvbfejdpodpalqafcu.supabase.co"
```

### Supabase Client Configuration

**Location:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

## Connection Methods

### 1. Frontend Application (Current Method)

The application uses the Supabase JavaScript client for all database operations:

```typescript
// Import the client
import { supabase } from "@/integrations/supabase/client";

// Example: Query data
const { data, error } = await supabase
  .from('ip_master')
  .select('*')
  .eq('status', 'V');

// Example: Insert data
const { data, error } = await supabase
  .from('ip_master')
  .insert({ first_name: 'John', last_name: 'Doe' });
```

### 2. Direct PostgreSQL Connection String

For direct PostgreSQL access (using tools like pgAdmin, DBeaver, or psql), you need to get the connection string from your Supabase dashboard:

#### Steps to Get Direct Connection String:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `pruvbfejdpodpalqafcu`

2. **Navigate to Database Settings:**
   - Go to: **Settings** → **Database**
   - Scroll to **Connection string** section

3. **Connection String Format:**

   **URI Format:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.pruvbfejdpodpalqafcu.supabase.co:5432/postgres
   ```

   **Connection Parameters:**
   ```
   Host: db.pruvbfejdpodpalqafcu.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: [Your database password]
   ```

4. **Connection Pooling (Recommended for server-side):**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.pruvbfejdpodpalqafcu.supabase.co:6543/postgres?pgbouncer=true
   ```
   - Port `6543` is for connection pooling (recommended)
   - Port `5432` is for direct connection

### 3. Supabase Edge Functions (Server-side)

Edge functions use environment variables set in Supabase:

```typescript
// In Supabase Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) and should only be used in server-side code.

## Connection Types

### 1. Anon Key (Frontend - Current)
- **Key Type:** `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- **Usage:** Client-side operations
- **Security:** Respects Row Level Security (RLS) policies
- **Location:** `.env` file

### 2. Service Role Key (Server-side)
- **Key Type:** `SUPABASE_SERVICE_ROLE_KEY`
- **Usage:** Edge functions, server-side operations
- **Security:** Bypasses RLS (use with caution)
- **Location:** Supabase Dashboard → Settings → API

### 3. Direct PostgreSQL Connection
- **Type:** PostgreSQL connection string
- **Usage:** Database tools, migrations, direct SQL access
- **Security:** Requires database password
- **Location:** Supabase Dashboard → Settings → Database

## Database Schema

The database schema is defined in:
- **TypeScript Types:** `src/integrations/supabase/types.ts` (auto-generated)
- **Migrations:** `supabase/migrations/` (20+ migration files)
- **Main Tables:**
  - `ip_master` - Insured Persons
  - `tmp_ip_master` - Temporary IP records
  - `ip_depend` - Dependents
  - `legal_cases` - Legal cases
  - `employers` - Employer records
  - `c3_files` - C3 contribution files
  - `notification_logs` - System notifications
  - `workflow_instances` - Workflow execution
  - And 100+ more tables

## Testing Connection

### Test Supabase Client Connection:

```typescript
import { supabase } from "@/integrations/supabase/client";

// Test connection
async function testConnection() {
  const { data, error } = await supabase
    .from('ip_master')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('Connection error:', error);
  } else {
    console.log('Connection successful!');
  }
}
```

### Test Direct PostgreSQL Connection:

Using `psql`:
```bash
psql "postgresql://postgres:[PASSWORD]@db.pruvbfejdpodpalqafcu.supabase.co:5432/postgres"
```

Using connection string in tools:
- **pgAdmin:** Use the connection string in connection dialog
- **DBeaver:** Create new PostgreSQL connection with the parameters
- **VS Code:** Use PostgreSQL extension with connection string

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Anon Key is safe for frontend** - It respects RLS policies
3. **Service Role Key is sensitive** - Only use in server-side code
4. **Database password** - Keep secure, rotate regularly
5. **Connection pooling** - Use port 6543 for production server-side connections

## Environment Setup

### Required Environment Variables:

```env
# Frontend (Public - Safe to expose)
VITE_SUPABASE_URL=https://pruvbfejdpodpalqafcu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]

# Backend/Edge Functions (Private - Never expose)
SUPABASE_URL=https://pruvbfejdpodpalqafcu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Getting Missing Keys:

1. **Supabase Dashboard:** https://supabase.com/dashboard/project/pruvbfejdpodpalqafcu
2. **Settings → API:**
   - `anon` key → Use as `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → Use as `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
3. **Settings → Database:**
   - Connection string → For direct PostgreSQL access

## Troubleshooting

### Connection Issues:

1. **Check environment variables:**
   ```bash
   # In terminal
   echo $VITE_SUPABASE_URL
   ```

2. **Verify Supabase project is active:**
   - Check Supabase dashboard
   - Ensure project is not paused

3. **Check network/firewall:**
   - Ensure ports 5432 or 6543 are accessible
   - Check if behind corporate firewall

4. **Verify credentials:**
   - Check if keys are correct
   - Ensure database password is correct

### Common Errors:

- **"Invalid API key"** → Check if key is correct in `.env`
- **"Connection refused"** → Check network/firewall settings
- **"RLS policy violation"** → Check Row Level Security policies
- **"Table does not exist"** → Run migrations or check schema

## Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Supabase Dashboard:** https://supabase.com/dashboard/project/pruvbfejdpodpalqafcu
