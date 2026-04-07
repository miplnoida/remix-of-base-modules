

## Analysis: C3 Wizard API Key Authorization for BIMA Endpoints

### Finding: All Endpoints Are Working — No Code Changes Required

Based on thorough investigation of the access logs, API registry, and scope assignments, **the C3 Wizard key already has full access to all reported endpoints and they are functioning correctly.**

### Evidence from Access Logs

| Endpoint | Status | Last Successful Call |
|----------|--------|---------------------|
| `GET /api/v1/Employee/employeesByLastC3/658852` | 200 | Apr 7, 07:44 UTC |
| `GET /api/v1/Employee/getIpDetailsByQuery/{params}` | 200 | Apr 6, 12:54 UTC |
| `POST /api/v1/api/payment/save` | 200 | Apr 6, 05:49 UTC |
| `POST /api/v1/api/payment/save/658852/ER` | 200 | Apr 3, 20:31 UTC |

All endpoints return 200. The **only 401** was a single call on Apr 3 from IP `34.91.234.249` — a different origin than all successful calls — indicating that specific request used a wrong or expired key.

### Scope Assignments (Confirmed in Database)

The C3 Wizard Application key (`pk_live_...`) has explicit scope assignments for:
- **C3 Ingestion** — c3-reported, c3-wages, c3-verify
- **C3 History** — Range, Detail, Last Submitted
- **Employee Lookup** — getIpDetailsByQuery, getMultipleIpDetails
- **Employee Sync** — employeesByLastC3, nwdirectorsByLastC3
- **Payment** — Payment Save, Receipt Lookup
- **Validation** — ER Master Details, SE Master Details
- **Profile Sync** — Update User

### Answers to the C3 Wizard Team

**Q1: Does the key need additional scopes?**
No. The key `pk_live_...tre7p` already has scopes for Employee Lookup, Employee Sync, and Payment categories. All are enabled and confirmed working. The 401 error was from a single request (IP `34.91.234.249`) that likely used a different/incorrect key. Ask the team to verify the exact key being sent from that environment.

**Q2: Payment endpoint path — `/api/v1/payment/save` or `/api/v1/api/payment/save`?**
**Both path formats work:**
- `POST /api/v1/api/payment/save` — flat POST with `payerId` and `payerType` in the request body (preferred, latest format)
- `POST /api/v1/api/payment/save/{payerId}/{payerType}` — legacy format with params in URL path (also works, confirmed in logs)

The path `/api/v1/payment/save` (without the extra `/api/`) will **NOT** work — the `isPaymentRoute` function requires the path to start with `/api/v1/api/payment/`.

**Q3: SE payments — payerType "SE" with 6-digit SSN, officeCode "STK"**
The payment handler passes the full payload to the `public_api_payment_save` RPC. Whether "SE" with 6-digit SSN and "STK" officeCode works depends on that RPC's validation logic. No restrictions exist at the API gateway level.

### Recommended Response to C3 Wizard Team

```text
RE: API Key Authorization Scope for BIMA Endpoints

All three endpoint groups (Employee, Payment, BIMA) are already
authorized for your key (pk_live_...tre7p). Access logs confirm
successful calls from your production IPs as recently as today.

The single 401 on Apr 3 came from IP 34.91.234.249 — please verify
which key that environment is sending. Your production environments
(AWS IPs 43.205.x, 13.235.x, etc.) are working correctly.

Payment path: Use POST /api/v1/api/payment/save with payerId and
payerType in the request body. The path /api/v1/payment/save
(without /api/) will NOT work.

SE payments: payerType "SE" and 6-digit SSN as payerId are accepted
at the gateway level. officeCode "STK" is passed through to the
backend RPC.

No key changes or additional scopes are needed.
```

### No Code Changes Required

The system is functioning as designed. This is an operational/communication issue, not a bug.

