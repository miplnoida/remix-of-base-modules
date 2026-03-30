

# C3-Wizard Configuration — SSB Admin Credentials for `c3_site_settings`

## What C3-Wizard Needs

The C3-Wizard team needs two values for their `c3_site_settings` table:

### 1. `SSB_BIMA_BASE_URL`

The base URL for all SSB Admin public APIs:

```
https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/public-api/api/v1
```

This is the edge function URL with the `/api/v1` path prefix that all endpoints expect.

### 2. `SSB_BIMA_API_KEY`

The API key for the **"C3 Wizard Application"** entry already exists in the system (`public_api_keys` table, ID: `cb45c54e-6946-4cd1-a007-c3c1cf33d5f0`, status: active).

**However**, the plain-text key is encrypted and can only be retrieved through the admin UI:
1. Log into SSB Admin
2. Navigate to **Admin → API Keys Management**
3. Find the **"C3 Wizard Application"** key
4. Click the **reveal/copy** button to get the plain-text API key
5. Share that value as `SSB_BIMA_API_KEY`

## What to Share with C3-Wizard Team

Once you retrieve the API key from the admin UI, send them this message:

---

**Subject: SSB Admin API Credentials for c3_site_settings**

**To: C3-Wizard Development Team**

Please insert the following into your `c3_site_settings` table:

| Setting Key | Value |
|---|---|
| `SSB_BIMA_BASE_URL` | `https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/public-api/api/v1` |
| `SSB_BIMA_API_KEY` | *(the API key retrieved from the admin panel — shared separately)* |

**Usage**: All API calls should use:
- **Header**: `x-api-key: {SSB_BIMA_API_KEY}`  
- **Base URL**: `{SSB_BIMA_BASE_URL}` + endpoint path (e.g., `/Employer/getERMasterDetails/{regNo},{email}`)

**Confirmation**: The `BIMA_API_USERNAME` and `BIMA_API_PASSWORD` secrets are no longer needed and can be safely deleted from your configuration.

---

## No Code Changes Required

This is a configuration handoff — no code changes are needed on the SSB Admin side. The API key and base URL already exist and are functional.

