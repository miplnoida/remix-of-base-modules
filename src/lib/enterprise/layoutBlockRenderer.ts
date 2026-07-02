/**
 * Layout Block Renderer
 * ---------------------
 * Pure function that turns a structured `comm_layout_block.config`
 * (rows → columns → components with channel visibility) into HTML.
 *
 * The renderer is intentionally free of Supabase calls: pass in
 * `resolvedMasters` (URLs / text already fetched by the caller) so
 * this works in both preview and runtime paths.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

async function resolveAssetUrl(row: any): Promise<string | null> {
  if (!row) return null;
  if (row.preview_url) return row.preview_url;
  if (row.external_url) return row.external_url;
  if (row.storage_path) {
    try { return (await getSignedUrl(row.storage_path, 3600)) ?? null; } catch { return null; }
  }
  return null;
}

export type ChannelSurface = "email" | "print" | "mobile";

export interface BlockComponent {
  id: string;
  type:
    | "logo"
    | "media_asset"
    | "org_name"
    | "org_tagline"
    | "org_contact"
    | "location_block"
    | "text_block"
    | "disclaimer"
    | "divider"
    | "spacer"
    | "social_links"
    | "qr_code"
    | "signature_ref"
    | "custom_text";
  // per-type fields (all optional)
  source?: string | null;          // e.g. "org_primary_logo" | "head_office" | "verification_url" | "default"
  asset_id?: string | null;        // for media_asset
  text_block_code?: string | null; // for text_block
  text?: string | null;            // for custom_text
  style?: "heading" | "body" | "small" | null;
  fields?: string[];               // for org_contact / location_block
  max_height?: number | null;      // for images
  height?: number | null;          // for spacer
  align?: "left" | "center" | "right" | null;
}

export interface BlockColumn {
  id: string;
  width: number; // 1-100 %
  align?: "left" | "center" | "right" | null;
  visibility?: Partial<Record<ChannelSurface, boolean>>;
  components: BlockComponent[];
}

export interface BlockRow {
  id: string;
  visibility?: Partial<Record<ChannelSurface, boolean>>;
  background_color?: string | null;
  padding?: { top: number; right: number; bottom: number; left: number };
  columns: BlockColumn[];
}

export interface BlockConfig {
  version: number;
  rows: BlockRow[];
  styles?: {
    divider_color?: string | null;
    text_color?: string | null;
  };
}

export interface ResolvedTheme {
  primary?: string | null;
  secondary?: string | null;
  text?: string | null;
  link?: string | null;
  background?: string | null;
  divider?: string | null;
  font_family?: string | null;
  heading_font?: string | null;
}

export interface ResolvedOrg {
  name?: string | null;
  tagline?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  primary_logo_url?: string | null;
}

export interface ResolvedLocation {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ResolveContext {
  theme: ResolvedTheme;
  org: ResolvedOrg;
  headOffice?: ResolvedLocation | null;
  mediaById: Record<string, string | null>;      // asset_id -> url
  textBlocksByCode: Record<string, string>;      // code -> html
  disclaimersByCode: Record<string, string>;
  channel: ChannelSurface;                       // which surface is being rendered
}

/* -----------------------------------------------------------
 * Aggregate resolver — one Supabase round trip for the whole
 * block (used by both preview and runtime).
 * ----------------------------------------------------------- */
export async function resolveBlockContext(opts: {
  channel: ChannelSurface;
  config: BlockConfig | null;
  themeId?: string | null;
}): Promise<ResolveContext> {
  const cfg = opts.config ?? { version: 1, rows: [] };

  const assetIds = new Set<string>();
  const textCodes = new Set<string>();
  const disclaimerCodes = new Set<string>();
  let needHeadOffice = false;

  for (const row of cfg.rows ?? []) {
    for (const col of row.columns ?? []) {
      for (const c of col.components ?? []) {
        if (c.type === "media_asset" && c.asset_id) assetIds.add(c.asset_id);
        if (c.type === "logo" && c.asset_id) assetIds.add(c.asset_id);
        if (c.type === "text_block" && c.text_block_code) textCodes.add(c.text_block_code);
        if (c.type === "disclaimer" && c.source && c.source !== "default") disclaimerCodes.add(c.source);
        if (c.type === "location_block") needHeadOffice = true;
      }
    }
  }

  const [orgRes, assetRes, textRes, discRes, themeRes, locRes] = await Promise.all([
    sb.from("core_organization").select("name,mainEmail,email,mainPhone,phone,website,mainAddress,address,primary_logo_url").limit(1).maybeSingle(),
    assetIds.size
      ? sb.from("comm_media_asset").select("id,preview_url,external_url").in("id", [...assetIds])
      : Promise.resolve({ data: [] }),
    textCodes.size
      ? sb.from("core_text_block").select("code,body_html,content").in("code", [...textCodes])
      : Promise.resolve({ data: [] }),
    disclaimerCodes.size
      ? sb.from("comm_disclaimer").select("id,code,body_html,html,content").in("code", [...disclaimerCodes])
      : Promise.resolve({ data: [] }),
    opts.themeId
      ? sb.from("app_themes").select("*").eq("id", opts.themeId).maybeSingle()
      : Promise.resolve({ data: null }),
    needHeadOffice
      ? sb.from("core_department_location").select("name,address,phone,email,is_head_office").eq("is_head_office", true).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const orgRow = (orgRes as any)?.data ?? {};
  const org: ResolvedOrg = {
    name: orgRow.name ?? null,
    tagline: null,
    email: orgRow.mainEmail ?? orgRow.email ?? null,
    phone: orgRow.mainPhone ?? orgRow.phone ?? null,
    website: orgRow.website ?? null,
    address: orgRow.mainAddress ?? orgRow.address ?? null,
    primary_logo_url: orgRow.primary_logo_url ?? null,
  };

  const mediaById: Record<string, string | null> = {};
  for (const a of (assetRes as any)?.data ?? []) {
    mediaById[a.id] = a.preview_url ?? a.external_url ?? null;
  }
  const textBlocksByCode: Record<string, string> = {};
  for (const t of (textRes as any)?.data ?? []) {
    textBlocksByCode[t.code] = t.body_html ?? t.content ?? "";
  }
  const disclaimersByCode: Record<string, string> = {};
  for (const d of (discRes as any)?.data ?? []) {
    if (d.code) disclaimersByCode[d.code] = d.body_html ?? d.html ?? d.content ?? "";
  }

  const t = (themeRes as any)?.data ?? {};
  const theme: ResolvedTheme = {
    primary: t.primary_color ?? t.primary ?? null,
    secondary: t.secondary_color ?? null,
    text: t.text_color ?? null,
    link: t.link_color ?? null,
    background: t.background_color ?? null,
    divider: t.divider_color ?? t.border_color ?? null,
    font_family: t.font_family ?? null,
    heading_font: t.heading_font ?? t.font_family ?? null,
  };

  const locRow = (locRes as any)?.data ?? null;
  const headOffice: ResolvedLocation | null = locRow
    ? { name: locRow.name, address: locRow.address, phone: locRow.phone, email: locRow.email }
    : null;

  return { theme, org, headOffice, mediaById, textBlocksByCode, disclaimersByCode, channel: opts.channel };
}

/* -----------------------------------------------------------
 * Renderer — JSON config → HTML string
 * ----------------------------------------------------------- */
function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function visibleOn(v: Partial<Record<ChannelSurface, boolean>> | undefined, ch: ChannelSurface): boolean {
  if (!v) return true;
  if (v[ch] === false) return false;
  return true;
}

function componentHtml(c: BlockComponent, ctx: ResolveContext): string {
  const t = ctx.theme;
  const align = c.align ?? null;
  const styleAlign = align ? `text-align:${align};` : "";
  const headingStyle = `font-family:${t.heading_font ?? t.font_family ?? "Arial, sans-serif"};color:${t.text ?? "#111"};font-size:18px;font-weight:600;margin:4px 0;`;
  const bodyStyle = `font-family:${t.font_family ?? "Arial, sans-serif"};color:${t.text ?? "#333"};font-size:14px;line-height:1.5;margin:2px 0;`;
  const smallStyle = `font-family:${t.font_family ?? "Arial, sans-serif"};color:${t.text ?? "#666"};font-size:11px;margin:2px 0;`;

  const pickStyle = (s?: string | null) =>
    s === "heading" ? headingStyle : s === "small" ? smallStyle : bodyStyle;

  switch (c.type) {
    case "logo": {
      const url = c.asset_id ? ctx.mediaById[c.asset_id] : (ctx.org.primary_logo_url ?? null);
      if (!url) return "";
      const h = c.max_height ?? 60;
      return `<div style="${styleAlign}"><img src="${esc(url)}" alt="logo" style="max-height:${h}px;display:inline-block" /></div>`;
    }
    case "media_asset": {
      const url = c.asset_id ? ctx.mediaById[c.asset_id] : null;
      if (!url) return "";
      const h = c.max_height ?? 80;
      return `<div style="${styleAlign}"><img src="${esc(url)}" alt="asset" style="max-height:${h}px;max-width:100%;display:inline-block" /></div>`;
    }
    case "org_name":
      return `<div style="${pickStyle(c.style ?? "heading")}${styleAlign}">${esc(ctx.org.name ?? "")}</div>`;
    case "org_tagline":
      return ctx.org.tagline ? `<div style="${pickStyle("small")}${styleAlign}">${esc(ctx.org.tagline)}</div>` : "";
    case "org_contact": {
      const fields = c.fields ?? ["address", "email", "phone", "website"];
      const parts: string[] = [];
      if (fields.includes("address") && ctx.org.address) parts.push(esc(ctx.org.address));
      if (fields.includes("email") && ctx.org.email) parts.push(esc(ctx.org.email));
      if (fields.includes("phone") && ctx.org.phone) parts.push(esc(ctx.org.phone));
      if (fields.includes("website") && ctx.org.website) parts.push(esc(ctx.org.website));
      if (!parts.length) return "";
      return `<div style="${smallStyle}${styleAlign}">${parts.join(" · ")}</div>`;
    }
    case "location_block": {
      const l = ctx.headOffice;
      if (!l) return "";
      const parts = [l.name, l.address, l.phone, l.email].filter(Boolean).map(esc);
      return `<div style="${smallStyle}${styleAlign}">${parts.join("<br/>")}</div>`;
    }
    case "text_block": {
      const html = c.text_block_code ? ctx.textBlocksByCode[c.text_block_code] : "";
      return html ? `<div style="${styleAlign}">${html}</div>` : "";
    }
    case "disclaimer": {
      const html = c.source && c.source !== "default"
        ? ctx.disclaimersByCode[c.source] ?? ""
        : "{{DISCLAIMER_BLOCK}}"; // runtime slot resolves this
      return `<div style="${smallStyle}${styleAlign};color:#888">${html}</div>`;
    }
    case "divider":
      return `<hr style="border:0;border-top:1px solid ${t.divider ?? "#e5e7eb"};margin:8px 0" />`;
    case "spacer":
      return `<div style="height:${c.height ?? 12}px"></div>`;
    case "social_links":
      return `<div style="${smallStyle}${styleAlign}">${(c.fields ?? []).map(esc).join(" · ")}</div>`;
    case "qr_code":
      return `<div style="${styleAlign}"><div style="display:inline-block;width:64px;height:64px;border:1px dashed #999;font-size:9px;color:#999;text-align:center;line-height:64px">QR</div></div>`;
    case "signature_ref":
      return `{{SIGNATURE_BLOCK}}`;
    case "custom_text":
      return `<div style="${pickStyle(c.style)}${styleAlign}">${esc(c.text ?? "")}</div>`;
    default:
      return "";
  }
}

export function renderBlockConfig(config: BlockConfig | null | undefined, ctx: ResolveContext): string {
  if (!config?.rows?.length) return "";
  const t = ctx.theme;
  const rowHtml: string[] = [];
  for (const row of config.rows) {
    if (!visibleOn(row.visibility, ctx.channel)) continue;
    const cols = (row.columns ?? []).filter((c) => visibleOn(c.visibility, ctx.channel));
    if (!cols.length) continue;
    const pad = row.padding ?? { top: 8, right: 12, bottom: 8, left: 12 };
    const bg = row.background_color ?? "";
    const tds = cols.map((col) => {
      const w = Math.max(1, Math.min(100, col.width || Math.floor(100 / cols.length)));
      const inner = (col.components ?? []).map((c) => componentHtml(c, ctx)).join("");
      const al = col.align ?? "left";
      return `<td valign="top" width="${w}%" style="width:${w}%;padding:0 4px;text-align:${al};vertical-align:top">${inner}</td>`;
    }).join("");
    rowHtml.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;${bg ? `background:${bg};` : ""}"><tr><td style="padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%"><tr>${tds}</tr></table></td></tr></table>`,
    );
  }
  const font = t.font_family ?? "Arial, sans-serif";
  const color = t.text ?? "#222";
  return `<div style="font-family:${font};color:${color}">${rowHtml.join("")}</div>`;
}

/** Convenience: fetch a block row + render it in one call. */
export async function renderBlockById(
  blockId: string,
  channel: ChannelSurface,
  themeId?: string | null,
): Promise<string> {
  const { data } = await sb.from("comm_layout_block").select("config,advanced_html,rendered_html,is_active").eq("id", blockId).maybeSingle();
  if (!data) return "";
  if (data.is_active === false) return "";
  if (data.advanced_html && String(data.advanced_html).trim()) return String(data.advanced_html);
  const cfg = (data.config ?? { version: 1, rows: [] }) as BlockConfig;
  const ctx = await resolveBlockContext({ channel, config: cfg, themeId });
  return renderBlockConfig(cfg, ctx);
}
