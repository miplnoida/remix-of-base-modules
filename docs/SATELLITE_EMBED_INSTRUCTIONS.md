# Satellite embed configuration (no env vars)

The host SocialServe and both satellite projects use **checked-in config files**
instead of `VITE_*` build env vars. This works in Lovable preview, published
`.lovable.app`, and the custom `*.secureserve.biz` domains with no Build
Secrets and no workspace coordination.

## Host (this project)

Edit `src/config/satellites.ts` to:
- Toggle a satellite on/off via `enabled`.
- Add additional preview/production URLs.
- Add additional allowed origins to the `allowedOrigins` array (origins NOT in
  the list are silently rejected by the postMessage bridge — always add both
  the preview and the published origin).

`pickSatelliteUrl()` automatically picks the preview URL when the host itself
is on a `*.lovable.app` domain, and the production URL otherwise.

## Satellites (Integrated Compliance Hub & Internal Audit)

Each satellite has `src/config/host.ts` with the list of host origins it
trusts. When SocialServe gets a new public origin (e.g. another custom
domain), append it to that array in **both** satellite repos and republish.

Currently allowed host origins:

```
https://id-preview--455cbbae-c40e-4f3f-af49-d9ed99089948.lovable.app
https://social-wellspring-app.lovable.app
https://admin.secureserve.biz
```

## Paste-in for each satellite (one shot)

Use this single prompt inside **each** satellite project:

> Create `src/config/host.ts` with the following exact contents:
>
> ```ts
> /**
>  * Origins of the SocialServe host that are allowed to send postMessage
>  * commands to this satellite. Add any new public host origin here and
>  * republish. Hard-coded (instead of VITE_HOST_ORIGIN) so it works on
>  * Lovable preview, published .lovable.app, and custom domains without
>  * workspace Build Secrets.
>  */
> export const ALLOWED_HOST_ORIGINS: string[] = [
>   'https://id-preview--455cbbae-c40e-4f3f-af49-d9ed99089948.lovable.app',
>   'https://social-wellspring-app.lovable.app',
>   'https://admin.secureserve.biz',
> ];
> ```
>
> Then update `src/lib/embed/hostBridge.ts`:
> - Add `import { ALLOWED_HOST_ORIGINS } from '@/config/host';` at the top.
> - Replace the body of `getAllowedHostOrigins()` (which currently parses
>   `VITE_HOST_ORIGIN`) with `return [...ALLOWED_HOST_ORIGINS];`.
> - Remove any reference to `VITE_HOST_ORIGIN` from `docs/EMBED_MODE.md`.
>
> Do not touch `src/integrations/supabase/*`, `.env`, or
> `supabase/config.toml`. Do not change the standalone-mode behavior, the
> postMessage protocol, or any DB / edge function.

## Why no `.env` / Build Secrets?

- Lovable's `.env` is auto-generated and reserved for Supabase keys.
- Build Secrets are workspace-scoped — sharing a value across host +
  satellites requires them in the same workspace, and the same name applies
  to every project in that workspace.
- Hard-coded config is reviewable in code, survives republishes, and avoids
  silent failures when a build secret is missing.
