import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  listReferrals,
  type SourceModule,
  type LegalReferralRow,
  type InfoRequestRow,
} from "@/services/legal/legalReferralUnifiedService";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { RespondInfoRequestDialog } from "./RespondInfoRequestDialog";
import { ReferralTimelineDialog } from "./ReferralTimelineDialog";
import { Clock } from "lucide-react";

const sb = supabase as any;

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED_TO_LEGAL: "bg-blue-100 text-blue-800",
  RECEIVED_BY_LEGAL: "bg-blue-100 text-blue-800",
  INFO_REQUESTED: "bg-amber-100 text-amber-800",
  INFO_RESPONDED: "bg-purple-100 text-purple-800",
  UNDER_LEGAL_REVIEW: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-green-100 text-green-800",
  LEGAL_CASE_CREATED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export interface UserContext {
  user_code?: string | null;
  is_admin?: boolean;
}

export interface WorkbasketContext {
  workbasket_codes?: string[];
  team_codes?: string[];
}

interface Props {
  sourceModule: SourceModule;
  userContext?: UserContext;
  workbasketContext?: WorkbasketContext;
  title?: string;
}

type PendingRow = InfoRequestRow & { referral: LegalReferralRow };

async function fetchPendingInfoRequests(
  sourceModule: SourceModule,
  user_code: string | null,
  workbasket_codes: string[],
  team_codes: string[],
  is_admin: boolean
): Promise<PendingRow[]> {
  let q = sb
    .from("legal_referral_info_request")
    .select("*, referral:legal_referral!inner(*)")
    .eq("status", "PENDING_SOURCE_RESPONSE")
    .eq("requested_to_module", sourceModule)
    .eq("referral.source_module", sourceModule)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!is_admin) {
    const ors: string[] = [];
    if (user_code) ors.push(`requested_to_user.eq.${user_code}`);
    if (workbasket_codes.length)
      ors.push(`requested_to_workbasket_code.in.(${workbasket_codes.map((c) => `"${c}"`).join(",")})`);
    if (team_codes.length)
      ors.push(`requested_to_team_code.in.(${team_codes.map((c) => `"${c}"`).join(",")})`);
    if (ors.length) q = q.or(ors.join(","));
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PendingRow[];
}

export function SourceLegalReferralsPage({
  sourceModule,
  userContext,
  workbasketContext,
  title,
}: Props) {
  const { user } = useAuth();
  const supaAuth = useSupabaseAuth();

  const userCode = userContext?.user_code ?? supaAuth.profile?.user_code ?? user?.email ?? "";
  const isAdmin = userContext?.is_admin ?? !!supaAuth.isAdmin;
  const workbasketCodes = workbasketContext?.workbasket_codes ?? [];
  const teamCodes = workbasketContext?.team_codes ?? [];

  const [tab, setTab] = useState("my");
  const [search, setSearch] = useState("");
  const [respondTarget, setRespondTarget] = useState<PendingRow | null>(null);

  // Referral list filter (used for non-info_requested tabs)
  const referralFilter = useMemo(() => {
    const base: any = { source_module: sourceModule };
    if (search) base.search = search;
    switch (tab) {
      case "my": base.submitted_by = userCode; break;
      case "responses": base.statuses = ["INFO_RESPONDED", "UNDER_LEGAL_REVIEW"]; break;
      case "accepted": base.statuses = ["ACCEPTED", "LEGAL_CASE_CREATED"]; break;
      case "rejected": base.statuses = ["REJECTED", "CLOSED"]; break;
      case "team": break;
    }
    return base;
  }, [tab, userCode, search, sourceModule]);

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["legal-referrals", sourceModule, tab, search, userCode],
    queryFn: () => listReferrals(referralFilter),
    enabled: tab !== "info_requested",
  });

  // Info Requested tab — drives from legal_referral_info_request directly
  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-info-requests", sourceModule, userCode, workbasketCodes.join(","), teamCodes.join(","), isAdmin],
    queryFn: () => fetchPendingInfoRequests(sourceModule, userCode || null, workbasketCodes, teamCodes, isAdmin),
  });

  const filteredPending = useMemo(() => {
    if (!search) return pending;
    const q = search.toLowerCase();
    return pending.filter(
      (p) =>
        p.referral?.referral_no?.toLowerCase().includes(q) ||
        p.referral?.source_reference_no?.toLowerCase().includes(q) ||
        p.request_reason?.toLowerCase().includes(q) ||
        p.request_no?.toLowerCase().includes(q)
    );
  }, [pending, search]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {title ?? `${sourceModule === "BENEFITS" ? "Benefits" : "Compliance"} — Legal Referrals`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track submitted referrals and respond to Legal information requests.
          </p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search referral / reference / reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="my">My Referrals</TabsTrigger>
          <TabsTrigger value="team">Team Referrals</TabsTrigger>
          <TabsTrigger value="info_requested">
            Info Requested
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses">Submitted Responses</TabsTrigger>
          <TabsTrigger value="accepted">Accepted / Case Created</TabsTrigger>
          <TabsTrigger value="rejected">Rejected / Closed</TabsTrigger>
        </TabsList>

        {tab === "info_requested" ? (
          <TabsContent value="info_requested">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">
                Pending info requests ({filteredPending.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral No</TableHead>
                    <TableHead>Source Ref</TableHead>
                    <TableHead>Legal Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLoading && (
                    <TableRow><TableCell colSpan={9} className="text-center py-6">Loading...</TableCell></TableRow>
                  )}
                  {!pendingLoading && filteredPending.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        No pending info requests.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredPending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.referral?.referral_no}</TableCell>
                      <TableCell>{p.referral?.source_reference_no ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[p.referral?.status] ?? ""}>
                          {p.referral?.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate" title={p.request_reason}>
                        {p.request_reason}
                      </TableCell>
                      <TableCell>{p.requested_by}</TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{p.due_date ?? "—"}</TableCell>
                      <TableCell><Badge>{p.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setRespondTarget(p)}>Respond</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ) : (
          <TabsContent value={tab}>
            <Card className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral No</TableHead>
                    <TableHead>Source Ref</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Legal Status</TableHead>
                    <TableHead>Pending Info</TableHead>
                    <TableHead>Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>
                  )}
                  {!isLoading && referrals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No referrals.
                      </TableCell>
                    </TableRow>
                  )}
                  {referrals.map((r: LegalReferralRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.referral_no}</TableCell>
                      <TableCell>{r.source_reference_no ?? "—"}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{r.submitted_by ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[r.status] ?? ""}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.pending_info_request_count > 0 ? (
                          <Badge variant="destructive">{r.pending_info_request_count}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{new Date(r.last_status_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {respondTarget && (
        <RespondInfoRequestDialog
          infoRequest={respondTarget as any}
          open={!!respondTarget}
          onOpenChange={(o) => !o && setRespondTarget(null)}
        />
      )}
    </div>
  );
}

// Backwards-compatible alias for any existing imports
export { SourceLegalReferralsPage as SourceLegalReferralsList };
