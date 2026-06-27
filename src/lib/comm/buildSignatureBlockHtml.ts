/**
 * Builds the HTML fragment for the signature/stamp block placed on a document.
 *
 * Two strategies:
 *  - "inline" — flow-positioned div that sits wherever it is rendered in the
 *    document body. The renderer injects this at the `{{signer_block}}` token
 *    (or appends to body end) so the signature follows the actual content.
 *  - "absolute" — legacy fixed-bottom overlay anchored at a mm offset.
 *    Retained for receipts/certificates with pre-printed fixed layouts.
 *
 * The dispatcher picks the right strategy based on `cfg.placement_mode`.
 */
import type { SignatureBlockConfig } from "@/lib/comm/templateCatalog";

export interface SignatureBlockUrls {
  signature?: string | null;
  stamp?: string | null;
  seal?: string | null;
  approval_stamp?: string | null;
}

export interface BuildSignatureOpts {
  pending?: boolean;
  draft?: boolean;
  testPrint?: boolean;
  signerName?: string | null;
  signerDesignation?: string | null;
}

function watermarkHtml(opts?: BuildSignatureOpts): string {
  if (opts?.testPrint)
    return `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:48pt;color:rgba(180,30,30,.18);font-weight:800;pointer-events:none;">TEST PRINT</div>`;
  if (opts?.draft)
    return `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:60pt;color:rgba(120,120,120,.15);font-weight:800;pointer-events:none;">DRAFT</div>`;
  return "";
}

/* ------------------------------------------------------------------ */
/* Inline (flow) signature block                                       */
/* ------------------------------------------------------------------ */
export function buildInlineSignatureBlock(
  cfg: SignatureBlockConfig,
  urls: SignatureBlockUrls,
  opts?: BuildSignatureOpts,
): string {
  if (!cfg.show_signature && !cfg.show_stamp && !cfg.show_seal && !cfg.show_approval_stamp) return "";

  const w = Math.max(20, cfg.width_mm ?? 50);
  const h = Math.max(8, cfg.height_mm ?? 20);
  const align =
    cfg.placement === "bottom_center" ? "center" :
    cfg.placement === "bottom_right"  ? "right"  : "left";

  const signOff = cfg.sign_off_phrase
    ? `<div style="margin-bottom:2mm;">${cfg.sign_off_phrase}</div>`
    : "";

  // Signature image / pending placeholder
  let sigCell = "";
  if (cfg.show_signature) {
    if (opts?.pending) {
      sigCell = `<div style="width:${w}mm;height:${h}mm;border:1px dashed #b91c1c;color:#b91c1c;font-size:9pt;display:flex;align-items:center;justify-content:center;border-radius:2mm;">SIGNATURE PENDING</div>`;
    } else if (urls.signature) {
      sigCell = `<img src="${urls.signature}" alt="signature" style="max-width:${w}mm;max-height:${h}mm;display:block;" />`;
    } else {
      sigCell = `<div style="height:${h}mm"></div>`;
    }
  }

  // Stamp — optionally overlapping the signature
  let stampHtml = "";
  if (cfg.show_stamp && urls.stamp) {
    if (cfg.stamp_overlap) {
      const dx = cfg.stamp_offset_x_mm ?? 18;
      const dy = cfg.stamp_offset_y_mm ?? -8;
      stampHtml = `<img src="${urls.stamp}" alt="stamp" style="position:absolute;left:${dx}mm;top:${dy}mm;max-width:32mm;max-height:32mm;mix-blend-mode:multiply;pointer-events:none;" />`;
    } else {
      stampHtml = `<img src="${urls.stamp}" alt="stamp" style="max-width:30mm;max-height:30mm;mix-blend-mode:multiply;margin-top:2mm;display:block;" />`;
    }
  }

  const sigStack = `<div style="position:relative;display:inline-block;">${sigCell}${stampHtml}</div>`;

  const caption = cfg.signature_caption || "Authorized Signature";
  const captionHtml = cfg.show_signature
    ? `<div style="border-top:1px solid #111;padding-top:1mm;margin-top:1mm;font-size:9pt;color:#111;min-width:${w}mm;display:inline-block;">${caption}${
        opts?.signerName ? `<br/><strong>${opts.signerName}</strong>` : ""
      }${opts?.signerDesignation ? `<br/><span style="color:#555">${opts.signerDesignation}</span>` : ""}</div>`
    : "";

  const sealHtml = cfg.show_seal && urls.seal
    ? `<div style="margin-top:3mm;"><img src="${urls.seal}" alt="seal" style="max-width:30mm;max-height:30mm;mix-blend-mode:multiply;" /></div>` : "";
  const approvalHtml = cfg.show_approval_stamp && urls.approval_stamp
    ? `<div style="margin-top:3mm;"><img src="${urls.approval_stamp}" alt="approval stamp" style="max-width:32mm;max-height:32mm;mix-blend-mode:multiply;" /></div>` : "";

  return `<div class="sigblock-inline" style="margin-top:10mm;text-align:${align};page-break-inside:avoid;">${signOff}${sigStack}${captionHtml ? `<div>${captionHtml}</div>` : ""}${sealHtml}${approvalHtml}</div>`;
}

/* ------------------------------------------------------------------ */
/* Absolute (legacy) signature block                                   */
/* ------------------------------------------------------------------ */
export function buildAbsoluteSignatureBlock(
  cfg: SignatureBlockConfig,
  urls: SignatureBlockUrls,
  opts?: BuildSignatureOpts,
): string {
  if (!cfg.show_signature && !cfg.show_stamp && !cfg.show_seal && !cfg.show_approval_stamp) return "";

  const anchor =
    cfg.placement === "bottom_left"   ? "left:18mm;bottom:32mm;text-align:left;" :
    cfg.placement === "bottom_center" ? "left:50%;bottom:32mm;transform:translateX(-50%);text-align:center;" :
    cfg.placement === "custom"        ? `left:${cfg.x_mm}mm;bottom:${cfg.y_mm}mm;` :
                                        "right:18mm;bottom:32mm;text-align:right;";

  const w = Math.max(20, cfg.width_mm ?? 50);
  const h = Math.max(8, cfg.height_mm ?? 20);
  const overlays: string[] = [];

  if (cfg.show_signature) {
    if (opts?.pending) {
      overlays.push(
        `<div style="width:${w}mm;height:${h}mm;border:1px dashed #b91c1c;color:#b91c1c;font-size:9pt;display:flex;align-items:center;justify-content:center;border-radius:2mm;">SIGNATURE PENDING</div>`,
      );
    } else if (urls.signature) {
      overlays.push(`<img src="${urls.signature}" alt="signature" style="max-width:${w}mm;max-height:${h}mm;display:block;" />`);
    }
    const caption = cfg.signature_caption || "Authorized Signature";
    overlays.push(
      `<div style="border-top:1px solid #111;padding-top:1mm;font-size:9pt;color:#111;min-width:${w}mm;">${caption}${
        opts?.signerName ? `<br/><strong>${opts.signerName}</strong>` : ""
      }${opts?.signerDesignation ? `<br/><span style="color:#555">${opts.signerDesignation}</span>` : ""}</div>`,
    );
  }
  if (cfg.show_stamp && urls.stamp) {
    overlays.push(`<img src="${urls.stamp}" alt="stamp" style="max-width:30mm;max-height:30mm;opacity:.85;margin-top:2mm;" />`);
  }
  if (cfg.show_seal && urls.seal) {
    overlays.push(`<img src="${urls.seal}" alt="seal" style="max-width:30mm;max-height:30mm;opacity:.9;margin-top:2mm;" />`);
  }
  if (cfg.show_approval_stamp && urls.approval_stamp) {
    overlays.push(`<img src="${urls.approval_stamp}" alt="approval stamp" style="max-width:32mm;max-height:32mm;opacity:.9;margin-top:2mm;" />`);
  }

  return `${watermarkHtml(opts)}<div class="sigblock" style="position:absolute;${anchor}">${overlays.join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */
export function buildSignatureBlockHtml(
  cfg: SignatureBlockConfig,
  urls: SignatureBlockUrls,
  opts?: BuildSignatureOpts,
): string {
  const mode = cfg.placement_mode ?? "inline_after_signer";
  if (mode === "absolute_fixed") return buildAbsoluteSignatureBlock(cfg, urls, opts);
  return buildInlineSignatureBlock(cfg, urls, opts);
}
