# Signature & Stamp — Inline / Flow-Based Placement

## Problem
Today `buildSignatureBlockHtml` always emits `position:absolute` anchored to a fixed mm offset from the page bottom. For letters and notices, signature + stamp must sit **right under the signer's name**, wherever the body content happens to end. As body length varies (1 paragraph vs 3 pages), the absolute block either overlaps text or floats in empty space.

## Solution — Introduce a `placement_mode` with 3 strategies

Extend `SignatureBlockConfig` with:

```ts
placement_mode: "inline_after_signer" | "flow_end_of_content" | "absolute_fixed"
sign_off_phrase?: string        // "Sincerely," (already partially supported)
signer_block_token?: string     // {{signer_block}} marker in body
stamp_offset_x_mm?: number      // stamp nudge relative to signature
stamp_offset_y_mm?: number
stamp_overlap?: boolean         // stamp overlaps signature (classic wet-stamp look)
```

### Mode A — `inline_after_signer` (default for Letters / Notices)
- Renderer searches the rendered body HTML for a `{{signer_block}}` marker (or, if absent, appends to the end of body).
- Replaces it with a **flow-positioned** `<div class="sigblock-inline">` containing:
  sign-off phrase → signature image (or "SIGNATURE PENDING" box) → signer name → designation → optional stamp positioned `relative` with small negative margin so it sits beside/over the signature like a real wet stamp.
- No `position:absolute`. The block grows with the page; if it overflows, it naturally moves to the next page with content.

### Mode B — `flow_end_of_content`
- Same inline block, but always appended at the end of the body (no token needed). Good for short memos.

### Mode C — `absolute_fixed` (current behavior, kept for receipts/certificates)
- Keeps today's fixed-bottom anchoring for fixed-layout financial docs where the signature must sit at a specific mm coordinate (e.g., certificates, receipts with pre-printed footer area).

## Files to change

1. `src/lib/comm/templateCatalog.ts` — extend `SignatureBlockConfig` type with new fields, default `placement_mode = "inline_after_signer"` for letter/notice templates, `"absolute_fixed"` for receipt/certificate templates.

2. `src/lib/comm/buildSignatureBlockHtml.ts` — split into:
   - `buildInlineSignatureBlock(cfg, urls, opts)` → returns a flow `<div>` (no absolute positioning).
   - `buildAbsoluteSignatureBlock(cfg, urls, opts)` → existing absolute logic, retained.
   - `buildSignatureBlockHtml(...)` dispatches on `cfg.placement_mode`.

3. `src/lib/enterprise/DocumentGenerationResolver.ts` — after token application:
   - If template's signature block is inline, inject the signature HTML at `{{signer_block}}` token (or append) **before** PDF rendering.
   - If absolute, keep current overlay path.

4. `src/pages/admin/communication/TemplateDesigner` (Signature & Stamp tab) — replace the always-visible Position (x,y) inputs with:
   - **Placement mode** select (Inline after signer / End of content / Fixed position).
   - Show x/y/width/height **only** when mode = Fixed.
   - Show "Sign-off phrase" + "Insert {{signer_block}} into body" helper button for inline modes.
   - Show "Stamp overlap signature" toggle + small x/y nudge inputs for inline modes.

5. Live A4 preview pane — render the inline block at the end of the sample body so designers see realistic placement; preview varies body length via a sample selector ("Short letter" / "Long letter") so they can verify flow behaviour.

6. Migration — add new columns to `core_template_signature_block` (or wherever stored). Default existing letter/notice rows to `inline_after_signer`, receipts/certificates to `absolute_fixed` (preserves current output).

## Acceptance
- Letter template: signature appears directly below "Sincerely, M. Williams / Senior Claims Officer" regardless of body length; stamp sits half-overlapping the signature.
- Long multi-page letter: signature flows to the last page after content, never overlaps text.
- Receipt/certificate templates: render unchanged (still absolute fixed).
- Template Designer hides x/y inputs unless Fixed mode is chosen.
- Health check warns if a letter/notice template uses `absolute_fixed` (likely misconfigured).

## Out of scope
- Multi-signer side-by-side layouts (tracked separately).
- Auto page-break tuning for inline blocks beyond what the PDF engine already provides.
