import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Search, Pencil } from "lucide-react";
import { useAppModules, useUpdateAppModule, type AppModule } from "@/hooks/org/useAppModules";

function ModuleRegistryPageInner() {
  const { data: modules = [], isLoading } = useAppModules({ rootOnly: true });
  const update = useUpdateAppModule();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AppModule | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return modules.filter(m =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.display_name ?? "").toLowerCase().includes(q),
    );
  }, [modules, search]);

  const handleSave = async () => {
    if (!editing) return;
    await update.mutateAsync({
      id: editing.id,
      display_name: editing.display_name,
      short_name: editing.short_name,
      icon: editing.icon,
      route: editing.route,
      is_enabled: editing.is_enabled,
    });
    setEditing(null);
  };

  return (
    <div className="min-h-screen w-full bg-muted/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Module Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Single source of truth for module names, icons, routes. All screens, templates, and notifications use display names from here — never hardcoded.
          </p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(m => (
              <Card key={m.id} className={`hover:border-primary transition-colors ${!m.is_enabled ? "opacity-60" : ""}`}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{m.display_name ?? m.name}</h3>
                      <code className="text-xs text-muted-foreground">{m.name}</code>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {m.short_name && <Badge variant="outline">{m.short_name}</Badge>}
                    {m.icon && <Badge variant="outline">{m.icon}</Badge>}
                    {m.route && <Badge variant="secondary" className="truncate max-w-[180px]">{m.route}</Badge>}
                    {!m.is_enabled && <Badge variant="destructive">Disabled</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Module</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div>
                  <Label>Code (read-only)</Label>
                  <Input value={editing.name} disabled />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Display Name</Label>
                    <Input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Short Name</Label>
                    <Input value={editing.short_name ?? ""} onChange={(e) => setEditing({ ...editing, short_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Icon</Label>
                    <Input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="Building2" />
                  </div>
                  <div>
                    <Label>Route</Label>
                    <Input value={editing.route ?? ""} onChange={(e) => setEditing({ ...editing, route: e.target.value })} placeholder="/admin/foo" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Enabled</Label>
                  <Switch checked={!!editing.is_enabled} onCheckedChange={(v) => setEditing({ ...editing, is_enabled: v })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={update.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function ModuleRegistryPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <ModuleRegistryPageInner />
    </PermissionWrapper>
  );
}
