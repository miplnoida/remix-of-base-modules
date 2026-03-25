

# Revert Default Status Filter

## Change
Update the `get_c3_records_filtered` function to restore the original default filter showing only `DFT` and `PEN` statuses (removing `VAC`).

### Database migration
Replace both occurrences of:
```sql
(p_status IS NULL AND c.posting_status IN ('DFT', 'PEN', 'VAC'))
```
with:
```sql
(p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
```

No frontend changes needed.

