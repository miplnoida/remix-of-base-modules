/**
 * Template resolver — loads `core_template` by code and walks the
 * `parent_template_id` chain so child templates inherit subject/body/tokens
 * from their parent (child fields win when non-null).
 *
 * Forward-compatible: if `parent_template_id` column does not exist yet,
 * only the direct row is returned.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ResolvedTemplate, DeliveryChannel, OwnerScope } from "../types";

const sb = supabase as any;

export async function resolveTemplate(
  code?: string | null,
): Promise<ResolvedTemplate | null> {
  if (!code) return null;
  try {
    const { data, error } = await sb
      .from("core_template")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return null;

    const chain: any[] = [data];
    let cursor: any = data;
    const guard = new Set<string>([data.id]);
    while (cursor?.parent_template_id && !guard.has(cursor.parent_template_id)) {
      const { data: parent } = await sb
        .from("core_template")
        .select("*")
        .eq("id", cursor.parent_template_id)
        .maybeSingle();
      if (!parent) break;
      chain.unshift(parent);
      guard.add(parent.id);
      cursor = parent;
    }

    const merged = chain.reduce<any>((acc, row) => {
      const next: any = { ...acc };
      for (const k of [
        "subject",
        "body_html",
        "body_text",
        "category",
        "channels",
      ]) {
        if (row[k] != null && row[k] !== "") next[k] = row[k];
      }
      next.tokens = Array.from(
        new Set([...(acc.tokens ?? []), ...((row.tokens as string[]) ?? [])]),
      );
      return next;
    }, {});

    return {
      id: data.id,
      code: data.code,
      name: data.name ?? data.code,
      category: merged.category ?? null,
      owner_scope: (data.owner_scope ?? "GLOBAL") as OwnerScope,
      parent_template_id: data.parent_template_id ?? null,
      subject: merged.subject ?? null,
      body_html: merged.body_html ?? null,
      body_text: merged.body_text ?? null,
      channels: (merged.channels ?? []) as DeliveryChannel[],
      tokens: merged.tokens ?? [],
    };
  } catch {
    return null;
  }
}
