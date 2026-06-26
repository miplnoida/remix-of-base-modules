import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CommLetterhead {
  id: string;
  name: string;
  version: string | null;
  logo_url: string | null;
  secondary_logo_url: string | null;
  header_html: string | null;
  footer_html: string | null;
  qr_code_url: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  description: string | null;
}
export interface CommEmailSignature {
  id: string;
  name: string;
  department_id: string | null;
  officer_user_code: string | null;
  html_signature: string | null;
  plain_text_signature: string | null;
  is_active: boolean;
}
export interface CommDisclaimer {
  id: string;
  name: string;
  category: string | null;
  language: string | null;
  body: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
}
export interface CommPrintFooter {
  id: string;
  name: string;
  footer_html: string | null;
  watermark_url: string | null;
  page_footer: string | null;
  version: string | null;
  is_active: boolean;
}

function makeListHook<T>(table: string) {
  return () =>
    useQuery({
      queryKey: [table, "list"],
      queryFn: async () => {
        const { data, error } = await sb
          .from(table)
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;
        return (data ?? []) as T[];
      },
      staleTime: 5 * 60_000,
    });
}

function makeByIdHook<T>(table: string) {
  return (id?: string | null) =>
    useQuery({
      queryKey: [table, "byId", id ?? "none"],
      enabled: !!id,
      queryFn: async () => {
        const { data, error } = await sb
          .from(table)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return (data ?? null) as T | null;
      },
      staleTime: 5 * 60_000,
    });
}

export const useLetterheads          = makeListHook<CommLetterhead>("comm_letterhead");
export const useEmailSignatures      = makeListHook<CommEmailSignature>("comm_email_signature");
export const useDisclaimers          = makeListHook<CommDisclaimer>("comm_disclaimer");
export const usePrintFooters         = makeListHook<CommPrintFooter>("comm_print_footer");

export const useLetterheadById       = makeByIdHook<CommLetterhead>("comm_letterhead");
export const useEmailSignatureById   = makeByIdHook<CommEmailSignature>("comm_email_signature");
export const useDisclaimerById       = makeByIdHook<CommDisclaimer>("comm_disclaimer");
export const usePrintFooterById      = makeByIdHook<CommPrintFooter>("comm_print_footer");
