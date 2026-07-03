import React from "react";
import PostJudgmentListWorkbench from "@/components/legal/post-judgment/PostJudgmentListWorkbench";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

export default function LgCourtFilingsWorkbench() {
  const { can } = useLgAccess();
  if (!can("viewCourtFiling")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view Court Filings.</div>;
  }
  return (
    <PostJudgmentListWorkbench
      title="Court Filings"
      description="Draft, filed, served, and accepted court filings across the portfolio."
      table="lg_court_filing"
      select="id,lg_case_id,filing_type,status,deadline,filed_date,created_at"
      orderBy={{ column: "created_at", ascending: false }}
      statusField="status"
      columns={[
        { key: "filing_type", label: "Type" },
        { key: "status", label: "Status", format: "badge" },
        { key: "deadline", label: "Deadline", format: "date" },
        { key: "filed_date", label: "Filed", format: "date" },
      ]}
    />
  );
}
