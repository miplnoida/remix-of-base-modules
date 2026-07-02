/**
 * EPIC-06A.2 — Intake Proposed Recoverable Liabilities.
 *
 * Stores proposed liabilities inside `lg_case_intake.payload.proposed_liabilities`
 * so no new table is required. On case creation/approval, `materializeForCase`
 * inserts rows into `lg_recoverable_liability`.
 *
 * Non-invasive: reads/writes only the existing `payload` JSON column.
 */
import { supabase } from "@/integrations/supabase/client";

const S: any = supabase;

export interface ProposedLiability {
  id: string;                       // local UUID within intake payload
  liability_type: string;           // ARREARS | OVERPAYMENT | PENALTY | INTEREST | COURT_ORDER | FEE | OTHER
  fund_type?: string | null;        // SSF | EIF | NHI | ...
  source_module?: string | null;    // CONTRIBUTIONS | BENEFITS | LEGAL | MANUAL
  source_reference?: string | null;
  employer_id?: string | null;
  insured_person_id?: string | null;
  assessment_number?: string | null;
  assessment_date?: string | null;  // YYYY-MM-DD
  contribution_period_from?: string | null;
  contribution_period_to?: string | null;
  principal?: number | null;
  interest?: number | null;
  penalty?: number | null;
  court_cost?: number | null;
  legal_cost?: number | null;
  currency?: string | null;
  limitation_date?: string | null;
  priority?: string | null;
  verified?: boolean;               // Officer confirmed the proposal
  remarks?: string | null;
}

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
}

async function loadIntakePayload(intakeId: string): Promise<Record<string, any>> {
  const { data, error } = await S.from("lg_case_intake").select("payload").eq("id", intakeId).maybeSingle();
  if (error) throw error;
  const p = data?.payload;
  return (p && typeof p === "object") ? { ...p } : {};
}

async function savePayload(intakeId: string, payload: Record<string, any>) {
  const { error } = await S.from("lg_case_intake").update({ payload }).eq("id", intakeId);
  if (error) throw error;
}

export async function listProposedLiabilities(intakeId: string): Promise<ProposedLiability[]> {
  const payload = await loadIntakePayload(intakeId);
  const arr = payload.proposed_liabilities;
  return Array.isArray(arr) ? (arr as ProposedLiability[]) : [];
}

export async function saveProposedLiabilities(intakeId: string, items: ProposedLiability[]): Promise<void> {
  const payload = await loadIntakePayload(intakeId);
  payload.proposed_liabilities = items;
  await savePayload(intakeId, payload);
}

export async function addProposedLiability(intakeId: string, item: Omit<ProposedLiability, "id">): Promise<ProposedLiability> {
  const items = await listProposedLiabilities(intakeId);
  const created: ProposedLiability = { id: newId(), ...item };
  items.push(created);
  await saveProposedLiabilities(intakeId, items);
  return created;
}

export async function updateProposedLiability(intakeId: string, id: string, patch: Partial<ProposedLiability>): Promise<void> {
  const items = await listProposedLiabilities(intakeId);
  const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
  await saveProposedLiabilities(intakeId, next);
}

export async function removeProposedLiability(intakeId: string, id: string): Promise<void> {
  const items = await listProposedLiabilities(intakeId);
  await saveProposedLiabilities(intakeId, items.filter((x) => x.id !== id));
}

export function summarize(items: ProposedLiability[]) {
  const count = items.length;
  const verified = items.filter((x) => x.verified).length;
  const total = items.reduce(
    (s, x) => s + Number(x.principal ?? 0) + Number(x.interest ?? 0) + Number(x.penalty ?? 0) + Number(x.court_cost ?? 0) + Number(x.legal_cost ?? 0),
    0,
  );
  return { count, verified, total };
}

/**
 * Materialize proposed liabilities into `lg_recoverable_liability` for a newly
 * created case. Idempotent-ish: skips proposals that already carry `materialized_id`.
 */
export async function materializeForCase(intakeId: string, caseId: string, actorCode?: string | null): Promise<{ created: number }> {
  const items = await listProposedLiabilities(intakeId);
  if (!items.length) return { created: 0 };

  const inserts = items
    .filter((it) => !(it as any).materialized_id)
    .map((it) => ({
      lg_case_id: caseId,
      liability_type: it.liability_type,
      fund_type: it.fund_type ?? null,
      source_module: it.source_module ?? "INTAKE",
      source_record_id: intakeId,
      source_reference: it.source_reference ?? null,
      employer_id: it.employer_id ?? null,
      insured_person_id: it.insured_person_id ?? null,
      assessment_number: it.assessment_number ?? null,
      assessment_date: it.assessment_date ?? null,
      contribution_period_from: it.contribution_period_from ?? null,
      contribution_period_to: it.contribution_period_to ?? null,
      principal: Number(it.principal ?? 0),
      interest: Number(it.interest ?? 0),
      penalty: Number(it.penalty ?? 0),
      court_cost: Number(it.court_cost ?? 0),
      legal_cost: Number(it.legal_cost ?? 0),
      currency: it.currency ?? "XCD",
      limitation_date: it.limitation_date ?? null,
      priority: it.priority ?? null,
      remarks: it.remarks ?? null,
      created_by: actorCode ?? null,
      updated_by: actorCode ?? null,
    }));

  if (!inserts.length) return { created: 0 };

  const { data, error } = await S.from("lg_recoverable_liability").insert(inserts).select("id");
  if (error) throw error;

  // Stamp materialized IDs back onto the proposals for auditability
  const createdIds: string[] = (data ?? []).map((r: any) => r.id);
  const nextItems = items.map((it) => {
    if ((it as any).materialized_id) return it;
    const nextId = createdIds.shift();
    return nextId ? ({ ...it, materialized_id: nextId } as ProposedLiability & { materialized_id?: string }) : it;
  });
  await saveProposedLiabilities(intakeId, nextItems);

  return { created: inserts.length };
}
