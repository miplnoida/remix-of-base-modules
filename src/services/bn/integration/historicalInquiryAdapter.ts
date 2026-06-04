/**
 * Historical Inquiry Adapter (READ-ONLY)
 * ---------------------------------------
 * Single entry point for BN screens to read legacy BEMA claim data
 * (cl_* tables). Pages MUST NOT query cl_* tables directly — always
 * go through this adapter.
 *
 * Rules:
 *  - No writes. Ever.
 *  - Returns normalized objects compatible with BN Claim 360.
 *  - Includes source metadata in every response.
 *  - Gracefully handles missing benefit-specific detail tables.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegacySource = "LEGACY_BEMA";

export interface SourceMetadata {
  source_system: LegacySource;
  source_table: string;
  read_only: true;
  fetched_at: string;
}

export interface LegacyResponse<T> {
  data: T;
  source: SourceMetadata;
}

export interface NormalizedLegacyClaim {
  claim_number: string;
  claim_seq: number;
  benefit_type: string;
  benefit_code?: string | null;
  status?: string | null;
  ssn: string;
  claimant_id?: string | null;
  payee_name?: string | null;
  date_received?: string | null;
  date_period_start?: string | null;
  date_period_end?: string | null;
  date_processed?: string | null;
  benefit_amount?: number | null;
  paid_to_date?: number | null;
  raw: Record<string, unknown>;
}

export interface NormalizedLegacyPayment {
  cheque_number?: string | null;
  amount?: number | null;
  issue_date?: string | null;
  status?: string | null;
  bank_account?: string | null;
  voided?: boolean;
  raw: Record<string, unknown>;
}

export interface NormalizedLegacyNote {
  note_seq?: number | null;
  note_text?: string | null;
  entered_by?: string | null;
  entered_date?: string | null;
  raw: Record<string, unknown>;
}

export interface NormalizedLegacyWage {
  period?: string | null;
  amount?: number | null;
  credited?: boolean;
  raw: Record<string, unknown>;
}

export interface LegacyTimelineEvent {
  event_date: string | null;
  event_type: string;
  description: string;
  actor?: string | null;
  source_table: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SOURCE_SYSTEM: LegacySource = "LEGACY_BEMA";

const meta = (source_table: string): SourceMetadata => ({
  source_system: SOURCE_SYSTEM,
  source_table,
  read_only: true,
  fetched_at: new Date().toISOString(),
});

/** Map benefit_type code -> legacy detail table. */
const BENEFIT_DETAIL_TABLE: Record<string, string> = {
  SB: "cl_detail_sb",
  SIB: "cl_detail_sib",
  MB: "cl_detail_matern",
  FB: "cl_detail_funeral",
  PEN: "cl_detail_pen",
  ME: "cl_detail_me",
  REF: "cl_detail_refund",
  UE: "cl_detail_unemploy",
};

function buildPayeeName(row: any): string | null {
  if (!row) return null;
  const parts = [row.payee_firstname, row.payee_middlename, row.payee_surname]
    .filter((v) => typeof v === "string" && v.trim().length > 0);
  return parts.length ? parts.join(" ") : null;
}

function normalizeClaim(row: any): NormalizedLegacyClaim {
  return {
    claim_number: row.claim_number,
    claim_seq: row.claim_seq,
    benefit_type: row.benefit_type,
    benefit_code: row.claim_type_code ?? null,
    status: row.status ?? null,
    ssn: row.insured_ssn,
    claimant_id: row.claimant_id ?? null,
    payee_name: buildPayeeName(row),
    date_received: row.date_received ?? null,
    date_period_start: row.date_period_start ?? null,
    date_period_end: row.date_period_end ?? null,
    date_processed: row.date_processed ?? null,
    benefit_amount: row.benefit_amount ?? null,
    paid_to_date: row.paid_to_date ?? null,
    raw: row,
  };
}

// Use `any` so this compiles regardless of generated Supabase type coverage
// for the legacy cl_* tables. This adapter is the single gatekeeper.
const legacy = supabase as any;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getLegacyClaim(
  claimNumber: string,
  claimSeq: number,
): Promise<LegacyResponse<{
  header: NormalizedLegacyClaim | null;
  detail: { table: string; row: Record<string, unknown> | null } | null;
}>> {
  const { data: header, error } = await legacy
    .from("cl_head")
    .select("*")
    .eq("claim_number", claimNumber)
    .eq("claim_seq", claimSeq)
    .maybeSingle();

  if (error) throw error;

  let detail: { table: string; row: Record<string, unknown> | null } | null = null;
  if (header) {
    const detailTable = BENEFIT_DETAIL_TABLE[header.benefit_type];
    if (detailTable) {
      try {
        const { data: detailRow, error: detailErr } = await legacy
          .from(detailTable)
          .select("*")
          .eq("claim_number", claimNumber)
          .eq("claim_seq", claimSeq)
          .maybeSingle();
        if (detailErr) {
          // Missing/inaccessible detail table → graceful null
          detail = { table: detailTable, row: null };
        } else {
          detail = { table: detailTable, row: detailRow ?? null };
        }
      } catch {
        detail = { table: detailTable, row: null };
      }
    }
  }

  return {
    data: {
      header: header ? normalizeClaim(header) : null,
      detail,
    },
    source: meta("cl_head"),
  };
}

export async function getLegacyClaimsBySsn(
  ssn: string,
): Promise<LegacyResponse<NormalizedLegacyClaim[]>> {
  const { data, error } = await legacy
    .from("cl_head")
    .select("*")
    .eq("insured_ssn", ssn)
    .order("date_received", { ascending: false });

  if (error) throw error;

  return {
    data: (data ?? []).map(normalizeClaim),
    source: meta("cl_head"),
  };
}

export async function getLegacyClaimPayments(
  claimNumber: string,
  claimSeq: number,
): Promise<LegacyResponse<{
  cheques: NormalizedLegacyPayment[];
  bank_accounts: Array<Record<string, unknown>>;
  voids: Array<Record<string, unknown>>;
}>> {
  const [chequesRes, banksRes, voidsRes] = await Promise.all([
    legacy
      .from("cl_cheques")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_bank_acct")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_void")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
  ]);

  if (chequesRes.error) throw chequesRes.error;

  const voidedCheques = new Set(
    ((voidsRes.data as any[]) ?? [])
      .map((v) => v.cheque_number)
      .filter(Boolean),
  );

  const cheques: NormalizedLegacyPayment[] = (
    (chequesRes.data as any[]) ?? []
  ).map((r) => ({
    cheque_number: r.cheque_number ?? null,
    amount: r.amount ?? r.cheque_amount ?? null,
    issue_date: r.issue_date ?? r.cheque_date ?? null,
    status: r.status ?? null,
    bank_account: r.account_number ?? r.bank_account ?? null,
    voided: voidedCheques.has(r.cheque_number),
    raw: r,
  }));

  return {
    data: {
      cheques,
      bank_accounts: (banksRes.data as any[]) ?? [],
      voids: (voidsRes.data as any[]) ?? [],
    },
    source: meta("cl_cheques,cl_bank_acct,cl_void"),
  };
}

export async function getLegacyClaimNotes(
  claimNumber: string,
  claimSeq: number,
): Promise<LegacyResponse<NormalizedLegacyNote[]>> {
  const { data, error } = await legacy
    .from("cl_head_notes")
    .select("*")
    .eq("claim_number", claimNumber)
    .eq("claim_seq", claimSeq);

  if (error) throw error;

  const notes: NormalizedLegacyNote[] = ((data as any[]) ?? []).map((r) => ({
    note_seq: r.note_seq ?? r.seq ?? null,
    note_text: r.note ?? r.note_text ?? r.remark ?? null,
    entered_by: r.entered_by ?? null,
    entered_date: r.date_entered ?? r.entered_date ?? null,
    raw: r,
  }));

  return { data: notes, source: meta("cl_head_notes") };
}

export async function getLegacyClaimWages(
  claimNumber: string,
  claimSeq: number,
): Promise<LegacyResponse<{
  wages: NormalizedLegacyWage[];
  credited: NormalizedLegacyWage[];
}>> {
  const [wagesRes, creditedRes] = await Promise.all([
    legacy
      .from("cl_head_wages")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_wages_credited")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
  ]);

  if (wagesRes.error) throw wagesRes.error;

  const mapWage = (r: any, credited: boolean): NormalizedLegacyWage => ({
    period: r.period ?? r.wage_period ?? null,
    amount: r.amount ?? r.wage_amount ?? null,
    credited,
    raw: r,
  });

  return {
    data: {
      wages: ((wagesRes.data as any[]) ?? []).map((r) => mapWage(r, false)),
      credited: ((creditedRes.data as any[]) ?? []).map((r) => mapWage(r, true)),
    },
    source: meta("cl_head_wages,cl_wages_credited"),
  };
}

export async function getLegacyClaimTimeline(
  claimNumber: string,
  claimSeq: number,
): Promise<LegacyResponse<LegacyTimelineEvent[]>> {
  const [headRes, trackRes, notifRes, voidRes, chequeRes] = await Promise.all([
    legacy
      .from("cl_head")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq)
      .maybeSingle(),
    legacy
      .from("cl_track")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_notification")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_void")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
    legacy
      .from("cl_cheques")
      .select("*")
      .eq("claim_number", claimNumber)
      .eq("claim_seq", claimSeq),
  ]);

  const events: LegacyTimelineEvent[] = [];
  const h = headRes.data as any;
  if (h) {
    if (h.date_received) events.push({ event_date: h.date_received, event_type: "RECEIVED", description: "Claim received", source_table: "cl_head" });
    if (h.date_entered) events.push({ event_date: h.date_entered, event_type: "ENTERED", description: "Claim entered", actor: h.entered_by ?? null, source_table: "cl_head" });
    if (h.date_verified) events.push({ event_date: h.date_verified, event_type: "VERIFIED", description: "Claim verified", actor: h.verified_by ?? null, source_table: "cl_head" });
    if (h.date_processed) events.push({ event_date: h.date_processed, event_type: "PROCESSED", description: "Claim processed", actor: h.processed_by ?? null, source_table: "cl_head" });
    if (h.date_modified) events.push({ event_date: h.date_modified, event_type: "MODIFIED", description: "Claim modified", actor: h.modified_by ?? null, source_table: "cl_head" });
  }

  for (const t of ((trackRes.data as any[]) ?? [])) {
    events.push({
      event_date: t.date_changed ?? t.event_date ?? t.date_entered ?? null,
      event_type: t.status ?? t.action ?? "TRACK",
      description: t.description ?? t.remark ?? "Status change",
      actor: t.entered_by ?? t.changed_by ?? null,
      source_table: "cl_track",
    });
  }

  for (const n of ((notifRes.data as any[]) ?? [])) {
    events.push({
      event_date: n.notification_date ?? n.date_sent ?? null,
      event_type: "NOTIFICATION",
      description: n.message ?? n.notification_type ?? "Notification sent",
      actor: n.sent_by ?? null,
      source_table: "cl_notification",
    });
  }

  for (const c of ((chequeRes.data as any[]) ?? [])) {
    if (c.issue_date || c.cheque_date) {
      events.push({
        event_date: c.issue_date ?? c.cheque_date,
        event_type: "CHEQUE_ISSUED",
        description: `Cheque ${c.cheque_number ?? ""} issued`,
        source_table: "cl_cheques",
      });
    }
  }

  for (const v of ((voidRes.data as any[]) ?? [])) {
    events.push({
      event_date: v.void_date ?? v.date_voided ?? null,
      event_type: "CHEQUE_VOIDED",
      description: `Cheque ${v.cheque_number ?? ""} voided${v.reason ? `: ${v.reason}` : ""}`,
      actor: v.voided_by ?? null,
      source_table: "cl_void",
    });
  }

  events.sort((a, b) => {
    const ad = a.event_date ? Date.parse(a.event_date) : 0;
    const bd = b.event_date ? Date.parse(b.event_date) : 0;
    return ad - bd;
  });

  return { data: events, source: meta("cl_head,cl_track,cl_notification,cl_cheques,cl_void") };
}

export const historicalInquiryAdapter = {
  getLegacyClaim,
  getLegacyClaimsBySsn,
  getLegacyClaimPayments,
  getLegacyClaimNotes,
  getLegacyClaimWages,
  getLegacyClaimTimeline,
};

export default historicalInquiryAdapter;
