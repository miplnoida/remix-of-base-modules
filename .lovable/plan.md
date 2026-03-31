

# Payment Module Configuration Enhancements

## Summary
Six changes to the Payment Module Configuration screen at `/cashier/payment-module-config`, covering head cashier per-branch assignment, email delivery config for invoices/receipts, per-branch opening balances, office-linked card machines, and date-aware batch behavior toggles.

---

## 1. Head Cashier Assignment — Separate Per-Branch Screen

**Current**: Single global head cashier per date, embedded in Roles & Permissions tab.

**Change**:
- Remove `HeadCashierAssignmentSection` from the Roles & Permissions tab
- Create a new dedicated page at `/cashier/head-cashier-assignment`
- Add `office_code` column to `cn_head_cashier_assignment` table (VARCHAR, FK to `tb_office.code`)
- Update `assign_head_cashier` and `get_active_head_cashier` RPCs to accept/return `office_code`
- New UI: office selector (from `tb_office`) + date picker → shows current assignment for that branch/date → assign any eligible cashier regardless of their own office
- Add route in `AppRoutes.tsx`

**Database migration**:
```sql
ALTER TABLE cn_head_cashier_assignment ADD COLUMN IF NOT EXISTS office_code VARCHAR REFERENCES tb_office(code);
```
Plus update the two RPCs to include `p_office_code` parameter and filter by it.

### Files
| File | Change |
|------|--------|
| Migration SQL | Add `office_code` to table + update RPCs |
| `src/pages/cashier/HeadCashierAssignment.tsx` | New page |
| `src/components/routing/AppRoutes.tsx` | Add route |
| `src/pages/cashier/PaymentModuleConfig.tsx` | Remove `HeadCashierAssignmentSection` import/usage |
| `src/hooks/useHeadCashier.ts` | Update to pass `office_code` to RPC |

---

## 2. Invoice Email Delivery Config (Always / Never / Ask)

**Change**: Add a new config key `invoice_email_delivery` to `payment_module_config` with value `'always'`, `'never'`, or `'ask'`.

- Add a new section in Roles & Permissions tab with a RadioGroup (Always / Never / Ask) with descriptions
- Seed config row via insert tool

### Files
| File | Change |
|------|--------|
| Insert tool | Seed `invoice_email_delivery` config row (default: `'never'`) |
| `src/pages/cashier/PaymentModuleConfig.tsx` | Add RadioGroup section in Roles tab |

---

## 3. Receipt Email Delivery Config (Always / Never / Ask)

Same pattern as #2 but for `receipt_email_delivery`.

### Files
| File | Change |
|------|--------|
| Insert tool | Seed `receipt_email_delivery` config row (default: `'never'`) |
| `src/pages/cashier/PaymentModuleConfig.tsx` | Add RadioGroup section in Roles tab |

---

## 4. Per-Branch Opening Balances

**Current**: Single global head_cashier / cashier balance stored in `payment_module_config`.

**Change**:
- Create new table `cn_office_opening_balance` with columns: `office_code` (FK tb_office), `head_cashier_balance` (NUMERIC), `cashier_balance` (NUMERIC), `updated_by`, `updated_at`. Unique on `office_code`.
- Rewrite `DefaultOpeningBalanceTab` to show a list of offices, each with its own head cashier & cashier balance inputs
- Keep the global default as fallback; per-office overrides take precedence
- Update `useBatchBehaviorConfig.ts` → `useDefaultOpeningBalance` to accept `office_code` and check per-office first, then fall back to global

### Files
| File | Change |
|------|--------|
| Migration SQL | Create `cn_office_opening_balance` table |
| `src/components/payments/DefaultOpeningBalanceTab.tsx` | Rewrite with office-level entries |
| `src/hooks/useBatchBehaviorConfig.ts` | Update `useDefaultOpeningBalance` to accept `office_code` |

---

## 5. Card Machines — Office Location

**Change**:
- Add `office_code VARCHAR REFERENCES tb_office(code)` to `cn_card_machine` table
- Update `CardMachineTab.tsx` form to include an office dropdown (from `tb_office`)
- Show office column in the machine list table
- Also update `CardMachineManagement.tsx` (standalone page) with same changes

### Files
| File | Change |
|------|--------|
| Migration SQL | Add `office_code` to `cn_card_machine` |
| `src/components/payments/CardMachineTab.tsx` | Add office dropdown in form + column in table |
| `src/pages/cashier/CardMachineManagement.tsx` | Same changes |

---

## 6. Batch Behavior Config — Date-Range / Working-Days Options

**Current**: Simple ON/OFF toggle for each batch behavior config.

**Change**: When a config is toggled ON, expand to show additional options:
- **Mode**: "Always" (no time limit) or "Scheduled"
- **If Scheduled**, sub-options:
  - **Date Range**: from-date / to-date
  - **Working Days After Month End**: number of working days + optional until month-year (or open-ended)
- Working days calculation uses `non_working_days` from `system_settings` and `public_holidays` table

**Data structure change**: Expand config value from `{ enabled: true }` to:
```json
{
  "enabled": true,
  "schedule_mode": "always" | "date_range" | "working_days_after_month",
  "date_from": "2026-04-01",
  "date_to": "2026-06-30",
  "working_days_count": 5,
  "until_month_year": "2026-12" | null
}
```

- Update `BatchBehaviorConfigSection.tsx` to render schedule options when toggled ON
- Update `useBatchBehaviorConfig.ts` to evaluate the schedule (check current date against range or compute working days from last day of previous month using holidays/NWD data)

### Files
| File | Change |
|------|--------|
| `src/components/payments/BatchBehaviorConfigSection.tsx` | Add schedule UI when ON |
| `src/hooks/useBatchBehaviorConfig.ts` | Add schedule evaluation logic |

---

## Database Changes Summary

| Change | Method |
|--------|--------|
| Add `office_code` to `cn_head_cashier_assignment` | Migration |
| Update `assign_head_cashier` / `get_active_head_cashier` RPCs | Migration |
| Create `cn_office_opening_balance` table | Migration |
| Add `office_code` to `cn_card_machine` | Migration |
| Seed `invoice_email_delivery` config | Insert tool |
| Seed `receipt_email_delivery` config | Insert tool |

## New Files
- `src/pages/cashier/HeadCashierAssignment.tsx`

## Modified Files
- `src/pages/cashier/PaymentModuleConfig.tsx` — remove head cashier section, add email delivery configs
- `src/components/payments/DefaultOpeningBalanceTab.tsx` — per-branch
- `src/components/payments/CardMachineTab.tsx` — office dropdown
- `src/pages/cashier/CardMachineManagement.tsx` — office dropdown
- `src/components/payments/BatchBehaviorConfigSection.tsx` — schedule options
- `src/hooks/useBatchBehaviorConfig.ts` — schedule evaluation + per-office balance
- `src/hooks/useHeadCashier.ts` — office_code parameter
- `src/components/routing/AppRoutes.tsx` — new route

