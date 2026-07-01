# Configuration Assignment Engine

Generic engine that resolves *"which configured resource applies at this scope
for this business event?"* across every domain in the platform.

## Table

`public.core_configuration_assignment` — see `.lovable/plan.md` §"Generic
Configuration Assignment Engine" for the column contract.

## Domains (v1)

| Domain          | Business event examples                | Resource types |
|-----------------|----------------------------------------|----------------|
| `communication` | `legal.notice.issued`, `bn.claim.approved` | `TEMPLATE`, `MEDIA_ASSET`, `LETTERHEAD`, `SIGNATURE`, `TEXT_BLOCK` |
| `workflow`      | `employer.registration.submitted`       | `WORKFLOW_TEMPLATE` |
| `numbering`     | `document.receipt`, `document.notice`   | `NUMBER_SEQUENCE` |
| `branding`      | `portal.render`                         | `THEME`, `LOGO` |
| `reporting`     | `report.employer.summary`               | `REPORT_TEMPLATE` |
| `ai`            | `ai.summarize.case`                     | `AI_MODEL`, `AI_PROMPT` |

New domains register by inserting seed rows only — no schema change.

## Consumer contract

```ts
import { resolveConfiguration } from '@/lib/configuration/resolver';

const res = await resolveConfiguration({
  domain: 'communication',
  businessEvent: 'legal.notice.issued',
  resourceType: 'TEMPLATE',
  scopeHints: { moduleCode: 'LEGAL', departmentCode: 'DEBT', workflowCode: 'LG_NOTICE_V1' },
});
// res.resource      → { id, code, ... }
// res.rule_set      → { channel, language, ... }
// res.trace         → [{ tier, matched, reason }...]
```

Communication resolver (Phase 5) becomes a thin adapter over this.

## Configuration Center (Phase 5 UI)

Single grid: `domain` × `business_event` × `scope` × `resource`. Filters:
domain, module, department, workflow. Row actions: edit rule_set, disable,
schedule, "Test resolve" (opens the runtime preview with the exact trace).

## Backward compatibility

- Phase 1 creates the table empty. Nothing consumes it yet.
- Phase 5 introduces `comm_asset_assignment_v` view over the engine so legacy
  readers keep working while modules migrate.
- Phase 7 flips `resolveCommunication()` to engine-only behind a feature flag,
  removed in Phase 8.
