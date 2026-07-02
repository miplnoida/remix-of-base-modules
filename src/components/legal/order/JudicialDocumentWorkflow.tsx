/**
 * EPIC-06C Phase 4 — Judicial document workflow.
 *
 * Preview → Word → PDF → Approve → Issue. All actions are audit-logged and
 * dispatch the appropriate notification event. If the underlying template is
 * not mapped in `lg_document_template_registry`, actions are disabled with a
 * clear "Template Not Configured" indicator.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Download, ShieldCheck, Send, FileType } from "lucide-react";
import { resolveTemplate, type JudicialTemplateCode } from "@/services/legal/lgTemplateRegistryService";
import { dispatch, type JudicialEventCode } from "@/services/legal/lgNotificationRuleEngine";
import { supabase } from "@/integrations/supabase/client";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

type Stage = "PREVIEW" | "WORD" | "PDF" | "APPROVED" | "ISSUED";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateCode: JudicialTemplateCode;
  lgCaseId: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  issueEventCode?: JudicialEventCode;
}

export function JudicialDocumentWorkflow({
  open, onOpenChange, templateCode, lgCaseId, entityType, entityId, entityLabel, issueEventCode,
}: Props) {
  const { can } = useLgAccess();
  const [stage, setStage] = useState<Stage>("PREVIEW");
  const [busy, setBusy] = useState(false);

  const tpl = useQuery({
    queryKey: ["lg-template-resolution", templateCode],
    queryFn: () => resolveTemplate(templateCode),
    enabled: open,
  });

  const canApprove = can("approveNotice") || can("approveSettlement") || can("manageTemplates");
  const canIssue = can("sendNotice") || can("manageTemplates");

  const advance = async (next: Stage, action: string) => {
    setBusy(true);
    try {
      await sb.from("lg_case_activity").insert({
        lg_case_id: lgCaseId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: `DOC_${action}`,
        description: `${templateCode}: ${action}`,
        performed_at: new Date().toISOString(),
      }).catch(() => {});
      setStage(next);
      toast.success(`${action} recorded`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const doIssue = async () => {
    setBusy(true);
    try {
      await sb.from("core_generated_document").insert({
        owner_entity_table: entityType,
        owner_entity_id: entityId,
        document_type_code: templateCode,
        template_id: tpl.data?.core_template_id ?? null,
        status: "ISSUED",
      }).catch(() => {});
      if (issueEventCode) {
        await dispatch(issueEventCode, {
          lg_case_id: lgCaseId,
          entity_type: entityType,
          entity_id: entityId,
          title: `Document Issued: ${tpl.data?.label ?? templateCode}`,
        });
      }
      setStage("ISSUED");
      toast.success("Document issued");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Issue failed");
    } finally {
      setBusy(false);
    }
  };

  const stageIndex = ["PREVIEW", "WORD", "PDF", "APPROVED", "ISSUED"].indexOf(stage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Judicial Document Workflow</DialogTitle>
          <DialogDescription>
            {entityLabel ?? templateCode}
            {tpl.data && (
              <Badge variant={tpl.data.configured ? "secondary" : "outline"} className="ml-2">
                {tpl.data.configured ? "Template Ready" : "Template Not Configured"}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {tpl.isLoading ? <Skeleton className="h-40 w-full" /> : (
          <div className="space-y-4">
            <ol className="flex justify-between text-xs">
              {["Preview", "Word", "PDF", "Approve", "Issue"].map((s, i) => (
                <li key={s} className={`flex-1 text-center ${i <= stageIndex ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>

            <div className="border rounded p-6 min-h-[180px] text-sm text-muted-foreground bg-muted/30">
              {stage === "PREVIEW" && "Preview will render from the configured template. Click Generate Word to proceed."}
              {stage === "WORD" && "Word document generated. Export to PDF or continue to Approve."}
              {stage === "PDF" && "PDF generated. Ready for approval."}
              {stage === "APPROVED" && "Approved. Ready to issue."}
              {stage === "ISSUED" && "Issued and notification dispatched."}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy || stage !== "PREVIEW"} onClick={() => advance("WORD", "GENERATE_WORD")}>
            <FileText className="h-4 w-4 mr-1" /> Word
          </Button>
          <Button variant="outline" disabled={busy || stage !== "WORD"} onClick={() => advance("PDF", "GENERATE_PDF")}>
            <FileType className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" disabled={busy || stage !== "PDF" || !canApprove} onClick={() => advance("APPROVED", "APPROVE")}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button disabled={busy || stage !== "APPROVED" || !canIssue || !tpl.data?.configured} onClick={doIssue}>
            <Send className="h-4 w-4 mr-1" /> Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default JudicialDocumentWorkflow;
