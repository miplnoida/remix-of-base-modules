import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileText, Loader2, CheckCircle2, Send } from "lucide-react";
import { useStageTemplates, useMissingRequiredForCase } from "@/hooks/legal/useLgStageTemplates";
import { coreTemplateDispatcherService } from "@/services/coreTemplateDispatcherService";
import { coreDmsService } from "@/services/core/coreDmsService";
import { useLgTokenContext } from "@/hooks/legal/useLgTemplates";
import { useUserCode } from "@/hooks/useUserCode";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

interface Props {
  caseId: string;
  caseTypeCode: string | null;
  currentStage: string | null;
  canGenerate: boolean;
}

const CHANNEL_OPTIONS = ["PRINT_LETTER", "EMAIL", "PDF", "SMS", "PORTAL_MSG"];

function flattenTokens(ctx: any): Record<string, any> {
  if (!ctx) return {};
  const flat: Record<string, any> = {};
  for (const [group, vals] of Object.entries(ctx)) {
    if (vals && typeof vals === "object") {
      for (const [k, v] of Object.entries(vals as any)) flat[`${group}.${k}`] = v;
    }
  }
  return flat;
}

export function AvailableLettersPanel({ caseId, caseTypeCode, currentStage, canGenerate }: Props) {
  const stage = currentStage ?? "";
  const templates = useStageTemplates(stage);
  const missing = useMissingRequiredForCase(caseId, stage);
  const tokenCtx = useLgTokenContext(caseId);
  const { userCode } = useUserCode();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Record<string, string>>({});

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

  const handleGenerate = async (t: any) => {
    if (!canGenerate) {
      toast.error("You don't have permission to generate letters");
      return;
    }
    const channel = selectedChannel[t.usage_id] || (t.template_type === "SMS" ? "SMS" : "PRINT_LETTER");
    setBusyId(t.usage_id);
    try {
      const tokens = flattenTokens(tokenCtx.data);
      const res = await coreTemplateDispatcherService.dispatch({
        template_id: t.template_id,
        channel_code: channel,
        module_code: "LEGAL",
        doc_type_code: t.code,
        prefix: "LG",
        entity_type: "lg_case",
        entity_id: caseId,
        tokens,
        generated_by: userCode ?? "SYSTEM",
        case_stage_code: stage,
        case_type_code: caseTypeCode ?? undefined,
      });
      toast.success(`Generated ${res.reference_no}`);

      // Auto-link generated letter into DMS + lg_document_link so it
      // appears in the case Documents tab (idempotent).
      try {
        if (res.id) {
          await coreDmsService.linkGeneratedToLegal({
            generated_document_id: res.id,
            user_code: userCode ?? "SYSTEM",
            link: {
              module_code: "LEGAL",
              lg_case_id: caseId,
              document_category_code: "CORRESPONDENCE",
              document_type_code: t.code || null,
              linked_stage_code: stage || null,
              title: `${t.name} — ${res.reference_no}`,
              confidential: false,
              court_filed: false,
            },
          });
        }
      } catch (linkErr: any) {
        // Non-blocking: letter is generated even if DMS link fails.
        console.warn("[Legal] auto-link of generated letter failed:", linkErr?.message);
      }

      qc.invalidateQueries({ queryKey: ["lg_generated_letters", caseId, stage] });
      qc.invalidateQueries({ queryKey: ["lg_missing_required", caseId, stage] });
      qc.invalidateQueries({ queryKey: ["lg_document_link", caseId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate letter");
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
                        onClick={() => handleGenerate(t)}
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
                    <Button size="sm" variant="outline" disabled={!canGenerate || busyId === t.usage_id} onClick={() => handleGenerate(t)}>
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
