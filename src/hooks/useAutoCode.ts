import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAutoCodeEntity, type AutoCodeEntity } from "@/config/autoCodeRegistry";

const sb = supabase as any;

interface Options {
  /** Registry key, e.g. "TEXT_BLOCK", "TEMPLATE". */
  entityKey: string;
  /** Optional module/department discriminator for patterns like TB-{DEPARTMENT}-{SEQ}. */
  departmentCode?: string | null;
  /** Country context. Defaults to SKN — override if the caller runs in another country context. */
  countryCode?: string;
  /** Set false to defer preview (e.g. in edit dialogs). */
  enabled?: boolean;
}

/**
 * Preview the next auto-generated code for a system-code entity, without
 * consuming a sequence value. Uses the central numbering engine via
 * `core_preview_next_number`. Actual code assignment happens in the save
 * mutation through `generateAutoCode`.
 */
export function useAutoCode({
  entityKey,
  departmentCode,
  countryCode = "SKN",
  enabled = true,
}: Options) {
  const entity = getAutoCodeEntity(entityKey);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!entity || !enabled) return;
    setLoading(true);
    try {
      const dept = entity.needsDepartmentCode
        ? (departmentCode?.trim() || "SHARED").toUpperCase()
        : null;
      const { data, error } = await sb.rpc("core_preview_next_number", {
        p_module_code: entity.moduleCode,
        p_entity_type: entity.entityType,
        p_country_code: countryCode,
        p_branch_code: null,
        p_department_code: dept,
      });
      if (error) throw error;
      setPreview((data as string) ?? null);
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [entity, enabled, departmentCode, countryCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entity, preview, loading, refresh };
}

/**
 * Server-side generation (consumes the sequence). Call inside save mutations
 * right before the insert. Throws if the engine cannot allocate a code.
 */
export async function generateAutoCode(opts: {
  entityKey: string;
  departmentCode?: string | null;
  countryCode?: string;
}): Promise<string> {
  const entity: AutoCodeEntity | undefined = getAutoCodeEntity(opts.entityKey);
  if (!entity) throw new Error(`Unknown auto-code entity: ${opts.entityKey}`);
  const dept = entity.needsDepartmentCode
    ? (opts.departmentCode?.trim() || "SHARED").toUpperCase()
    : null;
  const { data, error } = await sb.rpc("core_generate_number", {
    p_module_code: entity.moduleCode,
    p_entity_type: entity.entityType,
    p_country_code: opts.countryCode ?? "SKN",
    p_branch_code: null,
    p_department_code: dept,
    p_user_code: null,
  });
  if (error) throw error;
  const generated = Array.isArray(data)
    ? (data as any)[0]?.generated_number
    : (data as any)?.generated_number;
  if (!generated) throw new Error(`Numbering engine returned no code for ${opts.entityKey}`);
  return generated as string;
}
