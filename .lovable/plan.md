# Enterprise Communication Hub — Menu Shell Consolidation (Phase 1)

Non-destructive consolidation only. No new tables, no changes to Benefits/Legal/Compliance sending, no changes to `resolveBusinessCommunicationContext`, `coreTemplateResolverService`, `notificationDispatchResolver`, or any existing runtime path.

## What exists today (findings)

- **Templates**: `/admin/notification-templates` (`NotificationTemplatesAdmin`) + `/admin/template-management/*` (`TemplateManagementShell`) already unify template surfaces. Many legacy `/admin/comm/templates/*`, `/benefits/templates`, `/audit/templates`, `/c3-management/email-templates` already redirect here.
- **Branding / assets / library / validation**: live under `/admin/org/*` (`OrganizationManagementShell` + direct leaves) and `/admin/template-management/*` — media, letterheads, signatures, headers/footers, disclaimers, portal branding, document assets, categories, text blocks, configuration center, validation/health, impact.
- **Providers**: real, DB-backed page at `/admin/notifications/providers` (`ProviderSettings`).
- **Channels (mock)**: `/admin/notifications/channels` (`NotificationChannelSettings`) is mock-backed via `channelConfigurations` from `services/mockData/notificationData`. Overlaps conceptually with Provider Settings.
- **Correspondence workspace**: `/correspondence/*` (dashboard, incoming, outgoing, search, archive).
- **Notification log**: `/admin/notifications/log` (real).
- **Resolvers/services**: `src/lib/comm/*`, `src/lib/enterprise/*`, `src/platform/business-settings`, `src/platform/organization-settings`, `coreTemplateResolverService`, `coreTemplateService`. Untouched by this phase.
- **CI gate**: `scripts/lint-no-direct-comm.ts` already allow-lists `src/pages/admin/` and `src/pages/systemAdmin/`, so new hub pages under those paths pass without allow-list edits.

## Deliverables

### 1. New top-level sidebar section: "Enterprise Communication Hub"

New file `src/components/sidebar/menuItems/communicationHubMenuItems.ts`, registered in `src/components/sidebar/sidebarMenuItems.ts` **above** `systemAdminMenuItems`. Existing `correspondenceMenuItems` (already titled "Communication Hub") is left in place but the *new* top-level entry becomes the canonical entry point. (We can hide the old one in a follow-up phase — flagged in "Open questions" below.)

Structure (all `url:` fields point at existing routes, except placeholders which point at new stub pages under `/admin/communication-hub/*`):

```
Enterprise Communication Hub                         [/admin/communication-hub]
├── Overview                                         → /admin/communication-hub
├── Templates & Content
│   ├── Template Library                             → /admin/notification-templates
│   ├── Template Management Workspace                → /admin/template-management
│   ├── Text Blocks                                  → /admin/org/library/text-blocks
│   └── Document Assets                              → /admin/org/assets/document-assets
├── Branding & Assets
│   ├── Media Library                                → /admin/org/assets/media
│   ├── Letterheads                                  → /admin/org/assets/letterheads
│   ├── Signatures                                   → /admin/org/assets/signatures
│   ├── Headers / Footers                            → /admin/org/assets/headers-footers
│   ├── Disclaimers                                  → /admin/org/assets/disclaimers
│   └── Portal Branding                              → /admin/org/assets/portal-branding
├── Delivery Infrastructure
│   ├── Provider Settings                            → /admin/notifications/providers
│   ├── Channels (deprecated)                        → /admin/notifications/channels        [badge: Deprecated]
│   └── Configuration Center                         → /admin/org/configuration-center?domain=communication
├── Operations (placeholders — Phase 2)
│   ├── Communication Requests                       → /admin/communication-hub/requests
│   ├── Delivery Monitor                             → /admin/communication-hub/delivery-monitor
│   ├── Failed & Retry Queue                         → /admin/communication-hub/retry-queue
│   ├── Print Queue                                  → /admin/communication-hub/print-queue
│   ├── Dispatch Register                            → /admin/communication-hub/dispatch-register
│   └── Lifecycle Event Log                          → /admin/communication-hub/lifecycle-log
├── Correspondence Workspace                         → /correspondence/dashboard
├── Notification Log                                 → /admin/notifications/log
└── Governance & Validation
    ├── Health & Impact                              → /admin/org/validation/health
    ├── Usage Analysis                               → /admin/org/validation/usage
    └── Communication Governance                     → /admin/template-management/validation
```

All entries gated by `requiresPermission: "system_administration"` except the Correspondence and Notification Log links which reuse their existing permissions (`view_correspondence`, `view_notifications`).

### 2. Hub landing shell

New page `src/pages/admin/communicationHub/CommunicationHubShell.tsx` at route `/admin/communication-hub`.

- Uses `PageHeader` + card grid (existing shadcn/Tailwind tokens, no hardcoded colors).
- Sections mirror the menu: Templates & Content, Branding & Assets, Delivery Infrastructure, Operations, Correspondence, Governance.
- Each card shows title, one-line purpose, `→` link to the underlying real route.
- Operations cards render with a "Coming soon — Phase 2" badge and link to the placeholder pages.
- A prominent info-alert explains: "This hub consolidates the existing template, branding, provider, correspondence and governance surfaces. No configuration or sending behavior has changed."

### 3. Deprecate mock Channel Settings

Do **not** delete `src/pages/systemAdmin/NotificationChannelSettings.tsx` yet (retain for reference), but:

- Add an `Alert` banner at the top of the page: "Deprecated — mock data only. The real, database-backed channel/provider configuration lives at Provider Settings" with a link to `/admin/notifications/providers`.
- Wrap the mock tabs behind a collapsible "Show legacy mock UI" toggle (default collapsed) so it can't be mistaken for the real settings.
- Sidebar entry labelled "Channels (deprecated)" with a small `Badge`.
- Add a comment header in the file marking it deprecated and slated for removal once Provider Settings covers push/SMS provider selection.

(We keep the route rather than 301-redirecting so an existing bookmark still lands on an explanatory page rather than silently jumping.)

### 4. Placeholder pages for future areas

New files under `src/pages/admin/communicationHub/placeholders/`:

- `CommunicationRequestsPage.tsx`
- `DeliveryMonitorPage.tsx`
- `RetryQueuePage.tsx`
- `PrintQueuePage.tsx`
- `DispatchRegisterPage.tsx`
- `LifecycleLogPage.tsx`

Each renders a `PageHeader`, a "Coming in Phase 2" alert, a short description of what the screen will do, and a bullet list of the intended data sources it will consume (all listed as *"to be defined — no new tables in Phase 1"*). No queries, no mock data.

### 5. Routes

Additions to `src/components/routing/AppRoutes.tsx` (all wrapped in `PermissionWrapper moduleName="organization_management"` via existing patterns and lazy-loaded):

```
/admin/communication-hub                         → CommunicationHubShell
/admin/communication-hub/requests                → CommunicationRequestsPage
/admin/communication-hub/delivery-monitor        → DeliveryMonitorPage
/admin/communication-hub/retry-queue             → RetryQueuePage
/admin/communication-hub/print-queue             → PrintQueuePage
/admin/communication-hub/dispatch-register       → DispatchRegisterPage
/admin/communication-hub/lifecycle-log           → LifecycleLogPage
```

No existing routes are removed or redirected in this phase.

## Explicit non-goals (Phase 1)

- No new database tables, migrations, RLS policies, or grants.
- No new services, resolvers, or dispatch wrappers.
- No edits to `Benefits`, `Legal`, `Compliance`, `Finance`, `Registration`, `HR`, `Employer Services` sending code.
- No edits to `resolveBusinessCommunicationContext`, `coreTemplateResolverService`, `notificationDispatchResolver`, or any `src/lib/comm/*` / `src/lib/enterprise/*` file.
- No changes to `scripts/lint-no-direct-comm.ts` (new files land in already-allow-listed paths).
- Old `correspondenceMenuItems` "Communication Hub" section left as-is (see Open question 1).

## Files touched

**New**
- `src/components/sidebar/menuItems/communicationHubMenuItems.ts`
- `src/pages/admin/communicationHub/CommunicationHubShell.tsx`
- `src/pages/admin/communicationHub/placeholders/CommunicationRequestsPage.tsx`
- `src/pages/admin/communicationHub/placeholders/DeliveryMonitorPage.tsx`
- `src/pages/admin/communicationHub/placeholders/RetryQueuePage.tsx`
- `src/pages/admin/communicationHub/placeholders/PrintQueuePage.tsx`
- `src/pages/admin/communicationHub/placeholders/DispatchRegisterPage.tsx`
- `src/pages/admin/communicationHub/placeholders/LifecycleLogPage.tsx`

**Edited**
- `src/components/sidebar/sidebarMenuItems.ts` (register new section)
- `src/components/routing/AppRoutes.tsx` (7 new lazy routes)
- `src/pages/systemAdmin/NotificationChannelSettings.tsx` (deprecation banner + collapse mock UI + header comment)

## Open questions

1. **Old sidebar "Communication Hub" (correspondence section)** — keep visible alongside the new top-level hub, hide it, or fold its 6 items directly under "Correspondence Workspace" in the new hub? Default in this plan: keep both visible; the new hub links to `/correspondence/dashboard` as the single entry point.
2. **Permission for the new hub** — reuse `system_administration`, or introduce a dedicated `communication_hub.view` key later? Default: reuse `system_administration` (no permission-registry changes in Phase 1).
