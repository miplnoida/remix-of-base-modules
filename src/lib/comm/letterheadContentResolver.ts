/**
 * Letterhead Content Resolver
 * ---------------------------------------------------------------
 * Letterheads store LAYOUT only — where to put the head/branch office
 * blocks, which fields to show, which text block to use for the footer.
 * All live content (organization name, location addresses, phones, faxes,
 * emails, website, footer note) is resolved from the real master tables
 * at render time so preview + printed output always reflect the latest
 * data from:
 *   - core_organization
 *   - office_locations
 *   - core_text_block
 *
 * Any legacy static values embedded in `design_config` (organization_name,
 * head_office.lines, branch_office.lines, footer_note text, etc.) are
 * treated as fallbacks only when live data cannot be resolved.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type HeadOfficeRole = "PRIMARY" | "HEAD_OFFICE" | "SPECIFIC";
export type BranchOfficeRole = "FIRST_BRANCH" | "SPECIFIC" | "NONE";
export type OfficeBlockLayout = "left_right" | "stacked" | "header_only" | "none";

export interface LetterheadLayoutConfig {
  layout_variant?: "ssb_standard" | "image_bands";

  // display flags
  show_organization_name?: boolean;
  show_tagline?: boolean;
  show_head_office_block?: boolean;
  show_branch_office_block?: boolean;

  // office block layout
  office_block_layout?: OfficeBlockLayout;

  // where the head/branch offices come from
  head_office_location_role?: HeadOfficeRole;
  head_office_location_id?: string | null;
  branch_office_location_role?: BranchOfficeRole;
  branch_office_location_id?: string | null;

  // which fields to include inside each office block
  show_address?: boolean;
  show_phone?: boolean;
  show_fax?: boolean;
  show_email?: boolean;
  show_website?: boolean;

  // static labels (allowed, purely presentational)
  head_office_label?: string | null;
  branch_office_label?: string | null;

  // footer note text block
  footer_note_text_block_code?: string | null;

  // divider colour
  divider_color?: string | null;

  // ---- legacy fallbacks (still supported, never edited going forward) ----
  organization_name?: string | null;
  tagline?: string | null;
  head_office?: { label?: string | null; lines?: string[] } | null;
  branch_office?: { label?: string | null; lines?: string[] } | null;
  footer_note?: string | null;
}

export interface ResolvedOfficeBlock {
  label: string | null;
  lines: string[];
  location_id: string | null;
  source: "location" | "fallback" | "empty";
}

export interface ResolvedLetterheadContent {
  organization_name: string | null;
  tagline: string | null;
  head_office: ResolvedOfficeBlock;
  branch_office: ResolvedOfficeBlock;
  footer_note: string | null;
  footer_source: "text_block" | "fallback" | "empty";
  divider_color: string;
}

const DEFAULT_DIVIDER = "#2E7D32";

function locationLines(
  loc: any | null,
  flags: LetterheadLayoutConfig,
): string[] {
  if (!loc) return [];
  const wantAddress = flags.show_address !== false;
  const wantPhone = flags.show_phone !== false;
  const wantFax = flags.show_fax !== false;
  const wantEmail = flags.show_email !== false;

  const lines: string[] = [];
  if (wantAddress) {
    if (loc.address) lines.push(String(loc.address));
    const cityLine = [loc.parish_city || loc.city, loc.state || loc.island_or_region]
      .filter(Boolean)
      .join(", ");
    if (cityLine) lines.push(cityLine);
    if (loc.country) lines.push(String(loc.country));
  }
  const contact: string[] = [];
  if (wantPhone && loc.phone) contact.push(`Tel: ${loc.phone}`);
  if (wantFax && loc.fax) contact.push(`Fax: ${loc.fax}`);
  if (contact.length) lines.push(contact.join("  "));
  if (wantEmail && loc.email) lines.push(String(loc.email));
  return lines;
}

async function pickLocation(role: HeadOfficeRole | BranchOfficeRole, specificId: string | null | undefined, orgId: string | null) {
  const base = sb.from("office_locations").select("*").eq("is_active", true);
  if (role === "SPECIFIC" && specificId) {
    const { data } = await base.eq("id", specificId).maybeSingle();
    return data ?? null;
  }
  if (role === "HEAD_OFFICE") {
    const { data } = await (orgId ? base.eq("organization_id", orgId) : base)
      .eq("location_type", "HEAD_OFFICE").limit(1).maybeSingle();
    return data ?? null;
  }
  if (role === "PRIMARY") {
    const { data } = await (orgId ? base.eq("organization_id", orgId) : base)
      .eq("is_primary", true).limit(1).maybeSingle();
    return data ?? null;
  }
  if (role === "FIRST_BRANCH") {
    const { data } = await (orgId ? base.eq("organization_id", orgId) : base)
      .eq("is_primary", false).order("branch_name").limit(1).maybeSingle();
    return data ?? null;
  }
  return null;
}

/** Resolve one letterhead's live text content. Never returns null — always
 *  provides a usable structure (may fall back to legacy static values). */
export async function resolveLetterheadContent(
  design: LetterheadLayoutConfig | null | undefined,
  opts: { organizationId?: string | null } = {},
): Promise<ResolvedLetterheadContent> {
  const d: LetterheadLayoutConfig = design ?? {};

  // Resolve organization
  let org: any = null;
  if (opts.organizationId) {
    const { data } = await sb.from("core_organization").select("*").eq("id", opts.organizationId).maybeSingle();
    org = data;
  }
  if (!org) {
    const { data } = await sb.from("core_organization").select("*")
      .eq("status", "active").order("created_at").limit(1).maybeSingle();
    org = data;
  }
  const orgId = org?.id ?? null;

  // Resolve head/branch locations
  const headRole = (d.head_office_location_role ?? "PRIMARY") as HeadOfficeRole;
  const branchRole = (d.branch_office_location_role ?? "FIRST_BRANCH") as BranchOfficeRole;
  const showHead = d.show_head_office_block !== false && d.office_block_layout !== "none" && d.office_block_layout !== "header_only";
  const showBranch = d.show_branch_office_block !== false && d.office_block_layout !== "none" && d.office_block_layout !== "header_only" && branchRole !== "NONE";

  const [headLoc, branchLoc] = await Promise.all([
    showHead ? pickLocation(headRole, d.head_office_location_id ?? null, orgId) : Promise.resolve(null),
    showBranch ? pickLocation(branchRole, d.branch_office_location_id ?? null, orgId) : Promise.resolve(null),
  ]);

  const headLines = locationLines(headLoc, d);
  const branchLines = locationLines(branchLoc, d);

  // Legacy fallback lines if location resolution produced nothing
  const legacyHead = d.head_office?.lines ?? [];
  const legacyBranch = d.branch_office?.lines ?? [];

  const head: ResolvedOfficeBlock = showHead ? {
    label: d.head_office_label ?? d.head_office?.label ?? "Head Office:",
    lines: headLines.length ? headLines : legacyHead,
    location_id: headLoc?.id ?? null,
    source: headLines.length ? "location" : (legacyHead.length ? "fallback" : "empty"),
  } : { label: null, lines: [], location_id: null, source: "empty" };

  const branch: ResolvedOfficeBlock = showBranch ? {
    label: d.branch_office_label ?? d.branch_office?.label ?? "Branch Office:",
    lines: branchLines.length ? branchLines : legacyBranch,
    location_id: branchLoc?.id ?? null,
    source: branchLines.length ? "location" : (legacyBranch.length ? "fallback" : "empty"),
  } : { label: null, lines: [], location_id: null, source: "empty" };

  // Footer note — prefer text block
  let footer_note: string | null = null;
  let footer_source: ResolvedLetterheadContent["footer_source"] = "empty";
  if (d.footer_note_text_block_code) {
    const { data } = await sb.from("core_text_block")
      .select("content_text, content_html")
      .eq("text_block_code", d.footer_note_text_block_code)
      .eq("is_active", true)
      .order("version_no", { ascending: false })
      .limit(1).maybeSingle();
    if (data) {
      footer_note = (data.content_text ?? "").trim() || null;
      footer_source = footer_note ? "text_block" : "empty";
    }
  }
  if (!footer_note && d.footer_note) {
    footer_note = d.footer_note;
    footer_source = "fallback";
  }

  const showOrgName = d.show_organization_name !== false;
  const showTagline = d.show_tagline !== false;

  return {
    organization_name: showOrgName ? (org?.legal_name ?? d.organization_name ?? null) : null,
    tagline: showTagline ? (d.tagline ?? null) : null,
    head_office: head,
    branch_office: branch,
    footer_note,
    footer_source,
    divider_color: d.divider_color || DEFAULT_DIVIDER,
  };
}
