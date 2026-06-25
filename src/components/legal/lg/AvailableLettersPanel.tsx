import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileText, Loader2, CheckCircle2, Send } from "lucide-react";
import { useStageTemplates, useMissingRequiredForCase } from "@/hooks/legal/useLgStageTemplates";
import { coreTemplateDispatcherService } from "@/services/coreTemplateDispatcherService";
import { legalTemplateContextService, type LegalTemplateContext } from "@/services/legal/legalTemplateContextService";
import { useUserCode } from "@/hooks/useUserCode";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/services/systemLoggerService";
import { GenerateLetterDialog } from "./GenerateLetterDialog";

const sb = supabase as any;

interface Props {
  caseId: string;
  caseTypeCode: string | null;
  currentStage: string | null;
  canGenerate: boolean;
}

const CHANNEL_OPTIONS = ["PRINT_LETTER", "EMAIL", "PDF", "SMS", "PORTAL_MSG"];


function friendlyLetterError(error: unknown) {
  const raw = String((error as any)?.message || error || "");
  const normalized = raw.toLowerCase();

  if (normalized.includes("numbering sequence") || normalized.includes("core_generate_number") || normalized.includes("reference")) {
    return "Letter reference numbering is not available right now. The technical details have been logged for support.";
  }

  if (normalized.includes("dms") || normalized.includes("document repository") || normalized.includes("upload")) {
    return "The letter was generated, but it could not be linked to the document repository. Please retry from the Documents tab.";
  }

  if (normalized.includes("template has no") || normalized.includes("published version")) {
    return "This letter template is not ready for generation. Please publish the template version first.";
  }

  if (normalized.includes("permission") || normalized.includes("unauthorized")) {
    return "You do not have permission to generate this letter.";
  }

  return "Could not generate the letter. The technical details have been logged for support.";
}

export function AvailableLettersPanel({ caseId, caseTypeCode, currentStage, canGenerate }: Props) {
  const stage = currentStage ?? "";
  const templates = useStageTemplates(stage);
  const missing = useMissingRequiredForCase(caseId, stage);
  const { userCode } = useUserCode();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Record<string, string>>({});
  const [dialogTemplate, setDialogTemplate] = useState<any | null>(null);

  // Generated letters for this case+stage (for status indicators)
  const generated = useQuery({
    queryKey: ["lg_generated_letters", caseId, stage],
    enabled: !!caseId && !!stage,
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_generated_document")
        .select("id, template_id, reference_no, channel_code, case_stage_code, generated_at, delivery_status")
        .eq("entity_type", "lg_case")
        .eq("entity_id", caseId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const generatedByTemplate = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const g of generated.data ?? []) {
      const arr = m.get(g.template_id) ?? [];
      arr.push(g);
      m.set(g.template_id, arr);
    }
    return m;
  }, [generated.data]);

  const openGenerate = (t: any) => {
    if (!canGenerate) {
      toast.error("You don't have permission to generate letters");
      return;
    }
    setDialogTemplate(t);
  };

  const handleConfirmGenerate = async (args: {
    recipientPartyId: string | null;
    actionDeadline: string | null;
    context: LegalTemplateContext;
  }) => {
    const t = dialogTemplate;
    if (!t) return;
    const channel = selectedChannel[t.usage_id] || (t.template_type === "SMS" ? "SMS" : "PRINT_LETTER");
    setBusyId(t.usage_id);
    try {
      const tokens = legalTemplateContextService.flattenContext(args.context);
      const recipientAddress =
        channel === "EMAIL" ? args.context.recipient.email || undefined :
        channel === "SMS" ? args.context.recipient.phone || undefined :
        args.context.recipient.address_line1 || undefined;

      const res = await coreTemplateDispatcherService.dispatch({
        template_id: t.template_id,
        channel_code: channel,
        module_code: "LEGAL",
        doc_type_code: t.code,
        prefix: "LG",
        entity_type: "lg_case",
        entity_id: caseId,
        tokens,
        recipient_address: recipientAddress,
        generated_by: userCode ?? "SYSTEM",
        case_stage_code: stage,
        case_type_code: caseTypeCode ?? undefined,
        legal_link: {
          lg_case_id: caseId,
          document_category_code: "CORRESPONDENCE",
          document_type_code: t.code || null,
          linked_stage_code: stage || null,
          title: `${t.name}`,
          confidential: false,
          court_filed: false,
        } as any,
      });
      toast.success(`Generated ${res.reference_no}`);
      if (res.dms_upload_error) {
        void logError({
          module: "Legal",
          entity_type: "lg_case",
          entity_id: caseId,
          api_name: "legal_letter_storage",
          error_type: "DOCUMENT_STORAGE_FAILED",
          error_message: res.dms_upload_error,
          severity: "error",
          payload_json: { template_code: t.code, channel, stage, reference_no: res.reference_no },
        });
        toast.warning("Letter generated, but could not be saved to the document repository. Please retry from the Documents tab.");
      } else if (res.sync_state === "PENDING_CENTRAL") {
        toast.info("Letter saved locally. Central repository sync is pending.");
      }
      try {
        await sb.from("lg_case_activity").insert({
          lg_case_id: caseId,
          activity_type: channel === "PRINT_LETTER" ? "LETTER_PRINTED" : "LETTER_GENERATED",
          description: `${t.name} (${res.reference_no}) via ${channel} → ${args.context.recipient.name || "—"}`,
          payload: {
            template_code: t.code,
            channel,
            reference_no: res.reference_no,
            stage,
            recipient_party_id: args.recipientPartyId,
            recipient_name: args.context.recipient.name,
            action_deadline: args.context.legal.action_deadline,
          },
          performed_by: userCode ?? null,
        });
      } catch { /* non-blocking */ }
      qc.invalidateQueries({ queryKey: ["lg_generated_letters", caseId, stage] });
      qc.invalidateQueries({ queryKey: ["lg_missing_required", caseId, stage] });
      qc.invalidateQueries({ queryKey: ["lg_document_link", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_history_unified", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", caseId] });
      setDialogTemplate(null);
    } catch (e: any) {
      void logError({
        module: "Legal",
        entity_type: "lg_case",
        entity_id: caseId,
        api_name: "legal_letter_generation",
        error_type: "LETTER_GENERATION_FAILED",
        error_message: String(e?.message || e || "Unknown error"),
        stack_trace: e?.stack ?? undefined,
        severity: "error",
        payload_json: { template_code: t.code, channel, stage },
      });
      toast.error(friendlyLetterError(e));
    } finally {
      setBusyId(null);
    }
  };


  if (!stage) {
    return (
      <Card>
        <CardHeader><CardTitle>Available Letters</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Stage is not set on this case.</p></CardContent>
      </Card>
    );
  }

  const stageTemplates = (templates.data ?? []).filter((t) => t.stage_code === stage);
  const anyStageTemplates = (templates.data ?? []).filter((t) => t.usage_context === "ANY_STAGE");

  return (
    <div className="space-y-4">
      {(missing.data?.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing required letters for {stage}:</strong>{" "}
            {missing.data!.map((m) => m.code).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Available Letters — Stage: <Badge>{stage}</Badge>
          </CardTitle>
          <CardDescription>
            Templates mapped to the current legal stage. Generation snapshots the template version, legal references,
            stage, and a sequential reference number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
            </div>
          ) : stageTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates mapped to this stage yet.</p>
          ) : (
            <div className="space-y-2">
              {stageTemplates.map((t) => {
                const gens = generatedByTemplate.get(t.template_id) ?? [];
                const stageGens = gens.filter((g) => g.case_stage_code === stage);
                return (
                  <div key={t.usage_id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded p-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="text-xs text-muted-foreground">({t.code})</span>
                        {t.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                        {t.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        {t.approval_required && <Badge variant="outline" className="text-[10px]">Needs approval</Badge>}
                        {stageGens.length > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" /> {stageGens.length} generated
                          </Badge>
                        )}
                      </div>
                      {stageGens.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          Latest: {stageGens[0].reference_no} ({stageGens[0].channel_code}) — {stageGens[0].delivery_status}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded text-xs px-2 py-1 bg-background"
                        value={selectedChannel[t.usage_id] || "PRINT_LETTER"}
                        onChange={(e) =>
                          setSelectedChannel((p) => ({ ...p, [t.usage_id]: e.target.value }))
                        }
                      >
                        {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Button
                        size="sm"
                        disabled={!canGenerate || busyId === t.usage_id}
                        onClick={() => openGenerate(t)}
                      >
                        {busyId === t.usage_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="ml-1">Generate</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {anyStageTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available at any stage</CardTitle>
            <CardDescription>Fees, waivers, and other cross-stage correspondence.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anyStageTemplates.map((t) => (
                <div key={t.usage_id} className="flex items-center justify-between border rounded p-2">
                  <div className="text-sm">
                    <span className="font-medium">{t.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">({t.code})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded text-xs px-2 py-1 bg-background"
                      value={selectedChannel[t.usage_id] || "PRINT_LETTER"}
                      onChange={(e) =>
                        setSelectedChannel((p) => ({ ...p, [t.usage_id]: e.target.value }))
                      }
                    >
                      {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Button size="sm" variant="outline" disabled={!canGenerate || busyId === t.usage_id} onClick={() => openGenerate(t)}>
                      {busyId === t.usage_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span className="ml-1">Generate</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AvailableLettersPanel;
