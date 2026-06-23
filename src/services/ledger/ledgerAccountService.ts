import { supabase } from "@/integrations/supabase/client";
import type { LedgerAccount } from "@/types/ledger";

const sb = supabase as any;

export async function getOrCreateLedgerAccount(args: {
  employer_id: string;
  employer_no: string;
  employer_name?: string | null;
  country_code?: string;
}): Promise<LedgerAccount> {
  const country = args.country_code || "SKN";
  const { data: existing } = await sb
    .from("core_employer_ledger_account")
    .select("*")
    .eq("employer_id", args.employer_id)
    .eq("country_code", country)
    .maybeSingle();
  if (existing) return existing as LedgerAccount;

  const { data, error } = await sb
    .from("core_employer_ledger_account")
    .insert({
      employer_id: args.employer_id,
      employer_no: args.employer_no,
      employer_name: args.employer_name ?? null,
      country_code: country,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LedgerAccount;
}

export async function findLedgerAccountByEmployer(
  employer_id: string,
  country_code = "SKN",
): Promise<LedgerAccount | null> {
  const { data } = await sb
    .from("core_employer_ledger_account")
    .select("*")
    .eq("employer_id", employer_id)
    .eq("country_code", country_code)
    .maybeSingle();
  return (data as LedgerAccount) ?? null;
}
