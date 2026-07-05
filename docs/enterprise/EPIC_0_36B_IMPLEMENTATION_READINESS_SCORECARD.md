# Epic 0.36B — Implementation Readiness Scorecard

**Status:** Read-only audit.

Traffic-light scorecard per enterprise domain, scored on nine dimensions. Percentages are indicative synthesis of the matrices in this epic.

Scoring per dimension (0 / 25 / 50 / 75 / 100). Overall is a straight average.

Traffic light: 🟢 ≥ 80 % · 🟡 50–79 % · 🔴 < 50 %.

| # | Domain | Arch | Master Data | Routes | Pages | Services | Hooks | APIs | Testing | Docs | Overall | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Platform Foundation | 100 | 100 | 100 | 100 | 100 | 75 | 100 | 50 | 100 | **92 %** | 🟢 |
| 2 | Organisation | 100 | 50 | 50 | 50 | 50 | 25 | 50 | 25 | 75 | **53 %** | 🟡 |
| 3 | Identity | 100 | 75 | 100 | 100 | 75 | 50 | 100 | 50 | 75 | **81 %** | 🟢 |
| 4 | Authorisation / RBAC | 100 | 50 | 50 | 50 | 50 | 50 | 50 | 25 | 75 | **56 %** | 🟡 |
| 5 | Location / Geography (SSP) | 100 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 75 | **39 %** | 🔴 |
| 6 | Legal Reference (SSP) | 100 | 50 | 50 | 50 | 50 | 25 | 50 | 25 | 75 | **53 %** | 🟡 |
| 7 | Payment Channel / Bank (SSP) | 100 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 75 | **39 %** | 🔴 |
| 8 | ID Rules / Address / Participant (SSP) | 100 | 25 | 0 | 0 | 25 | 25 | 25 | 25 | 75 | **33 %** | 🔴 |
| 9 | Reference Data | 100 | 50 | 75 | 75 | 50 | 25 | 50 | 25 | 75 | **58 %** | 🟡 |
| 10 | Document Type Master | 100 | 50 | 50 | 50 | 50 | 25 | 50 | 25 | 75 | **53 %** | 🟡 |
| 11 | Workflow | 100 | 25 | 50 | 25 | 25 | 25 | 25 | 25 | 75 | **42 %** | 🔴 |
| 12 | Notification | 100 | 50 | 75 | 75 | 50 | 25 | 50 | 25 | 75 | **58 %** | 🟡 |
| 13 | Document Management | 100 | 75 | 75 | 50 | 75 | 50 | 75 | 25 | 75 | **67 %** | 🟡 |
| 14 | Audit & Traceability | 100 | 75 | 100 | 75 | 75 | 25 | 50 | 25 | 75 | **67 %** | 🟡 |
| 15 | Person (subject) | 100 | 25 | 50 | 50 | 50 | 25 | 50 | 25 | 75 | **50 %** | 🟡 |
| 16 | Employer | 100 | 25 | 50 | 50 | 50 | 25 | 50 | 25 | 75 | **50 %** | 🟡 |
| 17 | Scheme / Coverage | 100 | 50 | 75 | 75 | 50 | 50 | 50 | 25 | 75 | **61 %** | 🟡 |
| 18 | Contribution | 100 | 50 | 75 | 75 | 50 | 50 | 50 | 25 | 75 | **61 %** | 🟡 |
| 19 | Benefit | 100 | 75 | 100 | 100 | 75 | 100 | 75 | 50 | 100 | **86 %** | 🟢 |
| 20 | Compliance & Enforcement | 100 | 75 | 100 | 100 | 75 | 75 | 75 | 50 | 100 | **83 %** | 🟢 |
| 21 | Legal | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 75 | 100 | **97 %** | 🟢 |
| 22 | Finance | 100 | 25 | 50 | 50 | 50 | 25 | 25 | 25 | 50 | **44 %** | 🔴 |

## Aggregate

- 🟢 Green: 5 domains (Platform Foundation, Identity, Benefit, Compliance, Legal)
- 🟡 Amber: 12 domains
- 🔴 Red: 5 domains (Location, Payment/Bank, ID Rules/Address/Participant, Workflow, Finance)

Weighted enterprise readiness ≈ **60 %** — the platform *runs*; the *foundation for further composition* (SSP, Workflow, Notification, Finance) is the drag.

## Gate map

| Gate | Green? | Blocking capability |
|---|---|---|
| Foundational admin (Platform, Identity, Audit) | ✅ Yes | — |
| Live modules (BN, CE, LG, C3) | ✅ Yes | — |
| SSP extraction | 🔴 No | Country / Payment / Legal-Ref / ID Rules — Epics 0.36C / 0.36D |
| Shared Workflow / Notification | 🔴 No | Epic 0.37 |
| Org Document Master | 🟡 Partial | Epic 0.38 |
| Person / Employer consolidation | 🟡 Partial | Epic 0.38 |
| BN Consumption Refactor | 🔴 No | Epic 0.39 |
| BN Product Builder resumption | 🔴 No | Epic 0.40 (after all above) |

## Roadmap projection

```text
Epic 0.36C  Migration Planning (SSP extraction)
Epic 0.36D  Shared Service Layer (read-only SSP facades + Reference Data consolidation)
Epic 0.37   Organisation Foundation + Workflow/Notification consolidation + Authorisation refactor
Epic 0.38   Org Document Master + Person/Employer consolidation
Epic 0.39   BN Consumption Refactor
Epic 0.40   BN Product Builder (resumes)
```

This roadmap is the authoritative order for the next phase and matches Epics 0.35, 0.36A, and 0.36A.2.
