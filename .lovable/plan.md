
# Public API Gateway Implementation Plan

## Overview

Production-grade public API gateway using backend functions connected to the same database. Provides an independent API layer for external applications while keeping the UI project unchanged.

---

## Status: Phase 1 — Master Data APIs

### Phase 1 Endpoints (tb_ Master Tables)

| Method | Path | Table | Description |
|--------|------|-------|-------------|
| GET | /api/v1/countries | tb_country | List all countries |
| GET | /api/v1/districts | tb_district | List all districts |
| GET | /api/v1/postal-districts | tb_postal_district | List postal districts |
| GET | /api/v1/occupations | tb_occup | List occupations |
| GET | /api/v1/industries | tb_indus | List industries |
| GET | /api/v1/sectors | tb_sector | List sectors |
| GET | /api/v1/relations | tb_relation | List relation types |
| GET | /api/v1/dependent-relations | tb_dependent_relation | List dependent relation types |
| GET | /api/v1/activities | tb_activity | List activity types |
| GET | /api/v1/eye-colors | tb_eye_color | List eye colors |
| GET | /api/v1/offices | tb_office | List offices |
| GET | /api/v1/office-departments | tb_office_departments | List office departments |
| GET | /api/v1/inspectors | tb_inspector | List inspectors |
| GET | /api/v1/legal-statuses | tb_legal_status | List legal statuses |
| GET | /api/v1/c3-statuses | tb_c3_status | List C3 statuses |
| GET | /api/v1/ssc-rates | tb_ssc_rates | List SSC contribution rates |
| GET | /api/v1/levy-slabs | tb_levy_slabs | List levy slabs |
| GET | /api/v1/levy-slab-details | tb_levy_slab_details | List levy slab details |
| GET | /api/v1/self-emp-rates | tb_self_emp_contrib_rate | Self-employed rates |
| GET | /api/v1/vc-rates | tb_vc_contrib_rate | Voluntary contribution rates |
| GET | /api/v1/penalties | tb_penalty | List penalty configs |
| GET | /api/v1/health | — | Health check |

### Phase 2 (Future) — Transactional APIs

- ip_master CRUD
- ip_depend CRUD
- ip_notes CRUD

---

## Architecture

Same as implemented: single `public-api` edge function with middleware chain (CORS → API Key → Rate Limit → Endpoint Auth → Execute → Log).

## Already Implemented

- ✅ Database tables: `public_api_keys`, `public_api_access_logs`, `public_api_rate_limits`
- ✅ Edge function: `manage-api-keys` (generate, list, revoke, update, usage)
- ✅ Admin UI: `/admin/api-keys`
- ✅ Health check endpoint
- ✅ Full middleware chain (auth, rate limit, IP whitelist, endpoint auth, logging)

## Remaining

- [ ] Add Phase 1 master data GET endpoints to `public-api` edge function
