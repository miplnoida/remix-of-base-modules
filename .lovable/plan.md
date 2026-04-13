## Root Cause: SE Payment Sync Failure — "Company not found for registration_number: 100039"

### Analysis

The `sync-c3-payment` edge function sends `registration_number: 100039` (the SSN) in the payload for SE payers. The external C3-Wizard `/receive-payment` endpoint uses `registration_number` to look up the payer — and for SE payers, it expects the **self_ref_no** (e.g., `000002`), not the raw SSN.

**Evidence from sync log:**

```
request_payload: { registration_number: "100039", payer_type: "SE", ssn: "100039", ... }
response_payload: { success: false, error: "Company not found for registration_number: 100039" }
```

The `ip_self_employ` table shows SSN `100039` has `self_ref_no = '000002'`. The Wizard registers SE payers using this `self_ref_no` as their identifier — so the payment sync must send it as `registration_number`.

**Secondary issue:** The payload omits `schedule_number` for SE payers (line 206-210 of the edge function only includes it for ER). SE records also have `sequence_no` and the Wizard needs it.

### Fix

**File: `supabase/functions/sync-c3-payment/index.ts**`

1. **For SE payers, look up `self_ref_no` from `ip_self_employ**` and use it as `registration_number` instead of the raw SSN:

```typescript
// After fetching header (line 103), add SE lookup:
if (header.payer_type === 'SE') {
  const { data: seData } = await supabase
    .from('ip_self_employ')
    .select('self_ref_no')
    .eq('ssn', header.payer_id)
    .eq('status', 'A')
    .limit(1)
    .maybeSingle();
  
  if (seData?.self_ref_no) {
    payload.registration_number = seData.self_ref_no;
  }
}
```

2. **Include `schedule_number` for SE payers** (line 206-210):

```typescript
// Change from ER-only to SE+ER:
if (header.payer_type === 'ER' || header.payer_type === 'SE') {
  payload.schedule_number = component?.sequence_no != null
    ? String(component.sequence_no)
    : undefined;
}
```

### Files to Modify


| File                                          | Change                                                                |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `supabase/functions/sync-c3-payment/index.ts` | Look up `self_ref_no` for SE payers; include `schedule_number` for SE |


### Verification

After fix, the payload for SE 100039 will be:

```json
{
  "registration_number": "000002",  // self_ref_no (was "100039")
  "payer_type": "SE",
  "ssn": "100039",
  "schedule_number": "1",           // now included for SE
  "period_month": "9",
  "period_year": "2026",
  ...
}
```

This matches the identifier the C3-Wizard uses for SE payers, resolving the "Company not found" error. The existing ER flow is unaffected.  
  
  
important NOte :  
must read this  
you have to create a refined plan as your assumptions is wrong . this error is not your side . this error needs to resolve from the c3-wizard you must send the ssn 100039 and request the c3-wizard that pls check thhis why this error noccurs .  
basically you ahve to sahre the message to the c3-wizard team , it itself fix this.  
you dont need to chnage anything in this project.  
Also, for the NWD payment this system should give tehe employer id and the is_director true so in the request message include this as well for the verification it is handled there or not.  
Also, make sure you have to create a plan again.  
no implementation happen now.