import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCampaigns } from "@/services/legal/lgRecoveryCampaignService";
import type { RecoveryCampaign } from "@/types/legal/recoveryAssignment";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Megaphone } from "lucide-react";

/**
 * EPIC-06D — Recovery Campaigns list.
 * Read-only aggregate view over lg_recovery_campaign backing the sidebar
 * "Recovery Campaigns" menu item at /legal/lg/recovery-campaigns.
 */
export default function LgRecoveryCampaignsList() {
  const access = useLgAccess();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecoveryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listCampaigns();
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load recovery campaigns");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!access.can("viewRecoveryCampaign")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            You do not have permission to view Recovery Campaigns.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold">Recovery Campaigns</h1>
        </div>
        {access.can("manageRecoveryCampaign") && (
          <Button onClick={() => navigate("/legal/admin/recovery-campaign-types")} variant="outline">
            Configure Campaign Types
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading campaigns…</p>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No campaigns configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Recovered</TableHead>
                  <TableHead className="text-right">Assignments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{Number(c.target_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(c.actual_recovered_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{c.actual_assignment_count ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
