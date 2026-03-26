

# Update `/api/v1/c3-reported` to Accept `sequence_no` from Request

## Problem
The `public_api_insert_c3_reported` RPC currently auto-generates `sequence_no` by reading `MAX(sequence_no) + 1` from `cn_c3_reported`. The API must instead accept `sequence_no` from the request payload and validate uniqueness before inserting.

## What Already Exists
- A unique constraint `cn_c3_reported_unique` on `(payer_id, payer_type, sequence_no, period)` already exists in the database — no schema change needed.
- The advisory lock on `payer_id || payer_type || period` is currently used for sequence generation — it should be retained but now protects the uniqueness check.

## Changes

### 1. Database Migration — Replace `public_api_insert_c3_reported` RPC

- **Add parameter**: `p_sequence_no INTEGER` (required, no default)
- **Remove**: The `SELECT COALESCE(MAX(sequence_no), 0) + 1` auto-generation logic and `v_seq` variable
- **Add validation**: `IF p_sequence_no IS NULL THEN RAISE EXCEPTION 'sequence_no is required'`
- **Add duplicate check**: Before insert, query for existing record with same `(payer_id, payer_type, period, sequence_no)`. If found, return a JSONB error: `"This schedule/sequence number has already been submitted for this payer and period"`
- **Keep** the advisory lock to prevent race conditions
- **Update INSERT** to use `p_sequence_no` instead of `v_seq`
- **Update RETURN** to reference `p_sequence_no` instead of `v_seq`

### 2. Edge Function — Update `handleC3ReportedInsert` in `public-api/index.ts`

- **Add validation**: `if (payload.sequence_no == null) throw { code: "BAD_REQUEST", message: "sequence_no is required" }`
- **Add RPC parameter**: `p_sequence_no: Number(payload.sequence_no)` in the `.rpc()` call

### Summary of Behavior
- Request must include `sequence_no`
- RPC checks uniqueness of `(payer_id, payer_type, period, sequence_no)` inside advisory lock
- If duplicate: returns structured error (no DB exception)
- If unique: inserts and returns success with the provided `sequence_no`
- The existing DB unique constraint provides a safety net for concurrent edge cases

