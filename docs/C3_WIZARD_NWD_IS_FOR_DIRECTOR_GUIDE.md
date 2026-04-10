# C3-Wizard Integration Guide: NWD `is_for_director` Field

## Overview

All C3 ingestion and query APIs now support `is_for_director` to distinguish Non-Working Director (NWD) contributions from standard Employer (ER) records. Both share `payer_type = 'ER'`, but NWD records are flagged with `is_for_director: true`.

---

## 1. C3 Reported Insert (`POST /api/v1/c3-reported`)

Send `is_for_director: true` for NWD submissions, `false` or omit for standard ER.

```json
{
  "payer_id": "658852",
  "payer_type": "ER",
  "is_for_director": true,
  "sequence_no": 1,
  "period": "2026-04-01",
  "total_wages": 500,
  "emp_levy_amt_calc": 40,
  "emp_levy_penalty_amt": 0
}
```

**Notes:**
- `is_for_director` defaults to `false` when omitted (backward compatible).
- The duplicate check now includes `is_for_director`, so you can submit both a regular ER record and an NWD record for the same `payer_id + period + sequence_no`.

---

## 2. C3 Range Query (`GET .../range/{start}/{end,c3Type}`)

Use `c3Type=NW` to get only NWD records:
```
.../range/012026/042026,NW
```

Use `c3Type=EE` to get only standard ER records (excludes NWD):
```
.../range/012026/042026,EE
```

Response now includes `"isForDirector": true/false` per record:
```json
[
  {
    "month": 4,
    "year": 2026,
    "seqNo": 1,
    "payerType": "ER",
    "c3Type": "NW",
    "isForDirector": true
  }
]
```

---

## 3. C3 Detail Query (`GET .../C3Submitted/{month,year,seq,payerType,c3Type}`)

- `c3Type=NW` fetches the director record.
- `c3Type=EE` fetches the standard employee record.

Response `c3Header` includes `"isForDirector": true/false`:
```json
{
  "c3Header": {
    "c3Status": "S",
    "isForDirector": true,
    "calcEmpLevyAmt": 40,
    "totalEmpLevyPenalty": 0,
    ...
  },
  "ipWages": [...]
}
```

---

## 4. C3 Last Submitted Query (`GET .../C3LastSubmitted/{payerType}/{seq,c3Type}`)

- `c3Type=NW` finds the latest NWD record for the given sequence.
- `c3Type=EE` finds the latest standard ER record.

---

## 5. Payment Save (`POST /api/v1/api/payment/save`)

Include `isForDirector: true` in the payload for NWD payments:
```json
{
  "payerId": "658852",
  "payerType": "ER",
  "isForDirector": true,
  "periodMonth": 4,
  "periodYear": 2026,
  "scheduleNumber": 1,
  "paymentHeaders": [
    {
      "paymentCode": "LVC",
      "fundCode": "GEN",
      "paymentAmount": 40
    }
  ]
}
```

- NWD payments are tagged so receipt sync back to C3-Wizard includes `is_for_director: true`.

---

## 6. Component Balances (`get_c3_component_balances` RPC)

- **NWD records** (`p_is_for_director = true`): Returns only **LVC** (Levy) and **LVF** (Levy Fines) components.
- **Standard ER records**: Returns all 6 components (SSC, LVC, PEC, SSF, LVF, PEF) as before.

This prevents contribution balance inflation by restricting NWD calculations to the two applicable levy components.

---

## 7. Receipt Sync to C3-Wizard

When a payment is synced back to C3-Wizard via the `sync-c3-payment` edge function, the outbound payload now includes `is_for_director: true` for NWD-tagged payments:
```json
{
  "registration_number": "658852",
  "payer_type": "ER",
  "is_for_director": true,
  "receipt_number": "R-2026-0001",
  "receipt_amount": "40",
  ...
}
```

---

## Backward Compatibility

- All `is_for_director` fields default to `false` when omitted.
- Existing records remain unchanged (all existing records are `is_for_director = false`).
- C3-Wizard can omit the field entirely for standard ER submissions.

---

## Testing Checklist

- [ ] Submit a C3 reported record with `is_for_director: true` — verify it stores correctly
- [ ] Submit a standard ER record (without or with `is_for_director: false`) — verify it stores as `false`
- [ ] Query range with `c3Type=NW` — verify only NWD records returned
- [ ] Query range with `c3Type=EE` — verify NWD records excluded
- [ ] Query detail with `c3Type=NW` — verify `isForDirector: true` in response
- [ ] Query last submitted with `c3Type=NW` — verify correct NWD record returned
- [ ] Save payment with `isForDirector: true` — verify tagged on `cn_payment_header`
- [ ] Verify component balances for NWD return only LVC and LVF
- [ ] Verify sync payload includes `is_for_director: true` for NWD payments
- [ ] Verify standard ER and SE flows are **unaffected**

---

## Contact

For questions about this integration, contact the SSB Admin team.
