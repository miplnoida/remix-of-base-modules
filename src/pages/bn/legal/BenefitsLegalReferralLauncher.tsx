import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

interface ClaimRow {
  id: string;
  claim_number: string | null;
  status: string | null;
  ssn: string | null;
  claimant_name?: string | null;
}

export default function BenefitsLegalReferralLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      const term = search.trim();
      let claims: any[] = [];

      if (!term) {
        const { data, error } = await supabase
          .from("bn_claim")
          .select("id, claim_number, status, ssn")
          .order("entered_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        claims = data || [];
      } else {
        // Search by claim_number or ssn directly
        const { data: byClaim, error: e1 } = await supabase
          .from("bn_claim")
          .select("id, claim_number, status, ssn")
          .or(`claim_number.ilike.%${term}%,ssn.ilike.%${term}%`)
          .order("entered_at", { ascending: false })
          .limit(50);
        if (e1) throw e1;
        claims = byClaim || [];

        // Also search by claimant name via ip_master
        const { data: persons } = await supabase
          .from("ip_master")
          .select("ssn, firstname, surname")
          .or(`firstname.ilike.%${term}%,surname.ilike.%${term}%`)
          .limit(100);
        const ssns = (persons || []).map((p: any) => p.ssn).filter(Boolean);
        if (ssns.length) {
          const { data: byName } = await supabase
            .from("bn_claim")
            .select("id, claim_number, status, ssn")
            .in("ssn", ssns)
            .order("entered_at", { ascending: false })
            .limit(50);
          const existingIds = new Set(claims.map((c) => c.id));
          for (const c of byName || []) {
            if (!existingIds.has(c.id)) claims.push(c);
          }
        }
      }

      // Enrich with claimant name from ip_master
      const ssnSet = Array.from(new Set(claims.map((c) => c.ssn).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (ssnSet.length) {
        const { data: ppl } = await supabase
          .from("ip_master")
          .select("ssn, firstname, surname")
          .in("ssn", ssnSet);
        for (const p of ppl || []) {
          nameMap.set(p.ssn, `${p.firstname || ""} ${p.surname || ""}`.trim());
        }
      }

      setRows(
        claims.map((c) => ({
          ...c,
          claimant_name: nameMap.get(c.ssn) || null,
        })) as ClaimRow[],
      );
    } catch (e: any) {
      toast.error("Unable to load benefit claims", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Benefits → Legal Referral Wizard</h1>
        <p className="text-sm text-muted-foreground">
          Select a benefit claim to forward specific overpayments or disputes to Legal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find a claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by claim number, SSN, first name or surname"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button onClick={runSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>
          <div className="border rounded-md divide-y">
            {rows.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No claims loaded yet.</div>
            )}
            {rows.map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.claim_number || r.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.claimant_name ? `${r.claimant_name} · ` : ""}
                    SSN: {r.ssn || "—"} · Status: {r.status || "—"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/bn/claims/${r.id}/legal-referral`)}
                >
                  Open wizard
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
