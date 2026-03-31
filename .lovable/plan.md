

# Plan: Clean Up Audit Settings — Remove Combined Screen, Separate Risk & System

## Summary

Currently there are 3 settings screens in the Audit Module:
1. **`/audit/settings`** — Combined `AuditSettings.tsx` (tabs wrapper embedding both RiskSettings and AuditConfig) — **TO BE DELETED**
2. **`/audit/config`** — `AuditConfig.tsx` (System Configuration) — **KEEP, rename, remove risk tabs**
3. **`/audit/risk-settings`** — `RiskSettings.tsx` (Risk Configuration) — **KEEP as-is**

After cleanup, only 2 screens remain with distinct purposes.

---

## Step 1: Delete the Combined Settings Screen

- **Delete** `src/pages/audit/AuditSettings.tsx`
- **Remove** the `/audit/settings` route from `AppRoutes.tsx`
- **Remove** the lazy import for `AuditSettings`
- **Remove** `embedded` prop usage from `RiskSettings.tsx` and `AuditConfig.tsx` (they'll always render standalone with their own `PageShell`)

## Step 2: Remove Risk Tabs from AuditConfig (System Configuration)

`AuditConfig.tsx` currently has 8 tabs. Two are risk-related and must be removed:
- **"Risk Assessment"** tab (`value="risk"`, lines ~212–325) — risk criteria & weights, frequency mapping
- **"Risk Management"** tab (`value="riskMgmt"`, lines ~327–506) — likelihood levels, impact levels, control effectiveness, classification thresholds

After removal, the remaining 6 tabs are all system-related:
- Config Approvals
- Notifications & SLA
- Feature Flags
- Reference Settings
- Activity Types
- Planning Engine

Change the default tab from `"risk"` to `"configApprovals"` (or another system tab).

## Step 3: Rename "System Settings" to "System Configuration"

In `AuditConfig.tsx`:
- Update `PageShell` title from any "System Settings" / "Auto Plan Config" references to **"System Configuration"**
- Update breadcrumbs to `Internal Audit → System Configuration`
- Update subtitle to describe general audit module behavior

In `auditRouteConfig.ts`:
- Change `system-config` entry label from `"Auto Plan Config"` to `"System Configuration"`

## Step 4: Update Sidebar Menu

In `auditMenuItems.ts`, replace the single "Audit Settings" entry with two separate entries under the Settings group:

```
Settings (group label)
├── System Configuration  → /audit/config
└── Risk Configuration    → /audit/risk-settings
```

## Step 5: Update Route Config

In `auditRouteConfig.ts`:
- **Remove** the `audit-settings` entry (path `/audit/settings`)
- **Keep** `system-config` entry (path `/audit/config`, label → "System Configuration")
- **Keep** `risk-settings` entry (path `/audit/risk-settings`, label stays "Risk Configuration")

## Step 6: Update Dynamic Navigation

In `useDynamicNavigation.ts`:
- **Remove** the `ia-audit-settings` entry from `SIMPLIFIED_INTERNAL_AUDIT_MENU` (which has aliases for `/audit/settings`, `/audit/config`, `/audit/risk-settings`)
- **Add** two separate entries:
  - `ia-system-config` → path `/audit/config`, title "System Configuration"
  - `ia-risk-config` → path `/audit/risk-settings`, title "Risk Configuration"

## Step 7: Clean Up Embedded Prop

In both `AuditConfig.tsx` and `RiskSettings.tsx`:
- Remove the `embedded` prop and conditional `PageShell` logic
- Always render with their own `PageShell`

## Step 8: Database Migration

- Disable/remove the `audit_settings` module row from `app_modules` (the combined screen)
- Ensure `system-config` and `risk-settings` module rows remain enabled and visible

---

## Files Changed

| File | Action |
|------|--------|
| `src/pages/audit/AuditSettings.tsx` | **Delete** |
| `src/pages/audit/AuditConfig.tsx` | Remove risk tabs, remove `embedded` prop, rename to "System Configuration" |
| `src/pages/audit/RiskSettings.tsx` | Remove `embedded` prop (always standalone) |
| `src/components/routing/AppRoutes.tsx` | Remove `/audit/settings` route and `AuditSettings` import |
| `src/components/sidebar/menuItems/auditMenuItems.ts` | Replace single "Audit Settings" with two entries |
| `src/config/auditRouteConfig.ts` | Remove `audit-settings` entry, rename `system-config` label |
| `src/hooks/useDynamicNavigation.ts` | Split combined override into two separate entries |
| New migration | Disable `audit_settings` module in `app_modules` |

