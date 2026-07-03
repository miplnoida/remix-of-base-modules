import React from "react";
import { useParams, Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePostJudgmentSnapshot } from "@/hooks/legal/usePostJudgmentSnapshot";
import { PostJudgmentOverviewTab } from "@/components/legal/post-judgment/PostJudgmentOverviewTab";
import { JudgmentComplianceTab } from "@/components/legal/post-judgment/JudgmentComplianceTab";
import { ConsentOrdersTab } from "@/components/legal/post-judgment/ConsentOrdersTab";
import { LegalSettlementsTab } from "@/components/legal/post-judgment/LegalSettlementsTab";
import { CourtFilingsTab } from "@/components/legal/post-judgment/CourtFilingsTab";
import { ExternalCounselTab } from "@/components/legal/post-judgment/ExternalCounselTab";
import { LegalCostsTab } from "@/components/legal/post-judgment/LegalCostsTab";

export default function LgPostJudgmentWorkspace() {
  const { caseId } = useParams<{ caseId: string }>();
  const { data, isLoading, error } = usePostJudgmentSnapshot(caseId);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading post-judgment workspace…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6 text-destructive text-sm">
        Failed to load workspace: {(error as Error)?.message ?? "unknown error"}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/legal/lg/cases" className="hover:underline">Cases</Link>
            <span>/</span>
            <Link to={`/legal/lg/cases/${caseId}`} className="hover:underline">
              {caseId?.slice(0, 8)}…
            </Link>
            <span>/</span>
            <span>Post-Judgment</span>
          </div>
          <h1 className="text-2xl font-semibold">Post-Judgment Recovery Workspace</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/legal/lg/cases/${caseId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Case
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance ({data.compliances.length})</TabsTrigger>
          <TabsTrigger value="consent">Consent ({data.consentOrders.length})</TabsTrigger>
          <TabsTrigger value="settlements">Settlements ({data.settlements.length})</TabsTrigger>
          <TabsTrigger value="filings">Filings ({data.filings.length})</TabsTrigger>
          <TabsTrigger value="counsel">Counsel ({data.engagements.length})</TabsTrigger>
          <TabsTrigger value="costs">Costs ({data.costs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <PostJudgmentOverviewTab snap={data} />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          <JudgmentComplianceTab rows={data.compliances} />
        </TabsContent>
        <TabsContent value="consent" className="mt-4">
          <ConsentOrdersTab rows={data.consentOrders} />
        </TabsContent>
        <TabsContent value="settlements" className="mt-4">
          <LegalSettlementsTab rows={data.settlements} />
        </TabsContent>
        <TabsContent value="filings" className="mt-4">
          <CourtFilingsTab rows={data.filings} />
        </TabsContent>
        <TabsContent value="counsel" className="mt-4">
          <ExternalCounselTab rows={data.engagements} />
        </TabsContent>
        <TabsContent value="costs" className="mt-4">
          <LegalCostsTab rows={data.costs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
