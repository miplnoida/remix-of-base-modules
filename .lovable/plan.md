
# Public API Gateway Implementation Plan

## Overview

Since Lovable cannot create a separate Git repository or standalone backend project, this plan builds a **production-grade public API gateway** using backend functions connected to the same database. This gives you a fully independent API layer that external applications can call, while keeping the UI project unchanged.

When you're ready to migrate to ASP.NET, the API contracts, key management tables, and patterns established here will serve as the exact blueprint.

---

## Architecture

```text
  External App          External App          External App
       |                     |                     |
       |   x-api-key         |   x-api-key         |   x-api-key
       v                     v                     v
  +----------------------------------------------------------+
  |              public-api  (Edge Function)                  |
  |  /api/v1/ip-master, /api/v1/ip-depend, /api/v1/ip-notes  |
  |                                                          |
  |  Middleware Chain:                                        |
  |  1. CORS check                                           |
  |  2. API Key validation (hashed lookup)                   |
  |  3. Rate limiting check                                  |
  |  4. Endpoint authorization                               |
  |  5. Request validation                                   |
  |  6. Execute query via Supabase client (RLS respected)    |
  |  7. Access logging                                       |
  +----------------------------------------------------------+
       |
       v
  +------------------+
  |   PostgreSQL DB   |
  |  (same instance)  |
  |   RLS enforced    |
  +------------------+
```

---

## What Will Be Built

### 1. Database Tables (Migration)

**`public_api_keys`** -- Stores hashed API keys with metadata:
- `id` (UUID, PK)
- `key_hash` (VARCHAR 128) -- SHA-256 hash, never plain text
- `key_prefix` (VARCHAR 8) -- First 8 chars for identification (e.g., "pk_live_a")
- `app_name` (VARCHAR 100) -- Name of consuming application
- `status` (VARCHAR 20) -- active / revoked / expired
- `rate_limit_per_minute` (INT, default 60)
- `allowed_endpoints` (TEXT[]) -- Array of permitted endpoint patterns, e.g., ["/api/v1/ip-master/*"]
- `allowed_ip_addresses` (TEXT[]) -- Optional IP whitelist
- `expires_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at`, `created_by`, `revoked_at`, `revoked_by`

**`public_api_access_logs`** -- Logs every API request:
- `id` (UUID, PK)
- `api_key_id` (UUID, FK to public_api_keys)
- `endpoint` (VARCHAR 255)
- `http_method` (VARCHAR 10)
- `request_ip` (VARCHAR 45)
- `response_status` (INT)
- `response_time_ms` (INT)
- `request_payload_summary` (TEXT, truncated)
- `error_message` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

**`public_api_rate_limits`** -- Sliding window rate limit tracking:
- `api_key_id` (UUID)
- `window_start` (TIMESTAMPTZ)
- `request_count` (INT)
- Unique constraint on (api_key_id, window_start)

### 2. Edge Function: `public-api`

A single backend function handling all versioned routes:

**Route structure:**
- `POST /public-api` with JSON body containing `path`, `method`, and `payload`
- Paths follow `/api/v1/{resource}` pattern

**Supported endpoints (Phase 1):**

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/ip-master | List insured persons (paginated) |
| GET | /api/v1/ip-master/:id | Get single IP by UUID |
| POST | /api/v1/ip-master | Create new IP record |
| PUT | /api/v1/ip-master/:id | Update IP record |
| GET | /api/v1/ip-depend/:ip_id | List dependents for an IP |
| POST | /api/v1/ip-depend | Create dependent |
| PUT | /api/v1/ip-depend/:id | Update dependent |
| DELETE | /api/v1/ip-depend/:id | Delete dependent |
| GET | /api/v1/ip-notes/:ip_id | List notes for an IP |
| POST | /api/v1/ip-notes | Create note |
| GET | /api/v1/health | Health check |

**Middleware chain (executed in order):**

1. **CORS** -- Configurable allowed origins
2. **API Key Validation** -- Hash incoming key, look up in `public_api_keys`, check status/expiry
3. **Rate Limiting** -- Sliding window per key, returns 429 if exceeded
4. **Endpoint Authorization** -- Check key's `allowed_endpoints` against requested path
5. **Request Validation** -- Validate payload schema per endpoint
6. **Execution** -- Query database using service role with RLS-aware patterns
7. **Access Logging** -- Non-blocking log to `public_api_access_logs`

**Standard response format:**
```json
{
  "status": "success",
  "message": "Records retrieved successfully",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}
```

**Error response format:**
```json
{
  "status": "error",
  "message": "Invalid API key",
  "error": {
    "code": "UNAUTHORIZED",
    "details": "The provided API key is invalid or has been revoked"
  }
}
```

### 3. Edge Function: `manage-api-keys`

Admin-only function for key lifecycle management:

- **Generate key** -- Creates a cryptographically random key, stores SHA-256 hash, returns plain key once
- **List keys** -- Returns key metadata (prefix, app name, status) without the actual key
- **Revoke key** -- Sets status to "revoked" with timestamp and reason
- **Update key** -- Modify rate limits, allowed endpoints, expiry

### 4. Admin UI Page: `/admin/api-keys`

A management screen in the existing admin panel:
- Table listing all API keys (prefix, app name, status, rate limit, last used)
- "Generate New Key" dialog -- shows the key ONCE with copy button
- Revoke/Edit actions per key
- Usage statistics pulled from `public_api_access_logs`

### 5. Configuration

**`supabase/config.toml` additions:**
```toml
[functions.public-api]
verify_jwt = false

[functions.manage-api-keys]
verify_jwt = false
```

The `public-api` function skips JWT verification because it uses its own API key authentication. The `manage-api-keys` function validates JWT in code to restrict to admin users.

---

## Security Measures

- API keys hashed with SHA-256 before storage; plain text never persisted
- Rate limiting per key (default 60 req/min, configurable)
- Endpoint-level authorization per key
- Optional IP whitelisting
- All payloads validated against strict schemas before DB interaction
- Service role used only for controlled operations; RLS policies remain enforced where applicable
- Sensitive fields redacted from logs
- CORS restricted to configured origins
- All access attempts logged with IP, timestamp, status, and duration

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/functions/public-api/index.ts` (~400 lines) |
| Create | `supabase/functions/manage-api-keys/index.ts` (~200 lines) |
| Create | `src/pages/admin/ApiKeysManagement.tsx` |
| Create | `src/components/admin/GenerateApiKeyDialog.tsx` |
| Create | `src/components/admin/ApiKeyUsageStats.tsx` |
| Migration | Tables: `public_api_keys`, `public_api_access_logs`, `public_api_rate_limits` |
| Modify | `supabase/config.toml` (add function entries) |
| Modify | App router (add `/admin/api-keys` route) |

---

## Testing Strategy

After implementation:
1. Generate an API key from the admin screen
2. Call `GET /api/v1/health` with the key in `x-api-key` header to verify connectivity
3. Call `GET /api/v1/ip-master` to confirm data retrieval with RLS respected
4. Send requests without a key to confirm 401 response
5. Send rapid requests to confirm rate limiting returns 429
6. Verify access logs are recorded in the database
