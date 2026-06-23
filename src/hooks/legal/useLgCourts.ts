import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LgCourtRow {
  court_code: string;
  court_name: string;
  court_type: string | null;
  island: string | null;
  country_code: string | null;
  case_number_format_hint: string | null;
}
export interface LgCourtDivisionRow {
  division_code: string;
  court_code: string;
  division_name: string;
  civil_criminal_type: string | null;
}
export interface LgCourtVenueRow {
  venue_code: string;
  court_code: string;
  venue_name: string;
  island: string | null;
}
export interface LgCourtOfficerRow {
  officer_code: string;
  court_code: string;
  officer_name: string;
  officer_type: string | null;
}

export function useLgCourtsAll() {
  return useQuery({
    queryKey: ["lg_court", "all"],
    queryFn: async () => {
      const [courts, divisions, venues, officers] = await Promise.all([
        supabase.from("lg_court").select("court_code, court_name, court_type, island, country_code, case_number_format_hint").eq("active", true).order("court_name"),
        supabase.from("lg_court_division").select("division_code, court_code, division_name, civil_criminal_type").eq("active", true).order("division_name"),
        supabase.from("lg_court_venue").select("venue_code, court_code, venue_name, island").eq("active", true).order("venue_name"),
        supabase.from("lg_court_officer").select("officer_code, court_code, officer_name, officer_type").eq("active", true).order("officer_name"),
      ]);
      if (courts.error) throw courts.error;
      if (divisions.error) throw divisions.error;
      if (venues.error) throw venues.error;
      if (officers.error) throw officers.error;
      return {
        courts: (courts.data ?? []) as LgCourtRow[],
        divisions: (divisions.data ?? []) as LgCourtDivisionRow[],
        venues: (venues.data ?? []) as LgCourtVenueRow[],
        officers: (officers.data ?? []) as LgCourtOfficerRow[],
      };
    },
    staleTime: 5 * 60_000,
  });
}
