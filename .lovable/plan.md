

# Dynamic Placeholder-Based Number Format Configuration

## Current State
Three number formats (Invoice, Receipt, Batch) stored as simple `{format, seq_min_length/id_min_length}` objects in `payment_module_config`. Length control is fixed to one placeholder per format (SEQ for invoice, RECEIPT_ID for receipt, none for batch).

## New Design

### Config Structure (JSONB in `payment_module_config`)
Each format's `config_value` changes from a flat object to a **segments array** with per-placeholder length:

```json
{
  "segments": [
    { "type": "static", "value": "INV-" },
    { "type": "placeholder", "value": "YYYYMM" },
    { "type": "static", "value": "-" },
    { "type": "placeholder", "value": "SEQ", "min_length": 3 }
  ]
}
```

Each segment has:
- `type`: `"static"` (literal text) or `"placeholder"` (resolved at runtime)
- `value`: the text or placeholder key (e.g. `YYYYMM`, `SEQ`, `OFFICE_CODE`)
- `min_length` (optional): zero-pad or truncate to this length (applies to any placeholder)

No new database tables needed — same `payment_module_config` keys, new JSONB shape.

### Database Migration
1. **Migrate existing config** — Convert current `{format, seq_min_length}` / `{format, id_min_length}` into segments arrays via an SQL migration that parses the format string
2. **Update `set_receipt_number()`** — Read segments array, iterate segments, resolve each placeholder with its `min_length`, concatenate result
3. **Update `create_invoice_with_lines()`** — Same segment-based resolution; SEQ uses advisory lock + prefix extraction
4. **Remove standalone `receipt_id_min_length` / `invoice_id_min_length` config keys** — lengths now live in segments

### Backend Resolution Logic (PL/pgSQL)
```text
FOR each segment in segments array:
  IF type = 'static' → append value
  IF type = 'placeholder':
    resolved = resolve_placeholder(value, context)
    IF min_length defined → LPAD(resolved, min_length, '0')
    append resolved
```

For `{SEQ}` specifically: extract prefix from all preceding segments, query max existing sequence from that prefix, increment, then pad to `min_length`.

### Batch Number (Frontend)
Update `usePaymentBatch.ts` to read segments array and resolve placeholders client-side with length padding (same logic as current `resolveBatchFormat` but segment-based).

### UI Redesign — Number Formats Tab
Replace the three simple cards with a **unified segment builder** for each format:

Each card (Invoice / Receipt / Batch) contains:
- **Segments list** — ordered rows, each showing: type badge (Static/Placeholder), value, length input (for placeholders), up/down/delete buttons
- **Add segment controls** — dropdown to pick placeholder type from available list, or text input for static text, with "Add" button
- **Live preview** — real-time concatenation of resolved segments
- **Save button** — persists segments array to `payment_module_config`
- **Validation** — at least one segment required; SEQ placeholder allowed only once per format; min_length must be 1-10

Remove the separate "Minimum ID Display Length" card (lengths are now inline per segment).

Keep the "Available Placeholders" reference card at the bottom.

### Backward Compatibility
- Migration SQL parses existing format strings into segments
- DB functions check for both old (`format` string) and new (`segments` array) shapes, falling back to legacy parsing if segments not found
- Existing records remain untouched

### Files Changed

| File | Change |
|------|--------|
| DB migration SQL | Migrate existing configs to segments; update `set_receipt_number()` and `create_invoice_with_lines()` to iterate segments with per-placeholder length |
| `PaymentModuleConfig.tsx` | Replace format-pattern inputs with segment builder UI (add/edit/reorder/remove segments with length per placeholder); remove "Min ID Display Length" card |
| `usePaymentBatch.ts` | Update `resolveBatchFormat` to read segments array with lengths |
| `usePaymentModuleConfig.ts` | No changes (generic config read/write) |

### Audit
All config saves already go through `useUpdatePaymentConfig` which logs audit trails — no change needed.

