

# Generate C3 Public API Documentation PDF

## Task
Generate a professional, downloadable PDF document covering all three C3 Ingestion public APIs with complete request/response parameter details, authentication requirements, error codes, and usage examples.

## Approach
Use Python with `reportlab` to create a multi-page PDF at `/mnt/documents/C3_Public_API_Documentation.pdf`. The document will include:

1. **Cover / Title section** — SSB C3 Public API Documentation, version, date
2. **Authentication** — `x-api-key` header requirement, API key assignment via API Registry
3. **Base URL** — Edge function URL pattern
4. **API 1: Insert C3 Reported** (`POST /api/v1/c3-reported`)
   - All 18 parameters with type, required/optional, description, default
   - Success response with auto-generated `sequence_no`
   - Error responses
5. **API 2: Insert C3 Wages** (`POST /api/v1/c3-wages`)
   - All 27 parameters with type, required/optional, description, default
   - Parent validation error response
   - Success response with `c3_id` linkage
6. **API 3: Verify C3** (`POST /api/v1/c3-verify`)
   - 4 required parameters
   - Recalculation formulas
   - Nil-return vs non-nil-return flows
   - Success/error response variants
7. **Error Reference** — Standard error codes (401, 403, 404, 429, 400, 500)
8. **Integration Flow** — Step-by-step: create C3 → add wages → verify

Data sourced directly from the migration SQL and edge function handler code reviewed above.

## Implementation
Single Python script using `reportlab.platypus` (SimpleDocTemplate, Tables, Paragraphs) to produce a clean, professional PDF. Then QA via `pdftoppm` conversion and visual inspection.

## Output
`/mnt/documents/C3_Public_API_Documentation.pdf`

