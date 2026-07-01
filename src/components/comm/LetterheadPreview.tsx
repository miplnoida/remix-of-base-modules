/**
 * Live letterhead preview — resolves asset codes to Media Library URLs and
 * renders a scaled page-sized paper mock with header / logo / seal / watermark
 * / footer / signature slots.
 *
 * Consumed by Brand Assets → Letterheads (preview button) and by any surface
 * that needs a WYSIWYG before generating a real PDF.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { resolveMediaAssetsByCodes, type ResolvedMediaAsset } from "@/lib/comm/mediaAssetResolver";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

interface DesignConfig {
  page_size?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  header_asset_code?: string;
  footer_asset_code?: string;
  logo_asset_code?: string;
  seal_asset_code?: string;
  watermark_asset_code?: string;
  signature_code?: string;
}

interface Props {
  design: DesignConfig;
  /** Optional override HTML body — defaults to lorem-style demo copy. */
  bodyHtml?: string;
  /** CSS px width of the rendered preview. Height derives from page ratio. */
  width?: number;
}

// Physical page sizes in millimetres (portrait). Landscape swaps w/h.
const PAGE_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  Letter: [216, 279],
  Legal: [216, 356],
};

const PLACEHOLDER_BODY = `
  <h2 style="margin:0 0 8px 0;font-size:14pt;">Sample Document Title</h2>
  <p style="margin:0 0 8px 0;">To: <strong>[Recipient Name]</strong></p>
  <p style="margin:0 0 12px 0;">Reference: [Document Number]</p>
  <p style="margin:0 0 8px 0;">Dear Sir / Madam,</p>
  <p style="margin:0 0 8px 0;">
    This is a sample body used to preview the letterhead layout. When a real template is bound,
    the resolved content replaces this block. Header, footer, logo, seal and watermark assets
    are rendered exactly as they will appear at print time.
  </p>
  <p style="margin:0 0 8px 0;">Yours faithfully,</p>
`;

async function resolveAssets(codes: string[]): Promise<Record<string, ResolvedMediaAsset>> {
  const filtered = codes.filter(Boolean);
  if (filtered.length === 0) return {};
  return resolveMediaAssetsByCodes(filtered);
}

async function resolveSignature(code?: string) {
  if (!code) {
    const { data } = await sb.from("comm_email_signature")
      .select("html_signature, plain_text_signature, name")
      .eq("is_default", true).eq("scope_type", "ORGANIZATION").eq("is_active", true)
      .limit(1).maybeSingle();
    return data ?? null;
  }
  const { data } = await sb.from("comm_email_signature")
    .select("html_signature, plain_text_signature, name")
    .or(`code.eq.${code},id.eq.${code}`).limit(1).maybeSingle();
  return data ?? null;
}

export function LetterheadPreview({ design, bodyHtml, width = 620 }: Props) {
  const codes = [
    design.header_asset_code, design.footer_asset_code, design.logo_asset_code,
    design.seal_asset_code, design.watermark_asset_code,
  ].filter(Boolean) as string[];

  const { data: assets = {}, isLoading } = useQuery({
    queryKey: ["letterhead-preview-assets", codes.sort().join(",")],
    queryFn: () => resolveAssets(codes),
    enabled: true,
  });

  const { data: signature } = useQuery({
    queryKey: ["letterhead-preview-signature", design.signature_code ?? "__default"],
    queryFn: () => resolveSignature(design.signature_code),
  });

  const [wmm, hmm] = PAGE_MM[design.page_size ?? "A4"] ?? PAGE_MM.A4;
  const [pw, ph] = design.orientation === "landscape" ? [hmm, wmm] : [wmm, hmm];
  const height = Math.round((width * ph) / pw);
  const m = design.margins ?? {};
  const scale = width / (pw * 3.7795); // approx mm→px baseline at 96dpi

  const pad = {
    paddingTop: (m.top ?? 20) * scale,
    paddingBottom: (m.bottom ?? 20) * scale,
    paddingLeft: (m.left ?? 20) * scale,
    paddingRight: (m.right ?? 20) * scale,
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const get = (code?: string) => (code ? assets[code] : undefined);
  const wmk = get(design.watermark_asset_code);
  const hdr = get(design.header_asset_code);
  const logo = get(design.logo_asset_code);
  const seal = get(design.seal_asset_code);
  const ftr = get(design.footer_asset_code);

  const missingBadges: Array<{ role: string; code: string; found: boolean; inactive: boolean }> = [];
  const flag = (role: string, code: string | undefined, r?: ResolvedMediaAsset) => {
    if (!code) return;
    if (!r || !r.url) missingBadges.push({ role, code, found: !!r?.found, inactive: !!(r && r.found && !r.is_active) });
  };
  flag("Header", design.header_asset_code, hdr);
  flag("Footer", design.footer_asset_code, ftr);
  flag("Logo", design.logo_asset_code, logo);
  flag("Seal", design.seal_asset_code, seal);
  flag("Watermark", design.watermark_asset_code, wmk);

  return (
    <div className="space-y-2">
      {missingBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {missingBadges.map((m) => (
            <Badge key={m.role + m.code} variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              {m.role}: <span className="font-mono">{m.code}</span>
              {m.inactive ? " (inactive)" : m.found ? " (no file)" : " (not found)"}
            </Badge>
          ))}
        </div>
      )}
      <div className="mx-auto shadow-lg border relative overflow-hidden bg-white text-black"
           style={{ width, height }}>
        {/* Watermark */}
        {wmk?.url && (
          <img src={wmk.url} alt=""
               className="absolute inset-0 m-auto pointer-events-none select-none"
               style={{ opacity: 0.08, maxWidth: "70%", maxHeight: "70%", objectFit: "contain",
                        top: 0, bottom: 0, left: 0, right: 0 }} />
        )}

        {/* Header band */}
        {hdr?.url ? (
          <img src={hdr.url} alt="Header"
               className="w-full block" style={{ maxHeight: height * 0.18, objectFit: "contain" }} />
        ) : null}

        <div className="relative" style={{ ...pad, minHeight: height * 0.6 }}>
          {/* Logo + seal top-right corner */}
          <div className="absolute right-4 top-2 flex gap-2 items-start">
            {logo?.url && (
              <img src={logo.url} alt={logo.name ?? "Logo"} style={{ maxHeight: 48 }} />
            )}
            {seal?.url && (
              <img src={seal.url} alt={seal.name ?? "Seal"} style={{ maxHeight: 48, opacity: 0.85 }} />
            )}
          </div>

          <div className="text-[11px] leading-snug" style={{ fontFamily: "Georgia, serif" }}
               dangerouslySetInnerHTML={{ __html: bodyHtml ?? PLACEHOLDER_BODY }} />

          {signature && (
            <div className="mt-6 text-[11px]" dangerouslySetInnerHTML={{
              __html: signature.html_signature || `<pre style="font-family:inherit">${signature.plain_text_signature ?? signature.name ?? ""}</pre>`,
            }} />
          )}
        </div>

        {/* Footer band pinned to bottom */}
        {ftr?.url ? (
          <img src={ftr.url} alt="Footer"
               className="absolute bottom-0 left-0 w-full block"
               style={{ maxHeight: height * 0.12, objectFit: "contain" }} />
        ) : null}
      </div>
    </div>
  );
}

export default LetterheadPreview;
