# Fix: `SepContribRateManagement.tsx` Build Error & Consolidate `c3_wage_category` Usage

## Problem

The previous edit partially replaced the wage category dropdown in `SepContribRateManagement.tsx`. The query was updated to fetch from `c3_wage_category` (line 63-70, variable `wageCategories`), but the JSX on line 278 still references the old variable name `wageOptions` with old field names (`category_code`, `wage_upper`), causing the build error.

## Plan

### 1. Fix `SepContribRateManagement.tsx` — Replace `wageOptions` with `wageCategories`

**Lines 278-282**: Replace the broken dropdown mapping:

```tsx
// FROM (broken):
{wageOptions.map((c) => (
  <SelectItem key={c.category_code} value={String(c.wage_upper)}>
    Cat {c.category_code} — ${Number(c.wage_upper).toFixed(2)}
  </SelectItem>
))}

// TO (fixed, using wageCategories from line 63):
{wageCategories.map((c) => (
  <SelectItem key={c.category_id} value={String(c.weekly_income)}>
    Cat {c.category} — ${Number(c.weekly_income).toFixed(2)}
  </SelectItem>
))}
```

This aligns the JSX with the `wageCategories` query already fetching from `c3_wage_category`.

### 2. Update `WagesCategoryTab.tsx` — Use `c3_wage_category` instead of `tb_self_emp_contrib_rate`

Replace the `SelfEmployedService.getWageCategoryOptions()` call (which queries stale `tb_self_emp_contrib_rate` for distinct `wage_cat` numbers) with a direct query to `c3_wage_category`. This ensures the dropdown reflects configuration changes.

- Replace `wageCatOptions: number[]` state with a typed `WageCategory[]` array
- Query `c3_wage_category` directly for `category_id, category, weekly_income`
- Update the dropdown to display `Cat [category] — $[weekly_income]` instead of raw numbers
- Update the form value handling to use `weekly_income` as the stored value

### Files Changed


| File                                           | Change                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/SepContribRateManagement.tsx` | Fix line 278-282: replace `wageOptions` → `wageCategories` with correct field names                                                                                                                                                                                                                                                                                                                        |
| `src/components/ip/sep/WagesCategoryTab.tsx`   | Replace `getWageCategoryOptions()` with direct `c3_wage_category` query; update dropdown labels But wait configuration page for the c3 is using the master tables not the c3_wage_category then why are you editing other ppage to use the c3_wage_categort instead of fixinf the selfempyer edit page??? I have attached the tables used in the configuration.Please check the screenshot properly&nbsp; |
