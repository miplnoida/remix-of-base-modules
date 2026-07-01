# Scope Precedence Hierarchy

Applies to every configuration domain resolved by `core_configuration_assignment`
(communication, workflow, numbering, branding, reporting, AI, …).

## Precedence order (most specific wins)

```
1. USER               user_id
2. WORKFLOW_STAGE     workflow_code + stage_code (+ optional module_code)
3. WORKFLOW           workflow_code             (+ optional module_code)
4. LOCATION           location_id               (+ optional department_code / module_code)
5. DEPARTMENT         department_code           (+ optional module_code)
6. MODULE             module_code
7. ORG                organization_id (implicit — single tenant today)
8. GLOBAL             system default (seeded)
```

Resolution walks 1 → 8 and returns the first active row whose:

- `domain` matches
- `business_event` matches (or is NULL = wildcard)
- `resource_type` matches
- `scope_ref` keys are all satisfied by the caller's `scopeHints`
- `is_active = true`
- `now()` between `effective_from` and `effective_to` (NULLs = open ended)
- `rule_set` conditions (channel, language, custom predicate) match the request

## Tie-breaking within a tier

Within a single scope tier (e.g. two DEPARTMENT rows both match), the highest
`priority` wins; ties broken by most recent `effective_from`.

## Fallback

If no row matches at any tier, the resolver returns the domain's registered
**system default** (seeded at GLOBAL scope). Modules never hard-code fallbacks.

## Caller contract

Callers pass **intent**, never artifacts:

```ts
resolve({
  domain: 'communication',
  businessEvent: 'legal.notice.issued',
  resourceType: 'TEMPLATE',
  scopeHints: { userId?, workflowCode?, stageCode?, locationId?, departmentCode?, moduleCode? },
});
```

The resolver returns the picked row plus a **trace** showing which tier and
which row won, and which tiers were considered and skipped. The Configuration
Center's runtime preview renders this trace verbatim.

## Invariants

- No domain may add its own precedence rules — the order above is universal.
- `scope_ref` keys are additive filters, never OR'd.
- `GLOBAL` rows must exist for every (domain, business_event, resource_type)
  triple that any module resolves; missing GLOBAL = configuration bug, surfaced
  in Validation & Impact.
