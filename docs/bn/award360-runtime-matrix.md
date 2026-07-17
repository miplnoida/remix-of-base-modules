# Award 360 — Runtime Certification Matrix

Certification against static + mock harness (schema-aware). Live in-browser sweep is tracked separately; this matrix records what has been proven under CI.

## Method

- **Schema map:** Column allow-lists derived from live DB (see `award360-query-matrix.md`).
- **Column guard:** `summarySchemaAlignment.test.ts` + `award360SchemaCertification.test.ts` reject any `.eq/.order/.not/.contains/.lt/.lte/.gte/.in/.neq` on an unknown column.
- **Mutation guard:** `safety.test.ts` scans the Award 360 tree for direct writes.
- **Permission guard:** `medicalReviewHookAccess.test.tsx`, `auditHookAccess.test.tsx`, `tabAccessEnforcement.test.ts`, `adminTabAccess.test.ts`.
- **Lazy activation:** shell tests assert deep tabs do not fire until active (`shell.test.tsx`).

## Result

| Tab | Column guard | Mutation guard | Permission guard | Lazy activation |
|-----|--------------|----------------|------------------|-----------------|
| overview           | PASS | PASS | PASS | PASS |
| pensioner          | PASS | PASS | PASS | PASS |
| claim              | PASS | PASS | PASS | PASS |
| product            | PASS | PASS | PASS | PASS |
| beneficiaries      | PASS | PASS | PASS | PASS |
| schedule           | PASS | PASS | PASS | PASS |
| payments           | PASS | PASS | PASS | PASS |
| life-certificates  | PASS | PASS | PASS | PASS |
| medical            | PASS | PASS | PASS | PASS |
| suspensions        | PASS | PASS | PASS | PASS |
| overpayments       | PASS | PASS | PASS | PASS |
| communications     | PASS | PASS | PASS | PASS |
| audit              | PASS | PASS | PASS | PASS |

## Known-good column fixtures

Any drift from the live DB must (a) update the schema map in the test, (b) update `award360-query-matrix.md`, (c) update the service select strings — in one changeset. A missing update triggers a red test.

## Unavailable-source policy

If a source tab fails at runtime, its `SectionResult` becomes `unavailable` with a reason string. The tab renders the operational data available and shows a partial-data banner listing the missing sources. No source failure can cascade and blank the whole tab.
