# CH-SIMPLE-P3G — Navigation Simplification and Legacy Workflow Containment

**Status:** `P3G_CERTIFIED_WITH_LEGACY_ROUTES`

The Communication Hub navigation has been restructured around the operator's
normal workflow: **Go Live**. Legacy pages remain reachable for bookmarks and
authorised technical investigation but no longer appear as the recommended
path.

## Final Primary Navigation Structure

```text
Communication Hub
├── Overview                             /admin/communication-hub
├── Go Live               (primary)      /admin/communication-hub/go-live
├── Events & Templates    (group)
│   ├── Event → Template Mapping         /admin/communication-hub/design
│   └── Module Onboarding                /admin/communication-hub/onboarding
├── Operations            (group)
│   ├── Delivery Monitor                 /admin/communication-hub/delivery-monitor
│   ├── Communication Requests           /admin/communication-hub/requests
│   ├── Lifecycle Event Log              /admin/communication-hub/lifecycle-log
│   ├── Dispatch Register                /admin/communication-hub/dispatch-register
│   ├── Failed & Retry Queue             /admin/communication-hub/retry-queue
│   └── Print Queue                      /admin/communication-hub/print-queue
├── Settings              (group)
│   └── Operating Mode & Emergency Stop  /admin/communication-hub/control-center
└── Advanced Diagnostics  (group)
    ├── Pilots (Diagnostics)             /admin/communication-hub/pilots
    └── Governance & Live Control        /admin/communication-hub/governance
```

Menu source of truth: `public.app_modules` under parent
`c0110000-0000-4000-8000-000000000001` (Communication Hub).

## Route Inventory (Communication Hub)

| Route | Final Group | Action |
| --- | --- | --- |
| `/admin/communication-hub` | Overview | keep primary (simplified) |
| `/admin/communication-hub/go-live` | Go Live | keep primary |
| `/admin/communication-hub/design` | Events & Templates | keep primary |
| `/admin/communication-hub/onboarding` | Events & Templates | keep primary |
| `/admin/communication-hub/delivery-monitor` | Operations | keep primary |
| `/admin/communication-hub/requests` | Operations | keep primary |
| `/admin/communication-hub/lifecycle-log` | Operations | keep primary |
| `/admin/communication-hub/dispatch-register` | Operations | keep primary |
| `/admin/communication-hub/retry-queue` | Operations | keep primary |
| `/admin/communication-hub/print-queue` | Operations | keep primary |
| `/admin/communication-hub/control-center` | Settings | keep primary |
| `/admin/communication-hub/recipient-policy` | Settings | keep primary |
| `/admin/communication-hub/pilots` | Advanced Diagnostics | move (banner added) |
| `/admin/communication-hub/governance` | Advanced Diagnostics | move |
| `/admin/communication-hub/test-diagnostics` | Advanced Diagnostics | move |
| `/admin/communication-hub/testing/controlled-live-test` | Advanced Diagnostics | move |
| `/admin/communication-hub/safety` | Advanced Diagnostics | move (superseded by Settings/Operating Mode) |
| `/admin/communication-hub/recipient-control` | Advanced Diagnostics | deprecated — see Recipient Policy in Settings |
| `/admin/communication-hub/live-readiness/all-events` | Advanced Diagnostics | move |
| `/admin/communication-hub/production-readiness` | Advanced Diagnostics | move |
| `/admin/communication-hub/traces` | Operations (diagnostic tab) | keep, reclassified |

## Totals

- Kept in primary navigation: **11**
- Moved to Advanced Diagnostics: **9**
- Deprecated (banner + retained for compatibility): **1** (`recipient-control`)
- Redirects: **0** (deferred — legacy routes still resolve to their original pages behind a banner)

## Legacy Workflow Containment

The Pilots page (`/admin/communication-hub/pilots`) now renders a
`DeprecatedRouteBanner` in `diagnostic` mode at the top of the workspace with
a direct **Open Go Live** action. Documentation no longer describes Pilots as
the normal path.

## Overview Simplification

The former large technical directory in `CommunicationHubShell.tsx` has been
replaced with:

- Emergency Stop alert (server-derived)
- Current operating mode strip
- **Go Live** as the primary CTA
- Three secondary shortcuts (Events & Templates, Operations, Settings)
- A single de-emphasised **Advanced Diagnostics** link

## Storage and Security

- No authoritative decision is cached in `localStorage`.
- Session storage holds only the wizard step, selected module/event, and
  server-issued reference IDs (execution/certification numbers).
- Query parameters (`?module=&event=`) are informational hints; server-side
  permission checks remain authoritative on every route.

## Governance Scans (this stage)

- Menu structure test: primary groups = 5 (Go Live, Events & Templates,
  Operations, Settings, Advanced Diagnostics).
- Pilots is NOT registered in primary navigation.
- Recipient Policy remains under Settings only.
- Deprecated pages carry a visible banner with the Go Live deep link.

## Final P3 Programme Status

| Stage | Status |
| --- | --- |
| Dry Run (P3D) | `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION` |
| Controlled Live (P3E) | `P3E_STUB_CERTIFIED` |
| Unified Journey (P3F) | `P3F_CERTIFIED_WITH_LIMITATIONS` |
| Navigation (P3G) | `P3G_CERTIFIED_WITH_LEGACY_ROUTES` |

The legacy-routes classification is used because deprecated routes remain
available for compatibility but are removed from primary navigation and
carry the deprecation banner.
