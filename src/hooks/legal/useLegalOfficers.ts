import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useLegalOfficers — returns active profiles holding any Legal system role,
 * suitable for officer-pickers on the Legal Admin and case-assignment screens.
 *
 * Roles included (canonical + legacy aliases):
 *   LEGAL_OFFICER, SENIOR_LEGAL_OFFICER, LEGAL_MANAGER, LEGAL_ADMIN, LegalOfficer
 */
const LEGAL_ROLE_NAMES = [
  "LEGAL_ADMIN",
  "LEGAL_MANAGER",
  "LEGAL_OFFICER",
  "SENIOR_LEGAL_OFFICER",
  "LEGAL_SENIOR",
  "LEGAL_READ_ONLY",
  "LegalOfficer",
];

export interface LegalOfficerOption {
  user_id: string;
  user_code: string | null;
  full_name: string;
  email: string | null;
  roles: string[];
}

export function useLegalOfficers() {
  return useQuery<LegalOfficerOption[]>({
    queryKey: ["legal-officers"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sb = supabase as any;

      // 1) Find user_ids holding any Legal role
      const { data: roleRows, error: rErr } = await sb
        .from("user_roles")
        .select("user_id, role")
        .in("role", LEGAL_ROLE_NAMES);
      if (rErr) throw rErr;
      const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      if (!ids.length) return [];

      // 2) Hydrate profile info
      const { data: profs, error: pErr } = await sb
        .from("profiles")
        .select("id, user_code, full_name, email, is_active")
        .in("id", ids);
      if (pErr) throw pErr;

      const rolesByUser: Record<string, string[]> = {};
      for (const r of roleRows ?? []) {
        rolesByUser[r.user_id] = rolesByUser[r.user_id] || [];
        rolesByUser[r.user_id].push(r.role);
      }

      return (profs ?? [])
        .filter((p: any) => p.is_active !== false)
        .map((p: any) => ({
          user_id: p.id,
          user_code: p.user_code ?? null,
          full_name: p.full_name || p.user_code || p.email || "Unknown user",
          email: p.email ?? null,
          roles: rolesByUser[p.id] ?? [],
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}
