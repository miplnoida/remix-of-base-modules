import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listAiAnalyses, saveAiAnalysis, type ContractReview } from "@/services/legal/contractReviewService";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

export function ContractAiAnalysisTab({ review }: { review: ContractReview }) {
  const { userCode } = useUserCode();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => listAiAnalyses(review.id).then(setRows);
  useEffect(() => { load(); }, [review.id]);

  const analyze = async () => {
    if (text.trim().length < 100) { toast.error("Paste at least 100 characters of the contract."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("lg-contract-ai-analyze", {
        body: { contract_text: text, contract_type: review.contract_type, contract_title: review.contract_title },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await saveAiAnalysis({
        review_id: review.id,
        model: data.model,
        provider: data.provider,
        prompt_version: data.prompt_version,
        analysis_result: data.analysis,
        checklist_score: data.analysis?.checklist_score ?? null,
        generated_by_user_code: userCode,
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
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Contract Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>AI analysis is a drafting aid and must be reviewed by Legal before use.</AlertDescription></Alert>
        <Textarea rows={6} placeholder="Paste the contract text here…" value={text} onChange={e => setText(e.target.value)} />
        <Button onClick={analyze} disabled={busy}>{busy ? "Analyzing…" : "Analyze Contract"}</Button>

        <div className="space-y-4">
          {rows.length === 0 && <div className="text-center text-muted-foreground py-6">No analyses yet</div>}
          {rows.map(r => {
            const a = r.analysis_result ?? {};
            return (
              <div key={r.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.model} · {formatDateForDisplay(r.generated_at)} · {r.generated_by_user_code ?? ""}</span>
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
