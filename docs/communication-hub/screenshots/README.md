# Communication Hub — Screenshots

Real application screenshots go here. Every file MUST be captured from the running app (Playwright or the browser dev tools), never mocked or AI-generated.

## Naming
```
<figure-number>_<route-slug>_<env>_<commit-short>.png
# e.g. 01_control-center_staging_a1b2c3d.png
```

## Caption (record next to each file, e.g. in this README or a sibling `.md`)
- Figure number
- Route
- Environment
- Commit SHA
- Module / event (if relevant)
- Capture date
- What to verify
- Risk warning (if relevant)

## Automation
Run `bunx playwright test e2e/communication-hub-manual-screenshots.spec.ts` against an authenticated preview to populate this folder. The spec requires:

```
MANUAL_TEST_BASE_URL
MANUAL_TEST_EMAIL
MANUAL_TEST_PASSWORD
MANUAL_SCREENSHOT_OUTPUT_DIR=docs/communication-hub/screenshots
```

Screenshots that cannot be captured must be recorded here with:
- Actual route
- Environment
- Blocker (missing permission / data / migration / configuration)
- Corrective action

**Do NOT send a real production live communication just to obtain a screenshot.**
