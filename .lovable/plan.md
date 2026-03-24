

# Publish Self-Employed Income (Wages) Sync: SSB Admin → C3-Wizard

## Overview

Add a "Publish SE Wages" button on the Wages tab of the IP Registration view page. When clicked, it publishes all `ip_self_category` wage records (with joined `ip_self_employ` activity data) to the C3-Wizard via a new edge function, following the exact same pattern as the existing C3 Configuration publish flow.

## Architecture

```text
┌─────────────────────┐       ┌──────────────────────────┐       ┌──────────────┐
│ WagesCategoryTab    │──────▶│ se-wages-sync-publish    │──────▶│ C3-Wizard    │
│ (Publish Button)    │       │ (Edge Function)          │       │ API endpoint │
│                     │       │ Forwards payload with    │       │              │
│ usePublishSEWages() │       │ x-sync-api-key header    │       │ Upserts into │
│ builds payload from │       │                          │       │ wiz_ip_self_ │
│ ip_self_category +  │       │                          │       │ category     │
│ ip_self_employ      │       │                          │       │              │
└─────────────────────┘       └──────────────────────────┘       └──────────────┘
```

## Changes

### 1. New DB Table: `se_wages_sync_log` (Migration)

Tracks publish history, same pattern as `c3_config_sync_log`:

```sql
CREATE TABLE public.se_wages_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  payload_hash TEXT,
  records_count INTEGER DEFAULT 0,
  error_message TEXT,
  published_by TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.se_wages_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage SE wages sync log"
  ON public.se_wages_sync_log
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

### 2. New Edge Function: `supabase/functions/se-wages-sync-publish/index.ts`

Mirrors `c3-config-sync-publish` — reads `C3_WIZARD_SYNC_URL` and `C3_CONFIG_SYNC_API_KEY` secrets, forwards payload to C3-Wizard's SE wages sync endpoint (e.g., `/sync-se-wages`). Same error handling pattern.

### 3. New Hook: `src/hooks/usePublishSEWages.ts`

- **`buildSEWagesPayload(ssn)`**: Fetches all `ip_self_category` records for the SSN, joins with `ip_self_employ` for activity metadata (activity_type, self_ref_no), and with `tb_income_cat` for category code. Returns structured payload:
  ```typescript
  {
    sync_version: '1.0',
    sync_timestamp: string,
    ssn: string,
    self_ref_no: string,
    wages: [{
      activity_seq_no: string,
      activity_type: string,
      self_ref_no: string,
      effective_start_date: string,
      effective_end_date: string,
      wage_category: number,       // wage_upper value
      category_code: string,       // e.g. 'A', 'B', 'S'
    }]
  }
  ```
- **`usePublishSEWages()`**: Mutation that builds payload → inserts pending log → invokes `se-wages-sync-publish` edge function → updates log to success/failed. Same flow as `usePublishToC3Wizard`.

### 4. Update `src/components/ip/sep/WagesCategoryTab.tsx`

Add a "Publish to C3-Wizard" button (Upload icon) in the header next to "Add Wage Category". Shows confirmation dialog before publishing. Includes sync status badge (pending/synced) matching the C3 config pattern.

### 5. Message for C3-Wizard Team

A structured implementation guide will be prepared covering:

**A. New API Endpoint**: Accept POST at a new route (e.g., action `sync_se_wages` in wiz-admin-api) authenticated via `x-sync-api-key`.

**B. Mirror Table Schema**:
```sql
CREATE TABLE wiz_ip_self_category (
  ssn TEXT NOT NULL,
  self_ref_no TEXT NOT NULL,
  activity_seq_no TEXT NOT NULL,
  activity_type TEXT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  wage_category NUMERIC,
  category_code TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (ssn, activity_seq_no, effective_start_date)
);
```

**C. Upsert Logic**: On receive, delete all existing records for the SSN and re-insert (Full Replace strategy, same as `wiz_self_emp_contrib_rate`).

**D. C3 Submission Change** (Critical): When calculating SE contributions during C3 filing:
- **Current** (incorrect): Income fetched from personal details / SE profile
- **Required**: Query `wiz_ip_self_category` WHERE `ssn = :ssn` AND `effective_start_date <= :period_date` AND `effective_end_date >= :period_date`, use the matched `wage_category` for contribution calculation
- If no matching wage period found, block submission with error: "No wage category configured for the selected period"

## Files Created/Modified

| File | Action |
|------|--------|
| Migration SQL | Create `se_wages_sync_log` table |
| `supabase/functions/se-wages-sync-publish/index.ts` | New edge function |
| `src/hooks/usePublishSEWages.ts` | New hook for payload building + mutation |
| `src/components/ip/sep/WagesCategoryTab.tsx` | Add Publish button + confirmation dialog |
| `src/components/ip/sep/index.ts` | No change needed |

