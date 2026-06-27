/**
 * Reference scanner — finds every row referencing a given comm entity.
 *
 * Gracefully ignores tables that don't exist in the current project
 * (returns empty hits for those sources).
 */

import { supabase } from "@/integrations/supabase/client";
import {
  REFERENCE_REGISTRY,
  ENTITY_MATCH_KEY,
  type CommEntityType,
  type ReferenceSource,
} from "./referenceRegistry";

const sb = supabase as any;

export interface ReferenceHit {
  source: ReferenceSource;
  recordId: string | null;
  recordLabel: string | null;
  route: string | null;
  raw: any;
}

async function scanOne(
  source: ReferenceSource,
  matchValue: string,
): Promise<ReferenceHit[]> {
  const selectCols = [source.idColumn, source.labelColumn, "department_code"]
    .filter(Boolean)
    .join(", ") || "*";

  try {
    let q = sb.from(source.table).select(selectCols).limit(200);

    if (source.match.kind === "column") {
      q = q.eq(source.match.column, matchValue);
    } else if (source.match.kind === "jsonContains") {
      q = q.contains(source.match.column, source.match.pathValue(matchValue));
    } else if (source.match.kind === "jsonEquals") {
      // Use ->> chain. PostgREST supports `column->path->>leaf=eq.value`
      const path = source.match.jsonPath.join("->");
      q = q.eq(`${source.match.column}->${path}` as any, matchValue);
    }

    const { data, error } = await q;
    if (error) {
      // Table missing / column missing — treat as zero hits.
      return [];
    }
    return (data ?? []).map((row: any) => ({
      source,
      recordId: source.idColumn ? row?.[source.idColumn] ?? null : null,
      recordLabel: source.labelColumn ? row?.[source.labelColumn] ?? null : null,
      route: source.routeBuilder ? source.routeBuilder(row) : null,
      raw: row,
    }));
  } catch {
    return [];
  }
}

export async function scanReferences(
  entityType: CommEntityType,
  entityId: string,
  /** When entity is text-block, pass the text_block_code here instead */
  matchKeyOverride?: string,
): Promise<ReferenceHit[]> {
  const sources = REFERENCE_REGISTRY[entityType] ?? [];
  const matchValue = matchKeyOverride ?? entityId;
  const results = await Promise.all(sources.map((s) => scanOne(s, matchValue)));
  return results.flat();
}

export function groupHits(hits: ReferenceHit[]) {
  const m = new Map<string, ReferenceHit[]>();
  hits.forEach((h) => {
    const g = h.source.group;
    if (!m.has(g)) m.set(g, []);
    m.get(g)!.push(h);
  });
  return Array.from(m.entries());
}

export { ENTITY_MATCH_KEY };
