/**
 * EPIC-06C Phase 4 — Template Registry admin.
 * Map judicial template codes to core_template rows.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateTemplateCache } from "@/services/legal/lgTemplateRegistryService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const sb = supabase as any;

interface Registry {
  template_code: string;
  template_label: string;
  core_template_id: string | null;
  configured: boolean;
}

export default function LgTemplateRegistryAdmin() {
  const { can } = useLgAccess();
  const canEdit = can("manageTemplates" as any);
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<Registry>>>({});

  const q = useQuery({
    queryKey: ["lg-template-registry"],
    queryFn: async () => {
      const { data, error } = await sb.from("lg_document_template_registry").select("*").order("template_code");
      if (error) throw error;
      return (data ?? []) as Registry[];
    },
  });

  const templates = useQuery({
    queryKey: ["core-template-picker"],
    queryFn: async () => {
      const { data } = await sb.from("core_template").select("id, template_code, name").order("name").limit(500);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Registry) => {
      const patch = edits[row.template_code] ?? {};
      const { error } = await sb.from("lg_document_template_registry").update(patch).eq("template_code", row.template_code);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template mapping saved");
      invalidateTemplateCache();
      qc.invalidateQueries({ queryKey: ["lg-template-registry"] });
      setEdits({});
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Template Registry</CardTitle>
          <CardDescription>
            Map each judicial template code to a row in the central template library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Core Template</TableHead>
                <TableHead>Configured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((row) => {
                const patch = edits[row.template_code] ?? {};
                const merged = { ...row, ...patch };
                const dirty = !!edits[row.template_code];
                const upd = (k: keyof Registry, v: any) =>
                  setEdits((s) => ({ ...s, [row.template_code]: { ...(s[row.template_code] ?? {}), [k]: v } }));
                return (
                  <TableRow key={row.template_code}>
                    <TableCell className="font-mono text-xs">{row.template_code}</TableCell>
                    <TableCell>{row.template_label}</TableCell>
                    <TableCell>
                      <Select value={merged.core_template_id ?? ""} onValueChange={(v) => upd("core_template_id", v || null)} disabled={!canEdit}>
                        <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Unmapped" /></SelectTrigger>
                        <SelectContent>
                          {(templates.data ?? []).map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.template_code ?? t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Switch checked={merged.configured} disabled={!canEdit} onCheckedChange={(v) => upd("configured", v)} /></TableCell>
                    <TableCell>
                      {merged.configured && merged.core_template_id
                        ? <Badge variant="secondary">Ready</Badge>
                        : <Badge variant="outline">Not Configured</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" disabled={!dirty || !canEdit || save.isPending} onClick={() => save.mutate(row)}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
