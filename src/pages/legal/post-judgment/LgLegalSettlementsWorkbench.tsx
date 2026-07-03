import React from "react";
import PostJudgmentListWorkbench from "@/components/legal/post-judgment/PostJudgmentListWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export default function LgLegalSettlementsWorkbench() {
  const { can } = useLgAccess();
  if (!can("viewLegalSettlement")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view Legal Settlements.</div>;
  }
  return (
    <PostJudgmentListWorkbench
      title="Legal Settlements"
      description="Post-judgment settlements — court-approved, active, and breached."
      table="lg_settlement"
      select="id,lg_case_id,status,agreed_amount,paid_amount,agreed_date,created_at"
      orderBy={{ column: "created_at", ascending: false }}
      statusField="status"
      columns={[
        { key: "status", label: "Status", format: "badge" },
        { key: "agreed_date", label: "Agreed", format: "date" },
        { key: "agreed_amount", label: "Agreed", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
      ]}
    />
  );
}
