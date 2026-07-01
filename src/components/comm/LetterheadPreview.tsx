/**
 * Live letterhead preview.
 *
 * Renders the real SSB letterhead layout (single logo on the left, org heading
 * with green divider across the top, head-office / branch-office contact blocks,
 * body content, footer note, signature). Falls back to an "image_bands" variant
 * when the letterhead is configured with pre-composed header/footer images.
 *
 * Design_config shape (all fields optional):
 *   layout_variant?: 'ssb_standard' | 'image_bands'
 *   page_size, orientation, margins
 *   logo_asset_code                       (single logo/seal on the left)
 *   watermark_asset_code, signature_asset_code
 *   header_asset_code, footer_asset_code  (image_bands only)
 *   organization_name, tagline
 *   head_office: { label, lines[] }
 *   branch_office: { label, lines[] }
 *   divider_color                         (default: SSB green)
 *   footer_note                           (centered italic bottom line)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { resolveMediaAssetsByCodes, type ResolvedMediaAsset } from "@/lib/comm/mediaAssetResolver";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

export interface OfficeBlock {
  label?: string;
  lines?: string[];
}

export interface LetterheadDesignConfig {
  layout_variant?: "ssb_standard" | "image_bands";
  page_size?: "A4" | "A5" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  header_asset_code?: string | null;
  footer_asset_code?: string | null;
  logo_asset_code?: string | null;
  seal_asset_code?: string | null;
  watermark_asset_code?: string | null;
  signature_asset_code?: string | null;
  signature_code?: string | null;
  organization_name?: string;
  tagline?: string;
  head_office?: OfficeBlock;
  branch_office?: OfficeBlock;
  divider_color?: string;
  footer_note?: string;
}

interface Props {
  design: LetterheadDesignConfig;
  bodyHtml?: string;
  width?: number;
}

const PAGE_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  Letter: [216, 279],
  Legal: [216, 356],
};

const DEFAULT_ORG = "ST. CHRISTOPHER AND NEVIS SOCIAL SECURITY BOARD";
const DEFAULT_TAGLINE = "\"Striving for Social Justice\"";
const DEFAULT_DIVIDER = "#2E7D32";
const DEFAULT_FOOTER_NOTE = "(All correspondence to be addressed to the Director of Social Security)";
const DEFAULT_HEAD_OFFICE: OfficeBlock = {
  label: "Head Office:",
  lines: [
    "Robert L. Bradshaw Building",
    "P. O. Box 79",
    "Bay Rd., Basseterre",
    "Tel: (869) 465-2535  Fax: (869) 465-5051",
  ],
};
const DEFAULT_BRANCH_OFFICE: OfficeBlock = {
  label: "Branch Office:",
  lines: [
    "Social Security Building",
    "P. O. Box 667, Pinney's Estate",
    "St. Thomas' Parish, Nevis",
    "Tel: (869) 469-5245  Fax: (869) 469-1046",
  ],
};

const PLACEHOLDER_BODY = `
  <p style="margin:0 0 12px 0;">27 May 2025</p>
  <p style="margin:0 0 12px 0;text-align:center;font-weight:bold;text-decoration:underline;">TO WHOM IT MAY CONCERN</p>
  <p style="margin:0 0 8px 0;">This is a sample body used to preview the letterhead layout. When a real template is bound,
  the resolved content replaces this block. The header, contact blocks, divider and footer note are rendered exactly
  as they will appear at print time.</p>
  <p style="margin:0 0 8px 0;">Yours faithfully,</p>
`;

async function resolveAssets(codes: string[]) {
  const filtered = codes.filter(Boolean);
  if (!filtered.length) return {};
  return resolveMediaAssetsByCodes(filtered);
}

async function resolveSignature(code?: string | null) {
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
  const variant = design.layout_variant
    ?? (design.header_asset_code ? "image_bands" : "ssb_standard");

  // For ssb_standard we only need the single left logo (+ watermark/footer image if any).
  // For image_bands we resolve everything.
  const codes = variant === "ssb_standard"
    ? [design.logo_asset_code, design.watermark_asset_code, design.footer_asset_code]
    : [design.header_asset_code, design.footer_asset_code, design.logo_asset_code,
       design.seal_asset_code, design.watermark_asset_code];
  const codeList = codes.filter(Boolean) as string[];

  const { data: assets = {}, isLoading } = useQuery({
    queryKey: ["letterhead-preview-assets", variant, codeList.sort().join(",")],
    queryFn: () => resolveAssets(codeList),
  });

  const { data: signature } = useQuery({
    queryKey: ["letterhead-preview-signature", design.signature_asset_code ?? design.signature_code ?? "__default"],
    queryFn: () => resolveSignature(design.signature_asset_code ?? design.signature_code),
  });

  const [wmm, hmm] = PAGE_MM[design.page_size ?? "A4"] ?? PAGE_MM.A4;
  const [pw, ph] = design.orientation === "landscape" ? [hmm, wmm] : [wmm, hmm];
  const height = Math.round((width * ph) / pw);
  const m = design.margins ?? {};
  const scale = width / (pw * 3.7795);
  const pad = {
    paddingTop: (m.top ?? 20) * scale,
    paddingBottom: (m.bottom ?? 20) * scale,
    paddingLeft: (m.left ?? 20) * scale,
    paddingRight: (m.right ?? 20) * scale,
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const get = (code?: string | null) => (code ? assets[code] : undefined);
  const wmk = get(design.watermark_asset_code);
  const logo = get(design.logo_asset_code);
  const hdr = get(design.header_asset_code);
  const seal = get(design.seal_asset_code);
  const ftr = get(design.footer_asset_code);

  const missingBadges: Array<{ role: string; code: string; found: boolean; inactive: boolean }> = [];
  const flag = (role: string, code: string | undefined | null, r?: ResolvedMediaAsset) => {
    if (!code) return;
    if (!r || !r.url) missingBadges.push({
      role, code, found: !!r?.found, inactive: !!(r && r.found && !r.is_active),
    });
  };
  flag("Logo", design.logo_asset_code, logo);
  flag("Watermark", design.watermark_asset_code, wmk);
  if (variant === "image_bands") {
    flag("Header", design.header_asset_code, hdr);
    flag("Footer", design.footer_asset_code, ftr);
    flag("Seal", design.seal_asset_code, seal);
  }

  const orgName = design.organization_name || DEFAULT_ORG;
  const tagline = design.tagline ?? DEFAULT_TAGLINE;
  const divider = design.divider_color || DEFAULT_DIVIDER;
  const head = design.head_office ?? DEFAULT_HEAD_OFFICE;
  const branch = design.branch_office ?? DEFAULT_BRANCH_OFFICE;
  const footerNote = design.footer_note ?? DEFAULT_FOOTER_NOTE;

  return (
    <div className="space-y-2">
      {missingBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {missingBadges.map((mm) => (
            <Badge key={mm.role + mm.code} variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              {mm.role}: <span className="font-mono">{mm.code}</span>
              {mm.inactive ? " (inactive)" : mm.found ? " (no file)" : " (not found)"}
            </Badge>
          ))}
        </div>
      )}
      <div className="mx-auto shadow-lg border relative overflow-hidden bg-white text-black"
           style={{ width, height, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {/* Watermark */}
        {wmk?.url && (
          <img src={wmk.url} alt=""
               className="absolute inset-0 m-auto pointer-events-none select-none"
               style={{ opacity: 0.06, maxWidth: "60%", maxHeight: "60%", objectFit: "contain",
                        top: 0, bottom: 0, left: 0, right: 0 }} />
        )}

        {variant === "image_bands" ? (
          <>
            {hdr?.url && (
              <img src={hdr.url} alt="Header" className="w-full block"
                   style={{ maxHeight: height * 0.18, objectFit: "contain" }} />
            )}
            <div className="relative" style={{ ...pad, minHeight: height * 0.6 }}>
              <div className="absolute right-4 top-2 flex gap-2 items-start">
                {logo?.url && <img src={logo.url} alt="Logo" style={{ maxHeight: 48 }} />}
                {seal?.url && <img src={seal.url} alt="Seal" style={{ maxHeight: 48, opacity: 0.85 }} />}
              </div>
              <div className="text-[11px] leading-snug"
                   dangerouslySetInnerHTML={{ __html: bodyHtml ?? PLACEHOLDER_BODY }} />
            </div>
            {ftr?.url && (
              <img src={ftr.url} alt="Footer"
                   className="absolute bottom-0 left-0 w-full block"
                   style={{ maxHeight: height * 0.12, objectFit: "contain" }} />
            )}
          </>
        ) : (
          /* SSB standard: single logo left, org heading + green divider, two contact blocks */
          <div className="relative flex flex-col h-full" style={pad}>
            <header className="flex items-start gap-3">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 78 }}>
                {logo?.url ? (
                  <img src={logo.url} alt={logo.name ?? "Logo"}
                       style={{ width: 72, height: 72, objectFit: "contain" }} />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center text-[9px] text-muted-foreground text-center">
                    Logo
                  </div>
                )}
                {tagline && (
                  <div className="text-[8px] italic text-center mt-0.5 leading-tight" style={{ maxWidth: 78 }}>
                    {tagline}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold tracking-tight" style={{ fontSize: 14, lineHeight: 1.15 }}>
                  {orgName}
                </div>
                <div style={{ height: 2, background: divider, marginTop: 4, marginBottom: 6 }} />
                <div className="grid grid-cols-2 gap-3 text-[9px] leading-snug">
                  <div>
                    {head.label && <div className="font-bold">{head.label}</div>}
                    {(head.lines ?? []).map((ln, i) => <div key={i}>{ln}</div>)}
                  </div>
                  <div className="text-right">
                    {branch.label && <div className="font-bold">{branch.label}</div>}
                    {(branch.lines ?? []).map((ln, i) => <div key={i}>{ln}</div>)}
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 mt-5 text-[10.5px] leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: bodyHtml ?? PLACEHOLDER_BODY }} />

            {signature && (
              <div className="mt-4 text-[10px]" dangerouslySetInnerHTML={{
                __html: signature.html_signature
                  || `<pre style="font-family:inherit;margin:0">${signature.plain_text_signature ?? signature.name ?? ""}</pre>`,
              }} />
            )}

            {footerNote && (
              <div className="text-center italic text-[9px] mt-3 pt-2"
                   style={{ borderTop: `1px solid ${divider}` }}>
                {footerNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LetterheadPreview;
