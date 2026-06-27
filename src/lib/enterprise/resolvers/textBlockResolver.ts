/**
 * Text-block resolver — resolves a `core_text_block` by code, walking the
 * `parent_text_block_id` chain so specializations (disclaimers, print
 * footers, certificate clauses) inherit body from their parent.
 *
 * Specialization tables (`comm_disclaimer`, `comm_print_footer`) keep
 * their own metadata columns but FK to `core_text_block.id`; this
 * resolver returns the merged body, not the specialization metadata.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ResolvedTextBlock, OwnerScope } from "../types";

const sb = supabase as any;

export async function resolveTextBlock(
  code?: string | null,
): Promise<ResolvedTextBlock | null> {
  if (!code) return null;
  try {
    const { data, error } = await sb
      .from("core_text_block")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return null;

    let body_html = data.body_html ?? data.body ?? "";
    let body_text = data.body_text ?? "";
    let cursor: any = data;
    const guard = new Set<string>([data.id]);
    while (
      cursor?.parent_text_block_id &&
      !guard.has(cursor.parent_text_block_id) &&
      (!body_html || !body_text)
    ) {
      const { data: parent } = await sb
        .from("core_text_block")
        .select("*")
        .eq("id", cursor.parent_text_block_id)
        .maybeSingle();
      if (!parent) break;
      if (!body_html) body_html = parent.body_html ?? parent.body ?? body_html;
      if (!body_text) body_text = parent.body_text ?? body_text;
      guard.add(parent.id);
      cursor = parent;
    }

    return {
      id: data.id,
      code: data.code,
      scope: (data.scope ?? "GLOBAL") as OwnerScope,
      body_html,
      body_text,
      resolved_via: (data.scope ?? "GLOBAL") as OwnerScope,
      is_fallback: !body_html && !body_text,
    };
  } catch {
    return null;
  }
}

export async function resolveTextBlocks(
  codes: string[],
): Promise<Record<string, ResolvedTextBlock | null>> {
  const results = await Promise.all(codes.map(resolveTextBlock));
  return Object.fromEntries(codes.map((c, i) => [c, results[i]]));
}
