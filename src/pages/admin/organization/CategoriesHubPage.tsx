/**
 * Communication Library → Categories (Hub)
 * Category masters split by domain — asset, template, text-block/token taxonomies
 * live in different tables and must not be merged. Text-block categories are
 * managed in-context inside Text Blocks; token groups in-context inside Tokens.
 */
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderTree, Info, Loader2 } from "lucide-react";

const sb = supabase as any;
const AssetCategoryMasterPage = lazy(() => import("@/pages/admin/organization/AssetCategoryMasterPage"));

export default function CategoriesHubPage() {
  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <FolderTree className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Category masters split by domain. Asset and template categories are managed here; text-block and token
            groups are managed in-context on their respective pages.
          </p>
        </div>
      </div>

      <Tabs defaultValue="asset">
        <TabsList>
          <TabsTrigger value="asset">Asset Categories</TabsTrigger>
          <TabsTrigger value="template">Template Categories</TabsTrigger>
          <TabsTrigger value="text-blocks">Text Blocks</TabsTrigger>
          <TabsTrigger value="tokens">Token Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="asset">
          <Alert className="mb-3">
            <Info className="h-4 w-4" />
            <AlertDescription>Manages <code>comm_asset_category_master</code> — categories for Media Library binaries.</AlertDescription>
          </Alert>
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
            <AssetCategoryMasterPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="template"><TemplateCategoriesTab /></TabsContent>
        <TabsContent value="text-blocks"><TextBlockGroupsTab /></TabsContent>
        <TabsContent value="tokens"><TokenGroupsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateCategoriesTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_template_category", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template_category").select("*").order("module_code", { nullsFirst: false }).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="mt-3">
      <CardContent className="p-0">
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No template categories.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Module</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.module_code ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{r.description ?? "—"}</TableCell>
                  <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TextBlockGroupsTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_text_block", "category-summary"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_text_block").select("category, module_code, is_active");
      if (error) throw error;
      const map = new Map<string, { category: string; module: string; total: number; active: number }>();
      (data ?? []).forEach((r: any) => {
        const k = `${r.module_code ?? "__shared"}::${r.category ?? "__none"}`;
        const cur = map.get(k) ?? { category: r.category ?? "—", module: r.module_code ?? "shared", total: 0, active: 0 };
        cur.total++; if (r.is_active) cur.active++;
        map.set(k, cur);
      });
      return Array.from(map.values()).sort((a, b) => a.module.localeCompare(b.module) || a.category.localeCompare(b.category));
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Text-block categories are declared inline on each block. Manage them in{" "}
          <Link to="/admin/org/library/text-blocks" className="underline text-primary">Text Blocks</Link>.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Category</TableHead><TableHead>Active</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.module}</TableCell>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell><Badge variant="secondary">{r.active}</Badge></TableCell>
                    <TableCell className="text-xs">{r.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TokenGroupsTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["core_template_token", "group-summary"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_template_token").select("token_group, module_code, is_active");
      if (error) throw error;
      const map = new Map<string, { group: string; module: string; total: number; active: number }>();
      (data ?? []).forEach((r: any) => {
        const k = `${r.module_code ?? "__shared"}::${r.token_group ?? "__none"}`;
        const cur = map.get(k) ?? { group: r.token_group ?? "—", module: r.module_code ?? "shared", total: 0, active: 0 };
        cur.total++; if (r.is_active) cur.active++;
        map.set(k, cur);
      });
      return Array.from(map.values()).sort((a, b) => a.module.localeCompare(b.module) || a.group.localeCompare(b.group));
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Token groups are declared inline on each token. Manage them in{" "}
          <Link to="/admin/org/library/tokens" className="underline text-primary">Tokens</Link>.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Group</TableHead><TableHead>Active</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.module}</TableCell>
                    <TableCell className="font-medium">{r.group}</TableCell>
                    <TableCell><Badge variant="secondary">{r.active}</Badge></TableCell>
                    <TableCell className="text-xs">{r.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
