import React from "react";
import PostJudgmentListWorkbench from "@/components/legal/post-judgment/PostJudgmentListWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export default function LgJudgmentComplianceWorkbench() {
  const { can } = useLgAccess();
  if (!can("viewJudgmentCompliance")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view Judgment Compliance.</div>;
  }
  return (
    <PostJudgmentListWorkbench
      title="Judgment Compliance"
      description="Portfolio-wide monitoring of judgment compliance across all matters."
      table="lg_judgment_compliance"
      select="id,lg_case_id,compliance_status,total_ordered,paid_amount,compliance_due_date,created_at"
      orderBy={{ column: "created_at", ascending: false }}
      statusField="compliance_status"
      columns={[
        { key: "compliance_status", label: "Status", format: "badge" },
        { key: "compliance_due_date", label: "Due", format: "date" },
        { key: "total_ordered", label: "Ordered", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
      ]}
    />
  );
}
