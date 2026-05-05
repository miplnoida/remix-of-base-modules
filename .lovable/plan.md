## Problem

On `/audit/risk-assessment` the **Risk Category** field is a plain `Select` driven by a hardcoded array (`RISK_CATEGORIES = ['Operational','Financial','Compliance','IT','Strategic','Reputational']` at line 23 of `src/pages/audit/RiskAssessment.tsx`). Users cannot add new categories, and the existing data already contains values not in the list (`Data Integrity`, `Governance`, `People`, `Procurement`, `Technology`). There is no master table for risk categories — they are free strings stored on `ia_risk_assessments.risk_category`.

## Solution Overview

Introduce a proper master table `ia_risk_categories`, replace the static dropdown with a searchable **creatable** combobox, and persist new entries via Supabase with concurrency-safe upsert.

## 1. Database — new master table

Migration:

```sql
CREATE TABLE public.ia_risk_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_norm     text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    varchar(50),
  updated_by    varchar(50),
  source_screen text
);

CREATE UNIQUE INDEX ia_risk_categories_name_norm_uniq
  ON public.ia_risk_categories (name_norm) WHERE is_active = true;
```

The unique index on the normalized name (`lower(trim(name))`) gives **DB-level** case-insensitive duplicate prevention — this is what makes concurrent inserts safe even if two clients race.

Seed it with the existing distinct values from `ia_risk_assessments.risk_category` plus the original 6 hardcoded ones (idempotent insert via `ON CONFLICT DO NOTHING`). Tag system seeds with `created_by = 'SEED-SYSTEM'` per project memory.

Per project policy: **no RLS** (role-based security only), no DB triggers, no CHECK on time. `updated_at` is bumped from app code.

## 2. New CreatableSearchableSelect component

`src/components/ui/creatable-searchable-select.tsx` — thin wrapper over the existing `Command` + `Popover` pattern from `searchable-select.tsx`, adding:

- a controlled `inputValue` for the `CommandInput`
- when typed text doesn't match any option (case-insensitive), surface a **`+ Create "<typed value>"`** row inside `CommandList`
- on select of that row, call `onCreate(value)` and close the popover
- exposes a `creating` flag to disable the row while the async create is in flight

It reuses the same look/feel and keyboard nav as `SearchableSelect`.

## 3. Hook — `useIARiskCategories`

`src/hooks/useIARiskCategories.ts`

- `useIARiskCategories()` — `useQuery(['ia_risk_categories'])` → `select('*').eq('is_active', true).order('name')`.
- `useCreateIARiskCategory()` — mutation that:
  1. Trims input, rejects empty / >100 chars / regex `/^[A-Za-z0-9 &/_-]+$/` (naming standard).
  2. Performs a client-side existence check on the normalized name to short-circuit, then calls:
     ```ts
     supabase.from('ia_risk_categories')
       .upsert({ name, created_by, updated_by, source_screen: 'audit/risk-assessment' },
               { onConflict: 'name_norm', ignoreDuplicates: false })
       .select()
       .single();
     ```
     Because `name_norm` has a unique index, simultaneous inserts from two users collapse to one row; the loser still gets the existing row back from `.select().single()` after a follow-up `select` by `name_norm` if upsert returns no row. Wrap that fallback in the same hook.
  3. On success, optimistically inserts the new row into the `['ia_risk_categories']` cache and `invalidateQueries` so all open tabs converge.
  4. Errors are translated through the project's shielded-error pattern (toast user-friendly message; raw to `systemLoggerService` fire-and-forget).

Subscribe via `supabase.channel('ia_risk_categories').on('postgres_changes', ...)` inside the hook (mounted once) so newly created categories from other sessions appear without refresh — matches the existing `useRiskRealtimeSync` pattern used elsewhere in the audit module.

Migration also runs:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_risk_categories;
```

## 4. Wire it into `RiskAssessment.tsx`

- Remove the hardcoded `RISK_CATEGORIES` constant.
- Pull `{ data: categories } = useIARiskCategories()` and `{ mutateAsync: createCategory, isPending } = useCreateIARiskCategory()`.
- Replace the `<Select>` block at lines 443–446 with `<CreatableSearchableSelect>` configured with:
  - `options = categories.map(c => ({ value: c.name, label: c.name }))`
  - `value = riskCategory`, `onValueChange = setRiskCategory`
  - `onCreate = async (raw) => { const row = await createCategory(raw); setRiskCategory(row.name); }`
  - `disabled = isReadOnly || !canCreateCategory` for the create row only (the select itself stays enabled).
- The existing form `risk_category` payload field is unchanged — still a string.
- Also update the search/filter bar Risk Category filter (same screen) and the Risk Register filter dropdown to use the same hook so admin-added categories appear everywhere immediately.

## 5. Role-based gating

Use the existing audit role hook (already used for other audit CRUD). Only `Audit Manager`, `CAE`, and `Admin` see the `+ Create "<x>"` row; other roles see the message `Category not found — contact audit admin.` Selection of existing categories is unrestricted.

## 6. Audit logging

`created_by` / `updated_by` already populated from `useAuditFields().userCode`. Additionally fire a non-blocking `system_audit_trail` entry via `systemLoggerService`:

```
{ entity: 'ia_risk_categories', entity_id, action: 'CREATE',
  source_screen: 'audit/risk-assessment', user_code, payload: { name } }
```

## 7. Tests

Add to `src/pages/audit/__tests__/RiskAssessment.creatable-category.test.tsx`:

1. Existing categories load and are selectable.
2. Typing a brand-new name shows `+ Create "<name>"`; clicking it calls supabase upsert and auto-selects.
3. Typing an existing name (different case) does NOT show the create row and selects the existing one.
4. Empty / whitespace / over-length / disallowed-character entries surface validation toast and do not call supabase.
5. Concurrent create simulation: two parallel `createCategory('Cyber')` calls resolve to the same row id (mock supabase to reject the second with `23505` and verify fallback `select` returns the existing row).
6. After create, the new category is present in subsequent dropdown opens without remount (cache update) and is the selected value in the form.

## Files

- **New**: `supabase/migrations/<ts>_ia_risk_categories.sql`
- **New**: `src/components/ui/creatable-searchable-select.tsx`
- **New**: `src/hooks/useIARiskCategories.ts`
- **Edit**: `src/pages/audit/RiskAssessment.tsx` (drop hardcoded const, swap Select → CreatableSearchableSelect in form + filter)
- **New test**: `src/pages/audit/__tests__/RiskAssessment.creatable-category.test.tsx`

No edge functions required — all access through the typed Supabase client with the unique-index guard providing concurrency safety.
