# Legal Orders & Judgments — State Machine

Applies to `public.lg_order`. Enforced by `src/services/legal/lgOrderStateMachine.ts` and used by every write path (create dialog, tab actions, registry page).

## States

| Code       | Meaning                                                                 |
|------------|-------------------------------------------------------------------------|
| `DRAFT`    | Order captured internally but not yet lodged with the court.            |
| `FILED`    | Filed with the court, awaiting decision.                                |
| `GRANTED`  | Court granted / issued the order.                                       |
| `ACTIVE`   | Order in force; being monitored for compliance.                         |
| `COMPLIED` | Party satisfied all terms.                                              |
| `BREACHED` | Compliance failure detected; may trigger enforcement / recovery action. |
| `CLOSED`   | Terminal state; order concluded (complied, vacated, superseded, etc.).  |

## Allowed transitions

```
DRAFT    → FILED, CLOSED
FILED    → GRANTED, CLOSED
GRANTED  → ACTIVE, CLOSED
ACTIVE   → COMPLIED, BREACHED, CLOSED
COMPLIED → CLOSED
BREACHED → ACTIVE, CLOSED
CLOSED   → (terminal)
```

Any invalid transition is rejected by `assertLgOrderTransition` with a user-readable message.

## Date stamps

`changeLgOrderStatus` automatically stamps the corresponding date column the first time the state is entered:

| Transition to | Column set        |
|---------------|-------------------|
| `FILED`       | `filed_date`      |
| `GRANTED`     | `granted_date`    |
| `COMPLIED`    | `complied_date`   |
| `BREACHED`    | `breached_date`   |
| `CLOSED`      | `closed_date`     |

`issued_date`, `effective_date`, `expiry_date`, `compliance_date` and `hearing_id` are captured at creation and editable.

## Links

- `lg_case_id` → parent legal case (required)
- `hearing_id` → optional link to `lg_hearing`
- `payment_arrangement_id` → optional link into recovery pipeline (used when moving to `ACTIVE` / `BREACHED`)
- `enforcement_ref` → free-text enforcement reference (writ, execution number, etc.)

## Audit

Every create, update and status change writes to `lg_case_activity` via `logLgActivity`, using activity types:

- `ORDER_CREATED`
- `ORDER_UPDATED`
- `ORDER_FILED`, `ORDER_GRANTED`, `ORDER_ACTIVE`, `ORDER_COMPLIED`, `ORDER_BREACHED`, `ORDER_CLOSED`

## Validations

Enforced client-side in `AddOrderDialog`:

- Order type and order date are required.
- Expiry date must not be before order date.
- Compliance date must not be before order date.
- Ordered amount cannot be negative.
