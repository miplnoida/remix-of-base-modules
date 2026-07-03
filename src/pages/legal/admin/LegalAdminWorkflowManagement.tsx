/**
 * Legal Admin — Workflow Management
 * ---------------------------------
 * Filtered view of the enterprise `workflow_definitions` table showing
 * only workflows that belong to the Legal module. Detection is inclusive:
 *
 *   - workflow_definitions.secured_table LIKE 'lg_%'  OR
 *   - a workflow_triggers row with source_module LIKE 'lg_%' references it
 *
 * The page reuses the central workflow designer at `/admin/workflows/:id`
 * for edit — there is NO parallel legal-only workflow engine.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Edit, Copy, Power, BarChart3, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useToggleWorkflowStatus,
  useCloneWorkflow,
  type WorkflowDefinition,
} from "@/hooks/useWorkflows";
import { useLegalReadOnly } from "@/hooks/legal/useLegalReadOnly";

const sb = supabase as any;

interface LegalWorkflowRow extends WorkflowDefinition {
  bound_sources: string[];
}

function useLegalWorkflowDefinitions() {
  return useQuery({
    queryKey: ["legal-admin", "workflow-definitions"],
    queryFn: async (): Promise<LegalWorkflowRow[]> => {
      // 1. Direct hits — secured_table LIKE 'lg_%'
      const { data: bySecured, error: e1 } = await sb
        .from("workflow_definitions")
        .select("*")
        .ilike("secured_table", "lg\\_%");
      if (e1) throw e1;

      // 2. Triggered by any legal app_module (name starts with 'lg_' or 'legal')
      const { data: legalModules, error: eMods } = await sb
        .from("app_modules")
        .select("id, name")
        .or("name.ilike.lg\\_%,name.ilike.legal%");
      if (eMods) throw eMods;
      const moduleMap = new Map<string, string>(
        (legalModules ?? []).map((m: any) => [m.id, m.name]),
      );

      let triggers: any[] = [];
      if (moduleMap.size) {
        const { data, error: e2 } = await sb
          .from("workflow_triggers")
          .select("workflow_id, module_id, action_name")
          .in("module_id", Array.from(moduleMap.keys()));
        if (e2) throw e2;
        triggers = data ?? [];
      }

      const triggerIds = Array.from(
        new Set(triggers.map((t: any) => t.workflow_id).filter(Boolean)),
      );

      let byTrigger: any[] = [];
      if (triggerIds.length) {
        const { data, error } = await sb
          .from("workflow_definitions")
          .select("*")
          .in("id", triggerIds);
        if (error) throw error;
        byTrigger = data ?? [];
      }

      // Merge & annotate
      const map = new Map<string, LegalWorkflowRow>();
      for (const w of [...(bySecured ?? []), ...byTrigger]) {
        if (!map.has(w.id)) map.set(w.id, { ...(w as WorkflowDefinition), bound_sources: [] });
      }
      for (const t of triggers) {
        const row = map.get(t.workflow_id);
        const modName = moduleMap.get(t.module_id);
        if (row && modName && !row.bound_sources.includes(modName)) {
          row.bound_sources.push(modName);
        }
      }
      return Array.from(map.values()).sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
    },
    staleTime: 60_000,
  });
}

export default function LegalAdminWorkflowManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { isReadOnly } = useLegalReadOnly();
  const { data, isLoading, error } = useLegalWorkflowDefinitions();
  const toggle = useToggleWorkflowStatus();
  const clone = useCloneWorkflow();

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((w) =>
      (w.name ?? "").toLowerCase().includes(s) ||
      (w.process_type ?? "").toLowerCase().includes(s) ||
      w.bound_sources.some((m) => m.toLowerCase().includes(s)),
    );
  }, [data, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Legal Workflow Management</h1>
          <p className="text-muted-foreground">
            Read-and-configure view of enterprise workflows scoped to the Legal
            module. Editing opens the central workflow designer — Legal does not
            run a separate engine.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/workflows")}>
          Open Central Workflow Admin
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Legacy legal-only policies are being retired</AlertTitle>
        <AlertDescription>
          Rules previously configured under <code>lg_workflow_policy</code> are
          in the process of being migrated to the central engine (
          <code>workflow_definitions</code> + <code>workflow_triggers</code>). The
          legacy page at <code>/legal/admin/policy</code> remains available as a
          read-only reference during transition.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name, process type, or source module (e.g. lg_case)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" onClick={() => navigate("/admin/workflow-logs")}>
          <FileText className="h-4 w-4 mr-2" /> Logs
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/workflow-analytics")}>
          <BarChart3 className="h-4 w-4 mr-2" /> Analytics
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load legal workflows.</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Process Type</TableHead>
              <TableHead>Bound Sources</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No legal workflows found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <div>{w.name}</div>
                    {w.secured_table && (
                      <div className="text-xs text-muted-foreground">
                        table: <code>{w.secured_table}</code>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{w.process_type}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {w.bound_sources.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        w.bound_sources.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.is_active ? "default" : "secondary"}>
                      {w.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>v{w.version}</TableCell>
                  <TableCell>
                    {w.updated_at ? format(new Date(w.updated_at), "MMM dd, yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        title="Open in central workflow designer"
                        onClick={() => navigate(`/admin/workflows/${w.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        disabled={isReadOnly}
                        title={isReadOnly ? "Read-only role" : "Clone workflow"}
                        onClick={async () => {
                          const id = await clone.mutateAsync({
                            sourceWorkflowId: w.id,
                            newName: `${w.name} (Copy)`,
                          });
                          if (id) navigate(`/admin/workflows/${id}`);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        disabled={isReadOnly || toggle.isPending}
                        title={
                          isReadOnly
                            ? "Read-only role"
                            : w.is_active ? "Disable workflow" : "Enable workflow"
                        }
                        onClick={() =>
                          toggle.mutate({ id: w.id, is_active: !w.is_active })
                        }
                      >
                        <Power className={`h-4 w-4 ${w.is_active ? "text-green-500" : "text-muted-foreground"}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
