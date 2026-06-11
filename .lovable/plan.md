## Current finding

Your screenshots are correct: the page you are seeing does not include the complete updated simulator UI. It shows only the older/partial controls:

- Period dropdown
- Live Data / Reset / Run Simulation / Export
- No visible `Scan last 12 months`
- No visible `Matches only`
- No `Data Coverage` card before employer selection
- The layout is still the old two-card arrangement until more content appears

I checked the current source code, and the missing controls are already present in `src/pages/compliance/tools/RuleSimulator.tsx`, and the active route points to that file. So this is not a normal browser cache issue and not a wrong route issue. The preview/deployed page is serving a stale/partial build compared with the current source.

## Plan

### 1. Force a real source-level change on the active simulator screen
Make a small, visible versioned update in the active `RuleSimulator` component so the preview build must invalidate and reload the module. This will not publish to the live/client URL.

Add a small version marker in the dry-run banner or header, for example:

`Test Preview UI v2 — period scan + coverage enabled`

This gives us an immediate visual proof that the correct source is being served.

### 2. Re-layout the simulator toolbar so the missing controls cannot be hidden
The current controls can wrap awkwardly in the header area. I will adjust the simulator header into clear grouped rows:

- Row 1: title and dry-run context
- Row 2: rule filter, period selector, Live/Manual toggle
- Row 3: `Scan last 12 months`, `Matches only`, Reset, Run Simulation, Export

This makes the controls visible even at the screenshot viewport size.

### 3. Show `Data Coverage` immediately before employer selection
Ensure the `Data Coverage` card is always visible in the left panel, even when no employer is selected, with the message:

`Select an employer to see which rules can be evaluated.`

This is already implemented in the component, but the preview is not showing it; the forced rebuild plus layout adjustment should make it visible.

### 4. Keep the simulator strictly dry-run only
No Save Run button will be restored. The simulator remains read-only and will not create violations, ledger entries, notices, or escalations.

### 5. Verify Manual Violation Entry separately
Check that `/compliance/violations/manual-entry` uses the employer picker instead of free-text Employer ID. If the preview is also stale there, apply the same visible version marker/rebuild approach to that page.

### 6. Verification after implementation
After approval, I will verify in the preview route:

`/compliance/admin/tools/rule-simulator`

Acceptance checks:

- The page shows the version marker.
- `Scan last 12 months` is visible.
- `Matches only` is visible.
- `Data Coverage` card is visible before selecting an employer.
- `Save Run` is not visible.
- The active URL remains the preview/test URL; no live publish is performed.

## Important note about URLs

I will not publish to the client-facing live URL. The work will target the editor/test preview only. The published `preview--social-wellspring-app.lovable.app` style URL will continue to show the last published deployment unless you explicitly publish later.