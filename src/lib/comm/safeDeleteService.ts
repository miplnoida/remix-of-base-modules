/**
 * Safe-delete service for communication entities.
 *
 * Rules:
 *  - Hard delete only when there are zero references AND the row is not an
 *    active system default / latest approved default.
 *  - Archive sets is_active=false (+ approval_status='archived' when supported).
 *  - Replace rewrites all replaceable references from oldId → newId, then
 *    re-scans to verify zero remaining hits before allowing delete.
 *  - Every action writes to comm_asset_audit_log.
 */

import { supabase } from "@/integrations/supabase/client";
import { scanReferences, type ReferenceHit } from "./referenceScanner";
import type { CommEntityType } from "./referenceRegistry";

const sb = supabase as any;

export interface CanDeleteResult {
  allowed: boolean;
  reasons: string[];
  hits: ReferenceHit[];
}

async function fetchEntity(entityType: CommEntityType, id: string) {
  const { data } = await sb.from(entityType).select("*").eq("id", id).maybeSingle();
  return data;
}

function isProtectedDefault(entityType: CommEntityType, row: any): string | null {
  if (!row) return null;
  if (entityType === "comm_media_asset") {
    if (row.is_system_default && row.is_active) return "Active system-default asset cannot be deleted. Archive instead.";
    if (row.asset_type === "MASTER_LOGO" && row.is_active) return "Master logo cannot be deleted. Archive instead.";
  }
  if (entityType === "comm_letterhead") {
    if (row.is_active && row.status === "approved") {
      // Block delete on the latest approved active template
      return "Latest approved active template cannot be deleted. Archive instead.";
    }
  }
  return null;
}

export async function canDelete(
  entityType: CommEntityType,
  entityId: string,
  matchKeyOverride?: string,
): Promise<CanDeleteResult> {
  const reasons: string[] = [];
  const row = await fetchEntity(entityType, entityId);
  const protectedReason = isProtectedDefault(entityType, row);
  if (protectedReason) reasons.push(protectedReason);

  const hits = await scanReferences(entityType, entityId, matchKeyOverride);
  if (hits.length > 0) {
    reasons.push(`Used in ${hits.length} place${hits.length === 1 ? "" : "s"}.`);
  }

  return { allowed: reasons.length === 0, reasons, hits };
}

async function writeAudit(args: {
  entityType: CommEntityType;
  entityId: string;
  action: "delete" | "archive" | "replace" | "restore" | "reference_rewrite";
  reason?: string | null;
  oldReferenceId?: string | null;
  newReferenceId?: string | null;
  performedBy?: string | null;
  payload?: Record<string, any>;
}) {
  await sb.from("comm_asset_audit_log").insert({
    entity_type: args.entityType,
    entity_id: args.entityId,
    action: args.action,
    reason: args.reason ?? null,
    old_reference_id: args.oldReferenceId ?? null,
    new_reference_id: args.newReferenceId ?? null,
    performed_by: args.performedBy ?? null,
    payload: args.payload ?? {},
  });
}

export async function softArchive(
  entityType: CommEntityType,
  entityId: string,
  reason: string,
  performedBy: string | null,
) {
  const patch: Record<string, any> = { is_active: false };
  if (entityType === "comm_media_asset" || entityType === "comm_letterhead") {
    patch.approval_status = "archived";
    if (entityType === "comm_letterhead") patch.status = "archived";
  }
  const { error } = await sb.from(entityType).update(patch).eq("id", entityId);
  if (error) throw error;
  await writeAudit({ entityType, entityId, action: "archive", reason, performedBy });
}

export async function hardDelete(
  entityType: CommEntityType,
  entityId: string,
  reason: string,
  performedBy: string | null,
  matchKeyOverride?: string,
) {
  const check = await canDelete(entityType, entityId, matchKeyOverride);
  if (!check.allowed) {
    throw new Error(check.reasons.join(" "));
  }
  const { error } = await sb.from(entityType).delete().eq("id", entityId);
  if (error) throw error;
  await writeAudit({ entityType, entityId, action: "delete", reason, performedBy });
}

/**
 * Rewrite a single reference hit from oldId to newId.
 * For column refs: simple UPDATE.
 * For json refs:  fetch → setIn(path, newId) → UPDATE.
 */
async function rewriteHit(hit: ReferenceHit, oldId: string, newId: string) {
  const s = hit.source;
  if (!s.replaceable) return false;
  if (s.match.kind === "column") {
    const { error } = await sb
      .from(s.table)
      .update({ [s.match.column]: newId })
      .eq(s.match.column, oldId)
      .eq(s.idColumn ?? "id", hit.recordId);
    if (error) throw error;
    return true;
  }
  if (s.match.kind === "jsonContains" && s.writePath) {
    // Fetch full row, mutate the json path, write back.
    const idCol = s.idColumn ?? "id";
    const { data, error } = await sb.from(s.table).select(`${idCol}, ${s.match.column}`).eq(idCol, hit.recordId).maybeSingle();
    if (error || !data) return false;
    const path = s.writePath.split(".");
    // path[0] is the column; remaining is json path
    const colName = path.shift()!;
    const json = JSON.parse(JSON.stringify(data[colName] ?? {}));
    let node: any = json;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof node[path[i]] !== "object" || node[path[i]] === null) node[path[i]] = {};
      node = node[path[i]];
    }
    const leaf = path[path.length - 1];
    if (Array.isArray(node[leaf])) {
      node[leaf] = node[leaf].map((v: any) => (v === oldId ? newId : v));
    } else {
      node[leaf] = newId;
    }
    const { error: uerr } = await sb.from(s.table).update({ [colName]: json }).eq(idCol, hit.recordId);
    if (uerr) throw uerr;
    return true;
  }
  return false;
}

export async function replaceReferences(
  entityType: CommEntityType,
  oldId: string,
  newId: string,
  reason: string,
  performedBy: string | null,
): Promise<{ rewritten: number; skipped: number }> {
  if (oldId === newId) throw new Error("Replacement must be a different item.");
  const hits = await scanReferences(entityType, oldId);
  let rewritten = 0;
  let skipped = 0;
  for (const h of hits) {
    try {
      const ok = await rewriteHit(h, oldId, newId);
      if (ok) {
        rewritten++;
        await writeAudit({
          entityType,
          entityId: oldId,
          action: "reference_rewrite",
          reason,
          oldReferenceId: oldId,
          newReferenceId: newId,
          performedBy,
          payload: { table: h.source.table, record_id: h.recordId, write_path: h.source.writePath ?? null },
        });
      } else skipped++;
    } catch {
      skipped++;
    }
  }
  await writeAudit({
    entityType,
    entityId: oldId,
    action: "replace",
    reason,
    oldReferenceId: oldId,
    newReferenceId: newId,
    performedBy,
    payload: { total_hits: hits.length, rewritten, skipped },
  });
  return { rewritten, skipped };
}
