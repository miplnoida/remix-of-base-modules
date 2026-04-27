import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, PlayCircle, Database } from "lucide-react";
import { toast } from "sonner";

interface QueueStats {
  status: string;
  count: number;
}

/**
 * DMS Queue panel — shown on Admin → API Configuration screen
 *
 * Surfaces the current state of `dms_transfer_queue` and lets an admin
 * manually drain a batch via the `dms-transfer-retry` edge function.
 * The same edge function is invoked automatically by pg_cron every few
 * minutes; this panel is purely for visibility and on-demand retries.
 */
export function DmsQueuePanel() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [draining, setDraining] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("dms_transfer_queue")
        .select("status");
      if (error) throw error;
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: { status: string }) => {
        counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
      });
      setStats(
        Array.from(counts.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => a.status.localeCompare(b.status))
      );
    } catch (e) {
      console.error("[DmsQueuePanel] loadStats error:", e);
      toast.error("Failed to load DMS queue stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDrain = async () => {
    setDraining(true);
    try {
      const { data, error } = await supabase.functions.invoke("dms-transfer-retry", {
        body: { batchSize: 25 },
      });
      if (error) throw error;
      const r = data as {
        processed?: number;
        succeeded?: number;
        failed?: number;
        message?: string;
      };
      toast.success(
        `DMS queue drained: ${r?.processed ?? 0} processed (${r?.succeeded ?? 0} ok / ${r?.failed ?? 0} failed)`
      );
      await loadStats();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[DmsQueuePanel] drain error:", e);
      toast.error(`Drain failed: ${msg}`);
    } finally {
      setDraining(false);
    }
  };

  const total = stats.reduce((s, r) => s + r.count, 0);
  const pending = stats.find((s) => s.status === "pending")?.count ?? 0;
  const failed = stats.find((s) => s.status === "failed")?.count ?? 0;
  const inflight = stats.find((s) => s.status === "in_progress")?.count ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              DMS Transfer Queue
            </CardTitle>
            <CardDescription>
              Background queue draining documents into the DMS service. Drains automatically every few minutes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={handleDrain} disabled={draining || pending === 0} className="gap-2">
              {draining ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Drain now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={total} />
          <StatCard label="Pending" value={pending} tone="warning" />
          <StatCard label="In Progress" value={inflight} tone="info" />
          <StatCard label="Failed" value={failed} tone="destructive" />
        </div>
        {stats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.map((s) => (
              <Badge key={s.status} variant="outline" className="capitalize">
                {s.status}: {s.count}
              </Badge>
            ))}
          </div>
        )}
        {stats.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mt-4">Queue is empty.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "info" | "destructive";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "info"
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
