## Rename Compliance submenu "Administration" → "Setup"

The Compliance & Enforcement submenu currently shows "Administration", which clashes with the top-level "Administration" menu directly below it.

### Change

Update one row in `app_modules` (DB-driven sidebar):

- `id = ca000000-0000-0000-0000-000000000100` (`name = compliance_settings`)
- `display_name`: `Administration` → `Setup`

No other rows touched. The top-level `Administration` menu (`id = aab5fcb8…`) is unchanged.

### Notes

- Sidebar is fully DB-driven (`useNavigationMenu` / `DynamicSidebarContent`), so a single migration is sufficient — no React code changes.
- Routes, permissions (`manage_compliance`), child items, and capability checks remain unchanged.
- `docs/compliance/menu_alignment_summary.md` references the old name in its top-level menu tree; I'll update that doc string to "Setup" to keep documentation in sync.

### Acceptance

- Compliance & Enforcement → submenu shows "Setup" instead of "Administration".
- Top-level "Administration" menu unchanged.
- All child routes under `/compliance/admin/...` continue to work.
