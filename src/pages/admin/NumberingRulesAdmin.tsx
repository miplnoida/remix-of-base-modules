import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { coreNumberingService, type CoreNumberSequence, type NumberAuditEntry } from "@/services/core/coreNumberingService";

const RESET_OPTIONS = ["NEVER", "YEARLY", "MONTHLY", "DAILY"] as const;
const TOKEN_HELP = "{MODULE} {ENTITY} {COUNTRY} {YYYY} {YY} {MM} {DD} {SEQ} {BRANCH} {DEPARTMENT}";

export default function NumberingRulesAdmin() {
  const [rows, setRows] = useState<CoreNumberSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [audit, setAudit] = useState<NumberAuditEntry[]>([]);
  const [filterModule, setFilterModule] = useState<string>("ALL");

  async function refresh() {
    setLoading(true);
    try {
      const data = await coreNumberingService.listSequences();
      setRows(data);
    } catch (e: any) {
      toast.error("Failed to load sequences", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.module_code))).sort(), [rows]);
  const filtered = useMemo(
    () => rows.filter(r => filterModule === "ALL" || r.module_code === filterModule),
    [rows, filterModule],
  );
  const selected = useMemo(() => rows.find(r => r.id === selectedId) ?? null, [rows, selectedId]);

  async function saveSelected(patch: Partial<CoreNumberSequence>) {
    if (!selected) return;
    try {
      const updated = await coreNumberingService.updateSequence(selected.id, patch as any);
      setRows(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      toast.success("Saved");
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message });
    }
  }

  async function previewNext() {
    if (!selected) return;
    try {
      const p = await coreNumberingService.preview({
        moduleCode: selected.module_code,
        entityType: selected.entity_type,
        countryCode: selected.country_code,
      });
      setPreview(p);
    } catch (e: any) {
      toast.error("Preview failed", { description: e?.message });
    }
  }

  async function loadAudit() {
    if (!selected) return;
    try {
      const a = await coreNumberingService.listAudit(selected.id, 100);
      setAudit(a);
    } catch (e: any) {
      toast.error("Failed to load audit", { description: e?.message });
    }
  }

  useEffect(() => { setPreview(null); setAudit([]); }, [selectedId]);

  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Numbering Rules | Core Configuration</title>
        <meta name="description" content="Central numbering & code generation rules for all modules." />
      </Helmet>

      <div>
        <h1 className="text-2xl font-semibold">Numbering Rules</h1>
        <p className="text-sm text-muted-foreground">
          Central, configurable reference-number generation used by every module. Supported tokens: <code>{TOKEN_HELP}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Sequences</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Module</Label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void refresh()}>Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Pad</TableHead>
                  <TableHead>Reset</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No sequences configured</TableCell></TableRow>
                )}
                {filtered.map(r => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer ${selectedId === r.id ? "bg-muted/50" : ""}`}
                  >
                    <TableCell>{r.module_code}</TableCell>
                    <TableCell>{r.entity_type}</TableCell>
                    <TableCell>{r.country_code}</TableCell>
                    <TableCell className="font-mono text-xs">{r.number_pattern}</TableCell>
                    <TableCell>{r.padding_length}</TableCell>
                    <TableCell>{r.reset_frequency}</TableCell>
                    <TableCell>{r.current_number}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Edit Sequence</CardTitle></CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a sequence to edit, preview, or audit.</p>
            ) : (
              <Tabs defaultValue="edit">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview" onClick={() => void previewNext()}>Preview</TabsTrigger>
                  <TabsTrigger value="audit" onClick={() => void loadAudit()}>Audit</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-3 pt-3">
                  <div>
                    <Label>Module / Entity / Country</Label>
                    <Input readOnly value={`${selected.module_code} / ${selected.entity_type} / ${selected.country_code}`} />
                  </div>
                  <div>
                    <Label>Prefix Pattern</Label>
                    <Input
                      defaultValue={selected.prefix_pattern}
                      onBlur={(e) => e.target.value !== selected.prefix_pattern && void saveSelected({ prefix_pattern: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Number Pattern</Label>
                    <Input
                      defaultValue={selected.number_pattern}
                      onBlur={(e) => e.target.value !== selected.number_pattern && void saveSelected({ number_pattern: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Tokens: {TOKEN_HELP}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Padding</Label>
                      <Input
                        type="number"
                        defaultValue={selected.padding_length}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!Number.isNaN(n) && n !== selected.padding_length) void saveSelected({ padding_length: n });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Separator</Label>
                      <Input
                        defaultValue={selected.separator}
                        onBlur={(e) => e.target.value !== selected.separator && void saveSelected({ separator: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reset Frequency</Label>
                    <Select
                      value={selected.reset_frequency}
                      onValueChange={(v) => void saveSelected({ reset_frequency: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESET_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border rounded p-2">
                    <Label>Active</Label>
                    <Switch
                      checked={selected.is_active}
                      onCheckedChange={(v) => void saveSelected({ is_active: v })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">Read-only preview. No number is consumed.</p>
                  <div className="rounded border p-3 font-mono text-sm">{preview ?? "—"}</div>
                  <Button onClick={() => void previewNext()} size="sm">Refresh preview</Button>
                </TabsContent>

                <TabsContent value="audit" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">Latest 100 numbers issued for this sequence.</p>
                  <div className="max-h-80 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Seq</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead>Override</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                        )}
                        {audit.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">{a.generated_number}</TableCell>
                            <TableCell>{a.sequence_value}</TableCell>
                            <TableCell>{a.generated_by ?? "—"}</TableCell>
                            <TableCell className="text-xs">{new Date(a.generated_at).toLocaleString()}</TableCell>
                            <TableCell>
                              {a.is_override ? <Badge variant="destructive">Override</Badge> : <Badge variant="secondary">Auto</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
