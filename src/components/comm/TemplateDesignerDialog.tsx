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
  type SignaturePlacementMode,
} from "@/lib/comm/templateCatalog";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";
import { buildSignatureBlockHtml } from "@/lib/comm/buildSignatureBlockHtml";
import { SourceInspector, type SourceRow } from "@/components/comm/SourceInspector";
import { resolveCommunicationContext, type CommunicationContext } from "@/lib/comm/communicationResolver";
import { Checkbox } from "@/components/ui/checkbox";


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
  // Enterprise definition (resolver-driven; see SourceInspector)
  owner_department_code?: string | null;
  business_object?: string | null;
  recipient_type?: string | null;
  security_classification?: string | null;
  communication_profile_code?: string | null;
  document_profile_code?: string | null;
  signature_policy?: string | null;
  stamp_policy?: string | null;
  approval_workflow_code?: string | null;
  retention_policy?: string | null;
  dms_folder?: string | null;
  default_language?: string | null;
  supported_languages?: string[] | null;
  output_channels?: string[] | null;
}

const BUSINESS_OBJECTS = ["Employer", "Insured Person", "Self-Employed", "Case", "Claim", "Invoice", "Payment", "Inspection", "Legal Matter", "Generic"];
const RECIPIENT_TYPES = ["Employer", "Individual", "Internal Staff", "External Counsel", "Regulator", "Public"];
const SECURITY_LEVELS = ["Public", "Internal", "Confidential", "Restricted"];
const SIGNATURE_POLICIES = ["None", "Optional", "Required", "Required + Witness"];
const STAMP_POLICIES = ["None", "Optional", "Required", "Required + Seal"];
const RETENTION_POLICIES = ["Short (1 year)", "Standard (7 years)", "Legal (10 years)", "Permanent"];
const OUTPUT_CHANNELS = ["EMAIL", "PRINT", "PDF", "SMS", "PORTAL", "DMS", "API", "MOBILE_PUSH"];
const LANGUAGES = ["en", "fr", "es", "pt", "nl"];

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

function EnumSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value ?? "_none"} onValueChange={(v) => onChange(v === "_none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="— Select —" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— None —</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function useLookup(table: string, labelCol: string, valueCol: string) {
  return useQuery({
    queryKey: ["lookup", table, labelCol, valueCol],
    queryFn: async () => {
      try {
        const { data, error } = await sb.from(table).select(`${valueCol},${labelCol}`).order(labelCol).limit(500);
        if (error) throw error;
        return (data ?? []) as Array<Record<string, string>>;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });
}

function LookupSelect({ label, table, labelCol, valueCol, value, onChange }: { label: string; table: string; labelCol: string; valueCol: string; value: string | null; onChange: (v: string | null) => void }) {
  const { data = [], isLoading } = useLookup(table, labelCol, valueCol);
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value ?? "_none"} onValueChange={(v) => onChange(v === "_none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder={isLoading ? "Loading…" : "— Select —"} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— None —</SelectItem>
          {data.map((r) => (
            <SelectItem key={r[valueCol]} value={r[valueCol]}>{r[labelCol] ?? r[valueCol]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MultiCheckbox({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1 rounded-md border p-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={value.includes(o)} onCheckedChange={() => toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
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
  const sigPending = sb.show_signature && sb.signature_source !== "FIXED_ASSET" && !sb.signature_asset_id && !urls.signature;
  const signatureFragment = buildSignatureBlockHtml(
    sb,
    { signature: urls.signature, stamp: urls.stamp, seal: urls.seal, approval_stamp: urls.approval_stamp },
    { pending: sigPending, signerName: "{officer_name}", signerDesignation: "{officer_designation}" },
  ).replace(/\{officer_name\}/g, "M. Williams").replace(/\{officer_designation\}/g, "Senior Claims Officer");
  const mode = sb.placement_mode ?? "inline_after_signer";
  // For inline modes, splice the signature into the body and skip the absolute overlay.
  let bodyHtml = applyTokens(d.content.body_html);
  let absoluteSignature = "";
  if (mode === "absolute_fixed") {
    absoluteSignature = signatureFragment;
  } else if (mode === "inline_after_signer" && bodyHtml.includes("{{signer_block}}")) {
    bodyHtml = bodyHtml.replace(/\{\{signer_block\}\}/g, signatureFragment);
  } else {
    // flow_end_of_content OR inline_after_signer with no token → append
    bodyHtml = `${bodyHtml}${signatureFragment}`;
  }
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
        ${bodyHtml}
        ${blocksHtml}
      </div>
      ${urls.seal && d.header.show_seal ? `<div class="corner" style="${cornerStyle(d.layout.seal_position)}"><img src="${urls.seal}" /></div>` : ""}
      ${absoluteSignature}
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
        // For the designer preview we always resolve the configured signature asset
        // (regardless of source) so the user can see what the signature block will
        // look like. At runtime the real source still drives which signature is used.
        resolveAssetUrl(sigCfg.signature_asset_id),
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

  // Resolve the communication context for the Source Inspector so the
  // administrator can see exactly where every header / footer / asset value
  // originates (Organization vs. Department vs. Location vs. Asset Library
  // vs. Template-local override vs. System Default vs. Missing).
  const [ctx, setCtx] = useState<CommunicationContext | null>(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const c = await resolveCommunicationContext(row.module_code || row.owner_department_code || "LEGAL");
      if (!cancel) setCtx(c);
    })();
    return () => { cancel = true; };
  }, [row.module_code, row.owner_department_code]);

  const sourceRows = useMemo<SourceRow[]>(() => {
    const rows: SourceRow[] = [];
    const orgName = ctx?.organization.name || "";
    const deptName = ctx?.department.name || "";
    const locName = ctx?.location.name || "";
    const pick = (templateVal: string, ctxVal: string, scope: SourceRow["scope"], detail: string): SourceRow => {
      if (templateVal && templateVal.trim() && templateVal !== ctxVal) return { label: "", value: templateVal, scope: "TEMPLATE", detail: "Overridden in template designer" };
      if (ctxVal) return { label: "", value: ctxVal, scope, detail };
      return { label: "", value: null, scope: "MISSING", detail: "No value resolved" };
    };
    const add = (label: string, base: SourceRow, href?: string) => rows.push({ ...base, label, href });

    add("Organization Name", pick(design.header.organization_name, orgName, "ORGANIZATION", `core_organization → ${orgName || "—"}`), "/admin/organization");
    add("Department Name", pick(design.header.department_name, deptName, "DEPARTMENT", `core_department_profile → ${deptName || "—"}`), "/admin/organization/departments");
    add("Office Address", pick(design.header.office_address, ctx?.location.address ?? "", "LOCATION", `Location: ${locName || "—"}`), "/admin/organization/locations");
    add("Phone", pick(design.header.phone, ctx?.location.phone ?? "", "LOCATION", `Location: ${locName || "—"}`));
    add("Email", pick(design.header.email, ctx?.location.email ?? "", "LOCATION", `Location: ${locName || "—"}`));
    add("Website", pick(design.header.website, ctx?.organization.website ?? "", "ORGANIZATION", "core_organization.website"));
    add("Logo", { label: "", value: urls.logo || null, scope: design.branding.logo_asset_id ? "ASSET_LIBRARY" : (ctx?.organization.primaryLogoUrl ? "ORGANIZATION" : "MISSING"), detail: design.branding.logo_asset_id ? "comm_media_asset (template override)" : "core_organization.primary_logo" }, "/admin/organization/assets");
    add("Seal", { label: "", value: urls.seal || null, scope: design.branding.seal_asset_id ? "ASSET_LIBRARY" : (ctx?.organization.sealUrl ? "ORGANIZATION" : "MISSING"), detail: design.branding.seal_asset_id ? "comm_media_asset (template override)" : "core_organization.seal" });
    add("Watermark", { label: "", value: urls.watermark || null, scope: design.branding.watermark_asset_id ? "ASSET_LIBRARY" : "MISSING", detail: "comm_media_asset" });
    add("Signature", { label: "", value: urls.signature || null, scope: design.signature_block.signature_asset_id ? "ASSET_LIBRARY" : (design.signature_block.signature_source === "FIXED_ASSET" ? "MISSING" : "TEMPLATE"), detail: `Source: ${design.signature_block.signature_source}` });
    add("Stamp", { label: "", value: urls.stamp || null, scope: design.signature_block.stamp_asset_id ? "ASSET_LIBRARY" : "MISSING", detail: "comm_media_asset (category=stamp)" });
    add("Disclaimer Text Block", { label: "", value: ctx?.disclaimer.name || null, scope: ctx?.disclaimer.standard ? "TEXT_BLOCK" : "SYSTEM_DEFAULT", detail: "core_text_block via comm resolver" }, "/admin/organization/text-blocks");
    add("Print Footer", { label: "", value: ctx?.print.footer || null, scope: ctx?.print.footer ? "TEXT_BLOCK" : "SYSTEM_DEFAULT", detail: "comm_print_footer" });
    add("QR Code", { label: "", value: ctx?.letterhead.qrCode || null, scope: ctx?.letterhead.qrCode ? "ORGANIZATION" : "SYSTEM_DEFAULT", detail: "letterhead.qr_code" });
    add("Email Signature", { label: "", value: ctx?.email.senderEmail || null, scope: ctx?.email.signatureHtml ? "DEPARTMENT" : "SYSTEM_DEFAULT", detail: "comm_email_signature" });
    add("Communication Profile", { label: "", value: row.communication_profile_code || null, scope: row.communication_profile_code ? "TEMPLATE" : "MISSING", detail: "Drives default text blocks + assets" });
    add("Document Profile", { label: "", value: row.document_profile_code || null, scope: row.document_profile_code ? "TEMPLATE" : "MISSING", detail: "Drives storage + retention + layout" });
    return rows;
  }, [ctx, design, urls, row.communication_profile_code, row.document_profile_code]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row.name?.trim()) throw new Error("Name is required");
      const payload: any = {
        name: row.name, code: row.code, category: row.category, subcategory: row.subcategory,
        document_type: row.document_type, module_code: row.module_code, department_code: row.department_code,
        version: row.version, version_no: row.version_no ?? 1, status: row.status ?? "draft",
        effective_from: row.effective_from, effective_to: row.effective_to, is_active: row.is_active ?? true,
        description: row.description, design_config: design,
        owner_department_code: row.owner_department_code ?? null,
        business_object: row.business_object ?? null,
        recipient_type: row.recipient_type ?? null,
        security_classification: row.security_classification ?? null,
        communication_profile_code: row.communication_profile_code ?? null,
        document_profile_code: row.document_profile_code ?? null,
        signature_policy: row.signature_policy ?? null,
        stamp_policy: row.stamp_policy ?? null,
        approval_workflow_code: row.approval_workflow_code ?? null,
        retention_policy: row.retention_policy ?? null,
        dms_folder: row.dms_folder ?? null,
        default_language: row.default_language ?? null,
        supported_languages: row.supported_languages ?? null,
        output_channels: row.output_channels ?? null,
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
                {["general","layout","branding","header","footer","content","signature","tokens","preview","history"].map((t) =>
                  <TabsTrigger key={t} value={t} className="capitalize">{t === "signature" ? "Signature & Stamp" : t}</TabsTrigger>)}
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

                {/* ── Ownership & Scope ────────────────────────────── */}
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ownership &amp; Scope</div>
                  <div className="grid grid-cols-2 gap-2">
                    <LookupSelect table="core_department" labelCol="name" valueCol="code"
                      label="Owner Department" value={row.owner_department_code ?? null}
                      onChange={(v) => set("owner_department_code", v)} />
                    <EnumSelect label="Business Object" options={BUSINESS_OBJECTS}
                      value={row.business_object ?? null} onChange={(v) => set("business_object", v)} />
                    <EnumSelect label="Recipient Type" options={RECIPIENT_TYPES}
                      value={row.recipient_type ?? null} onChange={(v) => set("recipient_type", v)} />
                    <EnumSelect label="Security Classification" options={SECURITY_LEVELS}
                      value={row.security_classification ?? null} onChange={(v) => set("security_classification", v)} />
                  </div>
                </div>

                {/* ── Profiles & Policies ──────────────────────────── */}
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profiles &amp; Policies</div>
                  <div className="grid grid-cols-2 gap-2">
                    <LookupSelect table="core_communication_profile" labelCol="name" valueCol="code"
                      label="Communication Profile" value={row.communication_profile_code ?? null}
                      onChange={(v) => set("communication_profile_code", v)} />
                    <LookupSelect table="core_document_profile" labelCol="name" valueCol="code"
                      label="Document Profile" value={row.document_profile_code ?? null}
                      onChange={(v) => set("document_profile_code", v)} />
                    <EnumSelect label="Signature Policy" options={SIGNATURE_POLICIES}
                      value={row.signature_policy ?? null} onChange={(v) => set("signature_policy", v)} />
                    <EnumSelect label="Stamp Policy" options={STAMP_POLICIES}
                      value={row.stamp_policy ?? null} onChange={(v) => set("stamp_policy", v)} />
                    <LookupSelect table="bn_workflow_template" labelCol="name" valueCol="code"
                      label="Approval Workflow" value={row.approval_workflow_code ?? null}
                      onChange={(v) => set("approval_workflow_code", v)} />
                    <EnumSelect label="Retention Policy" options={RETENTION_POLICIES}
                      value={row.retention_policy ?? null} onChange={(v) => set("retention_policy", v)} />
                    <div className="col-span-2">
                      <Label>DMS Folder</Label>
                      <Input value={row.dms_folder ?? ""} placeholder="/Cases/{{case.number}}/Letters"
                        onChange={(e) => set("dms_folder", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* ── Localization & Delivery ──────────────────────── */}
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Localization &amp; Delivery</div>
                  <div className="grid grid-cols-2 gap-2">
                    <EnumSelect label="Default Language" options={LANGUAGES}
                      value={row.default_language ?? null} onChange={(v) => set("default_language", v)} />
                    <MultiCheckbox label="Supported Languages" options={LANGUAGES}
                      value={row.supported_languages ?? []} onChange={(v) => set("supported_languages", v)} />
                    <div className="col-span-2">
                      <MultiCheckbox label="Output Channels" options={OUTPUT_CHANNELS}
                        value={row.output_channels ?? []} onChange={(v) => set("output_channels", v)} />
                    </div>
                  </div>
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

              <TabsContent value="signature" className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground">
                  Configure how authorized signatures and official stamps are placed on the generated document.
                  Assets are managed in the Communication Assets Library and must be <strong>approved</strong> before use.
                </p>

                <div className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Signature Block</Label>
                    <Switch
                      checked={design.signature_block.show_signature}
                      onCheckedChange={(v) => setD("signature_block", { show_signature: v })}
                    />
                  </div>
                  {design.signature_block.show_signature && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Signature Source</Label>
                          <Select
                            value={design.signature_block.signature_source}
                            onValueChange={(v) => setD("signature_block", { signature_source: v as SignatureSource })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="FIXED_ASSET">Fixed asset (always this signature)</SelectItem>
                              <SelectItem value="CASE_OWNER">Case owner</SelectItem>
                              <SelectItem value="DEPARTMENT_MANAGER">Department manager</SelectItem>
                              <SelectItem value="APPROVER">Approving officer</SelectItem>
                              <SelectItem value="SELECT_AT_GENERATION">Select at generation time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>
                            {design.signature_block.signature_source === "FIXED_ASSET"
                              ? "Fixed Signature Asset"
                              : "Preview / Fallback Signature"}
                          </Label>
                          <AssetSelect
                            category="signature"
                            value={design.signature_block.signature_asset_id}
                            onChange={(v) => setD("signature_block", { signature_asset_id: v })}
                          />
                          {design.signature_block.signature_source !== "FIXED_ASSET" && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Used in the designer preview and as a fallback if the dynamic signer has no signature on file.
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Signature Caption</Label>
                          <Input
                            value={design.signature_block.signature_caption}
                            onChange={(e) => setD("signature_block", { signature_caption: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Office Stamp</Label>
                      <Switch
                        checked={design.signature_block.show_stamp}
                        onCheckedChange={(v) => setD("signature_block", { show_stamp: v })}
                      />
                    </div>
                    {design.signature_block.show_stamp && (
                      <AssetSelect
                        category="stamp"
                        value={design.signature_block.stamp_asset_id}
                        onChange={(v) => setD("signature_block", { stamp_asset_id: v })}
                      />
                    )}
                  </div>
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Official Seal</Label>
                      <Switch
                        checked={design.signature_block.show_seal}
                        onCheckedChange={(v) => setD("signature_block", { show_seal: v })}
                      />
                    </div>
                    {design.signature_block.show_seal && (
                      <AssetSelect
                        category="seal"
                        value={design.signature_block.seal_asset_id}
                        onChange={(v) => setD("signature_block", { seal_asset_id: v })}
                      />
                    )}
                  </div>
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Approval Stamp</Label>
                      <Switch
                        checked={design.signature_block.show_approval_stamp}
                        onCheckedChange={(v) => setD("signature_block", { show_approval_stamp: v })}
                      />
                    </div>
                    {design.signature_block.show_approval_stamp && (
                      <AssetSelect
                        category="stamp"
                        value={design.signature_block.approval_stamp_asset_id}
                        onChange={(v) => setD("signature_block", { approval_stamp_asset_id: v })}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-md border p-3 space-y-3">
                  <Label className="font-semibold">Placement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Placement mode</Label>
                      <Select
                        value={design.signature_block.placement_mode ?? "inline_after_signer"}
                        onValueChange={(v) => setD("signature_block", { placement_mode: v as SignaturePlacementMode })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline_after_signer">Inline — at {"{{signer_block}}"} in body (recommended)</SelectItem>
                          <SelectItem value="flow_end_of_content">Flow — append at end of content</SelectItem>
                          <SelectItem value="absolute_fixed">Fixed — absolute mm position (receipts/certificates)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Letters should use Inline so the signature follows the actual body length. Insert
                        <code className="mx-1 px-1 rounded bg-muted">{"{{signer_block}}"}</code>
                        in the body where the signature should appear (after the sign-off line).
                      </p>
                    </div>

                    {(design.signature_block.placement_mode ?? "inline_after_signer") !== "absolute_fixed" && (
                      <>
                        <div>
                          <Label className="text-xs">Sign-off phrase</Label>
                          <Input
                            value={design.signature_block.sign_off_phrase ?? ""}
                            onChange={(e) => setD("signature_block", { sign_off_phrase: e.target.value })}
                            placeholder="Sincerely,"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Alignment</Label>
                          <Select
                            value={design.signature_block.placement}
                            onValueChange={(v) => setD("signature_block", { placement: v as SignaturePlacement })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom_left">Left</SelectItem>
                              <SelectItem value="bottom_center">Center</SelectItem>
                              <SelectItem value="bottom_right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-2 col-span-2">
                          <Label className="text-xs">Stamp overlaps signature (wet-stamp look)</Label>
                          <Switch
                            checked={design.signature_block.stamp_overlap ?? true}
                            onCheckedChange={(v) => setD("signature_block", { stamp_overlap: v })}
                          />
                        </div>
                        {(design.signature_block.stamp_overlap ?? true) && design.signature_block.show_stamp && (
                          <>
                            <div>
                              <Label className="text-xs">Stamp offset X (mm)</Label>
                              <Input type="number" value={design.signature_block.stamp_offset_x_mm ?? 18}
                                onChange={(e) => setD("signature_block", { stamp_offset_x_mm: +e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">Stamp offset Y (mm)</Label>
                              <Input type="number" value={design.signature_block.stamp_offset_y_mm ?? -8}
                                onChange={(e) => setD("signature_block", { stamp_offset_y_mm: +e.target.value })} />
                            </div>
                          </>
                        )}
                        <div>
                          <Label className="text-xs">Signature width (mm)</Label>
                          <Input type="number" value={design.signature_block.width_mm}
                            onChange={(e) => setD("signature_block", { width_mm: +e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Signature height (mm)</Label>
                          <Input type="number" value={design.signature_block.height_mm}
                            onChange={(e) => setD("signature_block", { height_mm: +e.target.value })} />
                        </div>
                      </>
                    )}

                    {(design.signature_block.placement_mode ?? "inline_after_signer") === "absolute_fixed" && (
                      <>
                        <div>
                          <Label className="text-xs">Position</Label>
                          <Select
                            value={design.signature_block.placement}
                            onValueChange={(v) => setD("signature_block", { placement: v as SignaturePlacement })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom_left">Bottom left</SelectItem>
                              <SelectItem value="bottom_center">Bottom center</SelectItem>
                              <SelectItem value="bottom_right">Bottom right</SelectItem>
                              <SelectItem value="custom">Custom (x/y)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Appear On</Label>
                          <Select
                            value={design.signature_block.appear_on}
                            onValueChange={(v) => setD("signature_block", { appear_on: v as SignatureAppearOn })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LAST_PAGE">Last page</SelectItem>
                              <SelectItem value="FIRST_PAGE">First page</SelectItem>
                              <SelectItem value="EVERY_PAGE">Every page</SelectItem>
                              <SelectItem value="SPECIFIC_SECTION">Specific section</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {design.signature_block.appear_on === "SPECIFIC_SECTION" && (
                          <div className="col-span-2">
                            <Label className="text-xs">Section Marker</Label>
                            <Input
                              value={design.signature_block.specific_section ?? ""}
                              onChange={(e) => setD("signature_block", { specific_section: e.target.value || null })}
                              placeholder="e.g. #signature-here"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs">Width (mm)</Label>
                          <Input type="number" value={design.signature_block.width_mm}
                            onChange={(e) => setD("signature_block", { width_mm: +e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Height (mm)</Label>
                          <Input type="number" value={design.signature_block.height_mm}
                            onChange={(e) => setD("signature_block", { height_mm: +e.target.value })} />
                        </div>
                        {design.signature_block.placement === "custom" && (
                          <>
                            <div>
                              <Label className="text-xs">X (mm from left)</Label>
                              <Input type="number" value={design.signature_block.x_mm}
                                onChange={(e) => setD("signature_block", { x_mm: +e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">Y (mm from bottom)</Label>
                              <Input type="number" value={design.signature_block.y_mm}
                                onChange={(e) => setD("signature_block", { y_mm: +e.target.value })} />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <Label className="text-xs">Require approval before final issue</Label>
                    <Switch
                      checked={design.signature_block.require_approval_before_final}
                      onCheckedChange={(v) => setD("signature_block", { require_approval_before_final: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <Label className="text-xs">Reason required when applying</Label>
                    <Switch
                      checked={design.signature_block.reason_required}
                      onCheckedChange={(v) => setD("signature_block", { reason_required: v })}
                    />
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

          {/* RIGHT: live preview + source inspector */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="border rounded-md bg-muted/30 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="text-xs px-3 py-1.5 border-b bg-background flex items-center justify-between">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Resolved A4 preview</span>
                <span className="text-muted-foreground">{design.layout.paper_size} · {design.layout.orientation}</span>
              </div>
              <iframe title="preview" className="w-full flex-1 bg-white" srcDoc={previewHtml} />
            </div>
            <div className="max-h-[40%] min-h-[160px] flex flex-col">
              <SourceInspector rows={sourceRows} />
            </div>
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
