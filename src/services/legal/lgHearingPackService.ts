/**
 * Hearing Pack generator (EPIC-05A – Part 5)
 * Aggregates existing matter data (no duplication) and produces a printable HTML pack.
 * Print / PDF via window.print. Word via Blob download (application/msword).
 */
import { supabase } from "@/integrations/supabase/client";
import { getHearing, listAttendees, listEvidence, listAdjournments, listPrepChecklist, evaluateReadiness, evaluateRecoveryImpact, type HearingWorkbenchRow } from "@/services/legal/lgHearingWorkbenchService";
import { loadLiabilityRollupForCase } from "@/services/legal/lgLiabilityRetrofitService";

export interface HearingPack {
  hearing: HearingWorkbenchRow;
  matter: any | null;
  attendees: any[];
  evidence: any[];
  adjournments: any[];
  checklist: any[];
  previousHearings: any[];
  orders: any[];
  tasks: any[];
  liabilities: any[];
  liabilityRollup: {
    count: number;
    totalAssessed: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  readiness: ReturnType<typeof evaluateReadiness>;
  recoveryImpact: ReturnType<typeof evaluateRecoveryImpact>;
  generatedAt: string;
}

export async function buildHearingPack(hearingId: string): Promise<HearingPack> {
  const hearing = await getHearing(hearingId);
  if (!hearing) throw new Error("Hearing not found");
  const caseId = hearing.lg_case_id;
  const [matterRes, attendees, evidence, adjournments, checklist, prevRes, ordersRes, tasksRes, liabLinkRes, liabRollup] = await Promise.all([
    caseId ? supabase.from("lg_case").select("*").eq("id", caseId).maybeSingle() : Promise.resolve({ data: null }),
    listAttendees(hearingId),
    listEvidence(hearingId),
    listAdjournments(hearingId),
    listPrepChecklist(hearingId),
    caseId ? supabase.from("lg_hearing").select("id, hearing_number, hearing_date, status, outcome_code").eq("lg_case_id", caseId).neq("id", hearingId).order("hearing_date", { ascending: false }) : Promise.resolve({ data: [] }),
    caseId ? (supabase.from("lg_order") as any).select("*").eq("lg_case_id", caseId) : Promise.resolve({ data: [] }),
    (supabase.from("lg_case_task") as any).select("*").eq("source_id", hearingId),
    (supabase.from("lg_hearing_liability") as any)
      .select("liability_id, lg_recoverable_liability:liability_id ( id, liability_type, fund_type, contribution_period_from, contribution_period_to, principal, total_assessed, total_paid, outstanding, recovery_status, limitation_date )")
      .eq("hearing_id", hearingId),
    caseId ? loadLiabilityRollupForCase(caseId).then((x) => x.rollup) : Promise.resolve(null),
  ]);

  const liabilityRows = ((liabLinkRes as any)?.data as any[] ?? [])
    .map((r: any) => r.lg_recoverable_liability)
    .filter(Boolean);
  const rollup = liabRollup ?? { count: 0, totalAssessed: 0, totalPaid: 0, totalOutstanding: 0 } as any;

  return {
    hearing,
    matter: (matterRes as any).data ?? null,
    attendees: attendees ?? [],
    evidence: evidence ?? [],
    adjournments: adjournments ?? [],
    checklist: checklist ?? [],
    previousHearings: ((prevRes as any).data as any[]) ?? [],
    orders: ((ordersRes as any).data as any[]) ?? [],
    tasks: ((tasksRes as any).data as any[]) ?? [],
    liabilities: liabilityRows,
    liabilityRollup: {
      count: Number(rollup.count ?? 0),
      totalAssessed: Number(rollup.totalAssessed ?? 0),
      totalPaid: Number(rollup.totalPaid ?? 0),
      totalOutstanding: Number(rollup.totalOutstanding ?? 0),
    },
    readiness: evaluateReadiness(hearing),
    recoveryImpact: evaluateRecoveryImpact(hearing),
    generatedAt: new Date().toISOString(),
  };
}

function esc(s: any): string {
  return String(s ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function renderHearingPackHtml(p: HearingPack): string {
  const h = p.hearing;
  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;
  const rowsTable = (headers: string[], rows: string[][]) => `
    <table><thead><tr>${headers.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" style="text-align:center;color:#888">None</td></tr>`}</tbody></table>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Hearing Pack ${esc(h.hearing_number)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:12px}
    h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:2px}
    table{width:100%;border-collapse:collapse;margin:4px 0} th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;font-size:11px}
    th{background:#f4f4f4} .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px}
    .pill{display:inline-block;padding:2px 6px;border-radius:10px;font-size:10px;background:#eef}
  </style></head><body>
  <h1>Hearing Pack — ${esc(h.hearing_number)}</h1>
  <div>Generated ${esc(new Date(p.generatedAt).toLocaleString())}</div>
  <section><h2>Court Details</h2><div class="meta">
    <div><b>Matter #:</b> ${esc(h.lg_case_no)}</div>
    <div><b>Court:</b> ${esc(h.court_name_display)}</div>
    <div><b>Court File #:</b> ${esc(h.court_file_number)}</div>
    <div><b>Judge / Magistrate:</b> ${esc(h.judge_name || h.magistrate_name)}</div>
    <div><b>Date:</b> ${esc(h.hearing_date)} ${esc(h.hearing_time ?? "")}</div>
    <div><b>Venue:</b> ${esc(h.venue_name_display)}</div>
    <div><b>Status:</b> <span class="pill">${esc(h.status)}</span></div>
    <div><b>Type:</b> ${esc(h.hearing_type_code)}</div>
    <div><b>Officer:</b> ${esc(h.officer_code)}</div>
    <div><b>Lead Counsel:</b> ${esc(h.lead_counsel_code)}</div>
    <div><b>Readiness:</b> ${esc(p.readiness.level)} (${p.readiness.percent}%)</div>
    <div><b>Recovery Impact:</b> ${esc(p.recoveryImpact.impact)} — ${esc(p.recoveryImpact.reason)}</div>
  </div></section>
  ${section("Matter Summary", `<div>${esc(p.matter?.summary ?? h.case_summary)}</div>`)}
  ${section("Party (Employer / Insured Person)", `<div><b>Type:</b> ${esc(h.primary_party_type)}<br/><b>Ref:</b> ${esc(h.primary_party_name)}</div>`)}
  ${section("Financial Recovery Summary", `<div><b>Recovery Impact Amount:</b> ${esc(h.recovery_impact_amount)}</div>
    <div style="margin-top:6px"><b>Liability Rollup:</b> ${esc(p.liabilityRollup.count)} liabilit${p.liabilityRollup.count === 1 ? "y" : "ies"} · Assessed ${esc(p.liabilityRollup.totalAssessed.toFixed(2))} · Paid ${esc(p.liabilityRollup.totalPaid.toFixed(2))} · Outstanding ${esc(p.liabilityRollup.totalOutstanding.toFixed(2))}</div>`)}
  ${section("Affected Recoverable Liabilities", rowsTable(
    ["Type","Fund","Period","Assessed","Paid","Outstanding","Status","Limitation"],
    p.liabilities.map((l: any) => [
      l.liability_type,
      l.fund_type ?? "—",
      [l.contribution_period_from, l.contribution_period_to].filter(Boolean).join(" → ") || "—",
      Number(l.total_assessed ?? 0).toFixed(2),
      Number(l.total_paid ?? 0).toFixed(2),
      Number(l.outstanding ?? 0).toFixed(2),
      l.recovery_status ?? "—",
      l.limitation_date ?? "—",
    ]),
  ))}
  ${section("Preparation Checklist", rowsTable(["#","Item","Mandatory","Completed"], p.checklist.map((c: any, i: number) => [String(i + 1), c.item_label, c.mandatory ? "Yes" : "No", c.completed ? "Yes" : "No"])))}
  ${section("Evidence List", rowsTable(["Item","Type","Submitted","Accepted"], p.evidence.map((e: any) => [e.title ?? e.evidence_code, e.evidence_type_code ?? "—", e.submitted ? "Yes" : "No", e.accepted ? "Yes" : "No"])))}
  ${section("Attendees / Witnesses", rowsTable(["Role","Name","Confirmed"], p.attendees.map((a: any) => [a.attendee_role, a.attendee_name ?? a.attendee_code, a.confirmed ? "Yes" : "No"])))}
  ${section("Previous Hearings", rowsTable(["Hearing #","Date","Status","Outcome"], p.previousHearings.map((x: any) => [x.hearing_number, x.hearing_date, x.status, x.outcome_code ?? "—"])))}
  ${section("Orders", rowsTable(["Order #","Type","Status","Amount"], p.orders.map((o: any) => [o.order_number ?? o.id?.slice(0, 8), o.order_type_code, o.status, o.amount_ordered])))}
  ${section("Adjournments", rowsTable(["#","Reason","Next Date"], p.adjournments.map((a: any) => [String(a.adjournment_number), a.reason ?? "—", a.next_hearing_date ?? "—"])))}
  ${section("Tasks", rowsTable(["Title","Status","Due"], p.tasks.map((t: any) => [t.title, t.status, t.due_date ?? "—"])))}
  </body></html>`;
}

export function printHearingPack(html: string) {
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function downloadHearingPackWord(html: string, filename = "hearing-pack.doc") {
  const blob = new Blob([`<!DOCTYPE html>${html}`], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
