import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { History, Eye, Printer, Download, RefreshCw, Loader2, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { coreTemplateDispatcherService } from "@/services/coreTemplateDispatcherService";
import { useLgTokenContext } from "@/hooks/legal/useLgTemplates";
import { useUserCode } from "@/hooks/useUserCode";
import { logError } from "@/services/systemLoggerService";

const sb = supabase as any;

interface Props {
  caseId: string;
  currentStage: string | null;
  canGenerate: boolean;
}

type GenRow = {
  id: string;
  reference_no: string;
  template_id: string;
  doc_type_code: string | null;
  channel_code: string | null;
  case_stage_code: string | null;
  delivery_status: string | null;
  status: string | null;
  subject: string | null;
  generated_html: string | null;
  generated_at: string;
  generated_by: string | null;
  template_name?: string | null;
};

function statusVariant(s?: string | null): "default" | "secondary" | "destructive" | "outline" {
  const v = (s || "").toUpperCase();
  if (v === "DELIVERED" || v === "GENERATED") return "default";
  if (v === "QUEUED" || v === "PENDING") return "secondary";
  if (v === "FAILED") return "destructive";
  return "outline";
}

function printableHtml(row: GenRow): string {
  const body = row.generated_html || "<p><em>(empty body)</em></p>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${row.reference_no}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:780px;margin:24px auto;padding:0 24px;color:#111;line-height:1.5}
    .ref{font-size:12px;color:#555;margin-bottom:8px}
    .subj{font-size:18px;font-weight:600;margin:8px 0 16px}
    .toolbar{position:fixed;top:8px;right:8px;display:flex;gap:6px}
    .toolbar button{padding:6px 10px;font-size:12px;border:1px solid #ccc;background:#f5f5f5;border-radius:4px;cursor:pointer}
    @media print { .toolbar { display:none } body { margin:0 } }
  </style></head>
  <body>
    <div class="toolbar"><button onclick="window.print()">Print</button></div>
    <div class="ref">Ref: <strong>${row.reference_no}</strong> · ${row.channel_code || ""} · ${new Date(row.generated_at).toLocaleString()}</div>
    <div class="subj">${row.subject || ""}</div>
    <div>${body}</div>
  </body></html>`;
}

export function GeneratedLettersHistoryPanel({ caseId, currentStage, canGenerate }: Props) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const tokenCtx = useLgTokenContext(caseId);
  const [search, setSearch] = useState("");
  const [previewRow, setPreviewRow] = useState<GenRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useQuery<GenRow[]>({
    queryKey: ["lg_generated_letters_history", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_generated_document")
        .select("id, reference_no, template_id, doc_type_code, channel_code, case_stage_code, delivery_status, status, subject, generated_html, generated_at, generated_by")
        .eq("entity_type", "lg_case")
        .eq("entity_id", caseId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      const rows: GenRow[] = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.template_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: tpls } = await sb
          .from("core_template")
          .select("id, name, code")
          .in("id", ids);
        nameMap = new Map((tpls ?? []).map((t: any) => [t.id, t.name || t.code]));
      }
      return rows.map((r) => ({ ...r, template_name: nameMap.get(r.template_id) || r.doc_type_code }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = list.data ?? [];
    if (!q) return rows;
    return rows.filter((r) =>
      [r.reference_no, r.template_name, r.doc_type_code, r.channel_code, r.case_stage_code, r.subject]
        .some((v) => (v || "").toString().toLowerCase().includes(q)),
    );
  }, [list.data, search]);

  function openPrintWindow(row: GenRow) {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print letters.");
      return;
    }
    w.document.open();
    w.document.write(printableHtml(row));
    w.document.close();
  }

  function downloadHtml(row: GenRow) {
    const blob = new Blob([printableHtml(row)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.reference_no}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function regenerate(row: GenRow) {
    if (!canGenerate) {
      toast.error("You don't have permission to regenerate letters.");
      return;
    }
    setBusyId(row.id);
    try {
      const flat: Record<string, any> = {};
      const ctx: any = tokenCtx.data || {};
      for (const [g, vals] of Object.entries(ctx)) {
        if (vals && typeof vals === "object") {
          for (const [k, v] of Object.entries(vals as any)) flat[`${g}.${k}`] = v;
        }
      }
      const res = await coreTemplateDispatcherService.dispatch({
        template_id: row.template_id,
        channel_code: row.channel_code || "PRINT_LETTER",
        module_code: "LEGAL",
        doc_type_code: row.doc_type_code || "",
        prefix: "LG",
        entity_type: "lg_case",
        entity_id: caseId,
        tokens: flat,
        generated_by: userCode ?? "SYSTEM",
        case_stage_code: row.case_stage_code || currentStage || undefined,
        legal_link: {
          lg_case_id: caseId,
          document_category_code: "CORRESPONDENCE",
          document_type_code: row.doc_type_code || null,
          linked_stage_code: row.case_stage_code || currentStage || null,
          title: row.template_name || row.doc_type_code || row.reference_no,
          confidential: false,
          court_filed: false,
        } as any,
      });
      toast.success(`Regenerated as ${res.reference_no}`);
      try {
        await sb.from("lg_case_activity").insert({
          lg_case_id: caseId,
          activity_type: "LETTER_REGENERATED",
          description: `${row.template_name || row.doc_type_code} regenerated (${res.reference_no}) — original ${row.reference_no}`,
          payload: { original_reference: row.reference_no, new_reference: res.reference_no, template_id: row.template_id },
          performed_by: userCode ?? null,
        });
      } catch { /* non-blocking */ }
      qc.invalidateQueries({ queryKey: ["lg_generated_letters_history", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_generated_letters", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_history_unified", caseId] });
    } catch (e: any) {
      void logError({
        module: "Legal",
        entity_type: "lg_case",
        entity_id: caseId,
        api_name: "legal_letter_regeneration",
        error_type: "LETTER_REGENERATION_FAILED",
        error_message: String(e?.message || e),
        stack_trace: e?.stack ?? undefined,
        severity: "error",
        payload_json: { template_id: row.template_id, original_reference: row.reference_no },
      });
      toast.error("Could not regenerate the letter. The technical details have been logged for support.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Generated Letters History
            </CardTitle>
            <CardDescription>
              Every letter generated for this case. View, print, download, or reprint a fresh copy.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search reference / template…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["lg_generated_letters_history", caseId] })}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No letters generated for this case yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Reference</th>
                  <th className="text-left p-2">Template</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Channel</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Generated</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/40">
                    <td className="p-2 font-mono text-xs">{r.reference_no}</td>
                    <td className="p-2">{r.template_name || r.doc_type_code || "—"}</td>
                    <td className="p-2 text-xs">{r.case_stage_code || "—"}</td>
                    <td className="p-2 text-xs">{r.channel_code || "—"}</td>
                    <td className="p-2">
                      <Badge variant={statusVariant(r.delivery_status)} className="text-[10px]">
                        {r.delivery_status || r.status || "—"}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {new Date(r.generated_at).toLocaleString()}
                      {r.generated_by ? <div className="text-[10px] text-muted-foreground">{r.generated_by}</div> : null}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreviewRow(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Print" onClick={() => openPrintWindow(r)}>
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Download HTML" onClick={() => downloadHtml(r)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Regenerate a fresh copy with a new reference number"
                          disabled={!canGenerate || busyId === r.id}
                          onClick={() => regenerate(r)}
                        >
                          {busyId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 text-xs">Reprint</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewRow?.template_name || previewRow?.doc_type_code} —{" "}
              <span className="font-mono text-sm">{previewRow?.reference_no}</span>
            </DialogTitle>
          </DialogHeader>
          {previewRow && (
            <iframe
              title={previewRow.reference_no}
              srcDoc={printableHtml(previewRow)}
              className="w-full h-[70vh] border rounded bg-white"
            />
          )}
          <DialogFooter className="gap-2">
            {previewRow && (
              <>
                <Button variant="outline" onClick={() => downloadHtml(previewRow)}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <Button onClick={() => openPrintWindow(previewRow)}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default GeneratedLettersHistoryPanel;
