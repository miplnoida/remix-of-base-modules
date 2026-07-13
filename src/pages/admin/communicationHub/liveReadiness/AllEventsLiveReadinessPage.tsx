/**
 * EPIC CH-LIVE-ALL-1 — All Events Live Readiness.
 * Route: /admin/communication-hub/live-readiness/all-events
 *
 * Read-only inventory of every mapped Communication Hub event with
 * eligibility for controlled `live_manual_only`. Supports individual and
 * bulk controlled promotion; NEVER sends email, NEVER changes global gates,
 * NEVER enables cron / bulk / auto-live / external send.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "../components/CommunicationHubWorkspaceShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck, RefreshCcw, Rocket, ExternalLink, Loader2, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadAllEventsReadiness,
  promoteEventToLiveManual,
  type ReadinessRow,
} from "./allEventsLiveReadinessService";

const TYPED_INDIVIDUAL = "PROMOTE EVENT TO CONTROLLED LIVE";
const TYPED_BULK = "PROMOTE ELIGIBLE EVENTS TO CONTROLLED LIVE";

type StatusFilter = "all" | "eligible" | "blocked" | "already_live" | "high_risk";
type MissingFilter = "any" | "missing_template" | "missing_sender" | "missing_send_policy" | "missing_review_policy";

export default function AllEventsLiveReadinessPage() {
  const [rows, setRows] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [missingFilter, setMissingFilter] = useState<MissingFilter>("any");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [detailsRow, setDetailsRow] = useState<ReadinessRow | null>(null);
  const [promoteRow, setPromoteRow] = useState<ReadinessRow | null>(null);
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteTyped, setPromoteTyped] = useState("");
  const [promoting, setPromoting] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkTyped, setBulkTyped] = useState("");
  const [bulkIncludeHighRisk, setBulkIncludeHighRisk] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ key: string; ok: boolean; error?: string }>>([]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await loadAllEventsReadiness();
      setRows(data);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message ?? "Failed to load readiness");
      setError(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, []);

  const modules = useMemo(() => Array.from(new Set(rows.map((r) => r.module_code))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (moduleFilter !== "all" && r.module_code !== moduleFilter) return false;
      if (statusFilter === "eligible" && !r.eligible) return false;
      if (statusFilter === "blocked" && r.eligible) return false;
      if (statusFilter === "already_live" && r.live_control_status !== "live_manual_only") return false;
      if (statusFilter === "high_risk" && !r.is_high_risk) return false;
      if (missingFilter === "missing_template" && r.template_mapped && r.template_version_ok) return false;
      if (missingFilter === "missing_sender" && r.sender_mapped && r.sender_enabled) return false;
      if (missingFilter === "missing_send_policy" && r.send_policy_exists) return false;
      if (missingFilter === "missing_review_policy" && r.review_policy_exists) return false;
      return true;
    });
  }, [rows, moduleFilter, statusFilter, missingFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    eligible: rows.filter((r) => r.eligible).length,
    live: rows.filter((r) => r.live_control_status === "live_manual_only").length,
    blocked: rows.filter((r) => !r.eligible).length,
    highRisk: rows.filter((r) => r.is_high_risk).length,
  }), [rows]);

  const bulkCandidates = useMemo(() => {
    return rows.filter((r) =>
      selected.has(r.key) &&
      r.eligible &&
      r.live_control_status !== "live_manual_only" &&
      (bulkIncludeHighRisk || !r.is_high_risk),
    );
  }, [rows, selected, bulkIncludeHighRisk]);

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function selectVisibleEligible() {
    const next = new Set(selected);
    for (const r of filtered) if (r.eligible && r.live_control_status !== "live_manual_only") next.add(r.key);
    setSelected(next);
  }
  function clearSelection() { setSelected(new Set()); }

  async function runPromote() {
    if (!promoteRow) return;
    if (promoteTyped !== TYPED_INDIVIDUAL) {
      toast.error(`Type exactly: ${TYPED_INDIVIDUAL}`); return;
    }
    if (promoteReason.trim().length < 8) {
      toast.error("Reason required (min 8 chars)"); return;
    }
    setPromoting(true);
    try {
      const res = await promoteEventToLiveManual({
        moduleCode: promoteRow.module_code,
        eventCode: promoteRow.event_code,
        reason: promoteReason.trim(),
        typedConfirmation: promoteTyped,
        riskLevel: promoteRow.risk_level,
      });
      if (!res.ok) toast.error(`Promotion refused: ${res.error}`);
      else {
        toast.success(`${promoteRow.module_code}/${promoteRow.event_code} → live_manual_only`);
        setPromoteRow(null);
        setPromoteReason(""); setPromoteTyped("");
        await reload();
      }
    } finally { setPromoting(false); }
  }

  async function runBulkPromote() {
    if (bulkTyped !== TYPED_BULK) { toast.error(`Type exactly: ${TYPED_BULK}`); return; }
    if (bulkReason.trim().length < 8) { toast.error("Reason required (min 8 chars)"); return; }
    if (bulkCandidates.length === 0) { toast.error("No eligible selected events."); return; }
    setBulkRunning(true);
    setBulkResults([]);
    const out: Array<{ key: string; ok: boolean; error?: string }> = [];
    for (const r of bulkCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const res = await promoteEventToLiveManual({
        moduleCode: r.module_code,
        eventCode: r.event_code,
        reason: `${bulkReason.trim()} [bulk]`,
        typedConfirmation: `ENABLE live_manual_only FOR ${r.module_code}/${r.event_code}`,
        riskLevel: r.risk_level,
      });
      out.push({ key: r.key, ok: res.ok, error: res.error });
    }
    setBulkResults(out);
    setBulkRunning(false);
    const okCount = out.filter((x) => x.ok).length;
    if (okCount === out.length) toast.success(`Promoted ${okCount} event(s) to live_manual_only`);
    else toast.message(`Promoted ${okCount}/${out.length} — see results panel`);
    await reload();
  }

  function statusBadge(r: ReadinessRow) {
    if (r.eligible && r.live_control_status === "live_manual_only")
      return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Live-ready</Badge>;
    if (r.eligible) return <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" />Eligible</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
  }

  return (
    <CommunicationHubWorkspaceShell
      title="All Events Live Readiness"
      purpose="Inventory of every mapped Communication Hub event and its readiness for controlled live-manual send."
      risk="high-risk"
      quickLinks={[
        { label: "Communication Test & Diagnostics", href: "/admin/communication-hub/test-diagnostics" },
        { label: "Governance & Live Control", href: "/admin/communication-hub/governance" },
        { label: "Send Policies", href: "/admin/communication-hub/governance/send-policies" },
        { label: "Recipient Control Center", href: "/admin/communication-hub/recipient-control" },
        { label: "Trace Center", href: "/admin/communication-hub/traces" },
      ]}
    >
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Controlled promotion only</AlertTitle>
        <AlertDescription className="text-xs">
          Promotion here sets a single per-event flag (<code>live_manual_only</code>). It does <b>not</b> enable auto-live,
          cron, bulk, external recipients, or global live gates. Every real send still requires manual typed confirmation
          in Test &amp; Diagnostics, plus Recipient Control Center + master live gate to be open server-side.
        </AlertDescription>
      </Alert>

      <CommunicationHubSectionCard title="Summary" description="Portfolio view across modules">
        <div className="grid gap-2 sm:grid-cols-5">
          {[
            { label: "Total events", v: stats.total },
            { label: "Eligible", v: stats.eligible, cls: "text-emerald-600" },
            { label: "Already live-manual", v: stats.live, cls: "text-green-600" },
            { label: "Blocked", v: stats.blocked, cls: "text-destructive" },
            { label: "High risk", v: stats.highRisk, cls: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border p-3">
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.cls ?? ""}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard title="Filters">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="eligible">Eligible</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="already_live">Already live-manual</SelectItem>
                <SelectItem value="high_risk">High risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Missing</Label>
            <Select value={missingFilter} onValueChange={(v) => setMissingFilter(v as MissingFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="missing_template">Missing template</SelectItem>
                <SelectItem value="missing_sender">Missing sender</SelectItem>
                <SelectItem value="missing_send_policy">Missing send policy</SelectItem>
                <SelectItem value="missing_review_policy">Missing review policy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={selectVisibleEligible} disabled={loading || filtered.length === 0}>
              Select visible eligible
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selected.size === 0}>
              Clear
            </Button>
          </div>
        </div>
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title={`Events (${filtered.length}${selected.size ? ` · ${selected.size} selected` : ""})`}
        description="Table of every mapped event and its readiness."
      >
        <div className="mb-2 flex flex-wrap gap-2 justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {selected.size > 0
              ? `${bulkCandidates.length} of ${selected.size} selected are eligible for bulk promotion (high-risk ${bulkIncludeHighRisk ? "included" : "excluded"}).`
              : "Select rows to enable bulk promotion."}
          </div>
          <Button
            size="sm"
            onClick={() => { setBulkOpen(true); setBulkReason(""); setBulkTyped(""); setBulkResults([]); }}
            disabled={selected.size === 0}
          >
            <Rocket className="h-3.5 w-3.5 mr-1" /> Bulk promote eligible…
          </Button>
        </div>

        {(() => {
          const columns: HubTableColumn<ReadinessRow>[] = [
            {
              key: "select",
              header: "",
              sticky: "left",
              minWidth: 36,
              cell: (r) => (
                <Checkbox
                  checked={selected.has(r.key)}
                  onCheckedChange={() => toggleRow(r.key)}
                  aria-label={`Select ${r.module_code}/${r.event_code}`}
                />
              ),
            },
            {
              key: "module_event",
              header: "Module / Event",
              sortable: true,
              sortValue: (r) => `${r.module_code}:${r.event_code}`,
              cell: (r) => (
                <div className="font-mono text-[11px]">
                  <div>{r.module_code} / {r.event_code}</div>
                  <div className="text-muted-foreground">{r.event_name}</div>
                  {r.is_high_risk && (
                    <Badge variant="outline" className="mt-1">
                      <ShieldAlert className="h-3 w-3 mr-1" />high risk
                    </Badge>
                  )}
                </div>
              ),
            },
            {
              key: "template",
              header: "Template",
              sortable: true,
              sortValue: (r) => (r.template_mapped ? (r.template_version_ok ? 2 : 1) : 0),
              cell: (r) => (
                <div className="text-xs">
                  {r.template_mapped
                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />{r.template_code} v{r.template_version_no ?? "?"}</span>
                    : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />missing</span>}
                  {!r.template_version_ok && r.template_mapped && (
                    <div className="text-[10px] text-amber-600">version not approved</div>
                  )}
                </div>
              ),
            },
            {
              key: "sender",
              header: "Sender",
              sortable: true,
              sortValue: (r) => (r.sender_mapped ? (r.sender_enabled ? 2 : 1) : 0),
              cell: (r) => (
                <div className="text-xs">
                  {r.sender_mapped
                    ? <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className={`h-3 w-3 ${r.sender_enabled ? "text-green-600" : "text-amber-600"}`} />
                        {r.sender_enabled ? "enabled" : "disabled"}
                      </span>
                    : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />missing</span>}
                  {r.sender_mapped && !r.sender_domain_verified && (
                    <div className="text-[10px] text-amber-600">domain unverified</div>
                  )}
                </div>
              ),
            },
            {
              key: "send_policy",
              header: "Send policy",
              sortable: true,
              sortValue: (r) => (r.send_policy_exists ? (r.send_policy_approved ? 2 : 1) : 0),
              cell: (r) => (
                <div className="text-xs">
                  {r.send_policy_exists
                    ? <span className={`inline-flex items-center gap-1 ${r.send_policy_approved ? "" : "text-amber-600"}`}>
                        <CheckCircle2 className="h-3 w-3" />{r.send_policy_approved ? "approved" : "unapproved"}
                      </span>
                    : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />missing</span>}
                </div>
              ),
            },
            {
              key: "review",
              header: "Review",
              sortable: true,
              sortValue: (r) => (r.review_policy_exists ? (r.review_approval_ok ? 2 : 1) : 0),
              cell: (r) => (
                <div className="text-xs">
                  {r.review_policy_exists
                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 className={`h-3 w-3 ${r.review_approval_ok ? "text-green-600" : "text-amber-600"}`} />ok</span>
                    : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />missing</span>}
                </div>
              ),
            },
            {
              key: "live_status",
              header: "Live status",
              sortable: true,
              sortValue: (r) => r.live_control_status ?? "",
              cell: (r) => (
                <Badge variant={r.live_control_status === "live_manual_only" ? "default" : "outline"}>
                  {r.live_control_status ?? "no-row"}
                </Badge>
              ),
            },
            {
              key: "eligibility",
              header: "Eligibility",
              sortable: true,
              sortValue: (r) => (r.eligible ? (r.live_control_status === "live_manual_only" ? 2 : 1) : 0),
              cell: (r) => statusBadge(r),
            },
            {
              key: "blockers",
              header: "Blockers",
              sortable: true,
              sortValue: (r) => r.blockers.length,
              cell: (r) => (
                <div className="text-[10px] max-w-[22ch]">
                  {r.blockers.length === 0
                    ? <span className="text-muted-foreground">—</span>
                    : <span className="text-destructive break-words">{r.blockers.slice(0, 2).join(", ")}{r.blockers.length > 2 ? ` +${r.blockers.length - 2}` : ""}</span>}
                </div>
              ),
            },
            {
              key: "actions",
              header: <span className="text-right block">Actions</span>,
              sticky: "right",
              cell: (r) => (
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setDetailsRow(r)}>Details</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!r.eligible || r.live_control_status === "live_manual_only"}
                    onClick={() => { setPromoteRow(r); setPromoteReason(""); setPromoteTyped(""); }}
                  >
                    <Rocket className="h-3.5 w-3.5 mr-1" /> Promote
                  </Button>
                </div>
              ),
            },
          ];
          return (
            <CommunicationHubDataTable
              screenKey="comm-hub.live-readiness.all-events"
              columns={columns}
              rows={filtered}
              getRowKey={(r) => r.key}
              loading={loading}
              error={error ?? null}
              onRetry={() => void reload()}
              defaultSort={{ key: "module_event", direction: "asc" }}
              emptyMessage="No communication events match the current filters."
            />
          );
        })()}
      </CommunicationHubSectionCard>

      {/* Details drawer */}
      <Dialog open={!!detailsRow} onOpenChange={(o) => !o && setDetailsRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailsRow?.module_code} / {detailsRow?.event_code}</DialogTitle>
            <DialogDescription>{detailsRow?.event_name}</DialogDescription>
          </DialogHeader>
          {detailsRow && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Channel:</span> {detailsRow.channel}</div>
                <div><span className="text-muted-foreground">Risk:</span> {detailsRow.risk_level}{detailsRow.is_high_risk ? " (high)" : ""}</div>
                <div><span className="text-muted-foreground">Template:</span> {detailsRow.template_code ?? "—"} v{detailsRow.template_version_no ?? "?"} ({detailsRow.template_status ?? "?"})</div>
                <div><span className="text-muted-foreground">Live control:</span> {detailsRow.live_control_status ?? "no-row"}</div>
                <div><span className="text-muted-foreground">Sender:</span> {detailsRow.sender_mapped ? (detailsRow.sender_enabled ? "enabled" : "disabled") : "missing"} {detailsRow.sender_domain_verified ? "· domain verified" : "· domain unverified"}</div>
                <div><span className="text-muted-foreground">Provider:</span> {detailsRow.provider_configured ? "configured" : "not configured"}</div>
              </div>
              <div>
                <div className="font-medium">Blockers</div>
                {detailsRow.blockers.length === 0
                  ? <div className="text-muted-foreground">None — event is eligible.</div>
                  : <ul className="list-disc ml-4">{detailsRow.blockers.map((b) => <li key={b} className="text-destructive">{b}</li>)}</ul>}
              </div>
              <div>
                <div className="font-medium">Required tokens</div>
                <div className="font-mono text-[11px]">{detailsRow.required_tokens.join(", ") || "—"}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline" size="sm"><Link to="/admin/communication-hub/test-diagnostics">Open Test &amp; Diagnostics <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/admin/communication-hub/design">Event Mapping <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/admin/communication-hub/governance/send-policies">Send Policy <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/admin/communication-hub/governance">Governance / Review / Live Control <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/admin/communication-hub/senders">Sender Profile <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual promote dialog */}
      <Dialog open={!!promoteRow} onOpenChange={(o) => !o && setPromoteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to live_manual_only</DialogTitle>
            <DialogDescription>
              {promoteRow && (<><code>{promoteRow.module_code}/{promoteRow.event_code}</code> · risk {promoteRow.risk_level}</>)}
            </DialogDescription>
          </DialogHeader>
          {promoteRow?.is_high_risk && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>High-risk event</AlertTitle>
              <AlertDescription className="text-xs">
                This event is classified as high-risk. Confirm business approval before promoting.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason (required, audited)</Label>
              <Textarea rows={2} value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type exactly: <code>{TYPED_INDIVIDUAL}</code></Label>
              <Input value={promoteTyped} onChange={(e) => setPromoteTyped(e.target.value)} placeholder={TYPED_INDIVIDUAL} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPromoteRow(null)} disabled={promoting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => void runPromote()}
              disabled={promoting || promoteTyped !== TYPED_INDIVIDUAL || promoteReason.trim().length < 8}
            >
              {promoting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk promote dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o && !bulkRunning) setBulkOpen(false); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk promotion to live_manual_only</DialogTitle>
            <DialogDescription>
              Promotes only eligible selected events. Sends no email. Changes no global gates.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scope</AlertTitle>
            <AlertDescription className="text-xs">
              Selected: {selected.size} · Eligible for bulk: {bulkCandidates.length}
              {bulkIncludeHighRisk ? " (high-risk included)" : " (high-risk excluded)"}.
              Ineligible selections will be skipped.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={bulkIncludeHighRisk} onCheckedChange={(v) => setBulkIncludeHighRisk(!!v)} />
              Include high-risk events (requires explicit business approval)
            </label>
            <div>
              <Label className="text-xs">Reason (required, audited)</Label>
              <Textarea rows={2} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type exactly: <code>{TYPED_BULK}</code></Label>
              <Input value={bulkTyped} onChange={(e) => setBulkTyped(e.target.value)} placeholder={TYPED_BULK} />
            </div>
            {bulkResults.length > 0 && (
              <div className="rounded-md border divide-y max-h-60 overflow-auto">
                {bulkResults.map((r) => (
                  <div key={r.key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="font-mono">{r.key}</span>
                    <span className={r.ok ? "text-green-600" : "text-destructive"}>{r.ok ? "promoted" : `refused: ${r.error}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkRunning}>Close</Button>
            <Button
              variant="destructive"
              onClick={() => void runBulkPromote()}
              disabled={bulkRunning || bulkTyped !== TYPED_BULK || bulkReason.trim().length < 8 || bulkCandidates.length === 0}
            >
              {bulkRunning && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Promote {bulkCandidates.length} eligible
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommunicationHubWorkspaceShell>
  );
}
