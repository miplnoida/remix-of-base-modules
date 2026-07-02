import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, TrendingUp, Users, FileWarning, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  datasetKey: string;
  datasetTitle: string;
  module: string;
  rows: any[];
}

type Insight = {
  category: "sla_breach" | "recovery" | "workload" | "duplicate" | "missing_document" | "trend" | "outlier";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affected_count?: number;
  suggested_action?: string;
};

const ICONS: Record<string, any> = {
  sla_breach: AlertTriangle, recovery: TrendingUp, workload: Users,
  duplicate: Copy, missing_document: FileWarning, trend: TrendingUp, outlier: Sparkles,
};

export function ExplorerAiInsights({ datasetKey, datasetTitle, module, rows }: Props) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    if (!rows.length) { toast({ title: "No data to analyse" }); return; }
    setLoading(true);
    try {
      const sample = rows.slice(0, 200);
      const { data, error } = await supabase.functions.invoke("explorer-ai-insights", {
        body: { dataset_key: datasetKey, dataset_title: datasetTitle, module, row_count: rows.length, sample },
      });
      if (error) throw error;
      setInsights((data?.insights as Insight[]) ?? []);
    } catch (e: any) {
      toast({ title: "AI insights failed", description: e?.message || String(e), variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Insights</CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          {insights ? "Refresh" : "Analyse view"}
        </Button>
      </CardHeader>
      <CardContent>
        {!insights && !loading && (
          <div className="text-xs text-muted-foreground">
            Click Analyse to surface SLA breaches, recovery opportunities, workload imbalance, duplicate detection, and missing documents for the current filtered view.
          </div>
        )}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">Analysing {rows.length} rows…</div>}
        {insights && insights.length === 0 && <div className="text-xs text-muted-foreground">No issues detected. Everything looks healthy.</div>}
        {insights && insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((i, idx) => {
              const Icon = ICONS[i.category] || Sparkles;
              const tone = i.severity === "high" ? "border-destructive/50 bg-destructive/5" : i.severity === "medium" ? "border-amber-500/40 bg-amber-500/5" : "border-border";
              return (
                <div key={idx} className={`border rounded p-2.5 ${tone}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium">{i.title}</div>
                        <Badge variant="outline" className="text-[10px]">{i.category}</Badge>
                        {i.affected_count != null && <Badge variant="secondary" className="text-[10px]">{i.affected_count} affected</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{i.description}</div>
                      {i.suggested_action && <div className="text-xs mt-1"><strong>Action:</strong> {i.suggested_action}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
