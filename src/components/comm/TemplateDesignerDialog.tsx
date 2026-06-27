import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  CONTENT_BLOCKS, DEFAULT_DESIGN, mergeDesign, TEMPLATE_CATEGORIES, TOKEN_CATALOG,
  applyTokens, PAPER_SIZE_MM, type DesignConfig, type Corner, type PaperSize,
  type SignatureSource, type SignaturePlacement, type SignatureAppearOn,
} from "@/lib/comm/templateCatalog";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";
import { buildSignatureBlockHtml } from "@/lib/comm/buildSignatureBlockHtml";


const sb = supabase as any;

interface Row {
  id?: string;
  name?: string;
  code?: string | null;
  category?: string | null;
  subcategory?: string | null;
  document_type?: string | null;
  module_code?: string | null;
  department_code?: string | null;
  version?: string | null;
  version_no?: number | null;
  status?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
  description?: string | null;
  design_config?: any;
}

const STATUSES = ["draft", "pending_approval", "approved", "archived"];
const FONTS = [
  "Inter, system-ui, Arial, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Times New Roman', Times, serif",
  "Arial, Helvetica, sans-serif",
  "'Roboto', system-ui, sans-serif",
];

const CORNERS: Corner[] = ["top_left", "top_center", "top_right", "center", "bottom_left", "bottom_center", "bottom_right", "none"];

function useAssetOptions(category: string) {
  return useQuery({
    queryKey: ["comm_media_asset", "options", category],
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_media_asset")
        .select("id,name,category,storage_path,external_url,source")
        .eq("category", category)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; storage_path: string | null; external_url: string | null; source: string }>;
    },
    staleTime: 60_000,
  });
}

function AssetSelect({ category, value, onChange, placeholder }: { category: string; value: string | null; onChange: (v: string | null) => void; placeholder?: string }) {
  const { data = [], isLoading } = useAssetOptions(category);
  return (
    <Select value={value ?? "_none"} onValueChange={(v) => onChange(v === "_none" ? null : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "None"} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">— None —</SelectItem>
        {isLoading ? <SelectItem value="_loading" disabled>Loading…</SelectItem> :
          data.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

async function resolveAssetUrl(id: string | null): Promise<string> {
  if (!id) return "";
  const { data } = await sb.from("comm_media_asset").select("storage_path,external_url,source").eq("id", id).maybeSingle();
  if (!data) return "";
  if (data.source === "external_url") return data.external_url ?? "";
  if (data.storage_path) return (await getSignedUrl(data.storage_path)) ?? "";
  return "";
}

function cornerStyle(c: Corner): string {
  switch (c) {
    case "top_left": return "top:8mm;left:8mm;";
    case "top_right": return "top:8mm;right:8mm;";
    case "top_center": return "top:8mm;left:50%;transform:translateX(-50%);";
    case "bottom_left": return "bottom:8mm;left:8mm;";
    case "bottom_right": return "bottom:8mm;right:8mm;";
    case "bottom_center": return "bottom:8mm;left:50%;transform:translateX(-50%);";
    case "center": return "top:50%;left:50%;transform:translate(-50%,-50%);";
    default: return "display:none;";
  }
}

function buildPreviewHtml(
  d: DesignConfig,
  urls: { logo: string; seal: string; stamp: string; watermark: string; signature: string; approval_stamp: string },
  name: string,
) {
  const paper = PAPER_SIZE_MM[d.layout.paper_size as PaperSize] ?? PAPER_SIZE_MM.A4;
  const w = d.layout.orientation === "landscape" ? paper.h : paper.w;
  const h = d.layout.orientation === "landscape" ? paper.w : paper.h;
  const blocksHtml = d.content.blocks
    .map((k) => CONTENT_BLOCKS.find((b) => b.key === k))
    .filter(Boolean)
    .map((b) => `<p style="font-size:9pt;color:#555;margin-top:6mm;border-top:1px dashed #ccc;padding-top:3mm">${b!.body}</p>`)
    .join("");
  const sb = d.signature_block;
  const sigPending = sb.show_signature && sb.signature_source !== "FIXED_ASSET" && !urls.signature;
  const signatureFragment = buildSignatureBlockHtml(
    sb,
    { signature: urls.signature, stamp: urls.stamp, seal: urls.seal, approval_stamp: urls.approval_stamp },
    { pending: sigPending, signerName: "{officer_name}", signerDesignation: "{officer_designation}" },
  ).replace(/\{officer_name\}/g, "M. Williams").replace(/\{officer_designation\}/g, "Senior Claims Officer");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#eef2f7;font-family:${d.branding.font_family};}
    .page{position:relative;width:${w}mm;height:${h}mm;margin:12px auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:${d.layout.margin_mm.top}mm ${d.layout.margin_mm.right}mm ${d.layout.margin_mm.bottom}mm ${d.layout.margin_mm.left}mm;color:#111;font-size:${d.branding.font_size_pt}pt;}
    .header{border-bottom:2px solid ${d.branding.primary_color};padding-bottom:4mm;min-height:${d.layout.header_height_mm}mm;display:flex;justify-content:space-between;gap:6mm;align-items:flex-start;}
    .header .left{flex:1}
    .header h1{margin:0;color:${d.branding.primary_color};font-size:${d.branding.font_size_pt + 6}pt}
    .header .meta{font-size:${d.branding.font_size_pt - 2}pt;color:${d.branding.secondary_color};margin-top:2mm;line-height:1.4}
    .header .logo img{max-height:${Math.max(d.layout.header_height_mm - 6, 14)}mm;max-width:40mm;}
    .body{padding:6mm 0;line-height:1.55;}
    .footer{position:absolute;left:${d.layout.margin_mm.left}mm;right:${d.layout.margin_mm.right}mm;bottom:${d.layout.margin_mm.bottom}mm;border-top:1px solid #e5e7eb;padding-top:3mm;font-size:${Math.max(d.branding.font_size_pt - 3, 7)}pt;color:${d.branding.secondary_color};display:flex;justify-content:space-between;gap:6mm;}
    .corner{position:absolute;}
    .corner img{max-width:24mm;max-height:24mm;opacity:.95}
    .wm{position:absolute;${cornerStyle(d.layout.watermark_position)};opacity:.07;pointer-events:none;}
    .wm img{max-width:120mm;max-height:120mm}
    .tag{display:inline-block;font-size:8pt;color:#6b7280;background:#f1f5f9;border-radius:3px;padding:1px 6px;margin-left:6px}
  </style></head><body>
    <div class="page">
      ${urls.watermark ? `<div class="wm"><img src="${urls.watermark}" /></div>` : ""}
      <div class="header">
        <div class="left">
          ${d.header.show_logo && urls.logo && (d.layout.logo_position === "top_left" || d.layout.logo_position === "top_center") ? `<div class="logo" style="margin-bottom:3mm"><img src="${urls.logo}" /></div>` : ""}
          <h1>${applyTokens(d.header.organization_name)}</h1>
          ${d.header.tagline ? `<div class="meta">${applyTokens(d.header.tagline)}</div>` : ""}
          ${d.header.show_department ? `<div class="meta"><strong>${applyTokens(d.header.department_name)}</strong></div>` : ""}
          <div class="meta">
            ${applyTokens(d.header.office_address)}<br/>
            ${[d.header.phone, d.header.email, d.header.website].filter(Boolean).map(applyTokens).join(" · ")}
            ${d.header.registration_number ? `<span class="tag">Reg ${applyTokens(d.header.registration_number)}</span>` : ""}
          </div>
        </div>
        ${d.header.show_logo && urls.logo && d.layout.logo_position === "top_right" ? `<div class="logo"><img src="${urls.logo}" /></div>` : ""}
      </div>
      <div class="body">
        ${applyTokens(d.content.body_html)}
        ${blocksHtml}
      </div>
      ${urls.seal && d.header.show_seal ? `<div class="corner" style="${cornerStyle(d.layout.seal_position)}"><img src="${urls.seal}" /></div>` : ""}
      ${signatureFragment}
      <div class="footer">
        <div>
          <div>${applyTokens(d.footer.footer_text)}</div>
          <div>${applyTokens(d.footer.contact_details)} · ${applyTokens(d.footer.website)}</div>
          <div style="font-style:italic">${d.footer.confidentiality}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          ${d.footer.show_generated_date ? `Generated: ${new Date().toLocaleDateString()}<br/>` : ""}
          ${d.footer.show_version ? `Template: ${name || "—"}<br/>` : ""}
          ${d.footer.show_page_number ? `Page 1 of 1` : ""}
        </div>
      </div>
    </div>
  </body></html>`;
}


export function TemplateDesignerDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Row | null }) {
  const qc = useQueryClient();
  const [row, setRow] = useState<Row>({});
  const [design, setDesign] = useState<DesignConfig>(DEFAULT_DESIGN);
  const [tab, setTab] = useState("general");

  useEffect(() => {
    const r = initial ?? { is_active: true, status: "draft", version: "v1", version_no: 1, category: "Official Letters", subcategory: "Standard Letter" };
    setRow(r);
    setDesign(mergeDesign(r.design_config));
    setTab("general");
  }, [initial, open]);

  const set = (k: keyof Row, v: any) => setRow((r) => ({ ...r, [k]: v }));
  const setD = <K extends keyof DesignConfig>(section: K, patch: Partial<DesignConfig[K]>) =>
    setDesign((d) => ({ ...d, [section]: { ...d[section], ...patch } }));

  // resolve preview asset URLs
  const [urls, setUrls] = useState({ logo: "", seal: "", stamp: "", watermark: "", signature: "", approval_stamp: "" });
  const sigCfg = design.signature_block;
  useEffect(() => {
    let cancel = false;
    (async () => {
      const [logo, seal, stamp, watermark, signature, approval_stamp, sigStamp, sigSeal] = await Promise.all([
        resolveAssetUrl(design.branding.logo_asset_id),
        resolveAssetUrl(design.branding.seal_asset_id),
        resolveAssetUrl(design.branding.stamp_asset_id),
        resolveAssetUrl(design.branding.watermark_asset_id),
        resolveAssetUrl(sigCfg.signature_source === "FIXED_ASSET" ? sigCfg.signature_asset_id : null),
        resolveAssetUrl(sigCfg.approval_stamp_asset_id),
        resolveAssetUrl(sigCfg.stamp_asset_id),
        resolveAssetUrl(sigCfg.seal_asset_id),
      ]);
      if (!cancel) setUrls({
        logo, seal: sigSeal || seal, stamp: sigStamp || stamp, watermark, signature, approval_stamp,
      });
    })();
    return () => { cancel = true; };
  }, [
    design.branding.logo_asset_id, design.branding.seal_asset_id, design.branding.stamp_asset_id, design.branding.watermark_asset_id,
    sigCfg.signature_source, sigCfg.signature_asset_id, sigCfg.stamp_asset_id, sigCfg.seal_asset_id, sigCfg.approval_stamp_asset_id,
  ]);


  const subcategories = useMemo(() => TEMPLATE_CATEGORIES.find((g) => g.category === row.category)?.subcategories ?? [], [row.category]);

  const previewHtml = useMemo(() => buildPreviewHtml(design, urls, row.name ?? ""), [design, urls, row.name]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row.name?.trim()) throw new Error("Name is required");
      const payload: any = {
        name: row.name, code: row.code, category: row.category, subcategory: row.subcategory,
        document_type: row.document_type, module_code: row.module_code, department_code: row.department_code,
        version: row.version, version_no: row.version_no ?? 1, status: row.status ?? "draft",
        effective_from: row.effective_from, effective_to: row.effective_to, is_active: row.is_active ?? true,
        description: row.description, design_config: design,
        // keep legacy fields populated for downstream consumers
        header_html: `<!-- managed by template designer -->`,
        footer_html: `<!-- managed by template designer -->`,
      };
      if (row.id) {
        const { error } = await sb.from("comm_letterhead").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("comm_letterhead").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_letterhead"] });
      toast.success("Template saved");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const aiImprove = () => {
    // Lightweight rule-based suggester (placeholder for AI Gateway call)
    const tips: string[] = [];
    if (!design.branding.logo_asset_id) tips.push("Select a logo from Communication Assets for a professional header.");
    if (!design.header.show_department) tips.push("Show the department name so recipients know who issued the document.");
    if (design.layout.margin_mm.top < 15) tips.push("Increase top margin to at least 15mm for print safety.");
    if (!design.footer.show_page_number) tips.push("Enable page numbers for multi-page documents.");
    if (!design.content.blocks.includes("legal_disclaimer") && row.category === "Notifications") tips.push("Add the Legal Disclaimer block for notice templates.");
    if (!design.content.blocks.includes("appeal_instructions") && row.subcategory === "Rejection Letter") tips.push("Add Appeal Instructions block to rejection letters.");
    if (!tips.length) tips.push("Template looks good. Consider versioning before publishing.");
    toast.message("AI suggestions", { description: tips.map((t) => `• ${t}`).join("\n") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.id ? "Edit" : "New"} Template
            {row.status && <Badge variant="outline" className="capitalize">{row.status.replace("_", " ")}</Badge>}
            {row.category && <Badge variant="secondary">{row.category}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-4 flex-1 min-h-0">
          {/* LEFT: editor */}
          <div className="overflow-y-auto pr-1 min-h-0">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap">
                {["general","layout","branding","header","footer","content","tokens","preview","history"].map((t) =>
                  <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
              </TabsList>

              <TabsContent value="general" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Name</Label><Input value={row.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
                  <div><Label>Code</Label><Input value={row.code ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="e.g. BEN-REJ-V1" /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={row.category ?? ""} onValueChange={(v) => { set("category", v); set("subcategory", null); }}>
                      <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
                      <SelectContent>{TEMPLATE_CATEGORIES.map((g) => <SelectItem key={g.category} value={g.category}>{g.category}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory / Document Type</Label>
                    <Select value={row.subcategory ?? ""} onValueChange={(v) => set("subcategory", v)}>
                      <SelectTrigger><SelectValue placeholder="Pick type" /></SelectTrigger>
                      <SelectContent>{subcategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Module Code</Label><Input value={row.module_code ?? ""} onChange={(e) => set("module_code", e.target.value)} placeholder="benefits, compliance…" /></div>
                  <div><Label>Department Code</Label><Input value={row.department_code ?? ""} onChange={(e) => set("department_code", e.target.value)} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={row.status ?? "draft"} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Version Label</Label><Input value={row.version ?? ""} onChange={(e) => set("version", e.target.value)} placeholder="v1" /></div>
                  <div><Label>Effective From</Label><Input type="date" value={row.effective_from ?? ""} onChange={(e) => set("effective_from", e.target.value || null)} /></div>
                  <div><Label>Effective To</Label><Input type="date" value={row.effective_to ?? ""} onChange={(e) => set("effective_to", e.target.value || null)} /></div>
                </div>
                <div><Label>Description</Label><Textarea rows={2} value={row.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label>Active</Label>
                  <Switch checked={row.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} />
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-3 pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Paper</Label>
                    <Select value={design.layout.paper_size} onValueChange={(v) => setD("layout", { paper_size: v as PaperSize })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(["A4","Letter","Legal"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Orientation</Label>
                    <Select value={design.layout.orientation} onValueChange={(v) => setD("layout", { orientation: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Header Height (mm)</Label><Input type="number" value={design.layout.header_height_mm} onChange={(e) => setD("layout", { header_height_mm: +e.target.value })} /></div>
                  <div><Label>Footer Height (mm)</Label><Input type="number" value={design.layout.footer_height_mm} onChange={(e) => setD("layout", { footer_height_mm: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["top","right","bottom","left"] as const).map((side) => (
                    <div key={side}>
                      <Label className="capitalize">{side} margin (mm)</Label>
                      <Input type="number" value={(design.layout.margin_mm as any)[side]} onChange={(e) => setD("layout", { margin_mm: { ...design.layout.margin_mm, [side]: +e.target.value } })} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["logo_position","seal_position","signature_position","qr_position","watermark_position"] as const).map((k) => (
                    <div key={k}>
                      <Label className="capitalize">{k.replace("_"," ")}</Label>
                      <Select value={(design.layout as any)[k]} onValueChange={(v) => setD("layout", { [k]: v as Corner } as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CORNERS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_"," ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="branding" className="space-y-3 pt-4">
                <p className="text-xs text-muted-foreground">Assets are pulled from the Communication Assets Library — no uploads here.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Logo</Label><AssetSelect category="logo" value={design.branding.logo_asset_id} onChange={(v) => setD("branding", { logo_asset_id: v })} /></div>
                  <div><Label>Seal</Label><AssetSelect category="seal" value={design.branding.seal_asset_id} onChange={(v) => setD("branding", { seal_asset_id: v })} /></div>
                  <div><Label>Signature / Stamp</Label><AssetSelect category="signature" value={design.branding.stamp_asset_id} onChange={(v) => setD("branding", { stamp_asset_id: v })} /></div>
                  <div><Label>Watermark</Label><AssetSelect category="watermark" value={design.branding.watermark_asset_id} onChange={(v) => setD("branding", { watermark_asset_id: v })} /></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div><Label>Primary</Label><Input type="color" value={design.branding.primary_color} onChange={(e) => setD("branding", { primary_color: e.target.value })} /></div>
                  <div><Label>Secondary</Label><Input type="color" value={design.branding.secondary_color} onChange={(e) => setD("branding", { secondary_color: e.target.value })} /></div>
                  <div>
                    <Label>Font</Label>
                    <Select value={design.branding.font_family} onValueChange={(v) => setD("branding", { font_family: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f.split(",")[0]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Font Size (pt)</Label><Input type="number" value={design.branding.font_size_pt} onChange={(e) => setD("branding", { font_size_pt: +e.target.value })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="header" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["organization_name","Organization Name"],["department_name","Department Name"],
                    ["office_address","Office Address"],["phone","Phone"],["email","Email"],["website","Website"],
                    ["registration_number","Registration No."],["tagline","Tagline"],["social_media","Social Media"],
                  ] as const).map(([k,l]) => (
                    <div key={k}><Label>{l}</Label><Input value={(design.header as any)[k] ?? ""} onChange={(e) => setD("header", { [k]: e.target.value } as any)} /></div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {([["show_logo","Show Logo"],["show_qr","Show QR"],["show_seal","Show Seal"],["show_department","Show Department"]] as const).map(([k,l]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border p-2">
                      <Label className="text-xs">{l}</Label>
                      <Switch checked={(design.header as any)[k]} onCheckedChange={(v) => setD("header", { [k]: v } as any)} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="footer" className="space-y-3 pt-4">
                <div><Label>Footer Text</Label><Textarea rows={2} value={design.footer.footer_text} onChange={(e) => setD("footer", { footer_text: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Contact Details</Label><Input value={design.footer.contact_details} onChange={(e) => setD("footer", { contact_details: e.target.value })} /></div>
                  <div><Label>Website</Label><Input value={design.footer.website} onChange={(e) => setD("footer", { website: e.target.value })} /></div>
                </div>
                <div><Label>Confidentiality Notice</Label><Input value={design.footer.confidentiality} onChange={(e) => setD("footer", { confidentiality: e.target.value })} /></div>
                <div className="grid grid-cols-4 gap-2">
                  {([["show_page_number","Page #"],["show_generated_date","Date"],["show_generated_by","Generated By"],["show_version","Version"]] as const).map(([k,l]) => (
                    <div key={k} className="flex items-center justify-between rounded-md border p-2">
                      <Label className="text-xs">{l}</Label>
                      <Switch checked={(design.footer as any)[k]} onCheckedChange={(v) => setD("footer", { [k]: v } as any)} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3 pt-4">
                <div>
                  <Label>Body (HTML, supports tokens)</Label>
                  <Textarea rows={10} className="font-mono text-xs" value={design.content.body_html} onChange={(e) => setD("content", { body_html: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Reusable Content Blocks</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_BLOCKS.map((b) => {
                      const on = design.content.blocks.includes(b.key);
                      return (
                        <button key={b.key} type="button"
                          onClick={() => setD("content", { blocks: on ? design.content.blocks.filter((k) => k !== b.key) : [...design.content.blocks, b.key] })}
                          className={`text-left text-xs rounded border p-2 ${on ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                          <div className="font-medium">{b.label}</div>
                          <div className="text-muted-foreground line-clamp-2">{b.body}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground">Click a token to copy. Paste into any header/footer/body field.</p>
                {TOKEN_CATALOG.map((g) => (
                  <div key={g.group}>
                    <div className="text-xs font-semibold mb-1.5">{g.group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.tokens.map((t) => (
                        <button key={t.token} type="button"
                          onClick={() => { navigator.clipboard.writeText(t.token); toast.success(`Copied ${t.token}`); }}
                          className="text-xs px-2 py-0.5 rounded border bg-muted hover:bg-accent">
                          <Badge variant="outline" className="font-mono text-[10px] mr-1">{t.token}</Badge>{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="preview" className="pt-4">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Eye className="h-3 w-3" /> Live preview is always visible on the right.</div>
                <Button variant="outline" onClick={aiImprove}><Sparkles className="h-4 w-4 mr-2" /> AI Improve Template</Button>
              </TabsContent>

              <TabsContent value="history" className="pt-4 text-sm text-muted-foreground">
                Version history will appear here once approvals are enabled. Current version: <strong>{row.version ?? "v1"}</strong> (#{row.version_no ?? 1}).
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: live preview */}
          <div className="border rounded-md bg-muted/30 overflow-hidden min-h-0 flex flex-col">
            <div className="text-xs px-3 py-1.5 border-b bg-background flex items-center justify-between">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Live A4 preview (sample data)</span>
              <span className="text-muted-foreground">{design.layout.paper_size} · {design.layout.orientation}</span>
            </div>
            <iframe title="preview" className="w-full flex-1 bg-white" srcDoc={previewHtml} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Template</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
