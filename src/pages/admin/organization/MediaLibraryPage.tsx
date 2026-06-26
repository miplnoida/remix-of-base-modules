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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communication Assets & Branding</h1>
          <p className="text-sm text-muted-foreground">
            Centralized media library for logos, letterheads, signatures, stamps, banners and other branding assets.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Asset</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={groupFilter} onValueChange={setGroupFilter}>
              <TabsList>{GROUPS.map(g => <TabsTrigger key={g} value={g}>{g}</TabsTrigger>)}</TabsList>
            </Tabs>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : STATUS_LABELS[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
                <Label htmlFor="active-only">Active only</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No assets match the current filters.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(asset => {
                const catLabel = CATEGORIES.find(c => c.value === asset.category)?.label ?? asset.category;
                return (
                  <Card key={asset.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AssetPreview asset={asset} className="h-20 w-20 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{asset.name}</h3>
                            {asset.is_system_default && <Badge variant="default" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />Default</Badge>}
                            {!asset.is_active && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{catLabel}{asset.asset_code ? ` · ${asset.asset_code}` : ""}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant={STATUS_LABELS[asset.approval_status].variant} className="text-xs">
                              {STATUS_LABELS[asset.approval_status].label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{asset.source === "upload" ? "Uploaded" : "External"}</Badge>
                            <Badge variant="outline" className="text-xs">{asset.scope}</Badge>
                            <Badge variant="outline" className="text-xs">v{asset.version}</Badge>
                          </div>
                        </div>
                      </div>
                      {asset.rejection_reason && asset.approval_status === "rejected" && (
                        <p className="text-xs text-destructive">Rejected: {asset.rejection_reason}</p>
                      )}
                      {asset.remarks && <p className="text-xs text-muted-foreground line-clamp-2">{asset.remarks}</p>}
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openEdit(asset)}>
                          <Edit className="h-3 w-3 mr-1" />Edit
                        </Button>
                        {asset.approval_status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => approvalAction.mutate({ id: asset.id, action: "submit" })}>
                            <Send className="h-3 w-3 mr-1" />Submit
                          </Button>
                        )}
                        {asset.approval_status === "pending_approval" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => approvalAction.mutate({ id: asset.id, action: "approve" })}>
                              <ThumbsUp className="h-3 w-3 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => {
                              const reason = prompt("Reason for rejection?");
                              if (reason !== null) approvalAction.mutate({ id: asset.id, action: "reject", reason });
                            }}>
                              <ThumbsDown className="h-3 w-3 mr-1" />Reject
                            </Button>
                          </>
                        )}
                        {asset.approval_status === "rejected" && (
                          <Button size="sm" variant="outline" onClick={() => approvalAction.mutate({ id: asset.id, action: "back_to_draft" })}>
                            Back to draft
                          </Button>
                        )}
                        {asset.approval_status === "approved" && !asset.is_system_default && (
                          <Button size="sm" variant="ghost" onClick={() => approvalAction.mutate({ id: asset.id, action: "archive" })}>
                            <Archive className="h-3 w-3" />
                          </Button>
                        )}
                        {asset.source === "external_url" && asset.external_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={asset.external_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {!asset.is_system_default && (
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (confirm(`Delete "${asset.name}"?`)) deleteAsset.mutate(asset.id);
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                <Label>Expiry Date</Label>
                <Input type="date" value={draft.expiry_date ?? ""} onChange={e => setDraft({ ...draft, expiry_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Usage Location</Label>
                <Input value={draft.usage_location ?? ""} onChange={e => setDraft({ ...draft, usage_location: e.target.value })} placeholder="e.g. Payslip, Letterhead" />
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
