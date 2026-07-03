import React from "react";
import PostJudgmentListWorkbench from "@/components/legal/post-judgment/PostJudgmentListWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export default function LgLegalCostRecoveryWorkbench() {
  const { can } = useLgAccess();
  if (!can("viewLegalCost")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view Legal Cost Recovery.</div>;
  }
  return (
    <PostJudgmentListWorkbench
      title="Legal Cost Recovery"
      description="Recoverable legal costs — court fees, execution costs, service costs — and recovery status."
      table="lg_legal_cost"
      select="id,lg_case_id,cost_type,status,amount,recovered_amount,incurred_date,created_at"
      orderBy={{ column: "created_at", ascending: false }}
      statusField="status"
      columns={[
        { key: "cost_type", label: "Type" },
        { key: "status", label: "Status", format: "badge" },
        { key: "incurred_date", label: "Incurred", format: "date" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "recovered_amount", label: "Recovered", format: "currency" },
      ]}
    />
  );
}
