import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CountryOpt { code: string; description: string }

/** Country master (tb_country). */
export function useCountryOptions() {
  return useQuery({
    queryKey: ["tb_country", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("tb_country").select("code,description").order("description");
      if (error) throw error;
      return (data ?? []) as CountryOpt[];
    },
    staleTime: 30 * 60_000,
  });
}

/** Static currency list — replace with master if/when a `tb_currency` exists. */
export const CURRENCY_OPTIONS = [
  { code: "XCD", label: "XCD — East Caribbean Dollar" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
];

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

export const TIMEZONE_OPTIONS = [
  "America/St_Kitts",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Port_of_Spain",
  "Europe/London",
  "UTC",
];
