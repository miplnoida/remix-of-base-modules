import React from "react";
import PostJudgmentListWorkbench from "@/components/legal/post-judgment/PostJudgmentListWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export default function LgConsentOrdersWorkbench() {
  const { can } = useLgAccess();
  if (!can("viewConsentOrder")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view Consent Orders.</div>;
  }
  return (
    <PostJudgmentListWorkbench
      title="Consent Orders"
      description="All consent orders with installment schedules and breach signals."
      table="lg_consent_order"
      select="id,lg_case_id,status,agreed_amount,paid_amount,effective_date,created_at"
      orderBy={{ column: "created_at", ascending: false }}
      statusField="status"
      columns={[
        { key: "status", label: "Status", format: "badge" },
        { key: "effective_date", label: "Effective", format: "date" },
        { key: "agreed_amount", label: "Agreed", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
      ]}
    />
  );
}
