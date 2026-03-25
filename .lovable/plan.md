# Fix: SE Wages Publish — Missing `config_periods` and `levy_slabs` in Payload

## Root Cause

The C3-Wizard's `/sync-se-wages` endpoint shares validation middleware with the main config sync endpoint. That middleware requires `config_periods` and `levy_slabs` to be arrays. The SE wages payload omits them entirely, causing: `"Validation failed: config_periods and levy_slabs must be arrays"`.

## Fix

Add empty `config_periods: []` and `levy_slabs: []` to the SE wages payload in `src/hooks/usePublishSEWages.ts`.

### File: `src/hooks/usePublishSEWages.ts`

Update the `SEWagesPayload` interface and the payload construction:

```typescript
// Add to interface
config_periods: any[];
levy_slabs: any[];

// Add to payload object (lines 75-82)
config_periods: [],
levy_slabs: [],
```

This satisfies the wizard's shared validation without changing any other behavior. The `sync_type: 'se_wages'` field already tells the wizard to process the `wages` array specifically.  
  
I want you to create a proper message for the c3-wizard team, it should be chnage here as these fields doesnt relate to this functionality.  
This chnages should be managed from the external team to follow the best practices.