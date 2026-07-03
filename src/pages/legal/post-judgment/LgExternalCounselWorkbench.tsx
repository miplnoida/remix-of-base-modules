import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { formatCurrency } from "@/utils/formatCurrency";

const sb = supabase as any;

export default function LgExternalCounselWorkbench() {
  const { can } = useLgAccess();
  const [search, setSearch] = React.useState("");

  const { data: firms, isLoading } = useQuery({
    queryKey: ["post-judgment", "external-counsel"],
    queryFn: async () => {
      const [firmsRes, engRes] = await Promise.all([
        sb.from("lg_external_counsel").select("id,name,firm_type,status,created_at").limit(500),
        sb.from("lg_external_counsel_engagement").select("counsel_id,status,fee_estimate,fee_incurred"),
      ]);
      const engMap = new Map<string, { active: number; estimate: number; incurred: number }>();
      for (const e of (engRes.data ?? [])) {
        const cur = engMap.get(e.counsel_id) ?? { active: 0, estimate: 0, incurred: 0 };
        if (e.status === "ACTIVE") cur.active += 1;
        cur.estimate += Number(e.fee_estimate ?? 0);
        cur.incurred += Number(e.fee_incurred ?? 0);
        engMap.set(e.counsel_id, cur);
      }
      return (firmsRes.data ?? []).map((f: any) => ({ ...f, ...(engMap.get(f.id) ?? { active: 0, estimate: 0, incurred: 0 }) }));
    },
    staleTime: 30_000,
  });

  if (!can("viewExternalCounsel")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view External Counsel.</div>;
  }

  const filtered = (firms ?? []).filter((f: any) =>
    !search || (f.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">External Counsel</h1>
          <p className="text-sm text-muted-foreground">Firms, engagements, and fee utilisation.</p>
        </div>
        <Badge variant="outline">{filtered.length} firm{filtered.length === 1 ? "" : "s"}</Badge>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Search firms…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No firms registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Firm</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Active Engagements</th>
                    <th className="px-3 py-2 text-right font-medium">Estimate</th>
                    <th className="px-3 py-2 text-right font-medium">Incurred</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f: any) => (
                    <tr key={f.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{f.name}</td>
                      <td className="px-3 py-2">{f.firm_type ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{f.status ?? "—"}</Badge></td>
                      <td className="px-3 py-2 text-right">{f.active}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(f.estimate)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(f.incurred)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
