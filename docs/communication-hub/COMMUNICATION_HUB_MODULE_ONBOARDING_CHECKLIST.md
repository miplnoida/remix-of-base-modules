# Communication Hub — Module Onboarding Checklist

Complete per module (legal, insuredPerson, benefits, employerRegistration, compliance, or new).

## Identity
- Module name:
- Module code:
- Business owner:
- Technical owner:
- Communication events (list):
- Recipient sources:
- Sender profiles:
- Templates:
- Schedules (if any):
- Risk level:

## Registration
- [ ] Module row in `communication_hub_module_event_registry`
- [ ] Event rows registered with required tokens, recipient type, channel, risk
- [ ] Recipient resolver declared per event

## Templates
- [ ] Template authored in `core_template_master`
- [ ] Version approved and activated
- [ ] Required tokens covered by module payload

## Mapping / policies
- [ ] Event ↔ Template mapping row active
- [ ] Sender profile linked
- [ ] Send policy row present
- [ ] Review policy row present
- [ ] Recipient controls verified

## Adapter
- [ ] `src/modules/<module>/communication/<module>Communication.ts` present
- [ ] Uses `businessModuleCommunicationAdapter` façade only
- [ ] Never imports provider SDK
- [ ] Never writes to `notification_queue` / legacy tables
- [ ] Passes `moduleCode`, `eventCode`, `entityType`, `entityId`, `referenceNo`, `tokens`, `reason`, `source`, `idempotencyKey`
- [ ] Idempotency + correlation id set
- [ ] Governance lint clean

## Tests
- [ ] Adapter dry-run at `/admin/communication-hub/onboarding/module-adapter-tests`
- [ ] Dry-run produces request/message/attempt with `test_mode=true`, provider id `dry-run:*`
- [ ] Trace complete: `TEMPLATE_RESOLVED`, `MESSAGE_CREATED`, `MESSAGE_QUEUED`, `DISPATCH_STARTED`, `SENT` (dry-run variant)
- [ ] Idempotency verified (repeat blocked)
- [ ] Permission matrix verified
- [ ] All documented blockers reproduced with correct blocker codes

## Staging
- [ ] Full Part E test progression passed in staging
- [ ] Evidence template signed

## Production
- [ ] Production readiness checklist signed
- [ ] Progressive activation stages 0 → 5 planned with owner + approver
