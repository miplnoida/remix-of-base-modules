# Communication Hub — Operator Navigation Guide

> **The normal workflow:** Configure the event in **Events & Templates**,
> maintain policies in **Settings**, prepare and certify the event through
> **Go Live**, and monitor results in **Operations**. **Advanced
> Diagnostics** is reserved for authorised technical investigation.

## Primary Groups

1. **Go Live** — the single guided journey for readiness, preview, dry test,
   controlled live test, and certification review.
2. **Events & Templates** — event configuration and template mapping,
   library, versions and branding.
3. **Operations** — read-first monitoring of delivery, requests, dispatch
   register, retry queue and lifecycle events.
4. **Settings** — operating mode, emergency stop, recipient policy, send
   policies, sender profiles and provider settings.
5. **Advanced Diagnostics** — Pilots, event validation console, rehearsal,
   manual dispatch test, admin test notice, live-window setup, queue and
   dispatcher inspection.

## What operators should never repeat

- Recipient policy, sender, provider, event → template mapping, channel and
  operating-mode flags are configured **once** in Settings or Events &
  Templates. Go Live resolves them from authoritative server state.
- Advanced Diagnostics may inspect these values but must not create a
  competing normal configuration path.

## Deep links into Go Live

Pages such as Event Configuration or Template Mapping may open Go Live with
context:

```
/admin/communication-hub/go-live?module=<module>&event=<event>
```

The Go Live page validates these values against authorised server data.
Query parameters are informational, never authorisation.

## Terminology

Prefer operator-facing terms: **Go Live**, **Preview Approval**, **Dry
Test**, **Controlled Live Test**, **Delivery Status**, **Certification**.
Internal terms (dispatcher, queue claim, grant reservation, evaluator, live
window, mutation gate, runtime harness) are restricted to Advanced
Diagnostics and technical evidence.
