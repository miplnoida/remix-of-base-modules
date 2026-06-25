import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { getReview, setStatus, REVIEW_STATUSES, type ContractReview } from "@/services/legal/contractReviewService";
import { formatDateForDisplay } from "@/lib/format-config";
import { ContractDocumentsTab } from "@/components/legal/contract-review/ContractDocumentsTab";
import { ContractVersionsTab } from "@/components/legal/contract-review/ContractVersionsTab";
import { ContractCommentsTab } from "@/components/legal/contract-review/ContractCommentsTab";
import { ContractAiAnalysisTab } from "@/components/legal/contract-review/ContractAiAnalysisTab";
import { ContractChecklistTab } from "@/components/legal/contract-review/ContractChecklistTab";
import { ContractCyclesTab } from "@/components/legal/contract-review/ContractCyclesTab";
import { ContractExternalShareTab } from "@/components/legal/contract-review/ContractExternalShareTab";
import { ContractActivityTab } from "@/components/legal/contract-review/ContractActivityTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContractReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [review, setReview] = useState<ContractReview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => { if (!id) return; setReview(await getReview(id)); };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReview(id).then(setReview).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!review) return <div className="p-6">Not found</div>;

  const overdue = review.sla_due_at && new Date(review.sla_due_at) < new Date() && !["APPROVED_FINAL", "CLOSED", "REJECTED"].includes(review.status);

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav("/legal/contract-review/dashboard")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> {review.contract_title}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{review.request_no}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={review.status} onValueChange={async v => { await setStatus(review.id, v); toast.success("Status updated"); refresh(); }}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEW_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Field label="Source Dept" value={review.source_department} />
            <Field label="Contract Type" value={review.contract_type.replace(/_/g, " ")} />
            <Field label="Counterparty" value={review.counterparty_name ?? "—"} />
            <Field label="Value" value={review.contract_value ? `${review.currency ?? ""} ${review.contract_value}` : "—"} />
            <Field label="Start" value={review.start_date ? formatDateForDisplay(review.start_date) : "—"} />
            <Field label="End" value={review.end_date ? formatDateForDisplay(review.end_date) : "—"} />
            <Field label="Urgency" value={review.urgency ?? "—"} />
            <Field label="Confidentiality" value={review.confidentiality_level ?? "—"} />
            <Field label="SLA Due" value={review.sla_due_at ? formatDateForDisplay(review.sla_due_at) : "—"} className={overdue ? "text-destructive font-semibold" : ""} />
            <Field label="Status" value={<Badge>{review.status.replace(/_/g, " ")}</Badge>} />
          </div>
          {review.purpose_of_contract && <div className="mt-3 text-sm"><b>Purpose:</b> {review.purpose_of_contract}</div>}
          {review.specific_questions_for_legal && <div className="mt-2 text-sm"><b>Questions for Legal:</b> {review.specific_questions_for_legal}</div>}
        </CardContent>
      </Card>

      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="cycles">Review Cycles</TabsTrigger>
          <TabsTrigger value="share">External Sharing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="documents"><ContractDocumentsTab review={review} /></TabsContent>
        <TabsContent value="versions"><ContractVersionsTab review={review} /></TabsContent>
        <TabsContent value="comments"><ContractCommentsTab review={review} /></TabsContent>
        <TabsContent value="ai"><ContractAiAnalysisTab review={review} /></TabsContent>
        <TabsContent value="checklist"><ContractChecklistTab review={review} /></TabsContent>
        <TabsContent value="cycles"><ContractCyclesTab review={review} /></TabsContent>
        <TabsContent value="share"><ContractExternalShareTab review={review} /></TabsContent>
        <TabsContent value="activity"><ContractActivityTab review={review} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${className ?? ""}`}>{value}</div>
    </div>
  );
}
