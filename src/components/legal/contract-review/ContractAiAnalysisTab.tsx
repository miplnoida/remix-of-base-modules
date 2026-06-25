import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listAiAnalyses, saveAiAnalysis, listDocuments, type ContractReview,
} from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

export function ContractAiAnalysisTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [docs, setDocs] = useState<any[]>([]);
  const [docId, setDocId] = useState<string>("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [d, a] = await Promise.all([listDocuments(review.id), listAiAnalyses(review.id)]);
    setDocs(d); setRows(a);
    if (!docId) {
      const first = d.find((x: any) => x.ai_analysis_allowed);
      if (first) setDocId(first.id);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [review.id]);

  const allowedDocs = useMemo(() => docs.filter(d => d.ai_analysis_allowed), [docs]);
  const selectedDoc = useMemo(() => docs.find(d => d.id === docId), [docs, docId]);
  const canAnalyze = allowedDocs.length > 0 && !!docId && text.trim().length >= 100 && !busy;

  const analyze = async () => {
    if (!selectedDoc) { toast.error("Select a document"); return; }
    if (!selectedDoc.ai_analysis_allowed) { toast.error("AI analysis is not allowed on this document"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("lg-contract-ai-analyze", {
        body: { contract_text: text, contract_type: review.contract_type, contract_title: review.contract_title },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await saveAiAnalysis({
        review_id: review.id,
        document_id: selectedDoc.id,
        model: data.model,
        provider: data.provider,
        prompt_version: data.prompt_version,
        analysis_result: data.analysis,
        checklist_score: data.analysis?.checklist_score ?? null,
        generated_by_user_code: userCode,
        disclaimer: "AI analysis is advisory only and must be reviewed by Legal before use.",
      });
      toast.success("Analysis complete");
      setText("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Document Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>AI analysis is advisory only and must be reviewed by Legal before use.</AlertDescription></Alert>

        {allowedDocs.length === 0 ? (
          <Alert variant="destructive"><AlertDescription>
            No uploaded or linked document with AI analysis allowed. Add a document under the <b>Documents</b> tab (with AI allowed) before running analysis.
          </AlertDescription></Alert>
        ) : (
          <>
            <div>
              <Label>Document to analyze *</Label>
              <Select value={docId} onValueChange={setDocId}>
                <SelectTrigger><SelectValue placeholder="Select document" /></SelectTrigger>
                <SelectContent>
                  {allowedDocs.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.document_role ?? d.document_kind).replace(/_/g, " ")} — {d.file_name ?? d.dms_document_id ?? d.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document text (paste extracted text)</Label>
              <Textarea rows={6} placeholder="Paste the document text here (PDF/Word text extraction). Minimum 100 characters." value={text} onChange={e => setText(e.target.value)} />
              <div className="text-xs text-muted-foreground mt-1">{text.length} chars</div>
            </div>
            <Button onClick={analyze} disabled={!canAnalyze}>{busy ? "Analyzing…" : "Analyze Uploaded Document"}</Button>
          </>
        )}

        <div className="space-y-4 pt-4">
          {rows.length === 0 && <div className="text-center text-muted-foreground py-6">No analyses yet</div>}
          {rows.map(r => {
            const a = r.analysis_result ?? {};
            const doc = docs.find(d => d.id === r.document_id);
            return (
              <div key={r.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.model} · {formatDateForDisplay(r.generated_at)} · {r.generated_by_user_code ?? ""} {doc ? `· ${doc.file_name ?? doc.dms_document_id}` : ""}</span>
                  {r.checklist_score != null && <Badge>Score {Number(r.checklist_score).toFixed(0)}</Badge>}
                </div>
                {a.summary && <div className="text-sm"><b>Summary:</b> {a.summary}</div>}
                {a.high_risk_terms?.length > 0 && <Section title="High-risk terms" items={a.high_risk_terms} />}
                {a.missing_clauses?.length > 0 && <Section title="Missing clauses" items={a.missing_clauses} />}
                {a.recommended_legal_comments?.length > 0 && <Section title="Recommended legal comments" items={a.recommended_legal_comments} />}
                {a.action_items?.length > 0 && <Section title="Action items" items={a.action_items} />}
                <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Full JSON</summary><pre className="bg-muted p-2 rounded mt-1 overflow-auto">{JSON.stringify(a, null, 2)}</pre></details>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="text-sm">
      <b>{title}:</b>
      <ul className="list-disc ml-5 mt-1">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}
