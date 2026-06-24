import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

interface CaseRow {
  id: string;
  case_number: string | null;
  employer_id: string | null;
  status: string | null;
}

export default function ComplianceLegalReferralLauncher() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("ce_cases")
        .select("id, case_number, employer_id, status")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        q = q.or(`case_number.ilike.%${search}%,employer_id.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as CaseRow[]);
    } catch (e: any) {
      toast.error("Unable to load compliance cases", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Compliance → Legal Referral Wizard</h1>
        <p className="text-sm text-muted-foreground">
          Select a compliance case to forward selected arrears / periods / heads to Legal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find a case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by case number or employer id"
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
              <div className="p-4 text-sm text-muted-foreground">No cases loaded yet.</div>
            )}
            {rows.map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.case_number || r.id}</div>
                  <div className="text-xs text-muted-foreground">
                    Employer: {r.employer_id || "—"} · Status: {r.status || "—"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/compliance/cases/${r.id}/legal-referral`)}
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
