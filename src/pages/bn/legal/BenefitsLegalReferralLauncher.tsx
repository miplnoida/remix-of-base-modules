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
}

export default function BenefitsLegalReferralLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("bn_claim")
        .select("id, claim_number, status")
        .order("entered_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        q = q.ilike("claim_number", `%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as ClaimRow[]);
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
              placeholder="Search by claim number or claimant name"
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
                    Status: {r.status || "—"}
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
