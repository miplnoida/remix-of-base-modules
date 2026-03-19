

# Copy Currency Data from Test to Live

## Current State
- **Test**: 7 currencies, 2 cashier currency configs (XCD, USD enabled), 20 denominations
- **Live**: All three tables are empty

## What Needs to Be Copied

Three tables in dependency order:
1. **`tb_currencies`** (7 rows) — master currency list (XCD, USD, EUR, GBP, CAD, BBD, TTD)
2. **`cashier_currency_config`** (2 rows) — XCD and USD enabled for cashier
3. **`cashier_currency_denominations`** (20 rows) — notes and coins for XCD and USD

## How

Run three INSERT statements against the Live database via **Cloud View > Run SQL** (with Live selected). The SQL will use the exact IDs and values from Test to maintain referential integrity.

I will generate the complete SQL script for you to copy-paste and execute.

