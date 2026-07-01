/**
 * Configuration Center — Phase 5 (first working slice).
 *
 * First consumer of the generic `core_configuration_assignment` engine.
 * Provides:
 *   - Assignment grid filtered by domain / business event / resource type
 *   - Add / disable / delete rows with scope + rule_set editor
 *   - Runtime "Test resolve" preview that renders the exact trace
 *
 * The Communication domain is the first live domain; other domains appear as
 * selectable but empty until their consumers land in Phase 6/7.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, Play, Trash2, Info, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  resolveConfiguration,
  SCOPE_PRECEDENCE,
  type ScopeLevel,
  type ResolveResult,
  type AssignmentRow,
} from "@/lib/configuration/resolver";

interface DomainDef {
  code: string;
  label: string;
  description: string;
  /** Deep links to existing admin screens that manage the underlying resources. */
  resourceLinks: { label: string; href: string; description?: string }[];
}

const DOMAINS: DomainDef[] = [
  {
    code: "communication",
    label: "Communication",
    description:
      "Assign templates, letterheads, signatures, media and text blocks by scope and business event.",
    resourceLinks: [
      { label: "Notification Templates", href: "/admin/notification-templates", description: "Template library shared across modules" },
      { label: "Text Blocks",            href: "/admin/org/library/text-blocks" },
      { label: "Letterheads",            href: "/admin/org/assets/letterheads" },
      { label: "Media Library",          href: "/admin/org/assets/media" },
      { label: "Portal Branding",        href: "/admin/org/assets/portal-branding" },
      { label: "Document Assets",        href: "/admin/org/assets/document-assets" },
    ],
  },
  {
    code: "workflow",
    label: "Workflow",
    description:
      "Bind workflow templates and stage rules to organization, module, department, or user scope.",
    resourceLinks: [
      { label: "Workflow Management",       href: "/admin/workflow-management",       description: "Central workflow designer, runs, SLA, approvals" },
      { label: "Legal Workflow Admin",      href: "/legal/admin/workflow",            description: "Legal-specific workflow bindings" },
    ],
  },
  {
    code: "numbering",
    label: "Numbering",
    description:
      "Assign numbering rules for cases, notices, letters, templates, text blocks, workflow items and other coded records.",
    resourceLinks: [
      { label: "Numbering Rules",         href: "/admin/numbering",                     description: "Central number-sequence rules + reference sequences" },
      { label: "Reference Sequences",     href: "/admin/numbering?tab=sequences" },
    ],
  },
  {
    code: "branding",
    label: "Branding",
    description:
      "Control reusable brand assets. Runtime resolves branding through the assignment engine — do not duplicate assets in modules.",
    resourceLinks: [
      { label: "Letterheads",             href: "/admin/org/assets/letterheads" },
      { label: "Media Library",           href: "/admin/org/assets/media" },
      { label: "Portal Branding",         href: "/admin/org/assets/portal-branding" },
      { label: "Document Assets",         href: "/admin/org/assets/document-assets" },
      { label: "Asset Categories",        href: "/admin/org/assets/categories" },
    ],
  },
  {
    code: "reporting",
    label: "Reporting",
    description:
      "Configure report templates: output format, module context, schedule mode, roles, and branding.",
    resourceLinks: [
      { label: "Notification Templates (Report layouts)", href: "/admin/notification-templates" },
    ],
  },
  {
    code: "ai",
    label: "AI",
    description:
      "AI use-case configuration: prompt binding, approval, allowed roles, audit and data-masking flags. Runtime execution ships when a use-case is enabled.",
    resourceLinks: [],
  },
];

const RESOURCE_TYPES_BY_DOMAIN: Record<string, string[]> = {
  communication: ["TEMPLATE", "MEDIA_ASSET", "LETTERHEAD", "SIGNATURE", "TEXT_BLOCK"],
  workflow:      ["WORKFLOW_TEMPLATE", "STAGE_RULE", "SLA_POLICY"],
  numbering:     ["NUMBER_SEQUENCE"],
  branding:      ["LETTERHEAD", "LOGO", "PORTAL_THEME", "DOCUMENT_ASSET"],
  reporting:     ["REPORT_TEMPLATE"],
  ai:            ["AI_USE_CASE", "AI_PROMPT"],
};

const CONFIG_QK = (domain: string) => ["config_assignments", domain] as const;

export default function ConfigurationCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDomain = searchParams.get("domain") ?? "communication";
  const [domain, setDomain] = useState(initialDomain);
  useEffect(() => {
    const p = searchParams.get("domain");
    if (p && p !== domain) setDomain(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const setDomainAndUrl = (d: string) => {
    setDomain(d);
    const next = new URLSearchParams(searchParams);
    next.set("domain", d);
    setSearchParams(next, { replace: true });
  };
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: CONFIG_QK(domain),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_configuration_assignment")
        .select("*")
        .eq("domain", domain)
        .order("scope_level", { ascending: true })
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (row: AssignmentRow) => {
      const { error } = await supabase
        .from("core_configuration_assignment")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment updated");
      qc.invalidateQueries({ queryKey: CONFIG_QK(domain) });
    },
    onError: (e: Error) => toast.error("Failed to update", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("core_configuration_assignment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment deleted");
      qc.invalidateQueries({ queryKey: CONFIG_QK(domain) });
    },
    onError: (e: Error) => toast.error("Failed to delete", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Configuration Center</h2>
          <p className="text-sm text-muted-foreground">
            Single place where scope decides which resource applies. Communication is live;
            other domains reserve their slot for phased rollout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewAssignmentDialog domain={domain} onCreated={() => qc.invalidateQueries({ queryKey: CONFIG_QK(domain) })} />
          <ResolvePreviewDialog domain={domain} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button
            key={d.code}
            onClick={() => setDomainAndUrl(d.code)}
            className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
              domain === d.code ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {(() => {
        const def = DOMAINS.find((d) => d.code === domain)!;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{def.label} — resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{def.description}</p>
              {def.resourceLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {def.resourceLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="inline-flex flex-col rounded-md border bg-background px-3 py-2 text-xs hover:bg-muted transition-colors"
                      title={l.description ?? ""}
                    >
                      <span className="font-medium">{l.label}</span>
                      {l.description && <span className="text-muted-foreground">{l.description}</span>}
                    </a>
                  ))}
                </div>
              ) : domain === "ai" ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>AI configuration is metadata-only.</AlertTitle>
                  <AlertDescription>
                    Register AI use-cases as assignments below. Each rule_set should carry:
                    <code className="ml-1">{`{ useCase, promptRef, enabled, approvalRequired, allowedRoles, auditRequired, dataMaskingRequired, outputType }`}</code>.
                    Runtime execution is wired only when a use-case is enabled and its prompt exists in the notification-template library.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments — domain: <code>{domain}</code></CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
            </div>
          ) : rows.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No assignments yet.</AlertTitle>
              <AlertDescription>
                Add a GLOBAL fallback first, then layer more specific tiers (ORG, MODULE, DEPARTMENT, LOCATION, WORKFLOW, USER) as needed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Business Event</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Rule Set</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.scope_level}</div>
                        {Object.keys(r.scope_ref ?? {}).length > 0 && (
                          <div className="text-xs text-muted-foreground font-mono">{JSON.stringify(r.scope_ref)}</div>
                        )}
                      </TableCell>
                      <TableCell><code className="text-xs">{r.business_event ?? "*"}</code></TableCell>
                      <TableCell>
                        <div className="text-xs">{r.resource_type}</div>
                        <div className="text-xs text-muted-foreground font-mono">{JSON.stringify(r.resource_ref)}</div>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <code className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(r.rule_set)}</code>
                      </TableCell>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "active" : "disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(r)}>
                          {r.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm("Delete this assignment?")) remove.mutate(r.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope precedence (most specific wins)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm space-y-1 list-decimal pl-6">
            {SCOPE_PRECEDENCE.map((t) => <li key={t}><code>{t}</code></li>)}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ----------------------------- New assignment -----------------------------

function NewAssignmentDialog({ domain, onCreated }: { domain: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>("GLOBAL");
  const [businessEvent, setBusinessEvent] = useState("");
  const [resourceType, setResourceType] = useState(RESOURCE_TYPES_BY_DOMAIN[domain]?.[0] ?? "");
  const [scopeRef, setScopeRef] = useState("{}");
  const [resourceRef, setResourceRef] = useState('{"code":""}');
  const [ruleSet, setRuleSet] = useState("{}");
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resourceTypes = RESOURCE_TYPES_BY_DOMAIN[domain] ?? [];

  const submit = async () => {
    let parsedScope: Record<string, unknown>, parsedResource: Record<string, unknown>, parsedRule: Record<string, unknown>;
    try {
      parsedScope = JSON.parse(scopeRef || "{}");
      parsedResource = JSON.parse(resourceRef || "{}");
      parsedRule = JSON.parse(ruleSet || "{}");
    } catch (e) {
      toast.error("Invalid JSON", { description: (e as Error).message });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("core_configuration_assignment").insert([{
      domain,
      business_event: businessEvent.trim() || null,
      scope_level: scopeLevel,
      scope_ref: parsedScope as never,
      resource_type: resourceType,
      resource_ref: parsedResource as never,
      rule_set: parsedRule as never,
      priority,
      notes: notes || null,
      is_active: true,
    }]);
    setSaving(false);
    if (error) {
      toast.error("Failed to create", { description: error.message });
      return;
    }
    toast.success("Assignment created");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> New Assignment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New assignment — {domain}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Scope level</Label>
            <Select value={scopeLevel} onValueChange={(v) => setScopeLevel(v as ScopeLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_PRECEDENCE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Resource type</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {resourceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Business event (optional — blank = wildcard)</Label>
            <Input value={businessEvent} onChange={(e) => setBusinessEvent(e.target.value)} placeholder="e.g. legal.notice.issued" />
          </div>
          <div className="col-span-2">
            <Label>Scope ref (JSON)</Label>
            <Textarea rows={2} value={scopeRef} onChange={(e) => setScopeRef(e.target.value)} placeholder='{"module_code":"LEGAL"}' className="font-mono text-xs" />
          </div>
          <div className="col-span-2">
            <Label>Resource ref (JSON)</Label>
            <Textarea rows={2} value={resourceRef} onChange={(e) => setResourceRef(e.target.value)} placeholder='{"code":"legal_notice_v1"}' className="font-mono text-xs" />
          </div>
          <div className="col-span-2">
            <Label>Rule set (JSON)</Label>
            <Textarea rows={2} value={ruleSet} onChange={(e) => setRuleSet(e.target.value)} placeholder='{"channel":"EMAIL","language":"en"}' className="font-mono text-xs" />
          </div>
          <div>
            <Label>Priority</Label>
            <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------- Resolve preview -----------------------------

function ResolvePreviewDialog({ domain }: { domain: string }) {
  const [open, setOpen] = useState(false);
  const [businessEvent, setBusinessEvent] = useState("");
  const [resourceType, setResourceType] = useState(RESOURCE_TYPES_BY_DOMAIN[domain]?.[0] ?? "");
  const [hints, setHints] = useState({
    userId: "", workflowCode: "", stageCode: "", locationId: "",
    departmentCode: "", moduleCode: "", organizationId: "",
  });
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const scopeHints = Object.fromEntries(
        Object.entries(hints).filter(([, v]) => v.trim() !== ""),
      );
      const r = await resolveConfiguration({
        domain, businessEvent, resourceType, scopeHints,
      });
      setResult(r);
    } catch (e) {
      toast.error("Resolve failed", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Play className="h-4 w-4" /> Test Resolve</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Runtime resolution preview — {domain}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Business event</Label>
            <Input value={businessEvent} onChange={(e) => setBusinessEvent(e.target.value)} placeholder="legal.notice.issued" />
          </div>
          <div>
            <Label>Resource type</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(RESOURCE_TYPES_BY_DOMAIN[domain] ?? []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(Object.keys(hints) as (keyof typeof hints)[]).map((k) => (
            <div key={k}>
              <Label className="capitalize">{k.replace(/([A-Z])/g, " $1")}</Label>
              <Input value={hints[k]} onChange={(e) => setHints((h) => ({ ...h, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={run} disabled={running || !businessEvent || !resourceType}>
            {running && <Loader2 className="h-4 w-4 animate-spin" />} Resolve
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {result.winner ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Resolved at tier: {result.trace.find((t) => t.matched)?.tier}</AlertTitle>
                <AlertDescription>
                  <div className="text-xs mt-1">
                    <div>resource_type: <code>{result.winner.resource_type}</code></div>
                    <div>resource_ref: <code>{JSON.stringify(result.winner.resource_ref)}</code></div>
                    <div>rule_set: <code>{JSON.stringify(result.winner.rule_set)}</code></div>
                    <div>priority: {result.winner.priority}</div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>No match at any tier</AlertTitle>
                <AlertDescription>
                  Add at minimum a GLOBAL row for this (domain, business_event, resource_type) triple.
                </AlertDescription>
              </Alert>
            )}
            <div>
              <div className="text-sm font-medium mb-1">Trace</div>
              <div className="border rounded-md divide-y">
                {result.trace.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="font-mono">{t.tier}</span>
                    <span className="text-muted-foreground">{t.reason}</span>
                    <span>
                      {t.matched ? (
                        <Badge>WON · {t.candidates} candidate{t.candidates > 1 ? "s" : ""}</Badge>
                      ) : (
                        <Badge variant="secondary">skip</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
