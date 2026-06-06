import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicBenefitApi, type PortalRole, type ApiOptions } from './publicBenefitApiClient';

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

export const useExternalProducts = () =>
  useQuery({ queryKey: ['external', 'products'], queryFn: () => publicBenefitApi.listProducts() });

export const useExternalFormDefinition = (productCode: string | undefined, role: PortalRole, opts?: ApiOptions) =>
  useQuery({
    queryKey: ['external', 'form-definition', productCode, role, opts?.taskToken ?? 'session'],
    queryFn: () => publicBenefitApi.getFormDefinition(productCode!, role, opts),
    enabled: !!productCode,
  });

export const useExternalMessages = () =>
  useQuery({ queryKey: ['external', 'messages'], queryFn: () => publicBenefitApi.listMessages() });

export const useExternalClaimStatus = (claimNumber: string | undefined) =>
  useQuery({ queryKey: ['external', 'claim-status', claimNumber], queryFn: () => publicBenefitApi.getClaimStatus(claimNumber!), enabled: !!claimNumber });
