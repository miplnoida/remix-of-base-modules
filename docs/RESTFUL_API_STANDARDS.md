# RESTful API Design Standards — Mandatory Policy

## Scope

This document is the **authoritative standard** for all external/public APIs exposed by this system. Every endpoint registered in `api_registry` MUST comply. No exceptions.

---

## 1. Resource-Based URI Design

- URIs represent **resources (nouns)**, never actions (verbs).
- Use lowercase, hyphen-separated plural nouns.
- Hierarchical nesting for sub-resources (max 2 levels).

```
✅ GET  /api/v1/countries
✅ GET  /api/v1/countries/{id}
✅ GET  /api/v1/employers/{id}/employees

❌ GET  /api/v1/getCountries
❌ POST /api/v1/fetchData
❌ GET  /api/v1/country_list
```

---

## 2. HTTP Methods

| Method | Purpose | Idempotent | Request Body |
|--------|---------|------------|--------------|
| GET | Retrieve resource(s) | Yes | No |
| POST | Create new resource | No | Yes |
| PUT | Full replacement of resource | Yes | Yes |
| PATCH | Partial update of resource | Yes | Yes |
| DELETE | Remove resource | Yes | No |

- **GET** requests MUST NOT have side effects.
- **PUT/DELETE** MUST be idempotent.
- **POST** is used only for creation or non-idempotent operations.

---

## 3. Versioning

All APIs use **URI versioning**:

```
/api/v1/resource
/api/v2/resource
```

- Never use header-based or query-param versioning.
- Major version increments for breaking changes only.
- Deprecated versions must remain functional for a documented sunset period.

---

## 4. Standard Response Format

Every API response MUST follow this JSON structure:

### Success Response
```json
{
  "status": "success",
  "message": "Countries retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 195
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Human-readable error description",
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "details": "Additional context for debugging"
  }
}
```

### Standard Error Codes
| HTTP Status | Error Code | Usage |
|-------------|------------|-------|
| 400 | BAD_REQUEST | Malformed request or missing fields |
| 401 | UNAUTHORIZED | Missing or invalid API key |
| 403 | FORBIDDEN | Valid key but insufficient scope/IP blocked |
| 404 | NOT_FOUND | Resource or endpoint does not exist |
| 405 | METHOD_NOT_ALLOWED | HTTP method not supported for resource |
| 409 | CONFLICT | Resource state conflict |
| 422 | VALIDATION_ERROR | Valid JSON but semantically invalid |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unhandled server error |

---

## 5. HTTP Status Codes

- **2xx** — Success: `200 OK`, `201 Created`, `204 No Content`
- **3xx** — Redirection: avoided in APIs
- **4xx** — Client errors: `400`, `401`, `403`, `404`, `409`, `422`, `429`
- **5xx** — Server errors: `500`, `503`

Never return `200` for errors. Always match status code to outcome.

---

## 6. Query Parameters

### Pagination
```
GET /api/v1/countries?page=2&limit=50
```
- `page` — 1-indexed page number (default: 1)
- `limit` — items per page (default: 50, max: 1000)

### Filtering
```
GET /api/v1/countries?search=saint
```

### Sorting
```
GET /api/v1/countries?sort=name&order=asc
```

### Field Selection (future)
```
GET /api/v1/countries?fields=code,name
```

---

## 7. Stateless Requests

- Every request MUST contain all information needed to process it.
- No server-side session state between requests.
- Authentication via `x-api-key` header on every request.

---

## 8. Authentication & Security

- All endpoints (except health check) require `x-api-key` header.
- Keys are validated via SHA-256 hash comparison.
- Rate limiting enforced per key per minute.
- IP whitelisting supported per key.
- Scope-based endpoint authorization via `api_key_scope_assignments`.
- All transport via HTTPS only.

---

## 9. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| URI segments | lowercase, hyphen-separated | `/api/v1/eye-colors` |
| Query params | lowercase, underscore | `?page=1&limit=50` |
| JSON fields | snake_case | `{ "country_code": "KN" }` |
| Error codes | UPPER_SNAKE_CASE | `"RATE_LIMITED"` |
| Timestamps | ISO 8601 / UTC | `"2026-02-14T20:00:00Z"` |

---

## 10. API Registry Governance

Every external endpoint MUST be registered in the `api_registry` table before it is accessible:

- **api_name**: Human-readable name
- **http_method**: Must be a standard REST method
- **endpoint_path**: Must follow `/api/v{n}/{resource}` pattern
- **is_enabled**: Controls availability without code changes
- **requires_auth**: Enforces API key validation
- **category**: Groups endpoints logically

Endpoints not in the registry return `404 Not Found` with no metadata leakage.

---

## 11. Implementation Reference

### Current Base URL
```
https://pruvbfejdpodpalqafcu.supabase.co/functions/v1/public-api
```

### RESTful Call Pattern (Standard)
```bash
# Health check (no auth)
GET .../public-api/api/v1/health

# Master data with API key
GET .../public-api/api/v1/countries?page=1&limit=50
Headers: x-api-key: pk_live_xxxxx

# With search
GET .../public-api/api/v1/occupations?search=engineer
Headers: x-api-key: pk_live_xxxxx
```

### Legacy POST-Body Pattern (Backward Compatible)
```bash
POST .../public-api
Headers: x-api-key: pk_live_xxxxx
Body: { "path": "/api/v1/countries", "method": "GET", "query": { "page": "1" } }
```

The RESTful URL pattern is the **preferred and mandated** approach. The legacy POST-body pattern is maintained only for backward compatibility and will be deprecated.

---

## 12. Compliance Checklist for New Endpoints

Before registering any new endpoint, verify:

- [ ] URI uses plural nouns, no verbs
- [ ] Correct HTTP method for the operation
- [ ] Response follows standard JSON format
- [ ] Appropriate HTTP status codes used
- [ ] Pagination support for collection endpoints
- [ ] Error responses include `status`, `message`, and `error.code`
- [ ] Endpoint registered in `api_registry`
- [ ] API key authentication enforced (unless explicitly public)
- [ ] Rate limiting configured
- [ ] Idempotency guaranteed for GET/PUT/DELETE
