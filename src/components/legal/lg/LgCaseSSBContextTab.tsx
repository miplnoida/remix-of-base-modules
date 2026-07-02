/**
 * LgCaseSSBContextTab
 *
 * EPIC-04 §5 — SSB Business Context tab for the 360° Legal Matter Workspace.
 *
 * Purpose: give a Legal Officer a single, read-only cross-module view of the
 * SSB context surrounding the matter (employer or insured person) so they do
 * not have to hop between Compliance, Benefits and Finance modules.
 *
 * Data sources — LIVE only, no mock:
 *   - au_er_master                     (employer master)
 *   - ce_employer_compliance_status    (compliance profile)
 *   - ce_employer_financial_ledger     (arrears / balances)
 *   - ce_payment_arrangements          (active arrangements)
 *   - lg_case                          (prior legal matters for same party)
 *   - lg_order                         (existing court orders for those matters)
 *   - lg_case_party                    (party rows for insured persons)
 *   - ip_master                        (insured person master by SSN)
 *
 * When a source table has no row for the party we render "Unknown" — never a
 * fabricated value — and note the gap in
 * docs/legal/EPIC-04-LEGAL-MATTER-360-WORKSPACE.md §Known limitations.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { AlertTriangle, Building2, User, ExternalLink } from "lucide-react";

const sb = supabase as any;
const UNKNOWN = "Unknown";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === "" || value === UNKNOWN;
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={empty ? "text-sm text-muted-foreground italic" : "text-sm font-medium"}>
        {empty ? UNKNOWN : value}
      </div>
    </div>
  );
}

interface Props {
  lgCaseId: string;
  caseData: any;
}

export function LgCaseSSBContextTab({ lgCaseId, caseData }: Props) {
  const employerId: string | null = caseData?.employer_id ?? null;

  // Insured person party (if any) — carried on lg_case_party rows.
  const partyQ = useQuery({
    queryKey: ["lg-ssb-ctx-party", lgCaseId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_case_party")
        .select("id, party_type, display_name, external_ref_id, party_role")
        .eq("lg_case_id", lgCaseId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const insuredParty = (partyQ.data ?? []).find(
    (p) => String(p.party_type).toUpperCase().includes("INSURED") || String(p.party_type).toUpperCase() === "IP",
  );
  const ssn: string | null = insuredParty?.external_ref_id ?? null;

  // Employer master + compliance
  const employerQ = useQuery({
    enabled: !!employerId,
    queryKey: ["lg-ssb-ctx-employer", employerId],
    queryFn: async () => {
      const [erRes, compRes, ledgerRes] = await Promise.all([
        sb.from("au_er_master").select("id, er_no, er_name, er_status, er_reg_date").eq("id", employerId).maybeSingle(),
        sb.from("ce_employer_compliance_status").select("*").eq("employer_id", employerId).maybeSingle(),
        sb.from("ce_employer_financial_ledger").select("outstanding_balance, principal_due, interest_due, penalty_due, last_updated_at").eq("employer_id", employerId).maybeSingle(),
      ]);
      return {
        employer: erRes.data ?? null,
        compliance: compRes.data ?? null,
        ledger: ledgerRes.data ?? null,
      };
    },
  });

  // Prior legal matters for same employer (excluding self)
  const priorLegalQ = useQuery({
    enabled: !!employerId,
    queryKey: ["lg-ssb-ctx-prior-legal", employerId, lgCaseId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_case")
        .select("id, case_no, current_status, current_stage_code, opened_date, closed_date")
        .eq("employer_id", employerId)
        .neq("id", lgCaseId)
        .order("opened_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Active payment arrangements (from central table via employer party)
  const arrangementsQ = useQuery({
    enabled: !!employerId,
    queryKey: ["lg-ssb-ctx-arrangements", employerId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("ce_payment_arrangements")
        .select("id, arrangement_no, status, total_amount, outstanding_amount, start_date, end_date")
        .eq("employer_id", employerId)
        .in("status", ["ACTIVE", "APPROVED", "IN_PROGRESS"])
        .limit(20);
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

  // Existing court orders across all matters for the employer
  const ordersQ = useQuery({
    enabled: !!(priorLegalQ.data && priorLegalQ.data.length > 0) || !!lgCaseId,
    queryKey: ["lg-ssb-ctx-orders", lgCaseId, priorLegalQ.data?.map((r) => r.id)],
    queryFn: async () => {
      const caseIds = [lgCaseId, ...(priorLegalQ.data ?? []).map((r) => r.id)];
      const { data, error } = await sb
        .from("lg_order")
        .select("id, lg_case_id, order_type, order_date, amount_ordered, status")
        .in("lg_case_id", caseIds)
        .order("order_date", { ascending: false })
        .limit(30);
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

  // Insured person master (SSN lookup, when applicable)
  const ipQ = useQuery({
    enabled: !!ssn,
    queryKey: ["lg-ssb-ctx-ip", ssn],
    queryFn: async () => {
      const { data } = await sb
        .from("ip_master")
        .select("ip_no, first_name, last_name, dob, status")
        .eq("ip_no", ssn)
        .maybeSingle();
      return data ?? null;
    },
  });

  const employer = employerQ.data?.employer ?? null;
  const compliance = employerQ.data?.compliance ?? null;
  const ledger = employerQ.data?.ledger ?? null;

  return (
    <div className="space-y-4">
      {!employerId && !ssn && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This matter has neither an Employer nor an Insured Person subject linked.
            SSB business context cannot be resolved.
          </AlertDescription>
        </Alert>
      )}

      {/* Employer context */}
      {employerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Employer Context
            </CardTitle>
            <CardDescription>
              Cross-module snapshot from Employer, Compliance and Finance registers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employerQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Employer No" value={employer?.er_no} />
                  <Field label="Employer Name" value={employer?.er_name ?? caseData?.legacy_employer_name} />
                  <Field label="Registration Status" value={employer?.er_status} />
                  <Field label="Registered On" value={employer?.er_reg_date} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field
                    label="Compliance Status"
                    value={
                      compliance?.compliance_status ? (
                        <Badge variant="outline">{compliance.compliance_status}</Badge>
                      ) : null
                    }
                  />
                  <Field label="Risk Band" value={compliance?.risk_band} />
                  <Field label="Contribution Arrears" value={ledger?.principal_due != null ? Number(ledger.principal_due).toFixed(2) : null} />
                  <Field label="Outstanding Balance" value={ledger?.outstanding_balance != null ? Number(ledger.outstanding_balance).toFixed(2) : null} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Link
                    to={`/employers/${employerId}`}
                    className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open Employer <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insured person context */}
      {ssn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Insured Person Context
            </CardTitle>
            <CardDescription>Linked via case party (SSN: {ssn}).</CardDescription>
          </CardHeader>
          <CardContent>
            {ipQ.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="SSN" value={ipQ.data?.ip_no ?? ssn} />
                <Field label="Name" value={ipQ.data ? `${ipQ.data.first_name ?? ""} ${ipQ.data.last_name ?? ""}`.trim() : insuredParty?.display_name} />
                <Field label="Date of Birth" value={ipQ.data?.dob} />
                <Field label="Status" value={ipQ.data?.status} />
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground italic">
              Contribution and benefit history summaries are not exposed through Legal yet — see
              docs/legal/EPIC-04-LEGAL-MATTER-360-WORKSPACE.md §Known limitations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active payment arrangements */}
      {employerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Payment Arrangements</CardTitle>
          </CardHeader>
          <CardContent>
            {arrangementsQ.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (arrangementsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active arrangements found.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1">Arrangement</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Outstanding</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {(arrangementsQ.data ?? []).map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-1">{a.arrangement_no ?? String(a.id).slice(0, 8)}</td>
                      <td><Badge variant="outline">{a.status}</Badge></td>
                      <td className="text-right">{Number(a.total_amount ?? 0).toFixed(2)}</td>
                      <td className="text-right">{Number(a.outstanding_amount ?? 0).toFixed(2)}</td>
                      <td>{a.start_date ?? "—"}</td>
                      <td>{a.end_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prior legal matters */}
      {employerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous Legal Matters</CardTitle>
            <CardDescription>Other legal cases opened against the same employer.</CardDescription>
          </CardHeader>
          <CardContent>
            {priorLegalQ.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (priorLegalQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior legal matters.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1">Case No</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Opened</th>
                    <th>Closed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(priorLegalQ.data ?? []).map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-1">{c.case_no ?? String(c.id).slice(0, 8)}</td>
                      <td>{c.current_status ?? "—"}</td>
                      <td>{c.current_stage_code ?? "—"}</td>
                      <td>{c.opened_date ?? "—"}</td>
                      <td>{c.closed_date ?? "—"}</td>
                      <td>
                        <Link to={`/legal/lg/cases/${c.id}`} className="text-primary hover:underline">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing court orders across matters */}
      {employerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing Court Orders (all matters)</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersQ.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (ordersQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No court orders on record.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1">Type</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Matter</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordersQ.data ?? []).map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="py-1">{o.order_type ?? "—"}</td>
                      <td>{o.order_date ?? "—"}</td>
                      <td className="text-right">{Number(o.amount_ordered ?? 0).toFixed(2)}</td>
                      <td><Badge variant="outline">{o.status ?? "—"}</Badge></td>
                      <td>
                        {o.lg_case_id === lgCaseId ? (
                          <span className="text-muted-foreground">this matter</span>
                        ) : (
                          <Link to={`/legal/lg/cases/${o.lg_case_id}`} className="text-primary hover:underline">
                            {String(o.lg_case_id).slice(0, 8)}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Originating source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Originating Source</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Source Module" value={caseData?.source_module} />
          <Field label="Source Reference" value={caseData?.source_reference_no ?? caseData?.compliance_case_id} />
          <Field label="Source Reason" value={caseData?.source_reason ?? caseData?.referral_reason} />
          <Field label="Originating Department" value={caseData?.originating_department_code} />
        </CardContent>
      </Card>
    </div>
  );
}

export default LgCaseSSBContextTab;
