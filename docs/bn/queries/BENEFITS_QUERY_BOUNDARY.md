# BN Benefits — Secure Query Boundary

## Why it exists

Mortality data contains coroner findings, next-of-kin PII, award
overpayment amounts, and legal-referral hints. Direct
`supabase.from('bn_mortality_event').select('*')` from the browser is
unsafe: it exposes the raw payload, bypasses field masking, and offers
no audit surface.

As of migration `20260720`, `authenticated` no longer has any grants on
the four mortality tables (`bn_mortality_event`,
`bn_mortality_event_history`, `bn_mortality_award_impact`,
`bn_mortality_referral`). Every read is now routed through the
`bn-benefits-query` edge function.

## Shape

```
Browser (hook)
  → useBenefitsQuery
    → getBenefitsQueryClient().execute(envelope)
      → supabase.functions.invoke('bn-benefits-query')
        → validate JWT
        → resolve query code against server allow-list
        → walk role_permissions
        → run hand-written handler with service role
        → mask sensitive fields
        → write bn_module_events audit row
        → return BnBenefitsQueryResult
```

## Query envelope

Client → server:

```ts
interface BnBenefitsQueryEnvelope<TParams> {
  queryCode: BnBenefitsQueryCode;      // closed enum
  queryVersion: number;
  correlationId: string;               // for tracing
  moduleCode: string;                  // 'bn_mortality'
  params: TParams;
  page?: { pageSize?: number; pageToken?: string | null };
  actorHint?: { actorUserId?: string; actorUserCode?: string }; // telemetry only
}
```

Server → client:

```ts
interface BnBenefitsQueryResult<TData> {
  status: 'OK' | 'DENIED' | 'INVALID' | 'NOT_FOUND' | 'FAILED';
  correlationId: string;
  queryCode: string;
  queryVersion: number;
  data: TData | null;
  page?: { pageSize: number; nextPageToken: string | null; totalCount: number | null };
  errors: BnBenefitsQueryError[];
  maskedFields: string[];
  warnings: string[];
}
```

## Registered query codes (Mortality)

`BN_MORTALITY_GET_SUMMARY`, `BN_MORTALITY_LIST_EVENTS`,
`BN_MORTALITY_GET_EVENT`, `BN_MORTALITY_SEARCH_PERSON_MATCHES`,
`BN_MORTALITY_GET_AFFECTED_AWARDS`, `BN_MORTALITY_GET_EVENT_HISTORY`,
`BN_MORTALITY_GET_REFERRALS`, `BN_MORTALITY_GET_AWARD_IMPACTS`,
`BN_MORTALITY_GET_EVIDENCE_LINKS`, `BN_MORTALITY_GET_COMMUNICATIONS`.

Unknown codes fail closed at the edge function with
`QUERY_CODE_UNKNOWN`. Adding a code is a four-step change:

1. Add to `src/types/bn/queries/queryCodes.ts`.
2. Add a descriptor (capability + masked fields + max page size) to
   `src/services/bn/queries/benefitsQueryRegistry.ts`.
3. Implement a hand-written handler in the edge function.
4. Publish a DTO under `src/types/bn/mortality/mortalityDtos.ts`.

## Sensitive-field masking

Every descriptor declares `sensitiveFields`. Callers WITHOUT the module
`:admin` capability have those fields nulled server-side and the field
names echoed in `result.maskedFields`. Default sensitive categories:

- Raw source payload / external system JSON.
- Person PII beyond display name (`nationalIdMasked`, `dateOfBirth`,
  `contact`).
- Internal diagnostics (`diagnostics`, `matchScore`,
  `verificationNotes`).
- Financial impact detail (`overpaymentAmountMinor`, `ledgerDetail`).

## Authorisation

- JWT presence is required (no anonymous reads).
- Caller capabilities are walked from `role_permissions` server-side.
  Client-supplied `actorHint` is **never** used for authorisation.
- Any of the descriptor's `anyOfCapabilities` is sufficient.

## Audit

Every executed query writes one row to `bn_module_events`
(`event_type = 'query.executed'`) with correlation id, actor, page
window, and the list of masked fields. Audit rows are append-only.

## Test invariants

- No file under `src/**` (except this boundary) may `.from('bn_mortality_*')`
  directly — enforced by an architecture test.
- The registry in `benefitsQueryRegistry.ts` and the switch in the edge
  function stay in lock-step — enforced by a contract test.
