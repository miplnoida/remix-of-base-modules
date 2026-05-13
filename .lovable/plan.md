## Goal

Eliminate the unreliable `import.meta.env.VITE_*` reads for the satellite embed bridge by hard-coding the URLs/origins/flags in versioned config modules. This works immediately in Lovable preview, published `.lovable.app`, and the custom `*.secureserve.biz` domains — no Build Secrets needed.

## Known URLs

| Project | Preview URL | Production URL |
|---|---|---|
| SocialServe (host) | `https://id-preview--455cbbae-c40e-4f3f-af49-d9ed99089948.lovable.app` | `https://admin.secureserve.biz` (also `https://social-wellspring-app.lovable.app`) |
| Integrated Compliance Hub | `https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app` | `https://compliance.secureserve.biz` |
| SocialServe-Internal Audit | `https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app` | `https://internalaudit.secureserve.biz` |

## 1. Host (SocialServe) — this project

**New file:** `src/config/satellites.ts`

```ts
export const SATELLITE_CONFIG = {
  compliance: {
    enabled: true,
    // Pick prod URL when host is on a non-preview origin, else preview URL.
    url: {
      preview: "https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app",
      production: "https://compliance.secureserve.biz",
    },
    allowedOrigins: [
      "https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app",
      "https://compliance.secureserve.biz",
    ],
  },
  audit: {
    enabled: true,
    url: {
      preview: "https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app",
      production: "https://internalaudit.secureserve.biz",
    },
    allowedOrigins: [
      "https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app",
      "https://internalaudit.secureserve.biz",
    ],
  },
} as const;

export const pickSatelliteUrl = (
  cfg: { url: { preview: string; production: string } },
): string => {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isPreview = host.includes("id-preview--") || host.endsWith("lovable.app");
  return isPreview ? cfg.url.preview : cfg.url.production;
};
```

**Edit:** `src/lib/embed/satelliteRouting.ts` — replace the `import.meta.env.*` reads in `getComplianceHubUrl`, `getAuditHubUrl`, `getComplianceHubAllowedOrigins`, `getAuditHubAllowedOrigins`, `isComplianceRemoteEnabled`, `isAuditRemoteEnabled` with values from `SATELLITE_CONFIG` + `pickSatelliteUrl`. Remote-enabled flags become `SATELLITE_CONFIG.compliance.enabled` / `.audit.enabled`.

No other host changes needed — `SatelliteFrame`, menu rewrites, and `AppRoutes` keep working through the same getters.

## 2. Satellite (Integrated Compliance Hub)

**New file:** `src/config/host.ts`

```ts
export const ALLOWED_HOST_ORIGINS = [
  "https://id-preview--455cbbae-c40e-4f3f-af49-d9ed99089948.lovable.app",
  "https://social-wellspring-app.lovable.app",
  "https://admin.secureserve.biz",
];
```

**Edit:** `src/lib/embed/hostBridge.ts` — replace `getAllowedHostOrigins()` body to `return ALLOWED_HOST_ORIGINS;` (drop the `VITE_HOST_ORIGIN` parsing). Remove the env-var doc reference in `docs/EMBED_MODE.md`.

## 3. Satellite (SocialServe-Internal Audit)

Same change as #2: create `src/config/host.ts` with the identical three host origins, and point `hostBridge.ts` at it.

## 4. Documentation

Update `docs/SATELLITE_EMBED_INSTRUCTIONS.md` and `docs/SATELLITE_HOST_INTEGRATION.md` to:
- Remove the "set `VITE_*` env vars" sections.
- Replace with "edit `src/config/satellites.ts` (host) / `src/config/host.ts` (satellite) and add the new origin to the relevant array, then republish."

## What I will NOT touch

- `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml` — untouched.
- No DB / edge-function / auth changes.
- Satellite repos: I cannot edit them directly from this project; I will produce the exact two-file paste-in for each (file path + full contents) at the end so you can drop them into each satellite in one shot.

## Deliverable for satellites

After approval, I will print a ready-to-paste prompt containing:
1. The full `src/config/host.ts` file contents.
2. The exact `hostBridge.ts` patch (search/replace block) that swaps the env read for the import.

You then paste that prompt once into each satellite project. No env vars, no Build Secrets, no workspace coordination required.
