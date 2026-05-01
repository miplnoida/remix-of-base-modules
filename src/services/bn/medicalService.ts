// Medical Benefit Setup — Supabase data access
import { supabase } from '@/integrations/supabase/client';
import type {
  BnMedicalProcedure,
  BnMedicalFacility,
  BnMedicalFacilityProcedure,
  BnMedicalReferralRule,
  BnMedicalExpenseType,
  BnMedicalReimbursementLimit,
  BnMedicalClaimExpense,
  BnMedicalReimbursementCalc,
  BnMedicalRecommendation,
} from '@/types/bnMedical';

const ok = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

// ---------- Procedures ----------
export const fetchProcedures = async (countryCode?: string) => {
  let q = supabase.from('bn_medical_procedure').select('*').order('procedure_code');
  if (countryCode) q = q.eq('country_code', countryCode);
  return ok(await q);
};
export const upsertProcedure = async (p: Partial<BnMedicalProcedure>) =>
  ok(await supabase.from('bn_medical_procedure').upsert(p as any).select().single());
export const deleteProcedure = async (id: string) => {
  const { error } = await supabase.from('bn_medical_procedure').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Facilities ----------
export const fetchFacilities = async () =>
  ok(await supabase.from('bn_medical_facility').select('*').order('facility_code'));
export const upsertFacility = async (f: Partial<BnMedicalFacility>) =>
  ok(await supabase.from('bn_medical_facility').upsert(f as any).select().single());
export const deleteFacility = async (id: string) => {
  const { error } = await supabase.from('bn_medical_facility').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Facility–Procedure availability ----------
export const fetchFacilityProcedures = async () =>
  ok(await supabase.from('bn_medical_facility_procedure').select('*'));
export const upsertFacilityProcedure = async (fp: Partial<BnMedicalFacilityProcedure>) =>
  ok(await supabase.from('bn_medical_facility_procedure').upsert(fp as any).select().single());
export const deleteFacilityProcedure = async (id: string) => {
  const { error } = await supabase.from('bn_medical_facility_procedure').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Referral rules ----------
export const fetchReferralRules = async () =>
  ok(await supabase.from('bn_medical_referral_rule').select('*'));
export const upsertReferralRule = async (r: Partial<BnMedicalReferralRule>) =>
  ok(await supabase.from('bn_medical_referral_rule').upsert(r as any).select().single());
export const deleteReferralRule = async (id: string) => {
  const { error } = await supabase.from('bn_medical_referral_rule').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Expense types ----------
export const fetchExpenseTypes = async () =>
  ok(await supabase.from('bn_medical_expense_type').select('*').order('expense_code'));
export const upsertExpenseType = async (e: Partial<BnMedicalExpenseType>) =>
  ok(await supabase.from('bn_medical_expense_type').upsert(e as any).select().single());
export const deleteExpenseType = async (id: string) => {
  const { error } = await supabase.from('bn_medical_expense_type').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Reimbursement limits ----------
export const fetchReimbursementLimits = async () =>
  ok(await supabase.from('bn_medical_reimbursement_limit').select('*'));
export const upsertReimbursementLimit = async (l: Partial<BnMedicalReimbursementLimit>) =>
  ok(await supabase.from('bn_medical_reimbursement_limit').upsert(l as any).select().single());
export const deleteReimbursementLimit = async (id: string) => {
  const { error } = await supabase.from('bn_medical_reimbursement_limit').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// ---------- Claim expenses + calculation runs ----------
export const fetchClaimExpenses = async (claimId: string) =>
  ok(await supabase.from('bn_medical_claim_expense').select('*').eq('claim_id', claimId));
export const upsertClaimExpense = async (e: Partial<BnMedicalClaimExpense>) =>
  ok(await supabase.from('bn_medical_claim_expense').upsert(e as any).select().single());

export const fetchCalcRuns = async (claimId: string) =>
  ok(await supabase
    .from('bn_medical_reimbursement_calc')
    .select('*')
    .eq('claim_id', claimId)
    .order('calculation_number', { ascending: false }));
export const insertCalcRun = async (c: Partial<BnMedicalReimbursementCalc>) =>
  ok(await supabase.from('bn_medical_reimbursement_calc').insert(c as any).select().single());

// ---------- Recommendations ----------
export const fetchRecommendations = async (claimId: string) =>
  ok(await supabase.from('bn_medical_recommendation').select('*').eq('claim_id', claimId));
export const upsertRecommendation = async (r: Partial<BnMedicalRecommendation>) =>
  ok(await supabase.from('bn_medical_recommendation').upsert(r as any).select().single());
