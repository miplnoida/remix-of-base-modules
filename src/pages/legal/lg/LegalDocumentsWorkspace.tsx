import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import {
  listLegalTemplates, listGeneratedDocuments,
  buildMatterContext, renderText, renderDocx, renderPdf,
  generateDocument, transitionDocument, dispatchDocument,
  getSignedDownloadUrl, runTemplateAudit,
  LG_DOC_CATEGORIES, type LgDocLifecycle,
} from "@/services/legal/lgDocumentAutomationService";
import { toast } from "sonner";
import { FileText, Download, CheckCircle2, Send, Truck, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";

type Tab = "templates" | "generated" | "pending" | "issued" | "dispatch" | "failed" | "audit";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "templates", label: "Templates", icon: FileText },
  { id: "generated", label: "Generated Documents", icon: FileText },
  { id: "pending", label: "Pending Approval", icon: AlertTriangle },
  { id: "issued", label: "Issued Documents", icon: CheckCircle2 },
  { id: "dispatch", label: "Dispatch Log", icon: Truck },
  { id: "failed", label: "Failed", icon: XCircle },
  { id: "audit", label: "Template Audit", icon: ShieldAlert },
];

export default function LegalDocumentsWorkspace() {
  const { can, hasLegalAccess } = useLgAccess();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("templates");
  const [caseId, setCaseId] = useState("");
  const [dispatchFor, setDispatchFor] = useState<any | null>(null);

  const templates = useQuery({
    queryKey: ["lg-doc-automation", "templates"],
    queryFn: listLegalTemplates,
    enabled: !!hasLegalAccess,
  });
  const filterMap: Record<Exclude<Tab, "templates" | "audit">, LgDocLifecycle | undefined> = {
    generated: undefined, pending: "pending_approval",
    issued: "issued", dispatch: "dispatched", failed: "failed",
  };
  const generated = useQuery({
    queryKey: ["lg-doc-automation", "list", tab],
    queryFn: () => listGeneratedDocuments((filterMap as any)[tab]),
    enabled: !!hasLegalAccess && tab !== "templates" && tab !== "audit",
  });
  const audit = useQuery({
    queryKey: ["lg-doc-automation", "audit"],
    queryFn: runTemplateAudit,
    enabled: !!hasLegalAccess && tab === "audit",
  });

  const gen = useMutation({
    mutationFn: async (t: { id: string; code: string; name: string; body: string }) => {
      if (!caseId) throw new Error("Enter a matter ID first");
      const ctx = await buildMatterContext(caseId);
      const merged = renderText(t.body || `Document ${t.name}\n\nMatter: {{matter.case_no}}\nCourt: {{court.name}}\nOutstanding: {{financial.total_outstanding}}\nDate: {{date.today}}`, ctx);
      const docxBlob = await renderDocx(t.name, merged);
      const pdfBlob = renderPdf(t.name, merged);
      const fileBase = `${t.code}_${caseId.slice(0, 8)}`;
      return await generateDocument({
        lgCaseId: caseId, templateId: t.id, templateCode: t.code, title: t.name,
        docxBlob, pdfBlob, fileBase,
      });
    },
    onSuccess: () => {
      toast.success("Document generated and stored");
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

  const dispatchMut = useMutation({
    mutationFn: (args: { id: string; channel: string; recipient: string; recipientAddress: string }) =>
      dispatchDocument(args.id, { channel: args.channel, recipient: args.recipient, recipientAddress: args.recipientAddress }),
    onSuccess: () => {
      toast.success("Dispatch recorded");
      setDispatchFor(null);
      qc.invalidateQueries({ queryKey: ["lg-doc-automation"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Dispatch failed"),
  });

  async function download(d: any) {
    if (!d.storage_ref) return toast.error("No stored file for this document");
    try {
      const url = await getSignedDownloadUrl(d.storage_ref);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create download link");
    }
  }

  if (!hasLegalAccess) {
    return <div className="p-8">Restricted — legal role required.</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Legal Document Automation</h1>
        <p className="text-sm text-muted-foreground">
          Generate, approve, issue and dispatch legal correspondence. Rendered DOCX/PDF are
          uploaded to the <code>legal-documents</code> storage bucket and remain downloadable
          after refresh.
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
              Could not load templates from <code>core_template</code>.
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
                        <Download className="h-3.5 w-3.5" /> Generate & Store
                      </button>
                    </td>
                  </tr>
                ))}
                {templates.data?.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No LEGAL templates registered yet.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Required Template Code</th>
                <th className="px-3 py-2">Mapped Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Render Failures</th>
              </tr>
            </thead>
            <tbody>
              {(audit.data ?? []).map((r) => (
                <tr key={r.template_code} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.template_code}</td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      r.status === "mapped" ? "bg-emerald-100 text-emerald-800" :
                      r.status === "inactive" ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{r.render_failures}</td>
                </tr>
              ))}
              {audit.isLoading && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Running audit…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab !== "templates" && tab !== "audit" && (
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
                  <td className="px-3 py-2 font-medium">
                    {d.title}
                    {d.render_error && (
                      <div className="text-[11px] text-red-600 mt-0.5">{d.render_error}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{d.template_code}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {d.lifecycle_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{d.generated_at?.slice(0,19).replace("T"," ") ?? "—"}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {d.storage_ref && (
                      <button className="text-xs underline" onClick={() => download(d)}>
                        <Download className="inline h-3 w-3" /> Download
                      </button>
                    )}
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
                        onClick={() => setDispatchFor(d)}>
                        <Truck className="inline h-3 w-3" /> Dispatch
                      </button>
                    )}
                    {d.lifecycle_status === "dispatched" && (
                      <button className="text-xs underline"
                        onClick={() => trans.mutate({ id: d.id, to: "acknowledged" })}>
                        Acknowledge
                      </button>
                    )}
                    {!["acknowledged","cancelled","failed"].includes(d.lifecycle_status) && (
                      <button className="text-xs underline text-red-600"
                        onClick={() => trans.mutate({ id: d.id, to: "cancelled" })}>
                        Cancel
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

      {dispatchFor && (
        <DispatchDialog
          doc={dispatchFor}
          onClose={() => setDispatchFor(null)}
          onSubmit={(v) => dispatchMut.mutate({ id: dispatchFor.id, ...v })}
          submitting={dispatchMut.isPending}
        />
      )}
    </div>
  );
}

function DispatchDialog({
  doc, onClose, onSubmit, submitting,
}: {
  doc: any;
  onClose: () => void;
  onSubmit: (v: { channel: string; recipient: string; recipientAddress: string }) => void;
  submitting: boolean;
}) {
  const [channel, setChannel] = useState("email");
  const [recipient, setRecipient] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-4 shadow-xl space-y-3">
        <h2 className="text-lg font-semibold">Record Dispatch</h2>
        <p className="text-xs text-muted-foreground">Document: <span className="font-medium">{doc.title}</span></p>
        <label className="block text-sm">
          Channel
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            className="mt-1 block w-full rounded border bg-background px-2 py-1.5 text-sm">
            <option value="email">Email</option>
            <option value="postal">Postal Mail</option>
            <option value="courier">Courier</option>
            <option value="hand_delivery">Hand Delivery</option>
            <option value="fax">Fax</option>
            <option value="portal">Portal</option>
          </select>
        </label>
        <label className="block text-sm">
          Recipient
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient name / party" className="mt-1 block w-full rounded border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">
          Address / Email
          <input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Email or postal address" className="mt-1 block w-full rounded border bg-background px-2 py-1.5 text-sm" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
          <button
            disabled={submitting || !recipient || !recipientAddress}
            onClick={() => onSubmit({ channel, recipient, recipientAddress })}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40">
            Save Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}
