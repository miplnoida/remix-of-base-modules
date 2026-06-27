// Browser-side SSB logo derivation pipeline.
// Loads the master logo, generates every derived variant via Canvas 2D,
// uploads them to comm-assets/derived/<slot>.png, writes comm_media_asset rows,
// archives placeholder system defaults, and wires organization branding columns.

import { supabase } from "@/integrations/supabase/client";
import {
  DERIVED_ASSET_SPECS,
  ORG_DEFAULT_SLOT_MAP,
  SSB_MASTER_SLOT,
  type DerivedAssetSpec,
} from "./derivedAssetSpecs";

const sb = supabase as any;
const BUCKET = "comm-assets";
const MASTER_PATH = "master/ssb_official_master_logo.png";

/* ─────────────────────────── helpers ─────────────────────────── */

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.crossOrigin = "anonymous";
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function fitContain(srcW: number, srcH: number, dstW: number, dstH: number, padding = 0) {
  const aw = dstW - padding * 2;
  const ah = dstH - padding * 2;
  const scale = Math.min(aw / srcW, ah / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { dx: (dstW - w) / 2, dy: (dstH - h) / 2, dw: w, dh: h };
}

function applyPixelTransform(ctx: CanvasRenderingContext2D, w: number, h: number, spec: DerivedAssetSpec) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  switch (spec.transform) {
    case "transparent": {
      // remove near-white background
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) d[i + 3] = 0;
      }
      break;
    }
    case "monochrome": {
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      break;
    }
    case "white_on_dark": {
      // remove white bg + tint remaining pixels white
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) { d[i + 3] = 0; continue; }
        d[i] = d[i + 1] = d[i + 2] = 255;
      }
      break;
    }
    case "black_on_light": {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) { d[i + 3] = 0; continue; }
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = g < 128 ? 0 : g;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }
    case "low_opacity": {
      const alpha = Math.round(255 * (spec.opacity ?? 0.1));
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) { d[i + 3] = 0; continue; }
        d[i + 3] = Math.min(d[i + 3], alpha);
      }
      break;
    }
    case "qr_center":
    case "square_pad":
    case "passthrough":
    default:
      // also strip white bg for cleaner overlay where appropriate
      if (spec.transform === "qr_center") {
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) d[i + 3] = 0;
        }
      }
      break;
  }
  ctx.putImageData(imgData, 0, 0);
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function renderDerived(masterImg: HTMLImageElement, spec: DerivedAssetSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, spec.width, spec.height);
  const pad = spec.padding ?? 0;
  const fit = fitContain(masterImg.naturalWidth, masterImg.naturalHeight, spec.width, spec.height, pad);
  ctx.drawImage(masterImg, fit.dx, fit.dy, fit.dw, fit.dh);
  applyPixelTransform(ctx, spec.width, spec.height, spec);
  return canvasToBlob(canvas);
}

/* ─────────────────────────── master upload ─────────────────────────── */

export async function uploadMasterLogo(file: File): Promise<{ master_path: string; checksum: string; asset_id: string; }> {
  const buf = await file.arrayBuffer();
  const checksum = await sha256(buf);
  const { error: upErr } = await sb.storage.from(BUCKET).upload(MASTER_PATH, file, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) throw upErr;

  // Upsert master row by usage_slot
  const { data: existing } = await sb
    .from("comm_media_asset")
    .select("id, version_no")
    .eq("usage_slot", SSB_MASTER_SLOT)
    .maybeSingle();

  // Archive any other rows holding is_system_default=true for category 'logo'
  // to avoid clashing with the unique index ux_comm_media_asset_sys_default
  // (one is_system_default per category).
  const archiveQuery = sb
    .from("comm_media_asset")
    .update({ is_system_default: false, is_default: false, is_active: false, approval_status: "archived" })
    .eq("category", "logo")
    .eq("is_system_default", true);
  if (existing) {
    await archiveQuery.neq("id", existing.id);
  } else {
    await archiveQuery;
  }

  const payload: any = {
    name: "Official Social Security Board Logo",
    category: "logo",
    source: "upload",
    scope: "global",
    storage_path: MASTER_PATH,
    mime_type: file.type || "image/png",
    file_size_bytes: file.size,
    is_active: true,
    asset_code: SSB_MASTER_SLOT,
    approval_status: "approved",
    is_system_default: true,
    is_default: true,
    asset_type: "MASTER_LOGO",
    usage_slot: SSB_MASTER_SLOT,
    generated_by_system: false,
    checksum_sha256: checksum,
    version_no: existing ? (existing.version_no ?? 1) + 1 : 1,
  };

  if (existing) {
    const { error } = await sb.from("comm_media_asset").update(payload).eq("id", existing.id);
    if (error) throw error;
    return { master_path: MASTER_PATH, checksum, asset_id: existing.id };
  } else {
    const { data, error } = await sb.from("comm_media_asset").insert(payload).select("id").single();
    if (error) throw error;
    return { master_path: MASTER_PATH, checksum, asset_id: data.id };
  }
}


/* ─────────────────────────── full pipeline ─────────────────────────── */

export interface GenerationProgress {
  total: number;
  done: number;
  current?: string;
}

export async function generateAllDerivedAssets(opts?: { onProgress?: (p: GenerationProgress) => void }): Promise<{
  master_id: string;
  generated: { slot: string; asset_id: string }[];
  archived: number;
}> {
  // Fetch master row + storage blob
  const { data: master, error: mErr } = await sb
    .from("comm_media_asset")
    .select("id, storage_path")
    .eq("usage_slot", SSB_MASTER_SLOT)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!master?.storage_path) throw new Error("Upload the SSB master logo first.");

  const { data: dl, error: dlErr } = await sb.storage.from(BUCKET).download(master.storage_path);
  if (dlErr) throw dlErr;
  const masterImg = await loadImage(dl);

  const total = DERIVED_ASSET_SPECS.length;
  const generated: { slot: string; asset_id: string }[] = [];

  for (let i = 0; i < DERIVED_ASSET_SPECS.length; i++) {
    const spec = DERIVED_ASSET_SPECS[i];
    opts?.onProgress?.({ total, done: i, current: spec.name });

    const blob = await renderDerived(masterImg, spec);
    const buf = await blob.arrayBuffer();
    const checksum = await sha256(buf);
    const path = `derived/${spec.slot}.png`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) throw upErr;

    // Archive prior active default for this slot (keep audit)
    const { data: prior } = await sb
      .from("comm_media_asset")
      .select("id, version_no")
      .eq("usage_slot", spec.slot)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle();

    const nextVersion = prior ? (prior.version_no ?? 1) + 1 : 1;

    if (prior) {
      await sb
        .from("comm_media_asset")
        .update({ is_active: false, is_default: false, approval_status: "archived" })
        .eq("id", prior.id);
    }

    const row: any = {
      name: spec.name,
      category: spec.category,
      source: "upload",
      scope: "global",
      storage_path: path,
      mime_type: "image/png",
      file_size_bytes: blob.size,
      width_px: spec.width,
      height_px: spec.height,
      is_active: true,
      is_default: true,
      is_system_default: true,
      approval_status: "approved",
      asset_code: spec.slot,
      asset_type: "DERIVED",
      usage_slot: spec.slot,
      parent_asset_id: master.id,
      derived_from_asset_id: master.id,
      generated_by_system: true,
      generated_at: new Date().toISOString(),
      checksum_sha256: checksum,
      version_no: nextVersion,
      remarks: spec.description,
    };

    const { data: ins, error: insErr } = await sb
      .from("comm_media_asset")
      .insert(row)
      .select("id")
      .single();
    if (insErr) throw insErr;

    if (prior) {
      await sb
        .from("comm_media_asset")
        .update({ replaced_by_asset_id: ins.id })
        .eq("id", prior.id);
    }

    generated.push({ slot: spec.slot, asset_id: ins.id });
  }
  opts?.onProgress?.({ total, done: total });

  // Archive legacy "System Default *" placeholder seeds (one-time cleanup)
  const slotToId = new Map(generated.map((g) => [g.slot, g.asset_id]));
  const { data: placeholders } = await sb
    .from("comm_media_asset")
    .select("id, category, name")
    .ilike("name", "System Default %")
    .eq("is_active", true)
    .is("usage_slot", null);

  let archived = 0;
  if (placeholders?.length) {
    for (const p of placeholders) {
      // Best-effort map by category → preferred slot
      const matchSlot = DERIVED_ASSET_SPECS.find((s) => s.category === p.category)?.slot;
      const replaced_by = matchSlot ? slotToId.get(matchSlot) ?? null : null;
      await sb
        .from("comm_media_asset")
        .update({
          is_active: false,
          is_default: false,
          approval_status: "archived",
          replaced_by_asset_id: replaced_by,
        })
        .eq("id", p.id);
      archived++;
    }
  }

  // Wire organization defaults
  const { data: orgs } = await sb
    .from("core_organization")
    .select("id")
    .eq("status", "active");
  if (orgs?.length) {
    const patch: Record<string, string> = {};
    for (const [col, slot] of Object.entries(ORG_DEFAULT_SLOT_MAP)) {
      const id = slotToId.get(slot);
      if (id) patch[col] = id;
    }
    for (const org of orgs) {
      await sb.from("core_organization").update(patch).eq("id", org.id);
    }
  }

  return { master_id: master.id, generated, archived };
}
