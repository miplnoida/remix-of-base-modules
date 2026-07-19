# State-Machine Conventions

Every gap-module aggregate follows the same lifecycle scaffold:

1. **Codes are stable strings** in `SCREAMING_SNAKE_CASE`, versioned per
   aggregate (never renamed; only deprecated + superseded).
2. **Transitions are declarative** — a `{ from, to, command, requiredCap }[]`
   table stored alongside the handler. Never encoded only in triggers.
3. **Illegal transitions return** `status = REJECTED` with code
   `INVALID_STATE_TRANSITION` — never HTTP 500.
4. **Terminal states are annotated** (`isTerminal: true`) and refuse all
   further commands with `STATE_TERMINAL`.
5. **Every transition writes** an audit row with `before.status` and
   `after.status`.

## Canonical scaffolds (delivered in later slices)

| Aggregate                        | Draft states (illustrative)                |
| -------------------------------- | ------------------------------------------ |
| `bn_mortality_notification`      | `RECEIVED → VERIFIED → APPLIED → CLOSED`   |
| `bn_overpayment`                 | `DETECTED → CALCULATED → NOTIFIED → IN_RECOVERY → RECOVERED / WRITTEN_OFF` |
| `bn_appeal`                      | `LODGED → ACCEPTED → SCHEDULED → HEARD → DECIDED → REMEDIED` |
| `bn_means_test`                  | `INITIATED → EVIDENCED → ASSESSED → REVIEWED` |
| `bn_risk_case`                   | `FLAGGED → TRIAGED → INVESTIGATED → REFERRED / CLEARED` |
| `bn_uprating_run`                | `DRAFT → SCHEDULED → APPLIED → RECONCILED` |

The pipeline is agnostic to the specific state graph; handlers own it.
