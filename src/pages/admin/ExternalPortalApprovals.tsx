/**
 * ExternalPortalApprovals
 * Super-admin page that lists employer/doctor users awaiting approval.
 * Reads user_metadata.link_status === 'PENDING_APPROVAL' from auth.users
 * via the existing admin/users RPC; falls back to external_persona_audit
 * for the source of truth on requests.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditPortalAction } from "@/services/external/auditPortalAction";

const db = supabase as any;

interface PendingRequest {
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
}

export default function ExternalPortalApprovals() {
  const [rows, setRows] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("external_persona_audit")
      .select("user_id, action, metadata, created_at")
      .in("action", ["EMPLOYER_LINK_REQUESTED", "PROVIDER_LINK_REQUESTED"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (r: PendingRequest, approve: boolean) => {
    try {
      const event = approve
        ? (r.action === "EMPLOYER_LINK_REQUESTED" ? "EMPLOYER_LINK_APPROVED" : "PROVIDER_LINK_APPROVED")
        : (r.action === "EMPLOYER_LINK_REQUESTED" ? "EMPLOYER_LINK_REJECTED" : "PROVIDER_LINK_REJECTED");
      auditPortalAction(event as any, {
        userId: r.user_id,
        payload: { ...(r.metadata ?? {}), decidedAt: new Date().toISOString() },
      });
      toast.success(approve ? "Approved" : "Rejected");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record decision.");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">External portal approvals</h1>
        <p className="text-sm text-muted-foreground">
          Employer and medical-provider access requests awaiting administrator decision.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 border rounded-md p-3">
                  <Badge variant="outline">
                    {r.action === "EMPLOYER_LINK_REQUESTED" ? "Employer" : "Provider"}
                  </Badge>
                  <div className="text-sm flex-1">
                    <div className="font-medium">User: {r.user_id.slice(0, 8)}…</div>
                    <div className="text-xs text-muted-foreground">
                      {JSON.stringify(r.metadata)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decide(r, false)}>Reject</Button>
                    <Button size="sm" onClick={() => decide(r, true)}>Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
