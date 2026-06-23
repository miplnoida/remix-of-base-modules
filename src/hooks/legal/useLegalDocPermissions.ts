import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";

/**
 * Permission action codes for the Legal Documents area.
 * These are stored in module_actions.action_name (text) and granted to roles
 * via role_permissions (role_id, action_id).
 */
export const LEGAL_DOC_ACTIONS = [
  "LEGAL_DOCUMENT_VIEW",
  "LEGAL_DOCUMENT_UPLOAD",
  "LEGAL_DOCUMENT_LINK",
  "LEGAL_DOCUMENT_UNLINK",
  "LEGAL_DOCUMENT_CONFIDENTIAL_VIEW",
  "LEGAL_DOCUMENT_MARK_COURT_FILED",
] as const;

export type LegalDocAction = (typeof LEGAL_DOC_ACTIONS)[number];

export type LegalDocPermissions = Record<LegalDocAction, boolean>;

const sb = supabase as any;

async function resolveLegalDocPermissions(userId: string | null): Promise<LegalDocPermissions> {
  const out: LegalDocPermissions = Object.fromEntries(
    LEGAL_DOC_ACTIONS.map((a) => [a, false]),
  ) as LegalDocPermissions;

  if (!userId) return out;

  // user_roles.role (text) -> roles.role_name -> roles.id
  const { data: ur } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roleNames: string[] = (ur ?? []).map((r: any) => r.role).filter(Boolean);

  // Admin / super_admin short-circuit
  const adminNames = new Set(["admin", "Admin", "super_admin", "SuperAdmin", "SUPER_ADMIN"]);
  if (roleNames.some((n) => adminNames.has(n))) {
    for (const a of LEGAL_DOC_ACTIONS) out[a] = true;
    return out;
  }

  if (!roleNames.length) return out;

  const { data: roles } = await sb
    .from("roles")
    .select("id, role_name")
    .in("role_name", roleNames);
  const roleIds: string[] = (roles ?? []).map((r: any) => r.id);

  const { data: actions } = await sb
    .from("module_actions")
    .select("id, action_name")
    .in("action_name", LEGAL_DOC_ACTIONS as unknown as string[]);
  const actionIdByName = new Map<string, string>(
    (actions ?? []).map((a: any) => [a.action_name, a.id]),
  );

  if (!roleIds.length || !actionIdByName.size) return out;

  const { data: perms } = await sb
    .from("role_permissions")
    .select("action_id, is_granted")
    .in("role_id", roleIds)
    .in("action_id", Array.from(actionIdByName.values()));

  const grantedActionIds = new Set<string>(
    (perms ?? []).filter((p: any) => p.is_granted !== false).map((p: any) => p.action_id),
  );

  for (const [name, id] of actionIdByName.entries()) {
    if (grantedActionIds.has(id)) out[name as LegalDocAction] = true;
  }
  return out;
}

export function useLegalDocPermissions() {
  const { userId } = useUserCode();
  const [perms, setPerms] = useState<LegalDocPermissions>(() =>
    Object.fromEntries(LEGAL_DOC_ACTIONS.map((a) => [a, false])) as LegalDocPermissions,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    resolveLegalDocPermissions(userId ?? null)
      .then((p) => { if (!cancelled) { setPerms(p); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [userId]);

  return { perms, loaded };
}
