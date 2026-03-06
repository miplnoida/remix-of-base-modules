

## Plan: Rebuild StandardSearchFilterBar with Grid-Based Layout

### Problem
The current `StandardSearchFilterBar` uses a flex layout where the search input takes `flex-1` (stretching excessively), filters get arbitrary fixed widths (`170px`-`200px`), and the overall balance is poor. Pages with few filters have an oversized search bar; pages with many filters feel cramped.

### Solution
Rebuild the component using a **CSS grid with a 12-column system** and intelligent column allocation based on filter count. For pages with many filters (like Follow-up Tracker with 5 filters), automatically wrap into two rows.

### Changes

**1. Rewrite `src/components/common/StandardSearchFilterBar.tsx`**

Replace the flex layout with a 12-column grid system:

- **Grid container**: `grid grid-cols-12 gap-3` on desktop (`lg:`), stacked on mobile
- **Column allocation logic**:
  - Calculate total slots needed: search (4 cols) + filters (2 cols each) + reset (1 col)
  - If total exceeds 12, split into two rows
  - Search always gets 4 columns on desktop
  - Each filter gets 2 columns on desktop
  - Reset gets remaining space, right-aligned
- **Row wrapping**: When filters exceed what fits in one row (e.g., Follow-up Tracker with 5 filters), the grid naturally wraps. Search + first 2-3 filters on row 1, remaining filters + reset on row 2.
- **Mobile**: `grid-cols-1` (full stack), with filters in `grid-cols-2` sub-grid on tablet (`md:grid-cols-2`)
- **Consistent sizing**: All controls `h-9` (compact enterprise feel), uniform label spacing

**Layout mapping per filter count:**

```text
0-1 filters:  Search[4] Filter[2] Reset[auto]  — single row, balanced
2 filters:    Search[4] Filter[2] Filter[2] Reset[auto]
3 filters:    Search[4] Filter[2] Filter[2] Filter[2] Reset[auto]  
4 filters:    Search[3] Filter[2] Filter[2] Filter[2] Filter[2] Reset[1]
5+ filters:   Row 1: Search[4] Filter[2] Filter[2]
              Row 2: Filter[2] Filter[2] Filter[2] Reset[auto]
```

**Key CSS approach:**
- Desktop: `lg:grid lg:grid-cols-12 lg:gap-3`
- Each item gets `lg:col-span-X` based on allocation
- Reset always `lg:col-start-12` or `ml-auto` within its cell
- Tablet: `md:grid-cols-6` (half grid)
- Mobile: `grid-cols-1` full stack

**2. No changes needed to any page files**

The component interface (`StandardSearchFilterBarProps`) remains identical. All pages already pass the correct props. The only change is internal layout logic within the component.

**3. Specific layout outcomes:**

| Page | Filters | Desktop Layout |
|------|---------|---------------|
| Auditor Profiles | 1 (Role) | Search[4] Role[2] Reset[1] — 5 cols used, clean |
| Leave Management | 1 (Status) | Search[4] Status[2] Reset[1] |
| Holiday Management | 1 (Type) | Search[4] Type[2] Reset[1] |
| Audit Plans | 3 (FY, Status, Dept) | Search[3] FY[2] Status[2] Dept[2] Reset[1] — 10 cols |
| Activity Workbench | 4 (Plan, DeptAudit, Status, Assigned) | Search[3] Plan[2] DeptAudit[2] Status[2] Assigned[2] Reset[1] — 12 cols |
| Findings | 2 (Risk, Status) | Search[4] Risk[2] Status[2] Reset[1] |
| Follow-up Tracker | 5 (Status, Dept, DueFrom, DueTo, Assigned) | Row1: Search[4] Status[2] Dept[2] DueFrom[2] — Row2: DueTo[3] Assigned[3] Reset[auto] |
| Plan Closeout | 3 (FY, Type, Status) | Search[3] FY[2] Type[2] Status[2] Reset[1] |

### Implementation approach

The component will compute column spans dynamically:
- `searchCols = filterCount >= 3 ? 3 : 4`
- `filterCols = 2` (each)
- Total = searchCols + (filterCount * 2) + 1 (reset)
- If total > 12: enable `multiRow` mode, split filters across rows

All controls maintain `h-9` height (slightly more compact than current `h-10`), `text-xs` labels with `mb-1` spacing, and the card container uses `p-4` padding (tighter than current `pt-6`).

