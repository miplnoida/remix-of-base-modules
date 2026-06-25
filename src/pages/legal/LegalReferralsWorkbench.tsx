import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReferrals, type LegalReferralRow } from "@/services/legal/legalReferralUnifiedService";
import { RequestInfoDialog } from "@/components/legal/lg/RequestInfoDialog";

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

export default function LegalReferralsWorkbench() {
  const [tab, setTab] = useState("benefits");
  const [search, setSearch] = useState("");
  const [requestFor, setRequestFor] = useState<LegalReferralRow | null>(null);

  const filter = useMemo(() => {
    const base: any = { search: search || undefined };
    switch (tab) {
      case "benefits": base.source_module = "BENEFITS"; break;
      case "compliance": base.source_module = "COMPLIANCE"; break;
      case "info_requested": base.statuses = ["INFO_REQUESTED"]; break;
      case "responses": base.statuses = ["INFO_RESPONDED"]; break;
      case "accepted": base.statuses = ["ACCEPTED"]; break;
      case "rejected": base.statuses = ["REJECTED", "CLOSED"]; break;
      case "case_created": base.statuses = ["LEGAL_CASE_CREATED"]; break;
      case "all": break;
    }
    return base;
  }, [tab, search]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["legal-referrals-workbench", tab, search],
    queryFn: () => listReferrals(filter),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Legal Referrals Workbench</h1>
          <p className="text-sm text-muted-foreground">Referrals received from Benefits and Compliance.</p>
        </div>
        <Input className="max-w-xs" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="benefits">Benefits Referrals</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Referrals</TabsTrigger>
          <TabsTrigger value="info_requested">Info Requested</TabsTrigger>
          <TabsTrigger value="responses">Response Received</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="case_created">Case Created</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral No</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Source Ref</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pending Info</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-6">Loading...</TableCell></TableRow>}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No referrals.</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.referral_no}</TableCell>
                    <TableCell><Badge variant="outline">{r.source_module}</Badge></TableCell>
                    <TableCell>{r.source_reference_no ?? "—"}</TableCell>
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
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setRequestFor(r)}>
                        Request Info
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {requestFor && (
        <RequestInfoDialog
          legalReferralId={requestFor.id}
          referralNo={requestFor.referral_no}
          open={!!requestFor}
          onOpenChange={(o) => !o && setRequestFor(null)}
        />
      )}
    </div>
  );
}
