import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Loader2, Wand2, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { AssetPickerDialog } from "@/components/comm/AssetPickerDialog";
import { AssetPreview } from "@/components/comm/AssetPreview";
import { WhereUsedButton } from "@/components/comm/WhereUsedDialog";
import { toast } from "sonner";
import type { CommAssetCategory, CommMediaAsset } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

interface SlotSpec {
  label: string;
  category: CommAssetCategory;
  /** canonical asset_code to inherit if no override exists */
  defaultAssetCode: string | null;
  required: boolean;
  note?: string;
}

interface DocSpec {
  name: string;
  comm_type: string;
  slots: SlotSpec[];
}

const DOCUMENTS: DocSpec[] = [
  {
    name: "Payment Receipt", comm_type: "doc_payment_receipt", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Seal",      category: "seal",              defaultAssetCode: "SSB_OFFICIAL_SEAL",        required: true },
      { label: "Signature", category: "signature",         defaultAssetCode: null,                       required: false, note: "Only if receipt requires approval/signature" },
      { label: "QR Code",   category: "qr_code",           defaultAssetCode: "SSB_QR_CENTER_LOGO",       required: true },
    ],
  },
  {
    name: "Contribution Statement", comm_type: "doc_contribution_statement", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Watermark", category: "watermark",         defaultAssetCode: "SSB_WATERMARK_LIGHT",      required: true },
    ],
  },
  {
    name: "Employer Account Statement", comm_type: "doc_employer_statement", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Watermark", category: "watermark",         defaultAssetCode: "SSB_WATERMARK_LIGHT",      required: true },
    ],
  },
  {
    name: "Member Contribution History", comm_type: "doc_member_history", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
    ],
  },
  {
    name: "Benefit Payment Statement", comm_type: "doc_benefit_statement", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Signature", category: "signature",         defaultAssetCode: "BENEFITS_AUTHORISED_SIGNATURE", required: false, note: "Configure approved Benefits signature" },
      { label: "Seal",      category: "seal",              defaultAssetCode: "SSB_OFFICIAL_SEAL",        required: true },
    ],
  },
  {
    name: "Claim Acknowledgement", comm_type: "doc_claim_ack", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Signature", category: "signature",         defaultAssetCode: "CLAIMS_OFFICER_SIGNATURE", required: false, note: "Claims Officer or Dept Manager signature" },
    ],
  },
  {
    name: "Compliance Statement", comm_type: "doc_compliance_stmt", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Seal",      category: "seal",              defaultAssetCode: "SSB_OFFICIAL_SEAL",        required: true },
    ],
  },
  {
    name: "Certificate of Registration", comm_type: "doc_cert_registration", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Seal",      category: "seal",              defaultAssetCode: "SSB_OFFICIAL_SEAL",        required: true },
      { label: "Signature", category: "signature",         defaultAssetCode: "REGISTRATION_AUTHORISED_SIGNATURE", required: true, note: "Registration authorised signature" },
      { label: "QR Code",   category: "qr_code",           defaultAssetCode: "SSB_QR_CENTER_LOGO",       required: true },
      { label: "Watermark", category: "watermark",         defaultAssetCode: "SSB_WATERMARK_LIGHT",      required: true },
    ],
  },
  {
    name: "Certificate of Compliance", comm_type: "doc_cert_compliance", slots: [
      { label: "Logo",      category: "logo",              defaultAssetCode: "SSB_LOGO_MAIN",            required: true },
      { label: "Header",    category: "letterhead_header", defaultAssetCode: "SSB_LETTERHEAD_LOGO",      required: true },
      { label: "Footer",    category: "letterhead_footer", defaultAssetCode: "SSB_STANDARD_PRINT_FOOTER",required: true },
      { label: "Seal",      category: "seal",              defaultAssetCode: "SSB_OFFICIAL_SEAL",        required: true },
      { label: "Signature", category: "signature",         defaultAssetCode: "COMPLIANCE_AUTHORISED_SIGNATURE", required: true, note: "Compliance authorised signature" },
      { label: "QR Code",   category: "qr_code",           defaultAssetCode: "SSB_QR_CENTER_LOGO",       required: true },
      { label: "Watermark", category: "watermark",         defaultAssetCode: "SSB_WATERMARK_LIGHT",      required: true },
    ],
  },
];

type ResolutionSource = "override" | "global_code" | "system_default" | "missing";
type ResolutionStatus = "approved" | "archived" | "missing" | "invalid";

interface Resolution {
  asset: CommMediaAsset | null;
  source: ResolutionSource;
  status: ResolutionStatus;
  overrideMappingId: string | null;
}

function useAssetData() {
  return useQuery({
    queryKey: ["doc-assets-page", "v2"],
    queryFn: async () => {
      const allCats: CommAssetCategory[] = ["logo", "letterhead_header", "letterhead_footer", "seal", "signature", "qr_code", "watermark"];
      const [{ data: assets }, { data: mappings }] = await Promise.all([
        sb.from("comm_media_asset").select("*").in("category", allCats),
        sb.from("comm_asset_mapping")
          .select("id,asset_id,category,communication_type,is_active")
          .in("communication_type", DOCUMENTS.map((d) => d.comm_type)),
      ]);
      return { assets: (assets ?? []) as CommMediaAsset[], mappings: mappings ?? [] };
    },
    staleTime: 30_000,
  });
}

function resolveSlot(
  spec: SlotSpec,
  commType: string,
  assets: CommMediaAsset[],
  mappings: any[],
): Resolution {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const activeMap = mappings.find(
    (m) => m.is_active && m.communication_type === commType && m.category === spec.category,
  );
  if (activeMap) {
    const asset = byId.get(activeMap.asset_id) ?? null;
    if (!asset) return { asset: null, source: "override", status: "invalid", overrideMappingId: activeMap.id };
    if (asset.approval_status === "archived" || !asset.is_active) {
      return { asset, source: "override", status: "archived", overrideMappingId: activeMap.id };
    }
    return { asset, source: "override", status: "approved", overrideMappingId: activeMap.id };
  }
  // global asset_code
  if (spec.defaultAssetCode) {
    const a = assets.find(
      (x) =>
        x.asset_code === spec.defaultAssetCode &&
        x.approval_status === "approved" &&
        x.is_active &&
        x.category === spec.category,
    );
    if (a) return { asset: a, source: "global_code", status: "approved", overrideMappingId: null };
  }
  // system default by category
  const sysd = assets.find(
    (x) =>
      x.category === spec.category &&
      x.is_system_default &&
      x.is_active &&
      x.approval_status === "approved",
  );
  if (sysd) return { asset: sysd, source: "system_default", status: "approved", overrideMappingId: null };
  return { asset: null, source: "missing", status: "missing", overrideMappingId: null };
}

function SourceBadge({ source }: { source: ResolutionSource }) {
  const label =
    source === "override" ? "Document Override" :
    source === "global_code" ? "Global Default (SSB)" :
    source === "system_default" ? "System Default" : "—";
  const variant = source === "override" ? "default" : source === "missing" ? "destructive" : "outline";
  return <Badge variant={variant as any} className="text-[10px]">{label}</Badge>;
}

function StatusBadge({ status, required }: { status: ResolutionStatus; required: boolean }) {
  if (status === "approved") return <Badge variant="outline" className="text-[10px] border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  if (status === "archived") return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Archived</Badge>;
  if (status === "invalid")  return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />Invalid</Badge>;
  return <Badge variant={required ? "destructive" : "outline"} className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />{required ? "Missing (required)" : "Not configured"}</Badge>;
}

function Inner() {
  const { data, isLoading } = useAssetData();
  const qc = useQueryClient();
  const [picker, setPicker] = useState<{ doc: DocSpec; slot: SlotSpec } | null>(null);

  const assets = data?.assets ?? [];
  const mappings = data?.mappings ?? [];

  const resolved = useMemo(() => {
    const m = new Map<string, Resolution>();
    for (const d of DOCUMENTS)
      for (const s of d.slots)
        m.set(`${d.comm_type}|${s.category}`, resolveSlot(s, d.comm_type, assets, mappings));
    return m;
  }, [assets, mappings]);

  const upsertMapping = async (commType: string, category: string, asset_id: string | null, existingId: string | null) => {
    if (asset_id === null) {
      if (existingId) {
        const { error } = await sb.from("comm_asset_mapping").update({ is_active: false }).eq("id", existingId);
        if (error) throw error;
      }
      return;
    }
    if (existingId) {
      const { error } = await sb.from("comm_asset_mapping").update({ asset_id, is_active: true }).eq("id", existingId);
      if (error) throw error;
    } else {
      const { error } = await sb.from("comm_asset_mapping").insert({
        asset_id, category, communication_type: commType, is_active: true, priority: 100,
      });
      if (error) throw error;
    }
  };

  const slotMutation = useMutation({
    mutationFn: async (args: { commType: string; category: string; asset_id: string | null; existingId: string | null }) => {
      await upsertMapping(args.commType, args.category, args.asset_id, args.existingId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-assets-page"] }); toast.success("Slot updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const autoBind = useMutation({
    mutationFn: async () => {
      let fixed = 0, skipped = 0, warned = 0;
      for (const d of DOCUMENTS) for (const s of d.slots) {
        const r = resolved.get(`${d.comm_type}|${s.category}`)!;
        // Replace archived/invalid overrides with approved global default
        const needsReplace = r.source === "override" && (r.status === "archived" || r.status === "invalid");
        const needsBindIfRequired = r.source === "missing" && s.required;
        if (!needsReplace && !needsBindIfRequired) { skipped++; continue; }
        const target = s.defaultAssetCode
          ? assets.find((x) => x.asset_code === s.defaultAssetCode && x.approval_status === "approved" && x.is_active && x.category === s.category)
          : null;
        if (!target) { warned++; continue; }
        await upsertMapping(d.comm_type, s.category, target.id, r.overrideMappingId);
        fixed++;
      }
      return { fixed, skipped, warned };
    },
    onSuccess: ({ fixed, warned }) => {
      qc.invalidateQueries({ queryKey: ["doc-assets-page"] });
      toast.success(`Auto-bind complete — ${fixed} slot(s) fixed${warned ? `, ${warned} still need an approved asset uploaded` : ""}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Auto-bind failed"),
  });

  const summary = useMemo(() => {
    let ok = 0, missing = 0, archived = 0;
    for (const r of resolved.values()) {
      if (r.status === "approved") ok++;
      else if (r.status === "archived" || r.status === "invalid") archived++;
      else missing++;
    }
    return { ok, missing, archived };
  }, [resolved]);

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Document Profiles — Asset Resolver</h1>
            <p className="text-sm text-muted-foreground">
              Branding inherits Document Override → Department Profile → Organization → Approved Global. Only differences are stored as overrides.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-500">{summary.ok} resolved</Badge>
          {summary.archived > 0 && <Badge variant="destructive">{summary.archived} archived</Badge>}
          {summary.missing > 0 && <Badge variant="destructive">{summary.missing} missing</Badge>}
          <Button size="sm" onClick={() => autoBind.mutate()} disabled={autoBind.isPending}>
            {autoBind.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Auto-bind missing assets
          </Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
        <div className="space-y-4">
          {DOCUMENTS.map((d) => (
            <Card key={d.comm_type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {d.name}
                  <Badge variant="outline" className="font-mono text-[10px]">{d.comm_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Asset Slot</TableHead>
                      <TableHead className="w-40">Resolved Asset</TableHead>
                      <TableHead>Inherited From</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-44">Validation</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.slots.map((slot) => {
                      const r = resolved.get(`${d.comm_type}|${slot.category}`)!;
                      const inheritedFrom =
                        r.source === "override"        ? `Document Override (${d.comm_type})` :
                        r.source === "global_code"     ? `Global Default (${slot.defaultAssetCode ?? "—"})` :
                        r.source === "system_default"  ? "System Default (Approved)" :
                                                         "—";
                      return (
                        <TableRow key={slot.category}>
                          <TableCell>
                            <div className="text-sm font-medium">{slot.label}</div>
                            <div className="text-[10px] text-muted-foreground">{slot.required ? "Required" : "Optional"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-14 flex-shrink-0">
                                {r.asset ? <AssetPreview asset={r.asset} className="h-10 w-14" /> : (
                                  <div className="h-10 w-14 rounded border bg-muted flex items-center justify-center text-muted-foreground text-[9px]">none</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">{r.asset?.name ?? "—"}</div>
                                {r.asset?.asset_code && <div className="text-[10px] font-mono text-muted-foreground truncate">{r.asset.asset_code}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><SourceBadge source={r.source} />{" "}<span className="text-[11px] text-muted-foreground">{inheritedFrom}</span></TableCell>
                          <TableCell><StatusBadge status={r.status} required={slot.required} /></TableCell>
                          <TableCell>
                            {r.status === "approved" ? <span className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />OK</span>
                              : r.status === "archived" ? <span className="text-[11px] text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />Archived asset</span>
                              : slot.required ? <span className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Blocks generation</span>
                              : <span className="text-[11px] text-muted-foreground">Optional</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <WhereUsedButton assetId={r.asset?.id ?? null} assetName={r.asset?.name} />
                              {r.source === "override" && (
                                <Button type="button" size="sm" variant="ghost" title="Reset to inherited"
                                  onClick={() => slotMutation.mutate({ commType: d.comm_type, category: slot.category, asset_id: null, existingId: r.overrideMappingId })}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button type="button" size="sm" variant="outline" onClick={() => setPicker({ doc: d, slot })}>
                                <Pencil className="h-3.5 w-3.5 mr-1" />Override
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Approved branding lives in the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>. Archived assets are never resolved — the grid above is what every Receipt / Statement / Certificate will use at generation time.
      </p>

      {picker && (
        <AssetPickerDialog
          open={!!picker}
          onOpenChange={(o) => !o && setPicker(null)}
          category={picker.slot.category}
          slotLabel={`${picker.doc.name} — ${picker.slot.label}`}
          onPicked={(a) => {
            const r = resolved.get(`${picker.doc.comm_type}|${picker.slot.category}`)!;
            slotMutation.mutate({
              commType: picker.doc.comm_type,
              category: picker.slot.category,
              asset_id: a.id,
              existingId: r.overrideMappingId,
            });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

export default function DocumentAssetsPage() {
  return <PermissionWrapper moduleName="org_document_assets"><Inner /></PermissionWrapper>;
}
