import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useMediaAssets, useSaveMediaAsset, useDeleteMediaAsset, useApprovalAction,
  uploadAssetFile, checkExternalLink,
  type CommMediaAsset, type CommAssetCategory, type CommAssetSource, type CommAssetScope,
} from "@/hooks/comm/useMediaAssets";
import { AssetPreview } from "@/components/comm/AssetPreview";
import { Plus, Trash2, Edit, ExternalLink, Upload, CheckCircle2, XCircle, AlertCircle, Send, ThumbsUp, ThumbsDown, Archive, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const APPROVAL_STATUSES = ["all", "draft", "pending_approval", "approved", "rejected", "archived"] as const;
const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:            { label: "Draft",     variant: "outline" },
  pending_approval: { label: "Pending",   variant: "secondary" },
  approved:         { label: "Approved",  variant: "default" },
  rejected:         { label: "Rejected",  variant: "destructive" },
  archived:         { label: "Archived",  variant: "outline" },
};

const CATEGORIES: { value: CommAssetCategory; label: string; group: string }[] = [
  { value: "logo", label: "Company Logo", group: "Branding" },
  { value: "logo_small", label: "Small Logo / Icon", group: "Branding" },
  { value: "favicon", label: "Favicon", group: "Branding" },
  { value: "letterhead_header", label: "Letterhead Header", group: "Documents" },
  { value: "letterhead_footer", label: "Letterhead Footer", group: "Documents" },
  { value: "signature", label: "Authorized Signature", group: "Documents" },
  { value: "stamp", label: "Company Stamp", group: "Documents" },
  { value: "seal", label: "Company Seal", group: "Documents" },
  { value: "qr_code", label: "QR Code", group: "Documents" },
  { value: "watermark", label: "Watermark", group: "Documents" },
  { value: "certificate_background", label: "Certificate Background", group: "Documents" },
  { value: "email_header", label: "Email Header", group: "Email" },
  { value: "email_footer", label: "Email Footer", group: "Email" },
  { value: "login_logo", label: "Login Page Logo", group: "Portal" },
  { value: "login_background", label: "Login Background", group: "Portal" },
  { value: "dashboard_banner", label: "Dashboard Banner", group: "Portal" },
  { value: "announcement_banner", label: "Announcement Banner", group: "Portal" },
  { value: "maintenance_banner", label: "Maintenance Banner", group: "Portal" },
  { value: "app_icon", label: "Mobile App Icon", group: "Mobile" },
  { value: "app_splash", label: "Mobile Splash Screen", group: "Mobile" },
  { value: "other", label: "Other", group: "Other" },
];

const GROUPS = ["All", "Branding", "Documents", "Email", "Portal", "Mobile", "Other"];

function emptyDraft(): Partial<CommMediaAsset> {
  return {
    name: "", category: "logo", source: "upload", scope: "global",
    is_active: true, version: 1,
  };
}

export default function MediaLibraryPage() {
  const [groupFilter, setGroupFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<typeof APPROVAL_STATUSES[number]>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const { data: assets = [], isLoading } = useMediaAssets({ activeOnly });
  const saveAsset = useSaveMediaAsset();
  const deleteAsset = useDeleteMediaAsset();
  const approvalAction = useApprovalAction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CommMediaAsset>>(emptyDraft());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{ ok: boolean; status: string } | null>(null);

  const filtered = assets.filter(a => {
    if (groupFilter !== "All" && CATEGORIES.find(c => c.value === a.category)?.group !== groupFilter) return false;
    if (statusFilter !== "all" && a.approval_status !== statusFilter) return false;
    return true;
  });

  const openNew = () => { setDraft(emptyDraft()); setFile(null); setLinkStatus(null); setDialogOpen(true); };
  const openEdit = (a: CommMediaAsset) => { setDraft(a); setFile(null); setLinkStatus(null); setDialogOpen(true); };

  const handleSave = async () => {
    if (!draft.name || !draft.category) { toast.error("Name and category are required"); return; }
    try {
      setUploading(true);
      let payload: Partial<CommMediaAsset> = { ...draft };

      if (draft.source === "upload" && file) {
        const uploaded = await uploadAssetFile(file, draft.category!);
        payload = { ...payload, ...uploaded, external_url: null };
      } else if (draft.source === "external_url") {
        payload.storage_path = null;
      }

      if (!draft.id && draft.source === "upload" && !file) {
        toast.error("Please choose a file to upload");
        setUploading(false);
        return;
      }
      if (draft.source === "external_url" && !payload.external_url) {
        toast.error("Please enter an external URL");
        setUploading(false);
        return;
      }

      await saveAsset.mutateAsync(payload);
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setUploading(false);
    }
  };

  const validateLink = async () => {
    if (!draft.external_url) return;
    setLinkStatus(null);
    const r = await checkExternalLink(draft.external_url);
    setLinkStatus(r);
    setDraft(d => ({ ...d, link_last_status: r.status, link_last_checked_at: new Date().toISOString() }));
  };

  return (
    <div className="min-h-screen w-full bg-muted/30">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Communication Assets &amp; Branding</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Manage official logos, letterheads, signatures, stamps and banners across every Social Security Board touchpoint.
            </p>
          </div>
          <Button onClick={openNew} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> New Asset
          </Button>
        </div>

        {/* Tabs + filters card */}
        <div className="bg-card rounded-xl border shadow-sm">
          <Tabs value={groupFilter} onValueChange={setGroupFilter}>
            <div className="border-b px-2">
              <TabsList className="h-auto bg-transparent p-0 gap-2">
                {GROUPS.map(g => (
                  <TabsTrigger
                    key={g}
                    value={g}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground"
                  >
                    {g}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap p-4">
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPROVAL_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : STATUS_LABELS[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
                  <Label htmlFor="active-only" className="text-sm text-muted-foreground cursor-pointer">Active only</Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "asset" : "assets"}
              </p>
            </div>
          </Tabs>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading assets…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border rounded-xl py-16 text-center">
            <p className="text-sm text-muted-foreground">No assets match the current filters.</p>
            <Button variant="link" onClick={openNew} className="mt-2">Add the first asset</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(asset => {
              const catLabel = CATEGORIES.find(c => c.value === asset.category)?.label ?? asset.category;
              const statusInfo = STATUS_LABELS[asset.approval_status];
              const isApproved = asset.approval_status === "approved";
              const isRejected = asset.approval_status === "rejected";
              return (
                <div
                  key={asset.id}
                  className={`group relative bg-card rounded-xl border overflow-hidden hover:border-primary hover:shadow-md transition-all ${!asset.is_active ? "opacity-70" : ""}`}
                >
                  {/* Preview */}
                  <div className="relative h-44 bg-muted/40 flex items-center justify-center p-6 border-b">
                    <div className="w-32 h-32 bg-background rounded-lg shadow-sm border flex items-center justify-center overflow-hidden">
                      <AssetPreview asset={asset} className="max-h-28 max-w-28" />
                    </div>
                    {asset.is_system_default && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wide">
                        <ShieldCheck className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate" title={asset.name}>
                          {asset.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {catLabel} · v{asset.version}{asset.asset_code ? ` · ${asset.asset_code}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={statusInfo.variant}
                        className={`text-[10px] uppercase tracking-wide font-bold shrink-0 ${isApproved ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" : ""}`}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Meta row — Scope / Source / Usage */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y">
                      <Meta label="Scope" value={asset.scope} />
                      <Meta label="Source" value={asset.source === "upload" ? "Uploaded" : "External"} />
                      <Meta label="Usage" value={asset.usage_location || (asset.module_code ?? "—")} />
                    </div>

                    {isRejected && asset.rejection_reason && (
                      <p className="text-xs text-destructive line-clamp-2">Rejected: {asset.rejection_reason}</p>
                    )}
                    {asset.remarks && !isRejected && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{asset.remarks}</p>
                    )}

                    {/* Primary action row */}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(asset)}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit details
                      </Button>
                      {asset.source === "external_url" && asset.external_url && (
                        <Button size="sm" variant="outline" asChild title="Open external">
                          <a href={asset.external_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      {!asset.is_system_default && (
                        <Button size="sm" variant="outline" title="Delete" onClick={() => { if (confirm(`Delete "${asset.name}"?`)) deleteAsset.mutate(asset.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Workflow actions — only when relevant */}
                    {(asset.approval_status === "draft" || asset.approval_status === "pending_approval" || isRejected || (isApproved && !asset.is_system_default)) && (
                      <div className="flex gap-1.5 flex-wrap pt-1 border-t -mx-4 px-4 pt-3">
                        {asset.approval_status === "draft" && (
                          <Button size="sm" variant="secondary" onClick={() => approvalAction.mutate({ id: asset.id, action: "submit" })}>
                            <Send className="h-3 w-3 mr-1" /> Submit for approval
                          </Button>
                        )}
                        {asset.approval_status === "pending_approval" && (
                          <>
                            <Button size="sm" onClick={() => approvalAction.mutate({ id: asset.id, action: "approve" })}>
                              <ThumbsUp className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => {
                              const reason = prompt("Reason for rejection?");
                              if (reason !== null) approvalAction.mutate({ id: asset.id, action: "reject", reason });
                            }}>
                              <ThumbsDown className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {isRejected && (
                          <Button size="sm" variant="outline" onClick={() => approvalAction.mutate({ id: asset.id, action: "back_to_draft" })}>
                            Back to draft
                          </Button>
                        )}
                        {isApproved && !asset.is_system_default && (
                          <Button size="sm" variant="ghost" onClick={() => approvalAction.mutate({ id: asset.id, action: "archive" })}>
                            <Archive className="h-3 w-3 mr-1" /> Archive
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Asset" : "New Asset"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={draft.name ?? ""} onChange={e => setDraft({ ...draft, name: e.target.value })} maxLength={100} />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={draft.category} onValueChange={v => setDraft({ ...draft, category: v as CommAssetCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={draft.scope} onValueChange={v => setDraft({ ...draft, scope: v as CommAssetScope })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global default</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="location">Location / Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={draft.source} onValueChange={v => setDraft({ ...draft, source: v as CommAssetSource })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">Upload File</SelectItem>
                    <SelectItem value="external_url">External URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.source === "upload" ? (
              <div>
                <Label>File {draft.id && "(leave empty to keep existing)"}</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf,.svg,.webp"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(1)} KB</p>}
              </div>
            ) : (
              <div>
                <Label>External URL</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={draft.external_url ?? ""}
                    onChange={e => setDraft({ ...draft, external_url: e.target.value })}
                    placeholder="https://cdn.example.com/logo.png"
                  />
                  <Button type="button" variant="outline" onClick={validateLink}>Validate</Button>
                </div>
                {linkStatus && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${linkStatus.ok ? "text-green-600" : "text-destructive"}`}>
                    {linkStatus.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    Link {linkStatus.status}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Asset Code</Label>
                <Input value={draft.asset_code ?? ""} onChange={e => setDraft({ ...draft, asset_code: e.target.value || null })} placeholder="e.g. SSB-MAIN-LOGO" />
              </div>
              <div>
                <Label>Module Code</Label>
                <Input value={draft.module_code ?? ""} onChange={e => setDraft({ ...draft, module_code: e.target.value || null })} placeholder="e.g. LEGAL, BENEFITS" />
              </div>
              <div>
                <Label>Department Code</Label>
                <Input value={draft.department_code ?? ""} onChange={e => setDraft({ ...draft, department_code: e.target.value || null })} placeholder="e.g. LEGAL, FINANCE" />
              </div>
              <div>
                <Label>Usage Location</Label>
                <Input value={draft.usage_location ?? ""} onChange={e => setDraft({ ...draft, usage_location: e.target.value })} placeholder="e.g. Payslip, Letterhead" />
              </div>
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={draft.effective_from ?? ""} onChange={e => setDraft({ ...draft, effective_from: e.target.value || null })} />
              </div>
              <div>
                <Label>Effective To</Label>
                <Input type="date" value={draft.effective_to ?? ""} onChange={e => setDraft({ ...draft, effective_to: e.target.value || null })} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={draft.expiry_date ?? ""} onChange={e => setDraft({ ...draft, expiry_date: e.target.value || null })} />
              </div>
            </div>

            <div>
              <Label>Remarks</Label>
              <Textarea value={draft.remarks ?? ""} onChange={e => setDraft({ ...draft, remarks: e.target.value })} maxLength={250} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="active" checked={draft.is_active ?? true} onCheckedChange={v => setDraft({ ...draft, is_active: v })} />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex items-start gap-2 p-3 rounded bg-muted text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>For official payroll and HR documents (logos, letterheads, signatures, stamps), upload files. External URLs are recommended only for non-critical banners and marketing assets.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "Saving…" : <><Upload className="h-4 w-4 mr-2" />Save Asset</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide">{label}</span>
      <span className="text-xs font-medium text-foreground truncate" title={value}>{value || "—"}</span>
    </div>
  );
}
