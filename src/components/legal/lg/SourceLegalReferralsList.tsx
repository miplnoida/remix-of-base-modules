import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listReferrals,
  type SourceModule,
  type LegalReferralRow,
} from "@/services/legal/legalReferralUnifiedService";
import { legalReferralCollaborationService } from "@/services/legal/legalReferralCollaborationService";
import { useAuth } from "@/contexts/AuthContext";
import { RespondInfoRequestDialog } from "./RespondInfoRequestDialog";

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

interface Props {
  module: SourceModule;
  title?: string;
}

export function SourceLegalReferralsList({ module, title }: Props) {
  const { user } = useAuth();
  const userCode = user?.email ?? "";
  const [tab, setTab] = useState("my");
  const [search, setSearch] = useState("");
  const [respondTarget, setRespondTarget] = useState<any | null>(null);

  const filter = useMemo(() => {
    const base: any = { source_module: module };
    if (search) base.search = search;
    switch (tab) {
      case "my": base.submitted_by = userCode; break;
      case "info_requested": base.statuses = ["INFO_REQUESTED"]; break;
      case "responses": base.statuses = ["INFO_RESPONDED", "UNDER_LEGAL_REVIEW"]; break;
      case "accepted": base.statuses = ["ACCEPTED", "LEGAL_CASE_CREATED"]; break;
      case "rejected": base.statuses = ["REJECTED", "CLOSED"]; break;
      case "team": break;
      default: break;
    }
    return base;
  }, [tab, userCode, search, module]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["legal-referrals", module, tab, search, userCode],
    queryFn: () => listReferrals(filter),
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ["source-tasks", module, userCode],
    queryFn: () => legalReferralCollaborationService.getPendingInfoRequests(module, { user_code: userCode }),
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title ?? `${module === "BENEFITS" ? "Benefits" : "Compliance"} — Legal Referrals`}</h1>
          <p className="text-sm text-muted-foreground">Track submitted referrals and respond to Legal info requests.</p>
        </div>
        <Input className="max-w-xs" placeholder="Search referral / reference no..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="my">My Referrals</TabsTrigger>
          <TabsTrigger value="team">Team Referrals</TabsTrigger>
          <TabsTrigger value="info_requested">
            Info Requested
            {pendingTasks.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses">Submitted Responses</TabsTrigger>
          <TabsTrigger value="accepted">Accepted / Case Created</TabsTrigger>
          <TabsTrigger value="rejected">Rejected / Closed</TabsTrigger>
        </TabsList>

        {tab === "info_requested" ? (
          <TabsContent value="info_requested">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Open info-request tasks ({pendingTasks.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral No</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTasks.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No pending info requests.</TableCell></TableRow>
                  )}
                  {pendingTasks.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.referral?.referral_no}</TableCell>
                      <TableCell className="max-w-md truncate">{t.info_request?.request_reason}</TableCell>
                      <TableCell>{t.info_request?.requested_by}</TableCell>
                      <TableCell>{t.due_date ?? "—"}</TableCell>
                      <TableCell><Badge>{t.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setRespondTarget(t.info_request)}>Respond</Button>
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
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
                  {!isLoading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No referrals.</TableCell></TableRow>
                  )}
                  {rows.map((r: LegalReferralRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.referral_no}</TableCell>
                      <TableCell>{r.source_reference_no ?? "—"}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{r.submitted_by ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.pending_info_request_count > 0
                          ? <Badge variant="destructive">{r.pending_info_request_count}</Badge>
                          : "—"}
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
          infoRequest={respondTarget}
          open={!!respondTarget}
          onOpenChange={(o) => !o && setRespondTarget(null)}
        />
      )}
    </div>
  );
}
