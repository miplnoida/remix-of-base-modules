import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listReferrals, type LegalReferralRow } from "@/services/legal/legalReferralUnifiedService";
import { RequestInfoDialog } from "@/components/legal/lg/RequestInfoDialog";
import { LegalReferralsStandardGrid, type StandardReferralRow } from "@/components/legal/lg/LegalReferralsStandardGrid";
import { LegalReferralsErrorBoundary } from "@/components/legal/lg/LegalReferralsErrorBoundary";
import { useLegalReferralsRealtime } from "@/hooks/useLegalReferralsRealtime";
import { computeSlaStatus, type SlaStatus } from "@/services/legal/legalReferralSlaService";

const sb = supabase as any;

interface ReferralWithSla extends StandardReferralRow {
  source_bn_referral_id?: string | null;
  source_ce_referral_id?: string | null;
  legal_case_id?: string | null;
  lg_intake_id?: string | null;
}

interface InfoRequestGridRow extends StandardReferralRow {
  info_request_id: string;
  request_reason: string;
  requested_items_count: number;
  request_no: string;
}

function decorateWithSla(rows: LegalReferralRow[], openByReferral: Map<string, any>): ReferralWithSla[] {
  return rows.map((r) => {
    const open = openByReferral.get(r.id);
    return {
      ...r,
      sla_due_date: open?.due_date ?? null,
      sla_status: (open?.sla_status as SlaStatus) ?? (r.pending_info_request_count > 0 ? "ON_TIME" : null),
      reminder_at: open?.reminder_at ?? null,
      escalation_at: open?.escalation_at ?? null,
    };
  });
}

function InnerWorkbench() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("benefits");
  const [requestFor, setRequestFor] = useState<ReferralWithSla | null>(null);

  useLegalReferralsRealtime();

  // ALL open info requests (used to decorate referral rows and power the Info Requested tab)
  const { data: openInfoRequests = [] } = useQuery({
    queryKey: ["legal-referrals-info-open"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("legal_referral_info_request")
        .select("*, referral:legal_referral(*)")
        .eq("status", "PENDING_SOURCE_RESPONSE")
        .order("due_date", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const openByReferral = useMemo(() => {
    const m = new Map<string, any>();
    for (const ir of openInfoRequests) {
      // keep the earliest due_date per referral
      const cur = m.get(ir.legal_referral_id);
      if (!cur || (ir.due_date && (!cur.due_date || ir.due_date < cur.due_date))) {
        m.set(ir.legal_referral_id, ir);
      }
    }
    return m;
  }, [openInfoRequests]);

  const baseFilter = useMemo(() => {
    const base: any = {};
    switch (tab) {
      case "benefits": base.source_module = "BENEFITS"; break;
      case "compliance": base.source_module = "COMPLIANCE"; break;
      case "responses": base.statuses = ["INFO_RESPONDED"]; break;
      case "accepted": base.statuses = ["ACCEPTED"]; break;
      case "rejected": base.statuses = ["REJECTED", "CLOSED"]; break;
      case "case_created": base.statuses = ["LEGAL_CASE_CREATED"]; break;
    }
    return base;
  }, [tab]);

  const referralsQuery = useQuery({
    queryKey: ["legal-referrals-workbench", tab],
    queryFn: () => listReferrals(baseFilter),
    enabled: tab !== "info_requested",
  });

  const decorated = useMemo(
    () => decorateWithSla(referralsQuery.data ?? [], openByReferral),
    [referralsQuery.data, openByReferral]
  );

  const infoRequestRows: InfoRequestGridRow[] = useMemo(() => {
    return (openInfoRequests as any[])
      .filter((ir) => !!ir.referral)
      .map((ir) => ({
        id: ir.id,
        info_request_id: ir.id,
        request_no: ir.request_no,
        request_reason: ir.request_reason,
        requested_items_count: Array.isArray(ir.requested_items) ? ir.requested_items.length : 0,
        referral_no: ir.referral.referral_no,
        source_module: ir.referral.source_module,
        source_reference_no: ir.referral.source_reference_no,
        primary_entity_type: ir.referral.primary_entity_type,
        primary_entity_id: ir.referral.primary_entity_id,
        submitted_by: ir.requested_by,
        status: "PENDING_SOURCE_RESPONSE",
        legal_workbasket_code: ir.referral.legal_workbasket_code,
        legal_team_code: ir.referral.legal_team_code,
        pending_info_request_count: 1,
        sla_due_date: ir.due_date,
        sla_status: (ir.sla_status as SlaStatus) ?? computeSlaStatus({
          status: ir.status, due_date: ir.due_date, reminder_at: ir.reminder_at, escalation_at: ir.escalation_at,
        }),
        reminder_at: ir.reminder_at,
        escalation_at: ir.escalation_at,
        last_status_at: ir.updated_at ?? ir.created_at,
        created_at: ir.created_at,
      }));
  }, [openInfoRequests]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["legal-referrals-workbench"] });
    qc.invalidateQueries({ queryKey: ["legal-referrals-info-open"] });
  };

  const benefitsCount = decorated.filter((r) => r.source_module === "BENEFITS").length;
  const complianceCount = decorated.filter((r) => r.source_module === "COMPLIANCE").length;
  const openInfoCount = infoRequestRows.length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Legal Referrals Workbench</h1>
          <p className="text-sm text-muted-foreground">SLA-driven referrals received from Benefits and Compliance.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="benefits">Benefits {tab === "benefits" && benefitsCount > 0 && <Badge variant="secondary" className="ml-1">{benefitsCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="compliance">Compliance {tab === "compliance" && complianceCount > 0 && <Badge variant="secondary" className="ml-1">{complianceCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="info_requested">Info Requested {openInfoCount > 0 && <Badge variant="destructive" className="ml-1">{openInfoCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="responses">Response Received</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="case_created">Case Created</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {(["benefits", "compliance", "responses", "accepted", "case_created", "rejected"] as const).map((t) => (
          <TabsContent key={t} value={t}>
            <LegalReferralsStandardGrid
              rows={decorated}
              isLoading={referralsQuery.isLoading}
              isError={referralsQuery.isError}
              errorMessage={(referralsQuery.error as any)?.message}
              onRefresh={refreshAll}
              onRetry={() => referralsQuery.refetch()}
              statusOptions={[
                "SUBMITTED_TO_LEGAL", "RECEIVED_BY_LEGAL", "INFO_REQUESTED",
                "INFO_RESPONDED", "UNDER_LEGAL_REVIEW", "ACCEPTED",
                "LEGAL_CASE_CREATED", "REJECTED", "CLOSED",
              ]}
              buildRowLink={(r) => r.legal_case_id ? `/legal/cases/${r.legal_case_id}` : r.lg_intake_id ? `/legal/intake/${r.lg_intake_id}` : "#"}
              actions={[
                { label: "Request Info", onClick: (r) => setRequestFor(r), hidden: (r) => r.status === "REJECTED" || r.status === "CLOSED" || r.status === "LEGAL_CASE_CREATED" },
                { label: "View", onClick: (r) => { const link = r.legal_case_id ? `/legal/cases/${r.legal_case_id}` : r.lg_intake_id ? `/legal/intake/${r.lg_intake_id}` : null; if (link) window.location.href = link; } },
              ]}
            />
          </TabsContent>
        ))}

        <TabsContent value="info_requested">
          <LegalReferralsStandardGrid
            rows={infoRequestRows}
            isLoading={false}
            onRefresh={refreshAll}
            showSlaColumns={true}
            buildRowLink={() => "#"}
            actions={[]}
            emptyMessage="No open info requests."
          />
        </TabsContent>
      </Tabs>

      {requestFor && (
        <RequestInfoDialog
          legalReferralId={requestFor.id}
          referralNo={requestFor.referral_no}
          sourceModule={requestFor.source_module as "BENEFITS" | "COMPLIANCE"}
          open={!!requestFor}
          onOpenChange={(o) => !o && setRequestFor(null)}
        />
      )}
    </div>
  );
}

export default function LegalReferralsWorkbench() {
  return (
    <LegalReferralsErrorBoundary>
      <InnerWorkbench />
    </LegalReferralsErrorBoundary>
  );
}
