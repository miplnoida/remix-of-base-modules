import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { AssetPickerField } from "@/components/comm/AssetPickerField";
import { toast } from "sonner";
import type { CommAssetCategory } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

type Slot = { label: string; category: CommAssetCategory };

const SLOT_MAP: Record<string, Slot[]> = {
  Logo:        [{ label: "Logo",        category: "logo" }],
  Header:      [{ label: "Header",      category: "letterhead_header" }],
  Footer:      [{ label: "Footer",      category: "letterhead_footer" }],
  Seal:        [{ label: "Seal",        category: "seal" }],
  Signature:   [{ label: "Signature",   category: "signature" }],
  "QR Code":   [{ label: "QR Code",     category: "qr_code" }],
  Watermark:   [{ label: "Watermark",   category: "watermark" }],
  Disclaimer:  [{ label: "Disclaimer",  category: "other" }],
  Numbering:   [],
};

const OUTPUTS: { name: string; comm_type: string; slots: string[] }[] = [
  { name: "Payment Receipt",             comm_type: "doc_payment_receipt",       slots: ["Logo","Header","Footer","Seal","Signature","QR Code"] },
  { name: "Contribution Statement",      comm_type: "doc_contribution_statement",slots: ["Logo","Header","Footer","Watermark","Disclaimer"] },
  { name: "Employer Account Statement",  comm_type: "doc_employer_statement",    slots: ["Logo","Header","Footer","Watermark","Disclaimer"] },
  { name: "Member Contribution History", comm_type: "doc_member_history",        slots: ["Logo","Header","Footer","Disclaimer"] },
  { name: "Benefit Payment Statement",   comm_type: "doc_benefit_statement",     slots: ["Logo","Header","Footer","Signature","Seal"] },
  { name: "Claim Acknowledgement",       comm_type: "doc_claim_ack",             slots: ["Logo","Header","Footer","Signature"] },
  { name: "Compliance Statement",        comm_type: "doc_compliance_stmt",       slots: ["Logo","Header","Footer","Seal","Disclaimer"] },
  { name: "Certificate of Registration", comm_type: "doc_cert_registration",     slots: ["Logo","Header","Footer","Seal","Signature","QR Code","Watermark"] },
  { name: "Certificate of Compliance",   comm_type: "doc_cert_compliance",       slots: ["Logo","Header","Footer","Seal","Signature","QR Code","Watermark"] },
];

function useMappings() {
  return useQuery({
    queryKey: ["comm_asset_mapping", "documents"],
    queryFn: async () => {
      const types = OUTPUTS.map((o) => o.comm_type);
      const { data, error } = await sb
        .from("comm_asset_mapping")
        .select("id,asset_id,category,communication_type,is_active")
        .in("communication_type", types)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function Inner() {
  const { data: mappings = [], isLoading } = useMappings();
  const qc = useQueryClient();

  const byKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of mappings) m.set(`${r.communication_type}|${r.category}`, r);
    return m;
  }, [mappings]);

  const saveMapping = useMutation({
    mutationFn: async (args: { comm_type: string; category: string; asset_id: string | null }) => {
      const key = `${args.comm_type}|${args.category}`;
      const existing = byKey.get(key);
      if (args.asset_id === null) {
        if (!existing) return;
        const { error } = await sb.from("comm_asset_mapping").update({ is_active: false }).eq("id", existing.id);
        if (error) throw error;
        return;
      }
      if (existing) {
        const { error } = await sb.from("comm_asset_mapping").update({ asset_id: args.asset_id }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("comm_asset_mapping").insert({
          asset_id: args.asset_id,
          category: args.category,
          communication_type: args.comm_type,
          is_active: true,
          priority: 100,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_asset_mapping"] });
      toast.success("Slot updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Receipt / Statement / Certificate Assets</h1>
          <p className="text-sm text-muted-foreground">Bind branding assets to each generated financial / official document.</p>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
        <div className="grid lg:grid-cols-2 gap-4">
          {OUTPUTS.map((o) => (
            <Card key={o.comm_type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {o.name}
                  <Badge variant="outline" className="font-mono text-[10px]">{o.comm_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {o.slots.flatMap((slotKey) => SLOT_MAP[slotKey] ?? []).map((slot) => {
                  const key = `${o.comm_type}|${slot.category}`;
                  const bound = byKey.get(key);
                  return (
                    <AssetPickerField
                      key={key}
                      label={slot.label}
                      category={slot.category}
                      value={bound?.asset_id}
                      onChange={(id) => saveMapping.mutate({ comm_type: o.comm_type, category: slot.category, asset_id: id })}
                    />
                  );
                })}
                {o.slots.includes("Numbering") && (
                  <p className="text-[11px] text-muted-foreground">Numbering format is configured per document in the originating module.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Pick logos, seals, signatures, watermarks and QR codes from the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>, upload new files, or paste external URLs.
      </p>
    </div>
  );
}

export default function DocumentAssetsPage() {
  return <PermissionWrapper moduleName="org_document_assets"><Inner /></PermissionWrapper>;
}
