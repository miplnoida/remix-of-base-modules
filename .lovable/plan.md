
# Responsive CSS Refactoring Plan

## Problem Analysis
After scanning 780+ files, the main responsiveness issues are:

1. **TabsList with 7-14 columns** (32 files) — overflow on tablet/mobile with no scroll affordance
2. **Fixed-pixel grid layouts** like `grid-cols-[280px_1fr_360px]` — break below 1024px
3. **Fixed-width elements** (`w-[400px]`, `w-[1200px]`) — exceed viewport on small screens
4. **Tables without horizontal scroll wrappers** — cause page-level horizontal scroll
5. **Forms with `grid-cols-3` without responsive prefixes** — columns too narrow on tablet

## Strategy: Centralized + Targeted Fixes

Rather than editing 780 files, apply a **centralized responsive utility layer** in `index.css` that catches overflow patterns globally, then fix the ~15 worst structural offenders individually.

---

### 1. Global responsive utilities in `index.css`

Add a `@layer components` block with:
- **`.responsive-tabs`** — makes any TabsList horizontally scrollable with hidden scrollbar on overflow, replacing rigid `grid-cols-N` with `flex` + `overflow-x-auto` below `lg`
- **Global table overflow** — ensure all `<table>` inside `.container` get `overflow-x-auto` on their parent
- **Global `max-w-full`** — prevent any element from exceeding viewport via `* { max-width: 100vw }` on `<main>`
- **Responsive typography scale** — reduce `h1`/`h2` sizes on small screens
- **Form grid helper** — `.responsive-grid` utility that auto-stacks below `md`

### 2. Fix WorkflowDesigner 3-column fixed layout
- Change `grid-cols-[280px_1fr_360px]` to responsive: stack on mobile, 2-col on tablet, 3-col on desktop
- Use `lg:grid-cols-[280px_1fr_360px]` with `grid-cols-1` default

### 3. Fix WorkflowManagement 14-tab layout
- Replace `grid-cols-7 lg:grid-cols-14` with scrollable flex tabs using the new `.responsive-tabs` class

### 4. Fix high-column TabsLists across the app (~15 files)
Key files with `grid-cols-6` through `grid-cols-11`:
- `AddIPForm.tsx` (8 cols)
- `Claim360View.tsx` (11 cols)
- `ApplicationDetailPage.tsx` (7 cols)
- `EditEmployer.tsx` (7 cols)
- `SSSchemeDetail.tsx` (6 cols)
- `LevySchemeDetail.tsx` (6 cols)
- `C3ConfigurationPage.tsx` (11 cols)
- `LegalCaseView.tsx` (6 cols)
- `SecuritySettings.tsx` (4 cols)

For each: replace rigid `grid-cols-N` with `flex flex-wrap` or scrollable container pattern.

### 5. Fix ScheduleMeetingDialog fixed width
- Change `w-[1200px]` to `max-w-[1200px] w-full`

### 6. Fix AppLayout main content
- Already has `max-w-[1440px]` and `min-w-0` — good. Add `overflow-x-hidden` to prevent edge cases.

### 7. Fix select triggers with fixed widths
- Change patterns like `w-[400px]` to `w-full max-w-[400px]`

---

### Files to modify:
1. **`src/index.css`** — Add responsive utility classes
2. **`src/components/layout/AppLayout.tsx`** — Add overflow protection
3. **`src/components/workflow/WorkflowDesigner.tsx`** — Responsive grid
4. **`src/pages/workflow/WorkflowManagement.tsx`** — Scrollable tabs
5. **`src/components/person/AddIPForm.tsx`** — Responsive tabs
6. **`src/pages/newBenefit/Claim360View.tsx`** — Responsive tabs
7. **`src/pages/online-applications/ApplicationDetailPage.tsx`** — Responsive tabs
8. **`src/pages/employersManagement/EditEmployer.tsx`** — Responsive tabs
9. **`src/pages/c3/settings/ss/SSSchemeDetail.tsx`** — Responsive tabs
10. **`src/pages/c3/settings/levy/LevySchemeDetail.tsx`** — Responsive tabs
11. **`src/pages/admin/C3ConfigurationPage.tsx`** — Responsive tabs
12. **`src/components/legal/LegalCaseView.tsx`** — Responsive tabs
13. **`src/components/meetings/ScheduleMeetingDialog.tsx`** — Max-width fix
14. **`src/pages/admin/data-access/UserDataOverrides.tsx`** — Select width fix

### Technical approach for centralized tab fix:
```css
/* Responsive scrollable tabs */
.responsive-tabs {
  display: flex !important;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  width: 100%;
}
.responsive-tabs::-webkit-scrollbar { display: none; }
.responsive-tabs > * { flex-shrink: 0; }

@media (min-width: 1024px) {
  .responsive-tabs { flex-wrap: wrap; overflow-x: visible; }
}
```

This allows individual TabsList components to simply add `className="responsive-tabs"` instead of complex grid-cols breakpoints, and they'll scroll horizontally on small screens while wrapping naturally on desktop.
