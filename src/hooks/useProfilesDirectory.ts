import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface DirectoryProfile {
  user_code: string;
  full_name: string | null;
  email: string | null;
}

/** Lightweight directory of users (user_code + name) for pickers. */
export function useProfilesDirectory() {
  return useQuery({
    queryKey: ["profiles", "directory"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("profiles")
        .select("user_code, full_name, email")
        .not("user_code", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DirectoryProfile[];
    },
  });
}
