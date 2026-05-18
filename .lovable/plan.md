## Findings

The app itself is rendering correctly in the Lovable sandbox: `/login` displays the login screen with no React runtime error.

The blank page seen in the uploaded screenshot is not a React crash. The only visible network error is this request:

```text
/site.webmanifest -> redirected to /auth-bridge -> blocked by CORS
```

That happens when viewing a protected preview URL that requires Lovable preview authentication. The manifest request is being redirected to Lovable’s auth bridge instead of returning the manifest JSON. Browser devtools shows it as a red failed request, but it does not stop the app from rendering.

I also checked the published/custom domain response. The custom domain loads HTML and assets successfully, but the currently published build is still the older large bundle:

```text
/assets/index-In9sryZg.js = 14.3 MB
```

That means the optimized lazy-loaded build has not yet gone live on the published/custom-domain deployment. This matches the earlier publish failures: the preview/build can work, while the live deployment remains stale.

## Fix plan

1. **Remove the PWA manifest from `index.html`**
   - Remove only `<link rel="manifest" href="/site.webmanifest" />`.
   - Keep favicons, theme color, title, and meta tags.
   - This stops the misleading preview auth-bridge/CORS manifest failure and removes a blank-check red herring.

2. **Keep the previous lazy-route optimization intact**
   - Do not revert `AppRoutes.tsx`.
   - The sandbox already shows that the app can render after the lazy-loading refactor.

3. **Verify the dev preview after the manifest removal**
   - Open `/login` again.
   - Confirm there are no blocking JavaScript errors.
   - Confirm the login screen renders.

4. **Republish after the change**
   - The published/custom domain currently serves an old 14.3 MB main bundle.
   - After successful publishing, the live HTML should point to the new optimized chunks, with the main JS bundle much smaller than 14 MB.

5. **If publish still fails after this cleanup**
   - Treat it as a Lovable publishing pipeline issue rather than a frontend runtime blank page.
   - The next escalation would be checking publish/deployment logs from Lovable support because the app preview renders and the production assets are reachable, but the publish action is not replacing the stale deployment.

## Files to change

- `index.html` only

## What will not change

- No database changes
- No authentication logic changes
- No route or UI behavior changes
- No generated Lovable Cloud client/type files