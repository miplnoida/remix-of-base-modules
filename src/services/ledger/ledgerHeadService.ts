import { supabase } from "@/integrations/supabase/client";
import type { LedgerHead } from "@/types/ledger";

const sb = supabase as any;

let cache: LedgerHead[] | null = null;

export async function listLedgerHeads(forceRefresh = false): Promise<LedgerHead[]> {
  if (cache && !forceRefresh) return cache;
  const { data, error } = await sb
    .from("core_ledger_head")
    .select("*")
    .order("allocation_priority", { ascending: true });
  if (error) throw error;
  cache = (data || []) as LedgerHead[];
  return cache;
}

export async function getHead(headCode: string): Promise<LedgerHead | null> {
  const heads = await listLedgerHeads();
  return heads.find((h) => h.head_code === headCode) ?? null;
}

export async function isWaivable(headCode: string): Promise<boolean> {
  const h = await getHead(headCode);
  return !!h?.is_waivable;
}

export async function isPrincipal(headCode: string): Promise<boolean> {
  const h = await getHead(headCode);
  return !!h?.is_principal;
}
