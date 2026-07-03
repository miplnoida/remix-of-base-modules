import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import {
  listLegalTemplates, listGeneratedDocuments,
  buildMatterContext, renderText, renderDocx, renderPdf,
  generateDocument, transitionDocument,
  LG_DOC_CATEGORIES, type LgDocLifecycle,
} from "@/services/legal/lgDocumentAutomationService";
import { toast } from "sonner";
import { FileText, Download, CheckCircle2, Send, Truck, AlertTriangle } from "lucide-react";

type Tab = "templates" | "generated" | "pending" | "issued" | "dispatch" | "failed";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "templates", label: "Templates", icon: FileText },
  { id: "generated", label: "Generated Documents", icon: FileText },
  { id: "pending", label: "Pending Approval", icon: AlertTriangle },
  { id: "issued", label: "Issued Documents", icon: CheckCircle2 },
  { id: "dispatch", label: "Dispatch Log", icon: Truck },
  { id: "failed", label: "Failed / Missing Templates", icon: AlertTriangle },
];

export default function LegalDocumentsWorkspace() {
  const { can, hasLegalAccess } = useLgAccess();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("templates");
  const [caseId, setCaseId] = useState("");

  const templates = useQuery({
    queryKey: ["lg-doc-automation", "templates"],
    queryFn: listLegalTemplates,
    enabled: !!hasLegalAccess,
  });
  const filterMap: Record<Tab, LgDocLifecycle | undefined> = {
    templates: undefined, generated: undefined, pending: "pending_approval",
    issued: "issued", dispatch: "dispatched", failed: "failed",
  };
  const generated = useQuery({
    queryKey: ["lg-doc-automation", "list", tab],
    queryFn: () => listGeneratedDocuments(filterMap[tab]),
    enabled: !!hasLegalAccess && tab !== "templates",
  });

  const gen = useMutation({
    mutationFn: async (t: { id: string; code: string; name: string; body: string }) => {
      if (!caseId) throw new Error("Enter a matter ID first");
      const ctx = await buildMatterContext(caseId);
      const merged = renderText(t.body || `Document ${t.name}\n\nMatter: {{matter.case_no}}\nCourt: {{court.name}}\nOutstanding: {{financial.total_outstanding}}\nDate: {{date.today}}`, ctx);
      const [docx, pdf] = [await renderDocx(t.name, merged), renderPdf(t.name, merged)];
      const link = await generateDocument({
        lgCaseId: caseId, templateId: t.id, templateCode: t.code, title: t.name,
      });
      // Trigger browser downloads for the freshly rendered files
      for (const [blob, ext] of [[docx, "docx"], [pdf, "pdf"]] as const) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${t.code}_${caseId.slice(0,8)}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }
      return link;
    },
    onSuccess: () => {
      toast.success("Document generated and downloaded");
      qc.invalidateQueries({ queryKey: ["lg-doc-automation"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate document"),
  });

  const trans = useMutation({
    mutationFn: (a: { id: string; to: LgDocLifecycle }) => transitionDocument(a.id, a.to),
    onSuccess: () => {
      toast.success("Document updated");
      qc.invalidateQueries({ queryKey: ["lg-doc-automation"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Transition failed"),
  });

  if (!hasLegalAccess) {
    return <div className="p-8">Restricted — legal role required.</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Legal Document Automation</h1>
        <p className="text-sm text-muted-foreground">
          Generate, approve, issue and dispatch legal correspondence from the shared template registry.
          Uses <code>core_template</code> (LEGAL module) and writes to <code>lg_document_link</code>.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Matter ID</label>
            <input
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="lg_case.id UUID (paste from a matter workspace)"
              className="flex-1 rounded border px-3 py-1.5 text-sm bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Supported categories:</span>
            {LG_DOC_CATEGORIES.map((c) => (
              <span key={c} className="rounded-full border px-2 py-0.5">{c}</span>
            ))}
          </div>
          {templates.isLoading && <div className="text-sm">Loading templates…</div>}
          {templates.error && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              Could not load templates from <code>core_template</code>. Ensure LEGAL templates are configured.
            </div>
          )}
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Generate</th>
                </tr>
              </thead>
              <tbody>
                {(templates.data ?? []).map((t) => (
                  <tr key={t.id} className="border-t hover:bg-accent/30">
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-2">{t.category ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        disabled={!can("generateLegalDocument") || !caseId || gen.isPending}
                        onClick={() => gen.mutate(t)}
                        className="inline-flex items-center gap-1 rounded border px-3 py-1 text-xs hover:bg-accent disabled:opacity-40"
                      >
                        <Download className="h-3.5 w-3.5" /> Generate DOCX + PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {templates.data?.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No LEGAL templates registered yet. Use Template Registry to add.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab !== "templates" && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Generated</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(generated.data ?? []).map((d: any) => (
                <tr key={d.id} className="border-t hover:bg-accent/30">
                  <td className="px-3 py-2 font-medium">{d.title}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.template_code}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {d.lifecycle_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{d.generated_at?.slice(0,19).replace("T"," ") ?? "—"}</td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {d.lifecycle_status === "draft" && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "pending_approval" })}>
                        Submit
                      </button>
                    )}
                    {d.lifecycle_status === "pending_approval" && can("approveLegalDocument") && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "approved" })}>
                        <CheckCircle2 className="inline h-3 w-3" /> Approve
                      </button>
                    )}
                    {d.lifecycle_status === "approved" && can("issueLegalDocument") && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "issued" })}>
                        <Send className="inline h-3 w-3" /> Issue
                      </button>
                    )}
                    {d.lifecycle_status === "issued" && can("issueLegalDocument") && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "dispatched" })}>
                        <Truck className="inline h-3 w-3" /> Dispatch
                      </button>
                    )}
                    {d.lifecycle_status === "dispatched" && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "acknowledged" })}>
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {generated.data?.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No documents in this state.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
