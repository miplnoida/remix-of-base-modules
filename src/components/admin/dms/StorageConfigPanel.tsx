import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Cloud, HardDrive, Loader2, RefreshCw, ServerCog, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";

const sb = supabase as any;

type Provider = "LOCAL_SUPABASE" | "CENTRAL_DMS" | "HYBRID";

interface Cfg {
  id?: string;
  provider: Provider;
  local_bucket: string;
  dms_api_setting_key: string;
  dms_default_category_id: string;
  dms_legal_category_id: string;
  fallback_to_local: boolean;
  auto_mirror_to_central: boolean;
  retry_max: number;
  retry_backoff_seconds: number;
  is_active: boolean;
  notes?: string | null;
}

const PROVIDER_INFO: Record<Provider, { label: string; description: string; icon: any }> = {
  LOCAL_SUPABASE: {
    label: "Local Storage Only",
    description:
      "Documents are stored in this application's own storage bucket. No external DMS is contacted. Best while the central DMS is being set up.",
    icon: HardDrive,
  },
  CENTRAL_DMS: {
    label: "Central DMS Only",
    description:
      "All documents go to the central DMS. If 'Fallback to local' is on, a DMS outage silently writes locally and queues for later sync.",
    icon: Cloud,
  },
  HYBRID: {
    label: "Hybrid (Local + Central)",
    description:
      "Writes locally first (always succeeds), then best-effort to central. Local copy is always available; failed central pushes can be retried.",
    icon: ServerCog,
  },
};

export function StorageConfigPanel() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const { data: cfg, isLoading } = useQuery<Cfg | null>({
    queryKey: ["core_document_storage_config"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_document_storage_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Cfg | null;
    },
  });

  const [draft, setDraft] = useState<Cfg | null>(null);
  useEffect(() => { if (cfg) setDraft(cfg); }, [cfg]);

  const save = useMutation({
    mutationFn: async (next: Cfg) => {
      const payload = { ...next, updated_by: userCode ?? "SYSTEM" };
      if (next.id) {
        const { error } = await sb
          .from("core_document_storage_config")
          .update(payload)
          .eq("id", next.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_document_storage_config").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Storage configuration saved");
      qc.invalidateQueries({ queryKey: ["core_document_storage_config"] });
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  // Queue / health stats
  const { data: stats } = useQuery({
    queryKey: ["core_document_storage_stats"],
    queryFn: async () => {
      const [{ count: pending }, { count: failed }, { count: localOnly }, { count: synced }] = await Promise.all([
        sb.from("core_generated_document").select("id", { head: true, count: "exact" }).eq("sync_state", "PENDING_CENTRAL"),
        sb.from("core_generated_document").select("id", { head: true, count: "exact" }).eq("sync_state", "FAILED"),
        sb.from("core_generated_document").select("id", { head: true, count: "exact" }).eq("sync_state", "LOCAL_ONLY"),
        sb.from("core_generated_document").select("id", { head: true, count: "exact" }).eq("sync_state", "SYNCED"),
      ]);
      return {
        pending: pending ?? 0,
        failed: failed ?? 0,
        localOnly: localOnly ?? 0,
        synced: synced ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const runTest = async () => {
    if (!draft) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Probe local bucket: list a virtual prefix (errors out cleanly if bucket missing or policy wrong)
      if (draft.provider !== "CENTRAL_DMS") {
        const { error } = await sb.storage.from(draft.local_bucket).list("_probe", { limit: 1 });
        if (error && !String(error.message).toLowerCase().includes("not found")) {
          throw new Error(`Local bucket "${draft.local_bucket}": ${error.message}`);
        }
      }
      // Probe central DMS via api_settings
      if (draft.provider !== "LOCAL_SUPABASE") {
        const { data: setting } = await sb
          .from("api_settings")
          .select("base_url, is_active")
          .eq("setting_key", draft.dms_api_setting_key)
          .maybeSingle();
        if (!setting?.base_url) throw new Error(`api_settings("${draft.dms_api_setting_key}") not configured`);
        if (!setting.is_active) throw new Error(`api_settings("${draft.dms_api_setting_key}") is inactive`);
      }
      setTestResult({ ok: true, message: "Configuration looks valid." });
    } catch (e: any) {
      setTestResult({ ok: false, message: String(e?.message || e) });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading storage configuration…
      </div>
    );
  }

  const Icon = PROVIDER_INFO[draft.provider].icon;

  return (
    <div className="space-y-4">
      {/* Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Synced to Central</div>
          <div className="text-2xl font-semibold">{stats?.synced ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Local Only</div>
          <div className="text-2xl font-semibold">{stats?.localOnly ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Pending Central Sync</div>
          <div className="text-2xl font-semibold">{stats?.pending ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Failed</div>
          <div className={`text-2xl font-semibold ${(stats?.failed ?? 0) > 0 ? "text-destructive" : ""}`}>{stats?.failed ?? "—"}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" /> Document Storage Provider
            <Badge variant="secondary">{draft.provider}</Badge>
          </CardTitle>
          <CardDescription>{PROVIDER_INFO[draft.provider].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select value={draft.provider} onValueChange={(v) => setDraft({ ...draft, provider: v as Provider })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_INFO).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Local Bucket</Label>
              <Input
                value={draft.local_bucket}
                onChange={(e) => setDraft({ ...draft, local_bucket: e.target.value })}
                placeholder="core-documents"
              />
            </div>
            <div>
              <Label>Central DMS api_settings key</Label>
              <Input
                value={draft.dms_api_setting_key}
                onChange={(e) => setDraft({ ...draft, dms_api_setting_key: e.target.value })}
                placeholder="dms_service"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Default DMS CategoryId</Label>
                <Input value={draft.dms_default_category_id}
                  onChange={(e) => setDraft({ ...draft, dms_default_category_id: e.target.value })} />
              </div>
              <div>
                <Label>Legal DMS CategoryId</Label>
                <Input value={draft.dms_legal_category_id}
                  onChange={(e) => setDraft({ ...draft, dms_legal_category_id: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-sm font-medium">Fallback to local on DMS failure</div>
                <div className="text-xs text-muted-foreground">Users never lose a document if the central DMS is unreachable.</div>
              </div>
              <Switch checked={draft.fallback_to_local}
                onCheckedChange={(v) => setDraft({ ...draft, fallback_to_local: v })} />
            </label>
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-sm font-medium">Auto-mirror local to central</div>
                <div className="text-xs text-muted-foreground">Background worker re-attempts pending uploads.</div>
              </div>
              <Switch checked={draft.auto_mirror_to_central}
                onCheckedChange={(v) => setDraft({ ...draft, auto_mirror_to_central: v })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Retry max attempts</Label>
                <Input type="number" min={0} value={draft.retry_max}
                  onChange={(e) => setDraft({ ...draft, retry_max: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Retry backoff (seconds)</Label>
                <Input type="number" min={0} value={draft.retry_backoff_seconds}
                  onChange={(e) => setDraft({ ...draft, retry_backoff_seconds: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Why this configuration / contact for central DMS owner / migration plan…" />
          </div>

          {testResult && (
            <Alert variant={testResult.ok ? "default" : "destructive"}>
              {testResult.ok
                ? <CheckCircle2 className="h-4 w-4" />
                : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{testResult.ok ? "Connection OK" : "Connection failed"}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={runTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Test Configuration
            </Button>
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save Configuration"}
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              Changes take effect immediately for new uploads.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StorageConfigPanel;
