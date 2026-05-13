# Adding a new embedded satellite

Satellites are external Lovable projects that render inside SocialServe's
`AppLayout` via the `<SatelliteFrame />` iframe + postMessage bridge.

## Steps

1. Add env vars:
   - `VITE_<APP>_HUB_URL`            — satellite preview / production URL
   - `VITE_<APP>_HUB_ORIGIN`         — comma-separated allow-list of origins
   - `VITE_USE_<APP>_HUB_REMOTE=true` — feature flag to swap menu URLs

2. Add a route in `src/components/routing/AppRoutes.tsx`:

   ```tsx
   <Route path="/<base>/*" element={
     <ProtectedLayout>
       <Suspense fallback={<div>Loading...</div>}>
         <SatelliteFrame app="<id>" basePath="<base>" title="<Module Title>" />
       </Suspense>
     </ProtectedLayout>
   } />
   ```

3. In the menu file, wrap the raw export:

   ```ts
   import { applyAuditRemoteRouting } from "@/lib/embed/satelliteRouting";
   const xMenuItemsRaw = [...];
   export const xMenuItems = applyXRemoteRouting(xMenuItemsRaw);
   ```

4. Add the satellite app id to `SatelliteAppId` in
   `src/lib/embed/satelliteProtocol.ts` and to URL/origin getters in
   `src/lib/embed/satelliteRouting.ts`.

5. Mirror `src/lib/embed/satelliteProtocol.ts` verbatim in the satellite repo.

## Boundaries

- One reusable host component (`SatelliteFrame`).
- No DB, auth, edge function changes.
- Iframe is the host↔satellite boundary only — never used inside a satellite.
