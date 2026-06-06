import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicBenefitApi, type PortalRole, type ApiOptions } from './publicBenefitApiClient';

// ─── Tasks ──────────────────────────────────────────────────────────
export const useExternalTasks = (opts?: ApiOptions) =>
  useQuery({ queryKey: ['external', 'tasks', opts?.taskToken ?? 'session'], queryFn: () => publicBenefitApi.listTasks(opts) });

export const useExternalTask = (taskId: string | undefined, opts?: ApiOptions) =>
  useQuery({ queryKey: ['external', 'task', taskId, opts?.taskToken ?? 'session'], queryFn: () => publicBenefitApi.getTask(taskId!, opts), enabled: !!taskId });

export const useSubmitExternalTask = (opts?: ApiOptions) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, values, notes }: { taskId: string; values: Record<string, any>; notes?: string }) =>
      publicBenefitApi.submitTask(taskId, { values, notes }, opts),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external', 'tasks'] }),
  });
};

// ─── Benefits / intake ──────────────────────────────────────────────
export const useExternalProducts = () =>
  useQuery({ queryKey: ['external', 'products'], queryFn: () => publicBenefitApi.listProducts() });

export const useExternalFormDefinition = (productCode: string | undefined, role: PortalRole, opts?: ApiOptions) =>
  useQuery({
    queryKey: ['external', 'form-definition', productCode, role, opts?.taskToken ?? 'session'],
    queryFn: () => publicBenefitApi.getFormDefinition(productCode!, role, opts),
    enabled: !!productCode,
  });

// ─── Claimant self-service ──────────────────────────────────────────
export const useExternalMessages = () =>
  useQuery({ queryKey: ['external', 'messages'], queryFn: () => publicBenefitApi.listMessages() });

export const useExternalClaimStatus = (claimNumber: string | undefined) =>
  useQuery({ queryKey: ['external', 'claim-status', claimNumber], queryFn: () => publicBenefitApi.getClaimStatus(claimNumber!), enabled: !!claimNumber });

export const useExternalClaims = () =>
  useQuery({ queryKey: ['external', 'me', 'claims'], queryFn: () => publicBenefitApi.listClaims() });

export const useExternalClaimBuckets = () =>
  useQuery({ queryKey: ['external', 'me', 'claim-buckets'], queryFn: () => publicBenefitApi.listClaimBuckets() });

export const useExternalParticipantConfig = (productCode: string | undefined) =>
  useQuery({
    queryKey: ['external', 'participant-config', productCode],
    enabled: !!productCode,
    queryFn: () => publicBenefitApi.getParticipantConfig(productCode!),
  });

export const useExternalAwards = () =>
  useQuery({ queryKey: ['external', 'me', 'awards'], queryFn: () => publicBenefitApi.listAwards() });

export const useExternalPayments = () =>
  useQuery({ queryKey: ['external', 'me', 'payments'], queryFn: () => publicBenefitApi.listPayments() });

export const useExternalContributions = () =>
  useQuery({ queryKey: ['external', 'me', 'contributions'], queryFn: () => publicBenefitApi.getContributionHistory() });

export const useExternalEmploymentHistory = () =>
  useQuery({ queryKey: ['external', 'me', 'employment'], queryFn: () => publicBenefitApi.getEmploymentHistory() });

export const useExternalProfile = () =>
  useQuery({ queryKey: ['external', 'me', 'profile'], queryFn: () => publicBenefitApi.getProfile() });

// ─── Employer ───────────────────────────────────────────────────────
export const useEmployerProfile = () =>
  useQuery({ queryKey: ['external', 'employer', 'profile'], queryFn: () => publicBenefitApi.employerProfile() });

export const useEmployerEmployees = () =>
  useQuery({ queryKey: ['external', 'employer', 'employees'], queryFn: () => publicBenefitApi.employerEmployees() });

export const useEmployerC3History = () =>
  useQuery({ queryKey: ['external', 'employer', 'c3'], queryFn: () => publicBenefitApi.employerC3History() });

export const useEmployerContributions = () =>
  useQuery({ queryKey: ['external', 'employer', 'contributions'], queryFn: () => publicBenefitApi.employerContributions() });

export const useEmployerPayments = () =>
  useQuery({ queryKey: ['external', 'employer', 'payments'], queryFn: () => publicBenefitApi.employerPayments() });

export const useEmployerBalances = () =>
  useQuery({ queryKey: ['external', 'employer', 'balances'], queryFn: () => publicBenefitApi.employerBalances() });

export const useEmployerNotices = () =>
  useQuery({ queryKey: ['external', 'employer', 'compliance'], queryFn: () => publicBenefitApi.employerNotices() });

// ─── Doctor / Medical Provider ──────────────────────────────────────
export const useDoctorProfile = () =>
  useQuery({ queryKey: ['external', 'doctor', 'profile'], queryFn: () => publicBenefitApi.doctorProfile() });

export const useDoctorReports = () =>
  useQuery({ queryKey: ['external', 'doctor', 'reports'], queryFn: () => publicBenefitApi.doctorReports() });
