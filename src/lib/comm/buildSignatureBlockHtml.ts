/**
 * Builds the HTML fragment for the signature/stamp block placed on a document.
 * Used by the Template Designer live preview and the PDF generator.
 */
import type { SignatureBlockConfig } from "@/lib/comm/templateCatalog";

export interface SignatureBlockUrls {
  signature?: string | null;
  stamp?: string | null;
  seal?: string | null;
  approval_stamp?: string | null;
}

export function buildSignatureBlockHtml(
  cfg: SignatureBlockConfig,
  urls: SignatureBlockUrls,
  opts?: { pending?: boolean; draft?: boolean; testPrint?: boolean; signerName?: string | null; signerDesignation?: string | null },
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

  const watermark =
    opts?.testPrint ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:48pt;color:rgba(180,30,30,.18);font-weight:800;pointer-events:none;">TEST PRINT</div>` :
    opts?.draft     ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:60pt;color:rgba(120,120,120,.15);font-weight:800;pointer-events:none;">DRAFT</div>` :
    "";

  return `${watermark}<div class="sigblock" style="position:absolute;${anchor}">${overlays.join("")}</div>`;
}
