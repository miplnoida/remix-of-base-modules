# Epic 2.1 — Entity Relationship Map

Conceptual only. No schema. Arrows denote canonical read direction (consumer → provider) via the shared façade.

```text
                            +------------------+
                            |    Scheme        |  (Missing → new canonical)
                            +---------+--------+
                                      |
                                      v
+-----------+     +-------------------+-------------------+     +----------------+
|  Member   |<----+  Scheme Membership (derived → new)    +---->| Benefit        |
| (Legacy   |     +----+-----------------------+----------+     | Category       |
|  ip_*)    |          |                       |                +--------+-------+
+-----+-----+          |                       |                         |
      |                v                       v                         v
      |         +------+------+        +-------+--------+        +-------+--------+
      |         | Employment  |        | Contribution   |        | Benefit        |
      |         | (adapter    |        | Type           |        | Product        |
      |         |  v_employ..)|        | (reference)    |        | (bn_* façade)  |
      |         +------+------+        +-------+--------+        +-------+--------+
      |                |                       |                         |
      |                v                       v                         v
      |         +------+------+        +-------+--------+        +-------+--------+
      |         |  Employer   |        | Contribution   |        |   Claim        |
      |         | (Legacy er_*|<-------+ Period         +------->|  (bn_claim)    |
      |         |  → adapter) |        | (cn_* adapter) |        +-------+--------+
      |         +------+------+        +-------+--------+                |
      |                |                       |                         v
      |                |                       v                 +-------+--------+
      |                |               +-------+--------+        |     Award      |
      |                |               | Payment (in)   |        |  (bn_award)    |
      |                |               |  cn_* adapter  |        +-------+--------+
      |                |               +-------+--------+                |
      |                |                       |                         v
      |                |                       v                 +-------+--------+
      |                |               +-------+--------+        | Payment (out)  |
      |                +-------------->+   Ledger       +<-------+ bn_payment_*   |
      |                                |  core_ledger_* |        +-------+--------+
      |                                +-------+--------+                |
      |                                        |                         |
      |     +---------------+                  |                         |
      +---->|   Dependant   |                  |                         |
      |     |  v_member_dep |                  |                         |
      |     +-------+-------+                  |                         |
      |             |                          |                         |
      |             v                          |                         |
      |     +-------+-------+                  |                         |
      +---->|    Nominee    +------------------+-------------------------+
            | bn_award_bene |
            +---------------+

                                Case Management plane
     +-----------+     +-----------+     +---------------+     +--------------+
     |   Case    +---->|  Appeal   |     | Investigation |     |  Recovery    |
     |  (lg_*)   |     | (lg_appeal|     | (composed:    |     | (bn_overpay +|
     +-----+-----+     |  canonical|     |  er_visit +   |     |  cn_arrears +|
           |           |  vs bn_   |     |  lg_activity) |     |  lg_arr_liab)|
           |           |  correction)    +-------+-------+     +------+-------+
           |           +-----+-----+             |                    |
           +-----------------+-------------------+--------------------+
                            (all reference Member / Employer / Award / Payment
                             through their canonical façades)

  Supporting cross-cutting domains consumed by every plane:
    Identity · Geography · Legal · Financial · Communication · Document ·
    Calendar / Working Week / Holidays
```

## Consumption Rules Encoded in the Map

- Every arrow crosses a façade — no consumer reads a legacy table directly.
- BEMA tables (`ip_*`, `er_*`, `cn_*`, `tb_*`) appear only as providers behind adapter views.
- Scheme and Scheme Membership are drawn as canonical anchors even though not yet implemented — future additive work must slot into these boxes, not into BEMA.
- Case, Appeal, Investigation and Recovery share the same Case Management plane and reference other entities read-only.
