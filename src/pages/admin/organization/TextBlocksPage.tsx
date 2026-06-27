import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTextBlocks, useSaveTextBlock, useDeleteTextBlock, type TextBlock } from "@/hooks/org/useTextBlock";
import { useAppModules } from "@/hooks/org/useAppModules";

const CATEGORIES = ["disclaimer", "footer", "instruction", "notice", "warning", "header", "consent", "other"];

export default function TextBlocksPage() {
  const { data: blocks = [], isLoading } = useTextBlocks();
  const { data: modules = [] } = useAppModules({ enabledOnly: true, rootOnly: true });
  const save = useSaveTextBlock();
  const del = useDeleteTextBlock();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<TextBlock> | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return blocks.filter(b =>
      !q ||
      b.text_block_code.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.category ?? "").toLowerCase().includes(q),
    );
  }, [blocks, search]);

  const handleSave = async () => {
    if (!editing?.text_block_code || !editing?.name) return;
    await save.mutateAsync({
      ...editing,
      language_code: editing.language_code ?? "en",
      version_no: editing.version_no ?? 1,
      is_active: editing.is_active ?? true,
    });
    setEditing(null);
  };

  return (
    <div className="min-h-screen w-full bg-muted/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Text Blocks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable content blocks (disclaimers, notices, instructions). Templates reference these by code instead of hardcoding paragraphs.
            </p>
          </div>
          <Button onClick={() => setEditing({ language_code: "en", version_no: 1, is_active: true })}>
            <Plus className="h-4 w-4 mr-2" /> New Text Block
          </Button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            No text blocks yet. Create your first one to replace hardcoded paragraphs in templates.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(b => (
              <Card key={b.id} className="hover:border-primary transition-colors">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{b.name}</h3>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.text_block_code}</code>
                      <Badge variant="outline" className="text-xs">v{b.version_no}</Badge>
                      <Badge variant="secondary" className="text-xs">{b.language_code}</Badge>
                      {b.category && <Badge variant="outline" className="text-xs capitalize">{b.category}</Badge>}
                      {b.module_code && <Badge variant="outline" className="text-xs">{b.module_code}</Badge>}
                      {!b.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {b.content_text ?? b.content_html?.replace(/<[^>]+>/g, "") ?? "(no content)"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Delete "${b.name}"?`)) del.mutate(b.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit" : "New"} Text Block</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code *</Label>
                  <Input
                    value={editing?.text_block_code ?? ""}
                    onChange={(e) => setEditing({ ...editing, text_block_code: e.target.value })}
                    placeholder="CONFIDENTIALITY_NOTICE"
                  />
                </div>
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={editing?.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Confidentiality Notice"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={editing?.category ?? ""} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Module (optional)</Label>
                  <Select value={editing?.module_code ?? "__none"} onValueChange={(v) => setEditing({ ...editing, module_code: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="All modules" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">All modules</SelectItem>
                      {modules.map(m => <SelectItem key={m.id} value={m.name}>{m.display_name ?? m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Input
                    value={editing?.language_code ?? "en"}
                    onChange={(e) => setEditing({ ...editing, language_code: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Plain Text Content</Label>
                <Textarea
                  rows={4}
                  value={editing?.content_text ?? ""}
                  onChange={(e) => setEditing({ ...editing, content_text: e.target.value })}
                />
              </div>
              <div>
                <Label>HTML Content (optional)</Label>
                <Textarea
                  rows={4}
                  value={editing?.content_html ?? ""}
                  onChange={(e) => setEditing({ ...editing, content_html: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Effective From</Label>
                  <Input type="date" value={editing?.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value || null })} />
                </div>
                <div>
                  <Label>Effective To</Label>
                  <Input type="date" value={editing?.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value || null })} />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input type="number" value={editing?.version_no ?? 1} onChange={(e) => setEditing({ ...editing, version_no: Number(e.target.value) || 1 })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
