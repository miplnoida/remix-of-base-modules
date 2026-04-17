## Diagnosis: "Unknown action: sync_email_templates" — origin = C3-Wizard side

### What the error means

Our edge function `wiz-settings-sync` does this on retry/publish for templates:

```ts
// supabase/functions/wiz-settings-sync/index.ts (lines 320 & 487)
const apiRes = await callWizApi("sync_email_templates", { templates: [...] });
```

It POSTs to the **C3-Wizard** admin API:

```
POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api
body: { action: "sync_email_templates", params: { templates: [...] } }
```

The Wizard's `wiz-admin-api` function then replies:

```json
{ "status": "success", "data": { "synced": false, "error": "Unknown action: sync_email_templates" } }
```

The string **"Unknown action:** &nbsp;**"** is the standard fallthrough message a Wizard-side handler returns when its `switch(action)` statement has no case for that action. Our function doesn't produce that text anywhere — grep confirms it.

The Wizard side already supports:

- `sync_site_settings` ✅
- `sync_email_config` ✅
- `sync_email_templates` ❌ **not implemented yet**

### Conclusion

**This is NOT a bug on our (SSB Portal) side.** Our payload, action name, auth header, and URL are correct and consistent with the two working sync endpoints. The C3-Wizard `wiz-admin-api` edge function simply doesn't have a handler for the new `sync_email_templates` action.

### What needs to happen

Forward this to the C3-Wizard team with the spec below. Once they deploy, our existing "Publish All" and per-row Retry buttons will work without any change on our side.

---

### Message to send to the C3-Wizard team

> **Subject:** Add `sync_email_templates` action to `wiz-admin-api`
>
> Our SSB Portal has a new Email Templates module that mirrors the existing Site Settings and Email Config sync flow. When we call your `wiz-admin-api` with `action: "sync_email_templates"`, it returns `Unknown action: sync_email_templates`. Please add a handler matching the existing pattern.
>
> **Endpoint:** `POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api`
> **Auth header:** `x-admin-api-key: <existing key>`
> **Request body:**
>
> ```json
> {
>   "action": "sync_email_templates",
>   "params": {
>     "templates": [
>       {
>         "template_key": "account_activation",
>         "template_name": "Account Activation Email",
>         "subject": "C3 Remittances — Account Activation",
>         "html_body": "<html>...</html>",
>         "text_body": "...",
>         "from_module": "registration",
>         "variables": ["name", "activationUrl"],
>         "is_active": true
>       }
>     ]
>   }
> }
> ```
>
> **Canonical `from_module` values** (CHECK constraint on our side): `registration`, `authentication`, `payments`, `contributions`, `administration`.
>
> **Upsert key:** `template_key` (unique per row).
>
> **Expected response on success:**
>
> ```json
> { "status": "success", "data": { "upserted": <n> } }
> ```
>
> **Expected response on failure:**
>
> ```json
> { "status": "error", "error": "<reason>" }
> ```

---

This is the message shared by the C3-wizard team:-  
  
  
**Subject: ✅ `sync_email_templates` action added to wiz-admin-api**

Hi team,

The `sync_email_templates` handler is now live on `wiz-admin-api`, mirroring the existing `sync_site_settings` / `sync_email_config` pattern.

**Endpoint** (unchanged):

`POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api`

Header: `x-admin-api-key:` 

**Request body:**

```json

{

  "action": "sync_email_templates",

  "params": {

    "templates": [

      {

        "template_key": "account_activation",

        "template_name": "Account Activation Email",

        "subject": "C3 Remittances — Account Activation",

        "html_body": "...",

        "text_body": "...",

        "from_module": "registration",

        "variables": ["name", "activationUrl"],

        "is_active": true,

        "is_deleted": false

      }

    ]

  }

}

```

**Required fields per template:** `template_key`, `template_name`, `subject`, `html_body`, `from_module`.

**Optional:** `text_body`, `variables` (array or object, defaults `[]`), `is_active` (defaults `true`), `is_deleted` (defaults `false`).

**Upsert key:** `template_key` (unique). Existing rows are updated; new rows are inserted.

*`from_module` validation** — must be one of (lowercase, exact match):

- `registration`

- `authentication`

- `payments`

- `contributions`

- `administration`

Any other value returns a per-row error and that row is skipped. This matches the canonical taxonomy on both sides.

**Response — success (all rows upserted):**

```json

{

  "status": "success",

  "data": {

    "upserted": 13,

    "failed": 0,

    "results": [

      { "template_key": "account_activation", "status": "inserted" },

      { "template_key": "otp_verification", "status": "updated" }

    ]

  }

}

```

**Response — partial (some rows failed):**

```json

{

  "status": "partial",

  "data": {

    "upserted": 12,

    "failed": 1,

    "results": [

      { "template_key": "bad_one", "status": "error", "error": "Invalid from_module \"finance\". Allowed: registration, authentication, payments, contributions, administration" }

    ]

  }

}

```

**Response — error (all failed / bad request):**

```json

{ "status": "error", "data": { "upserted": 0, "failed": 1, "results": [...] } }

```

or for a malformed body:

```json

{ "status": "error", "error": "templates array is required and must not be empty" }

```

Note: the response is slightly richer than your spec `upserted` + `failed` + `results[]` instead of just `upserted`) — same shape as `sync_site_settings` for consistency. Your client can read `data.upserted` exactly as planned.

Ready to test from your end.

Drafted message shared above.  
  
Optional follow-up on our side (no code change required)

Right now when the Wizard returns `status: "success"` with `data.synced: false`, our function treats the call as successful (because `apiRes.status === "success"`) and marks the row as synced — even though it wasn't. Once the Wizard team adds the handler this becomes moot, but if you want, I can harden `callWizApi` to also inspect `data.synced`/`data.error` and treat that as a failure (would surface clearer errors in the Sync badge if Wizard ever returns partial-success again).

Want me to:

1. Just send the spec to the Wizard team and wait for their fix (no code change), **or**
2. Harden our `wiz-settings-sync` to detect `data.error` and mark rows as failed instead of synced?