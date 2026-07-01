# Auto-Generated Code Standards

**Owner:** platform / core numbering
**Status:** Active (rolled out incrementally from 2026-07-01)

## Principle

Never ask a normal admin user to invent a technical code.

| Type | Source | UI |
|---|---|---|
| **System / internal code** | Central numbering engine — `core_number_sequence` + `core_generate_number` | Read-only preview via `<AutoCodeField />`. No manual entry. |
| **Business / reference code** | External authority (regulator, bank, court, ISO) | Controlled input with validation + uniqueness. |

Frontend counters, `Math.random`, `Date.now()` codes, or client-side sequence math are **not allowed** for system codes.

## How to add a new system-code entity

1. Add a row to `src/config/autoCodeRegistry.ts` with `moduleCode`, `entityType`, `pattern`, target table/column.
2. Seed `core_number_sequence` via migration:
   ```sql
   INSERT INTO public.core_number_sequence
     (module_code, entity_type, country_code, pattern, padding, reset_frequency, is_active)
   VALUES ('CORE', 'MY_ENTITY', 'SKN', 'ME-{DEPARTMENT}-{SEQ}', 4, 'NEVER', TRUE);
   ```
3. Add a unique index on the target `*_code` column (fail-closed on duplicates).
4. In the create dialog: replace the code `<Input>` with `<AutoCodeField entityKey="MY_ENTITY" departmentCode={form.module_code} />`.
5. In the save mutation: when no code is supplied, call `await generateAutoCode({ entityKey: "MY_ENTITY", departmentCode })` and stamp the result before insert.
6. Edit flows: keep the code read-only.

## Business / reference codes

Listed in `BUSINESS_CODE_FIELDS` in the registry. Keep manual input but require:
- uppercase normalization,
- format regex,
- uniqueness check on save,
- picker where a master list exists.

## Admin override

Manual code entry for system-code entities is **off by default** everywhere. If an admin surface needs it (e.g. legacy imports), gate it behind a feature flag and write an audit entry. Bulk imports should call `generateAutoCode` in a loop rather than accepting external codes.

## Enforcement

`scripts/lint-no-manual-code.ts` (planned) will fail CI when a component binds an editable input to a `*_code` field for an entity present in `AUTO_CODE_REGISTRY`.

## Rollout status

- **Phase A** — Text Blocks ✅ (2026-07-01); Templates / Categories / Tokens / Channels / Comm Assets — pending.
- **Phase B** — Legal stages, rules, SLA, fee, waiver, document rules — pending.
- **Phase C** — Workflow / approval / escalation policies — pending.
