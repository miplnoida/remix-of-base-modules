import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/bn/medicalService';

const k = (...parts: unknown[]) => ['bn', 'medical', ...parts] as const;

// Procedures
export const useMedicalProcedures = (countryCode?: string) =>
  useQuery({ queryKey: k('procedures', countryCode), queryFn: () => svc.fetchProcedures(countryCode) });
export const useUpsertProcedure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.upsertProcedure,
    onSuccess: () => qc.invalidateQueries({ queryKey: k('procedures') }),
  });
};
export const useDeleteProcedure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.deleteProcedure,
    onSuccess: () => qc.invalidateQueries({ queryKey: k('procedures') }),
  });
};

// Facilities
export const useMedicalFacilities = () =>
  useQuery({ queryKey: k('facilities'), queryFn: svc.fetchFacilities });
export const useUpsertFacility = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.upsertFacility, onSuccess: () => qc.invalidateQueries({ queryKey: k('facilities') }) });
};
export const useDeleteFacility = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteFacility, onSuccess: () => qc.invalidateQueries({ queryKey: k('facilities') }) });
};

// Facility–procedure
export const useFacilityProcedures = () =>
  useQuery({ queryKey: k('facility-procedures'), queryFn: svc.fetchFacilityProcedures });
export const useUpsertFacilityProcedure = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.upsertFacilityProcedure, onSuccess: () => qc.invalidateQueries({ queryKey: k('facility-procedures') }) });
};
export const useDeleteFacilityProcedure = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteFacilityProcedure, onSuccess: () => qc.invalidateQueries({ queryKey: k('facility-procedures') }) });
};

// Referral rules
export const useReferralRules = () =>
  useQuery({ queryKey: k('referral-rules'), queryFn: svc.fetchReferralRules });
export const useUpsertReferralRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.upsertReferralRule, onSuccess: () => qc.invalidateQueries({ queryKey: k('referral-rules') }) });
};
export const useDeleteReferralRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteReferralRule, onSuccess: () => qc.invalidateQueries({ queryKey: k('referral-rules') }) });
};

// Expense types
export const useExpenseTypes = () =>
  useQuery({ queryKey: k('expense-types'), queryFn: svc.fetchExpenseTypes });
export const useUpsertExpenseType = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.upsertExpenseType, onSuccess: () => qc.invalidateQueries({ queryKey: k('expense-types') }) });
};
export const useDeleteExpenseType = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteExpenseType, onSuccess: () => qc.invalidateQueries({ queryKey: k('expense-types') }) });
};

// Limits
export const useReimbursementLimits = () =>
  useQuery({ queryKey: k('reimb-limits'), queryFn: svc.fetchReimbursementLimits });
export const useUpsertReimbursementLimit = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.upsertReimbursementLimit, onSuccess: () => qc.invalidateQueries({ queryKey: k('reimb-limits') }) });
};
export const useDeleteReimbursementLimit = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: svc.deleteReimbursementLimit, onSuccess: () => qc.invalidateQueries({ queryKey: k('reimb-limits') }) });
};
