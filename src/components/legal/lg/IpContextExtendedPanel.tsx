/**
 * EPIC-04A §3 — Insured-Person context aggregation.
 *
 * Aggregates cross-module IP context (contributions, benefits, overpayments,
 * prior legal/recovery matters) so a Legal Officer can assess the person
 * without hopping between modules. Read-only Supabase queries. No mock data.
 *
 * Tables consulted (each fails silently if not present):
 *   ip_master, au_ip_wages_ann_sum, au_cl_head, bn_overpayment, lg_case
 *
 * Missing read-models are surfaced with the exact table name so ops can plan
 * the next data-model extension.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

const sb = supabase as any;

async function safe<T>(p: Promise<{ data: T | null }>, fallback: T | null = null): Promise<T | null> {
  try { const { data } = await p; return (data ?? fallback) as T | null; } catch { return fallback; }
}

interface Props { lgCaseId: string; personId?: string | null; ssn?: string | null; }

export function IpContextExtendedPanel({ lgCaseId, personId, ssn: ssnProp }: Props) {
  const q = useQuery({
    queryKey: ["lg-ip-context", lgCaseId, personId, ssnProp],
    enabled: !!(personId || ssnProp),
    queryFn: async () => {
      let ssn = ssnProp ?? null;
      let ip: any = null;
      if (personId) {
        ip = await safe(sb.from("ip_master").select("id, ssn, firstname, middle_name, surname, dob").eq("id", personId).maybeSingle());
        ssn = ssn ?? ip?.ssn ?? null;
      } else if (ssn) {
        ip = await safe(sb.from("ip_master").select("id, ssn, firstname, middle_name, surname, dob").eq("ssn", ssn).maybeSingle());
      }

      const [contribAgg, claims, overpayments, priorLegal] = await Promise.all([
        ssn ? safe<any[]>(sb.from("au_ip_wages_ann_sum").select("year, total_wages, total_contributions, weeks_paid").eq("ssn", ssn).order("year", { ascending: false }).limit(5), []) : Promise.resolve([]),
        ssn ? safe<any[]>(sb.from("au_cl_head").select("id, cl_no, benefit_code, cl_status, cl_date").eq("ssn", ssn).order("cl_date", { ascending: false }).limit(10), []) : Promise.resolve([]),
        ip?.id ? safe<any[]>(sb.from("bn_overpayment").select("id, outstanding_amount, status, created_at, period_from, period_to").eq("participant_id", ip.id).order("created_at", { ascending: false }).limit(10), []) : Promise.resolve([]),
        ip?.id ? safe<any[]>(sb.from("lg_case").select("id, lg_case_no, status_code, current_stage_code, opened_date").eq("person_id", ip.id).neq("id", lgCaseId).order("opened_date", { ascending: false }).limit(10), []) : Promise.resolve([]),
      ]);

      const contribAvailable = Array.isArray(contribAgg);
      const claimsAvailable = Array.isArray(claims);
      const overpaymentsAvailable = Array.isArray(overpayments);

      const totalOverpayment = (overpayments ?? []).reduce((s: number, o: any) => s + Number(o.outstanding_amount ?? 0), 0);

      return {
        ip, ssn,
        contribAgg: contribAgg ?? [],
        claims: claims ?? [],
        overpayments: overpayments ?? [],
        priorLegal: priorLegal ?? [],
        totalOverpayment,
        gaps: {
          contribution: !contribAvailable,
          benefit: !claimsAvailable,
          overpayment: !overpaymentsAvailable,
        },
      };
    },
  });

  if (!personId && !ssnProp) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" /> Insured Person — Cross-Module Context
        </CardTitle>
        <CardDescription>Contributions, benefits, overpayments and prior legal matters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading || !q.data ? <Skeleton className="h-24 w-full" /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Field label="SSN" v={q.data.ssn} />
              <Field label="Name" v={q.data.ip ? [q.data.ip.firstname, q.data.ip.middle_name, q.data.ip.surname].filter(Boolean).join(" ") : null} />
              <Field label="Date of Birth" v={q.data.ip?.dob} />
              <Field label="Outstanding Overpayment" v={q.data.totalOverpayment > 0 ? q.data.totalOverpayment.toFixed(2) : "0.00"} />
            </div>

            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Contribution Summary (last 5 years)</h4>
              {q.data.gaps.contribution ? (
                <p className="text-xs text-muted-foreground italic">
                  Read-model unavailable — table <code>au_ip_wages_ann_sum</code> not accessible.
                </p>
              ) : q.data.contribAgg.length === 0 ? (
                <p className="text-xs text-muted-foreground">No contribution records.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground"><tr className="text-left">
                    <th className="py-1">Year</th><th className="text-right">Wages</th>
                    <th className="text-right">Contributions</th><th className="text-right">Weeks Paid</th>
                  </tr></thead>
                  <tbody>{q.data.contribAgg.map((r: any) => (
                    <tr key={r.year} className="border-t">
                      <td className="py-1">{r.year}</td>
                      <td className="text-right">{Number(r.total_wages ?? 0).toFixed(2)}</td>
                      <td className="text-right">{Number(r.total_contributions ?? 0).toFixed(2)}</td>
                      <td className="text-right">{r.weeks_paid ?? 0}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Benefit History</h4>
              {q.data.gaps.benefit ? (
                <p className="text-xs text-muted-foreground italic">
                  Read-model unavailable — table <code>au_cl_head</code> not accessible.
                </p>
              ) : q.data.claims.length === 0 ? (
                <p className="text-xs text-muted-foreground">No benefit claims on record.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground"><tr className="text-left">
                    <th className="py-1">Claim No</th><th>Benefit</th><th>Status</th><th>Date</th>
                  </tr></thead>
                  <tbody>{q.data.claims.map((c: any) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-1">{c.cl_no ?? String(c.id).slice(0, 8)}</td>
                      <td>{c.benefit_code ?? "—"}</td>
                      <td>{c.cl_status ?? "—"}</td>
                      <td>{c.cl_date ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Overpayments</h4>
              {q.data.gaps.overpayment ? (
                <p className="text-xs text-muted-foreground italic">
                  Read-model unavailable — table <code>bn_overpayment</code> not accessible.
                </p>
              ) : q.data.overpayments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No overpayments on record.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground"><tr className="text-left">
                    <th className="py-1">Period</th><th>Status</th><th className="text-right">Outstanding</th>
                  </tr></thead>
                  <tbody>{q.data.overpayments.map((o: any) => (
                    <tr key={o.id} className="border-t">
                      <td className="py-1">{o.period_from ?? "—"} – {o.period_to ?? "—"}</td>
                      <td><Badge variant="outline">{o.status ?? "—"}</Badge></td>
                      <td className="text-right">{Number(o.outstanding_amount ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Prior Legal Matters</h4>
              {q.data.priorLegal.length === 0 ? (
                <p className="text-xs text-muted-foreground">No prior legal matters for this person.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {q.data.priorLegal.map((c: any) => (
                    <li key={c.id}>
                      <Link to={`/legal/lg/cases/${c.id}`} className="text-primary hover:underline">
                        {c.lg_case_no}
                      </Link>{" "}
                      <span className="text-muted-foreground">
                        · {c.status_code ?? "—"} · {c.current_stage_code ?? "—"} · opened {c.opened_date ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, v }: { label: string; v: React.ReactNode }) {
  const empty = v === null || v === undefined || v === "";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={empty ? "text-xs text-muted-foreground italic" : "text-sm font-medium"}>{empty ? "Unknown" : v}</div>
    </div>
  );
}

export default IpContextExtendedPanel;
