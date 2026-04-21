# Compliance Mobile API

Public API for the Compliance & Enforcement module, designed for the
field-officer mobile application.

---

## Authentication model

Every request to the Compliance Mobile API requires **two layers of auth**:

| Header | Identity | Required on |
|---|---|---|
| `X-API-Key: <key>` | Mobile app | All endpoints |
| `Authorization: Bearer <jwt>` | Officer | All endpoints except `/auth/login`, `/auth/pin-unlock`, `/auth/refresh`, `/auth/logout` |

- The **API key** is provisioned in `/admin/api-keys → API Keys`.
- The **officer JWT** is issued by the login endpoint and refreshed via
  the refresh endpoint. It is a standard Supabase access token and can be
  validated with `supabase.auth.getClaims()`.

### Two-step login (mobile)

1. **First launch**: officer enters email + password.
   ```
   POST /functions/v1/compliance-mobile-auth/login
   ```
   Returns: `access_token` (JWT), `refresh_token`, registers the device,
   and indicates whether a PIN should be set.

2. **Set device PIN** (one-time):
   ```
   POST /functions/v1/compliance-mobile-auth/set-pin
   ```
   Stores a salted hash of the PIN against the device.

3. **Subsequent launches**: PIN/biometric unlock:
   ```
   POST /functions/v1/compliance-mobile-auth/pin-unlock
   ```
   Validates PIN against stored hash and issues a session token.

4. **Token refresh**:
   ```
   POST /functions/v1/compliance-mobile-auth/refresh
   ```

5. **Logout** (optionally revokes the device):
   ```
   POST /functions/v1/compliance-mobile-auth/logout
   ```

All login attempts and token operations are written to `ce_mobile_audit_log`.

---

## Base URL

```
https://<your-project>.supabase.co/functions/v1
```

- Auth functions: `…/compliance-mobile-auth/<action>`
- Data functions: `…/compliance-mobile-api/api/v1/compliance/<resource>`

---

## Endpoint catalog (~40)

### Auth (5)
| Method | Path | Description |
|---|---|---|
| POST | `/compliance-mobile-auth/login` | Email + password → JWT, register device |
| POST | `/compliance-mobile-auth/set-pin` | Set device PIN (after login) |
| POST | `/compliance-mobile-auth/pin-unlock` | Unlock with PIN + refresh token |
| POST | `/compliance-mobile-auth/refresh` | Rotate refresh token |
| POST | `/compliance-mobile-auth/logout` | Revoke refresh token / device |

### Officer & field operations (7)
| Method | Path | Description |
|---|---|---|
| GET  | `/compliance/me` | Officer profile |
| GET  | `/compliance/my/inspections` | My assigned inspections |
| GET  | `/compliance/my/cases` | My assigned cases |
| GET  | `/compliance/employers/{regno}/360` | Employer 360 view |
| POST | `/compliance/inspections/{id}/check-in` | GPS check-in |
| POST | `/compliance/inspections/{id}/check-out` | Check-out + findings |
| POST | `/compliance/inspections/{id}/evidence` | Append photo / document |

### Resources (CRUD subset)
For each resource, supported methods are listed.

| Resource | GET list | GET id | POST | PATCH |
|---|---|---|---|---|
| `cases` | ✓ | ✓ | ✓ | ✓ |
| `case-violations` | ✓ | ✓ | ✓ | — |
| `violations` | ✓ | ✓ | ✓ | ✓ |
| `violation-types` | ✓ | ✓ | — | — |
| `inspections` | ✓ | ✓ | ✓ | ✓ |
| `audit-plans` | ✓ | ✓ | — | — |
| `plan-items` | ✓ | ✓ | — | ✓ |
| `notices` | ✓ | ✓ | ✓ | ✓ |
| `notice-templates` | ✓ | ✓ | — | — |
| `legal-recommendations` | ✓ | ✓ | — | ✓ |
| `legal-referrals` | ✓ | ✓ | ✓ | ✓ |
| `risk-profiles` | ✓ | ✓ | — | — |
| `risk-bands` | ✓ | ✓ | — | — |
| `payment-arrangements` | ✓ | ✓ | — | — |
| `officers` | ✓ | ✓ | — | — |
| `zones` | ✓ | ✓ | — | — |

### List query options
- `?limit=50&page=1`
- `?order=created_at:desc`
- Equality filter: `?status=OPEN`
- Operator filter: `?discovered_date:gte=2025-01-01&discovered_date:lte=2025-12-31`
- Search (ilike): `?employer_name:like=acme`
- IN filter: `?status:in=OPEN,IN_PROGRESS`

---

## Examples

### 1. Officer login
```bash
curl -X POST \
  "$BASE/compliance-mobile-auth/login" \
  -H "x-api-key: $APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "officer@example.com",
    "password": "••••••••",
    "device_id": "ios-A1B2C3",
    "device_name": "iPhone 15 — Field 1",
    "platform": "ios",
    "app_version": "1.0.0"
  }'
```

### 2. List my inspections
```bash
curl "$BASE/compliance-mobile-api/api/v1/compliance/my/inspections?status=SCHEDULED" \
  -H "x-api-key: $APP_KEY" \
  -H "Authorization: Bearer $JWT"
```

### 3. Check-in
```bash
curl -X POST "$BASE/compliance-mobile-api/api/v1/compliance/inspections/$ID/check-in" \
  -H "x-api-key: $APP_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 17.30, "lng": -62.72 }'
```

### 4. Upload evidence (URL-based)
The mobile app uploads the file to Supabase Storage directly, then posts
the URL to the API:
```bash
curl -X POST "$BASE/compliance-mobile-api/api/v1/compliance/inspections/$ID/evidence" \
  -H "x-api-key: $APP_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "photo",
    "url": "https://…/storage/v1/object/public/evidence/…/photo.jpg",
    "caption": "Wage book page 12",
    "lat": 17.30, "lng": -62.72
  }'
```

### 5. Update case status
```bash
curl -X PATCH "$BASE/compliance-mobile-api/api/v1/compliance/cases/$CASE_ID" \
  -H "x-api-key: $APP_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{ "status": "RESOLVED", "closure_reason": "Paid in full" }'
```

---

## Audit & monitoring

- `ce_mobile_audit_log` — every action (login, unlock, write) recorded with user, device, IP, status, metadata.
- `ce_mobile_devices` — visible at `/admin/api-keys → Mobile Devices`. Admins can revoke a device.
- `api_registry` (category `compliance-mobile*`) — visible at `/admin/api-keys → Compliance API`. Admins can disable individual endpoints without redeploying code.

---

## Security notes

- Refresh tokens are stored as SHA-256 hashes; rotated on every `/refresh`.
- Device PINs are stored salted + SHA-256 hashed.
- API keys have hashed storage, optional IP whitelist, and per-minute rate
  limits — see `public_api_keys`.
- Officer accounts must be **active** in `profiles.is_active`.
- All endpoints honor the global `api_registry.is_enabled` flag — admins
  can kill-switch any endpoint at any time.

---

## Known limitations / next steps

- The `pin-unlock` flow currently issues an opaque session token. For full
  Supabase JWT re-issue with biometric-only unlock, integrate
  `supabase.auth.admin.createSession` (requires explicit user-impersonation
  tokens). Until then, the mobile app should fall back to `/login` with
  cached credentials when a 401 is observed.
- File uploads use Supabase Storage directly (signed-URL pattern). The API
  receives only the resulting object URL.
- `ce_officers` and `ce_zones` are read-only mirrors and assume those
  tables exist in your environment.
