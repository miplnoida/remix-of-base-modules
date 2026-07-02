/**
 * EPIC-06C Phase 1 — Judicial template registry resolver.
 *
 * Maps a stable judicial template code (e.g. LG_COURT_ORDER) to a row in
 * `core_template`. Returns `{ configured: false }` when unmapped so the UI
 * can display "Template Not Configured" instead of dead buttons.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type JudicialTemplateCode =
  | "LG_COURT_ORDER"
  | "LG_JUDGMENT"
  | "LG_COMPLIANCE_NOTICE"
  | "LG_BREACH_NOTICE"
  | "LG_APPEAL_NOTICE"
  | "LG_ENFORCEMENT_NOTICE"
  | "LG_SETTLEMENT_LETTER"
  | "LG_RECOVERY_CLOSURE";

export interface TemplateResolution {
  code: JudicialTemplateCode;
  label: string;
  configured: boolean;
  core_template_id: string | null;
}

let cache: Map<string, TemplateResolution> | null = null;
let cacheAt = 0;
const TTL_MS = 60_000;

async function loadAll(): Promise<Map<string, TemplateResolution>> {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;
  try {
    const { data } = await sb
      .from("lg_document_template_registry")
      .select("template_code, template_label, core_template_id, configured");
    const m = new Map<string, TemplateResolution>();
    (data ?? []).forEach((r: any) =>
      m.set(r.template_code, {
        code: r.template_code,
        label: r.template_label,
        configured: !!r.configured && !!r.core_template_id,
        core_template_id: r.core_template_id ?? null,
      }),
    );
    cache = m;
    cacheAt = now;
    return m;
  } catch {
    return new Map();
  }
}

export async function resolveTemplate(code: JudicialTemplateCode): Promise<TemplateResolution> {
  const m = await loadAll();
  return (
    m.get(code) ?? {
      code,
      label: code,
      configured: false,
      core_template_id: null,
    }
  );
}

export function invalidateTemplateCache(): void {
  cache = null;
  cacheAt = 0;
}

export async function listTemplateRegistry(): Promise<TemplateResolution[]> {
  const m = await loadAll();
  return Array.from(m.values()).sort((a, b) => a.code.localeCompare(b.code));
}
