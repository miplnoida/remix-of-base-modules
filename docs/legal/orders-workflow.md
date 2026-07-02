# Legal Orders & Judgments — Workflow

Companion to `docs/legal/legal-order-state-machine.md`.

## Data model

| Table                    | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `lg_order`               | Court orders and judgments (typed, versioned by status)  |
| `lg_hearing`             | Optional link via `lg_order.hearing_id`                  |
| `ce_payment_arrangements`| Optional link via `lg_order.payment_arrangement_id`      |
| `lg_case_activity`       | Full audit trail (ORDER_CREATED, ORDER_UPDATED, ORDER_*) |
| `lg_fee_charge`          | Auto fees fired on `JUDGMENT_RECORDED`                   |

Core columns on `lg_order`: `order_no`, `order_type_code`, `issued_by_court`,
`issued_date`, `effective_date`, `expiry_date`, `compliance_date`,
`ordered_amount`, `terms`, `status`, plus lifecycle stamps
(`filed_date`, `granted_date`, `complied_date`, `breached_date`, `closed_date`)
and recovery links (`enforcement_ref`, `payment_arrangement_id`).

## Screens

| Screen                          | Route                                | Purpose                                          |
| ------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Court Orders & Judgments (grid) | `/legal/court-orders`                | Global live registry with filters + status change|
| Case 360 → Orders tab           | `/legal/lg/cases/:id?tab=orders`     | Case-scoped orders, add / edit / transition      |

Legacy `/legal/orders` (`LegalOrderRegistry`) is retired and redirects to
`/legal/court-orders`. See `docs/legal/deprecation-notes.md`.

## Actions & guards

All mutations go through `src/services/legal/lgOrderService.ts`:

| Action                | Function                       | Guards                                          |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| Create                | `createLgOrder`                | `useLgAccess().can("createOrder")`              |
| Update details        | `updateLgOrder`                | `useLgAccess().can("editOrder")`                |
| Change status         | `changeLgOrderStatus`          | `assertLgOrderTransition`, capability per state |
| Link to arrangement   | `linkLgOrderPaymentArrangement`| Manager / Admin                                 |

State transitions and per-target capabilities are documented in
`docs/legal/legal-order-state-machine.md`. Every mutation writes to
`lg_case_activity`.

## Compliance & recovery hand-off

- Moving an order to **ACTIVE** allows linking a payment arrangement
  (`payment_arrangement_id`); breach on the arrangement propagates to
  `BREACHED` via the Recovery Workbench.
- **BREACHED** unlocks the "Trigger enforcement task" action on the case
  Recovery tab (Phase 7) which creates a task + records
  `enforcement_ref`.
- **COMPLIED** / **CLOSED** stamps the corresponding date columns
  automatically the first time they are entered.

## Empty / loading / error states

- Registry and Case 360 tab render via `LgDataGrid` (built-in loading,
  empty, and error UI).
- Status dialog rejects invalid transitions client-side with the message
  from `assertLgOrderTransition`.
