import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on Legal Referrals tables and invalidates
 * the relevant React Query keys so the workbench updates without a refresh.
 */
export function useLegalReferralsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["legal-referrals-workbench"] });
      qc.invalidateQueries({ queryKey: ["legal-referral-info-requests"] });
      qc.invalidateQueries({ queryKey: ["legal-referral"] });
      qc.invalidateQueries({ queryKey: ["legal-referrals"] });
      qc.invalidateQueries({ queryKey: ["legal-referrals-info-open"] });
      qc.invalidateQueries({ queryKey: ["lg-letters"] });
    };

    const channel = supabase
      .channel("legal-referrals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "legal_referral" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "legal_referral_info_request" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "legal_referral_source_task" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "core_generated_document" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
