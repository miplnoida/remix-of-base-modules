/**
 * Communication Profile + Document Profile resolver.
 *
 * Profiles are reusable bundles (assets + text blocks + channel defaults)
 * referenced by templates. They follow the same inheritance chain
 * (GLOBAL → ORGANIZATION → MODULE → DEPARTMENT) and are merged child-wins.
 *
 * NOTE: The underlying tables (`core_communication_profile`,
 * `core_document_profile`) are created in a later migration phase. This
 * resolver is forward-compatible: if the tables/rows don't exist yet
 * it returns null so callers degrade gracefully.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  CommunicationProfileCode,
  DocumentProfileCode,
  ResolvedProfile,
} from "../types";

const sb = supabase as any;

async function loadProfile(
  table: "core_communication_profile" | "core_document_profile",
  code: string,
): Promise<ResolvedProfile | null> {
  try {
    const { data, error } = await sb
      .from(table)
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return null;

    // Walk parent chain, child wins.
    const chain: any[] = [data];
    let cursor = data;
    while (cursor?.parent_id) {
      const { data: parent } = await sb
        .from(table)
        .select("*")
        .eq("id", cursor.parent_id)
        .maybeSingle();
      if (!parent) break;
      chain.unshift(parent);
      cursor = parent;
    }
    const merged = chain.reduce(
      (acc, row) => ({ ...acc, ...(row.config ?? {}) }),
      {} as Record<string, unknown>,
    );
    return {
      id: data.id,
      code: data.code,
      name: data.name ?? data.code,
      owner_scope: data.owner_scope ?? "GLOBAL",
      parent_id: data.parent_id ?? null,
      config: merged,
    };
  } catch {
    return null;
  }
}

export const resolveCommunicationProfile = (
  code?: CommunicationProfileCode | null,
) => (code ? loadProfile("core_communication_profile", code) : Promise.resolve(null));

export const resolveDocumentProfile = (
  code?: DocumentProfileCode | null,
) => (code ? loadProfile("core_document_profile", code) : Promise.resolve(null));
